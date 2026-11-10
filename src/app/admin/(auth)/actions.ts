"use server";

import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { PASSWORD_MAX, hashPassword, passwordPolicyError, verifyPassword } from "@/lib/auth/password";
import { createSession, destroyAllSessions, destroyCurrentSession, getSession, requirePasswordStage } from "@/lib/auth/session";
import { verifyTotp } from "@/lib/auth/totp";
import { decrypt, encrypt, randomToken, sha256 } from "@/lib/crypto";
import { db } from "@/lib/db";
import { sendPasswordReset } from "@/lib/email/notify";
import { env } from "@/lib/env";
import type { FormState } from "@/lib/form-state";
import { rateLimit, rateLimitByIp } from "@/lib/rate-limit";

const MAX_FAILURES = 5;
const LOCK_MS = 15 * 60_000;
const RESET_TTL_MS = 60 * 60_000;
const BAD_LOGIN = "Nieprawidłowy e-mail lub hasło. Po 5 nieudanych próbach konto jest blokowane na 15 minut.";
const TOO_MANY = "Zbyt wiele prób. Odczekaj kilka minut.";

let dummyHash: Promise<string> | undefined;

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await rateLimitByIp("login", 10, 900))) return { ok: false, message: TOO_MANY };
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password || email.length > 254 || password.length > PASSWORD_MAX) return { ok: false, message: BAD_LOGIN };

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.active) {
    // Ten sam koszt obliczeń co dla istniejącego konta – czas odpowiedzi nie zdradza, czy konto istnieje.
    dummyHash ??= hashPassword(randomToken());
    await verifyPassword(await dummyHash, password);
    return { ok: false, message: BAD_LOGIN };
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) return { ok: false, message: BAD_LOGIN };

  if (!(await verifyPassword(user.passwordHash, password))) {
    const { failedAttempts } = await db.user.update({
      where: { id: user.id },
      data: { failedAttempts: { increment: 1 } },
      select: { failedAttempts: true },
    });
    if (failedAttempts >= MAX_FAILURES) {
      await db.user.update({ where: { id: user.id }, data: { failedAttempts: 0, lockedUntil: new Date(Date.now() + LOCK_MS) } });
      await audit({ actor: user.email, userId: user.id, action: "auth.lockout", entity: "User", entityId: user.id });
    }
    return { ok: false, message: BAD_LOGIN };
  }

  await db.user.update({ where: { id: user.id }, data: { failedAttempts: 0, lockedUntil: null } });
  await createSession(user.id, false);
  redirect(user.totpEnabled ? "/admin/login/2fa" : "/admin/2fa-setup");
}

/** Po poprawnym kodzie wymieniamy sesję na nową (ochrona przed fiksacją sesji). */
async function completeTwoFactor(userId: string, email: string): Promise<never> {
  await destroyCurrentSession();
  await createSession(userId, true);
  await audit({ actor: email, userId, action: "auth.login", entity: "User", entityId: userId });
  redirect("/admin");
}

async function totpAttemptAllowed(userId: string): Promise<boolean> {
  if (await rateLimit(`totp:${userId}`, 5, 300)) return true;
  await destroyCurrentSession();
  return false;
}

export async function verifyTwoFactor(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user } = await requirePasswordStage();
  if (!user.totpEnabled || !user.totpSecretEnc) redirect("/admin/2fa-setup");
  if (!(await totpAttemptAllowed(user.id))) redirect("/admin/login");

  const code = String(formData.get("code") ?? "").replace(/\s/g, "");
  const step = verifyTotp(decrypt(user.totpSecretEnc, "totp"), user.email, code, user.totpLastStep);
  if (step === null) return { ok: false, message: "Nieprawidłowy kod. Sprawdź aplikację i spróbuj ponownie." };

  // Warunkowy zapis kroku: ten sam kod nie przejdzie dwa razy, także przy równoległych żądaniach.
  const { count } = await db.user.updateMany({
    where: { id: user.id, OR: [{ totpLastStep: null }, { totpLastStep: { lt: step } }] },
    data: { totpLastStep: step },
  });
  if (count !== 1) return { ok: false, message: "Ten kod został już użyty. Poczekaj na następny." };
  return completeTwoFactor(user.id, user.email);
}

export async function enableTwoFactor(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user } = await requirePasswordStage();
  if (user.totpEnabled) redirect("/admin/login/2fa");
  if (!(await totpAttemptAllowed(user.id))) redirect("/admin/login");

  let secret: string;
  try {
    // Sekret wraca z formularza zaszyfrowany i związany z kontem – nie da się go podmienić.
    const [owner, value] = decrypt(String(formData.get("setup") ?? ""), "totp-setup").split(":");
    if (owner !== user.id || !value) throw new Error("mismatch");
    secret = value;
  } catch {
    return { ok: false, message: "Sesja konfiguracji wygasła. Odśwież stronę i zeskanuj kod ponownie." };
  }
  const code = String(formData.get("code") ?? "").replace(/\s/g, "");
  const step = verifyTotp(secret, user.email, code, null);
  if (step === null) return { ok: false, message: "Nieprawidłowy kod. Sprawdź godzinę w telefonie i spróbuj ponownie." };

  await db.user.update({
    where: { id: user.id },
    data: { totpSecretEnc: encrypt(secret, "totp"), totpEnabled: true, totpLastStep: step },
  });
  await audit({ actor: user.email, userId: user.id, action: "auth.2fa_enabled", entity: "User", entityId: user.id });
  return completeTwoFactor(user.id, user.email);
}

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session?.twoFactorPassed) redirect("/admin/login");
  const { user } = session;
  if (!(await rateLimit(`pwd:${user.id}`, 10, 900))) return { ok: false, message: TOO_MANY };

  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("password") ?? "");
  const repeat = String(formData.get("repeat") ?? "");
  if (!(await verifyPassword(user.passwordHash, current))) return { ok: false, message: "Obecne hasło jest nieprawidłowe." };
  if (next !== repeat) return { ok: false, message: "Hasła nie są takie same." };
  if (next === current) return { ok: false, message: "Nowe hasło musi różnić się od obecnego." };
  const policy = passwordPolicyError(next, user.email);
  if (policy) return { ok: false, message: policy };

  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next), mustChangePassword: false } });
  // Zmiana hasła unieważnia wszystkie pozostałe sesje.
  await db.session.deleteMany({ where: { userId: user.id, id: { not: session.id } } });
  await audit({ actor: user.email, userId: user.id, action: "auth.password_changed", entity: "User", entityId: user.id });
  redirect("/admin?haslo=1");
}

export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  // Zawsze ta sama odpowiedź – formularz nie zdradza, czy konto istnieje.
  const done: FormState = { ok: true, message: "Jeśli konto istnieje, wysłaliśmy na ten adres link do ustawienia nowego hasła (ważny 60 minut)." };
  if (!(await rateLimitByIp("pwd-reset", 5, 3600))) return { ok: false, message: TOO_MANY };
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email || email.length > 254) return done;
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.active) return done;
  if (!(await rateLimit(`pwd-reset:${user.id}`, 3, 3600))) return done;

  const token = randomToken();
  await db.passwordResetToken.create({
    data: { tokenHash: sha256(token), userId: user.id, expiresAt: new Date(Date.now() + RESET_TTL_MS) },
  });
  await sendPasswordReset(user.email, `${env().APP_URL}/admin/reset-hasla/${token}`);
  await audit({ actor: user.email, userId: user.id, action: "auth.reset_requested", entity: "User", entityId: user.id });
  return done;
}

export async function resetPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await rateLimitByIp("pwd-reset-use", 10, 900))) return { ok: false, message: TOO_MANY };
  const token = String(formData.get("token") ?? "");
  const next = String(formData.get("password") ?? "");
  const repeat = String(formData.get("repeat") ?? "");
  const record = await db.passwordResetToken.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } });
  if (!record || record.usedAt || record.expiresAt < new Date() || !record.user.active) {
    return { ok: false, message: "Link jest nieprawidłowy albo wygasł. Poproś o nowy." };
  }
  if (next !== repeat) return { ok: false, message: "Hasła nie są takie same." };
  const policy = passwordPolicyError(next, record.user.email);
  if (policy) return { ok: false, message: policy };

  // Token jest jednorazowy: warunek usedAt = null rozstrzyga równoległe użycie.
  const { count } = await db.passwordResetToken.updateMany({ where: { id: record.id, usedAt: null }, data: { usedAt: new Date() } });
  if (count !== 1) return { ok: false, message: "Link został już wykorzystany." };
  await db.user.update({
    where: { id: record.userId },
    data: { passwordHash: await hashPassword(next), mustChangePassword: false, failedAttempts: 0, lockedUntil: null },
  });
  await destroyAllSessions(record.userId);
  await audit({ actor: record.user.email, userId: record.userId, action: "auth.password_reset", entity: "User", entityId: record.userId });
  redirect("/admin/login?reset=1");
}

export async function logout(): Promise<void> {
  const session = await getSession();
  await destroyCurrentSession();
  if (session) await audit({ actor: session.user.email, userId: session.user.id, action: "auth.logout", entity: "User", entityId: session.user.id });
  redirect("/admin/login");
}

export async function logoutEverywhere(): Promise<void> {
  const session = await getSession();
  if (session) {
    await destroyAllSessions(session.user.id);
    await audit({ actor: session.user.email, userId: session.user.id, action: "auth.logout_all", entity: "User", entityId: session.user.id });
  }
  await destroyCurrentSession();
  redirect("/admin/login");
}
