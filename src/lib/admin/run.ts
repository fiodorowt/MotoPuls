import "server-only";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOwner, requireUser } from "@/lib/auth/session";
import { BookingError, SlotTakenError } from "@/lib/booking";
import { formValues, type FormState } from "@/lib/form-state";
import { fieldErrors } from "@/lib/validation";
import type { User } from "@/generated/prisma/client";

interface RunOptions<S extends z.ZodType> {
  schema: S;
  /** Akcja tylko dla właściciela */
  owner?: boolean;
}

/**
 * Wspólna rama każdej akcji panelu: autoryzacja po stronie serwera, walidacja Zod,
 * bezpieczne komunikaty błędów i odświeżenie widoków panelu.
 */
export async function runAction<S extends z.ZodType>(
  formData: FormData,
  options: RunOptions<S>,
  handler: (data: z.output<S>, user: User) => Promise<FormState | void>,
): Promise<FormState> {
  const user = options.owner ? await requireOwner() : await requireUser();
  const parsed = options.schema.safeParse(formValues(formData));
  if (!parsed.success) {
    return { ok: false, message: "Popraw błędy w formularzu.", errors: fieldErrors(parsed.error) };
  }
  try {
    const result = await handler(parsed.data, user);
    revalidatePath("/admin", "layout");
    return result ?? { ok: true, message: "Zapisano." };
  } catch (error) {
    if (error instanceof BookingError || error instanceof SlotTakenError) return { ok: false, message: error.message };
    throw error;
  }
}

// ---------- Klocki schematów dla pól formularzy (wartości przychodzą jako tekst) ----------

export const f = {
  id: z.string().min(1).max(40),
  str: (min: number, max: number, label: string) =>
    z.string({ error: `${label}: pole wymagane` }).trim().min(min, `${label}: pole wymagane`).max(max, `${label}: najwyżej ${max} znaków`),
  opt: (max: number) =>
    z
      .string()
      .trim()
      .max(max, `Najwyżej ${max} znaków`)
      .optional()
      .transform((v) => v || null),
  int: (min: number, max: number, label: string) =>
    z.coerce.number({ error: `${label}: podaj liczbę` }).int(`${label}: podaj liczbę całkowitą`).min(min, `${label}: co najmniej ${min}`).max(max, `${label}: najwyżej ${max}`),
  optInt: (min: number, max: number, label: string) =>
    z
      .union([z.literal(""), z.coerce.number().int().min(min, `${label}: co najmniej ${min}`).max(max, `${label}: najwyżej ${max}`)])
      .optional()
      .transform((v) => (v === "" || v === undefined ? null : v)),
  checkbox: z
    .string()
    .optional()
    .transform((v) => v === "on" || v === "true"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Podaj datę"),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Podaj godzinę"),
};
