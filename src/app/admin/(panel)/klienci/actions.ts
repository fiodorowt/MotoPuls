"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { f, runAction } from "@/lib/admin/run";
import { db } from "@/lib/db";
import type { FormState } from "@/lib/form-state";
import { anonymizeCustomer } from "@/lib/maintenance";
import { emailSchema, phoneSchema } from "@/lib/validation";

const customerSchema = z.object({
  id: f.id,
  name: f.str(2, 80, "Imię i nazwisko"),
  phone: phoneSchema,
  email: z.union([z.literal(""), emailSchema]),
  fleetAccountId: f.opt(40),
});

export async function updateCustomer(_prev: FormState, formData: FormData): Promise<FormState> {
  return runAction(formData, { schema: customerSchema }, async ({ id, ...data }, user) => {
    const { count } = await db.customer.updateMany({ where: { id, anonymizedAt: null }, data });
    if (count !== 1) return { ok: false, message: "Nie można edytować tego klienta." };
    await audit({ actor: user.email, userId: user.id, action: "customer.update", entity: "Customer", entityId: id });
  });
}

export async function addCustomerNote(_prev: FormState, formData: FormData): Promise<FormState> {
  return runAction(formData, { schema: z.object({ customerId: f.id, body: f.str(1, 2000, "Notatka") }) }, async ({ customerId, body }, user) => {
    await db.note.create({ data: { customerId, body, authorId: user.id } });
    return { ok: true, message: "Notatka dodana." };
  });
}

export async function deleteCustomerNote(_prev: FormState, formData: FormData): Promise<FormState> {
  return runAction(formData, { schema: z.object({ id: f.id }) }, async ({ id }, user) => {
    await db.note.delete({ where: { id } });
    await audit({ actor: user.email, userId: user.id, action: "note.delete", entity: "Note", entityId: id });
    return { ok: true, message: "Notatka usunięta." };
  });
}

/** RODO: prawo do usunięcia danych. Tylko właściciel; operacja nieodwracalna. */
export async function anonymizeCustomerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const result = await runAction(formData, { schema: z.object({ id: f.id }), owner: true }, async ({ id }, user) => {
    await anonymizeCustomer(id, user);
  });
  if (result.ok) redirect("/admin/klienci?usunieto=1");
  return result;
}
