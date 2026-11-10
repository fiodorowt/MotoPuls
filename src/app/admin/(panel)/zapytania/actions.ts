"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { f, runAction } from "@/lib/admin/run";
import { db } from "@/lib/db";
import type { FormState } from "@/lib/form-state";

const schema = z.object({
  id: f.id,
  status: z.enum(["NEW", "IN_PROGRESS", "CLOSED"]),
  internalNote: f.opt(2000),
});

export async function updateInquiry(_prev: FormState, formData: FormData): Promise<FormState> {
  return runAction(formData, { schema }, async ({ id, status, internalNote }, user) => {
    await db.inquiry.update({ where: { id }, data: { status, internalNote } });
    await audit({ actor: user.email, userId: user.id, action: "inquiry.update", entity: "Inquiry", entityId: id, details: { status } });
  });
}

export async function deleteInquiry(_prev: FormState, formData: FormData): Promise<FormState> {
  const result = await runAction(formData, { schema: z.object({ id: f.id }), owner: true }, async ({ id }, user) => {
    await db.inquiry.delete({ where: { id } });
    await audit({ actor: user.email, userId: user.id, action: "inquiry.delete", entity: "Inquiry", entityId: id });
  });
  if (result.ok) redirect("/admin/zapytania");
  return result;
}
