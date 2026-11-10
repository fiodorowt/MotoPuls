"use server";

import { z } from "zod";
import { audit } from "@/lib/audit";
import { f, runAction } from "@/lib/admin/run";
import { db } from "@/lib/db";
import { DEFAULT_TEMPLATES } from "@/lib/email/templates";
import type { FormState } from "@/lib/form-state";

const schema = z.object({
  key: z.string().min(1).max(60),
  // Temat trafia do nagłówka wiadomości – bez znaków nowej linii.
  subject: f.str(3, 200, "Temat").refine((v) => !/[\r\n]/.test(v), "Temat nie może zawierać nowych linii"),
  body: f.str(10, 5000, "Treść"),
});

export async function saveTemplate(_prev: FormState, formData: FormData): Promise<FormState> {
  return runAction(formData, { schema, owner: true }, async ({ key, ...data }, user) => {
    await db.emailTemplate.update({ where: { key }, data });
    await audit({ actor: user.email, userId: user.id, action: "template.update", entity: "EmailTemplate", entityId: key });
  });
}

export async function resetTemplate(_prev: FormState, formData: FormData): Promise<FormState> {
  return runAction(formData, { schema: z.object({ key: z.string().min(1).max(60) }), owner: true }, async ({ key }, user) => {
    const original = DEFAULT_TEMPLATES[key];
    if (!original) return { ok: false, message: "Nieznany szablon." };
    await db.emailTemplate.update({ where: { key }, data: { subject: original.subject, body: original.body } });
    await audit({ actor: user.email, userId: user.id, action: "template.reset", entity: "EmailTemplate", entityId: key });
    return { ok: true, message: "Przywrócono treść domyślną." };
  });
}
