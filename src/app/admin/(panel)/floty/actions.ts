"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { f, runAction } from "@/lib/admin/run";
import { db } from "@/lib/db";
import type { FormState } from "@/lib/form-state";
import { emailSchema, fleetSchema, phoneSchema, vehicleSchema } from "@/lib/validation";

const fleetFields = {
  companyName: f.str(2, 120, "Nazwa firmy"),
  nip: fleetSchema.shape.nip.transform((v) => v ?? null),
  contactName: f.opt(80),
  phone: z.union([z.literal(""), phoneSchema]).transform((v) => v || null),
  email: z.union([z.literal(""), emailSchema]).transform((v) => v || null),
  notes: f.opt(2000),
};

export async function createFleet(_prev: FormState, formData: FormData): Promise<FormState> {
  let createdId = "";
  const result = await runAction(formData, { schema: z.object(fleetFields) }, async (data, user) => {
    const fleet = await db.fleetAccount.create({ data });
    createdId = fleet.id;
    await audit({ actor: user.email, userId: user.id, action: "fleet.create", entity: "FleetAccount", entityId: fleet.id });
  });
  if (result.ok) redirect(`/admin/floty/${createdId}`);
  return result;
}

export async function updateFleet(_prev: FormState, formData: FormData): Promise<FormState> {
  return runAction(formData, { schema: z.object({ id: f.id, ...fleetFields }) }, async ({ id, ...data }, user) => {
    await db.fleetAccount.update({ where: { id }, data });
    await audit({ actor: user.email, userId: user.id, action: "fleet.update", entity: "FleetAccount", entityId: id });
  });
}

/** Usunięcie klienta flotowego: pojazdy bez właściciela znikają, pozostałe i klienci zostają bez przypisania. */
export async function deleteFleet(_prev: FormState, formData: FormData): Promise<FormState> {
  const result = await runAction(formData, { schema: z.object({ id: f.id }), owner: true }, async ({ id }, user) => {
    await db.$transaction([
      db.vehicle.deleteMany({ where: { fleetAccountId: id, customerId: null } }),
      db.fleetAccount.delete({ where: { id } }),
    ]);
    await audit({ actor: user.email, userId: user.id, action: "fleet.delete", entity: "FleetAccount", entityId: id });
  });
  if (result.ok) redirect("/admin/floty");
  return result;
}

const fleetVehicleSchema = z.object({
  fleetAccountId: f.id,
  make: vehicleSchema.shape.make,
  model: vehicleSchema.shape.model,
  year: f.optInt(1950, 2100, "Rok produkcji"),
  plate: vehicleSchema.shape.plate,
  vin: vehicleSchema.shape.vin.transform((v) => v ?? null),
  type: vehicleSchema.shape.type,
});

export async function addFleetVehicle(_prev: FormState, formData: FormData): Promise<FormState> {
  return runAction(formData, { schema: fleetVehicleSchema }, async (data) => {
    await db.vehicle.create({ data });
    return { ok: true, message: "Pojazd dodany." };
  });
}

export async function removeFleetVehicle(_prev: FormState, formData: FormData): Promise<FormState> {
  return runAction(formData, { schema: z.object({ id: f.id }) }, async ({ id }) => {
    const vehicle = await db.vehicle.findUnique({ where: { id }, select: { customerId: true } });
    if (!vehicle) return { ok: false, message: "Nie znaleziono pojazdu." };
    // Pojazd klienta ma historię wizyt – tylko odpinamy go od floty.
    if (vehicle.customerId) await db.vehicle.update({ where: { id }, data: { fleetAccountId: null } });
    else await db.vehicle.delete({ where: { id } });
    return { ok: true, message: "Pojazd usunięty z floty." };
  });
}
