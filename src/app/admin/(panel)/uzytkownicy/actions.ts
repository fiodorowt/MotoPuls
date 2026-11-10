"use server";

import { z } from "zod";
import { audit } from "@/lib/audit";
import { f, runAction } from "@/lib/admin/run";
import { generatePassword, hashPassword } from "@/lib/auth/password";
import { destroyAllSessions } from "@/lib/auth/session";
import { db, isUniqueViolation } from "@/lib/db";
import type { FormState } from "@/lib/form-state";
import { emailSchema } from "@/lib/validation";

const roleSchema = z.enum(["OWNER", "EMPLOYEE"]);

/** Hasło startowe pokazujemy tylko raz, w odpowiedzi na tę akcję – w bazie jest wyłącznie jego skrót. */
function oneTimePasswordMessage(intro: string, password: string): string {
  return `${intro} Hasło jednorazowe: ${password} — przekaż je bezpiecznym kanałem; nie zostanie pokazane ponownie. Przy pierwszym logowaniu system wymusi zmianę hasła.`;
}

export async function createUser(_prev: FormState, formData: FormData): Promise<FormState> {
  const schema = z.object({ name: f.str(2, 80, "Imię i nazwisko"), email: emailSchema, role: roleSchema });
  return runAction(formData, { schema, owner: true }, async (data, user) => {
    const password = generatePassword();
    try {
      const created = await db.user.create({ data: { ...data, passwordHash: await hashPassword(password), mustChangePassword: true } });
      await audit({ actor: user.email, userId: user.id, action: "user.create", entity: "User", entityId: created.id, details: { role: data.role } });
    } catch (error) {
      if (isUniqueViolation(error)) return { ok: false, message: "Konto z tym adresem e-mail już istnieje." };
      throw error;
    }
    return { ok: true, message: oneTimePasswordMessage("Konto utworzone.", password) };
  });
}

/** Zawsze musi pozostać co najmniej jeden aktywny właściciel – inaczej panel straciłby administratora. */
async function isLastActiveOwner(userId: string): Promise<boolean> {
  const others = await db.user.count({ where: { role: "OWNER", active: true, id: { not: userId } } });
  return others === 0;
}

export async function updateUser(_prev: FormState, formData: FormData): Promise<FormState> {
  const schema = z.object({ id: f.id, name: f.str(2, 80, "Imię i nazwisko"), role: roleSchema, active: f.checkbox });
  return runAction(formData, { schema, owner: true }, async ({ id, ...data }, user) => {
    const target = await db.user.findUnique({ where: { id } });
    if (!target) return { ok: false, message: "Nie znaleziono konta." };
    const losesOwner = target.role === "OWNER" && target.active && (data.role !== "OWNER" || !data.active);
    if (losesOwner && id === user.id) return { ok: false, message: "Nie możesz odebrać uprawnień ani wyłączyć własnego konta." };
    if (losesOwner && (await isLastActiveOwner(id))) return { ok: false, message: "To ostatni aktywny właściciel – nie można go wyłączyć ani zmienić mu roli." };

    await db.user.update({ where: { id }, data });
    // Zmiana roli lub wyłączenie konta działa natychmiast – kończymy wszystkie sesje tej osoby.
    if (data.role !== target.role || !data.active) await destroyAllSessions(id);
    await audit({ actor: user.email, userId: user.id, action: "user.update", entity: "User", entityId: id, details: { role: data.role, active: data.active } });
  });
}

export async function resetUserPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  return runAction(formData, { schema: z.object({ id: f.id }), owner: true }, async ({ id }, user) => {
    if (id === user.id) return { ok: false, message: "Własne hasło zmienisz w zakładce „Moje konto”." };
    const password = generatePassword();
    await db.user.update({
      where: { id },
      data: { passwordHash: await hashPassword(password), mustChangePassword: true, failedAttempts: 0, lockedUntil: null },
    });
    await destroyAllSessions(id);
    await audit({ actor: user.email, userId: user.id, action: "user.password_reset", entity: "User", entityId: id });
    return { ok: true, message: oneTimePasswordMessage("Hasło zresetowane.", password) };
  });
}

/** Gdy pracownik straci telefon: przy następnym logowaniu skonfiguruje 2FA od nowa. */
export async function resetUserTwoFactor(_prev: FormState, formData: FormData): Promise<FormState> {
  return runAction(formData, { schema: z.object({ id: f.id }), owner: true }, async ({ id }, user) => {
    if (id === user.id) return { ok: false, message: "Nie możesz zresetować 2FA na własnym koncie – poproś innego właściciela." };
    await db.user.update({ where: { id }, data: { totpEnabled: false, totpSecretEnc: null, totpLastStep: null } });
    await destroyAllSessions(id);
    await audit({ actor: user.email, userId: user.id, action: "user.2fa_reset", entity: "User", entityId: id });
    return { ok: true, message: "2FA zresetowane. Użytkownik skonfiguruje je ponownie przy logowaniu." };
  });
}
