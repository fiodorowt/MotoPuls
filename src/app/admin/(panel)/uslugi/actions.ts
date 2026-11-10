"use server";

import { z } from "zod";
import { audit } from "@/lib/audit";
import { f, runAction } from "@/lib/admin/run";
import { db } from "@/lib/db";
import type { FormState } from "@/lib/form-state";
import { SLOT_MIN } from "@/lib/slots";

const categorySchema = z.object({
  id: f.id,
  name: f.str(2, 80, "Nazwa"),
  summary: f.str(2, 300, "Krótki opis"),
  description: f.str(2, 4000, "Opis"),
  sortOrder: f.int(0, 999, "Kolejność"),
});

export async function saveCategory(_prev: FormState, formData: FormData): Promise<FormState> {
  return runAction(formData, { schema: categorySchema, owner: true }, async ({ id, ...data }, user) => {
    await db.serviceCategory.update({ where: { id }, data });
    await audit({ actor: user.email, userId: user.id, action: "category.update", entity: "ServiceCategory", entityId: id });
  });
}

const serviceSchema = z
  .object({
    id: z.string().max(40).optional(),
    categoryId: f.id,
    name: f.str(2, 120, "Nazwa"),
    description: z.string().trim().max(1000, "Opis: najwyżej 1000 znaków").default(""),
    priceFrom: f.optInt(0, 100_000, "Cena od"),
    priceTo: f.optInt(0, 100_000, "Cena do"),
    durationMin: f.int(SLOT_MIN, 600, "Czas trwania").refine((v) => v % SLOT_MIN === 0, `Czas trwania: wielokrotność ${SLOT_MIN} minut`),
    active: f.checkbox,
    requiresRefrigerant: f.checkbox,
    sortOrder: f.int(0, 999, "Kolejność"),
  })
  .refine((v) => v.priceFrom === null || v.priceTo === null || v.priceTo >= v.priceFrom, { path: ["priceTo"], message: "Cena do nie może być niższa niż cena od" });

/** Zmiana czasu lub ceny nie rusza istniejących rezerwacji – te przechowują własną migawkę usługi. */
export async function saveService(_prev: FormState, formData: FormData): Promise<FormState> {
  return runAction(formData, { schema: serviceSchema, owner: true }, async ({ id, ...data }, user) => {
    const service = id ? await db.service.update({ where: { id }, data }) : await db.service.create({ data });
    await audit({ actor: user.email, userId: user.id, action: id ? "service.update" : "service.create", entity: "Service", entityId: service.id });
    return { ok: true, message: id ? "Zapisano." : "Usługa dodana." };
  });
}

export async function deleteService(_prev: FormState, formData: FormData): Promise<FormState> {
  return runAction(formData, { schema: z.object({ id: f.id }), owner: true }, async ({ id }, user) => {
    const used = await db.bookingService.count({ where: { serviceId: id } });
    if (used > 0) {
      // Usługa z historią wizyt nie może zniknąć – wyłączamy ją z oferty.
      await db.service.update({ where: { id }, data: { active: false } });
    } else {
      await db.service.delete({ where: { id } });
    }
    await audit({ actor: user.email, userId: user.id, action: used > 0 ? "service.deactivate" : "service.delete", entity: "Service", entityId: id });
    return { ok: true, message: used > 0 ? "Usługa ma historię wizyt – została wyłączona z oferty." : "Usługa usunięta." };
  });
}
