import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { randomToken, sha256 } from "@/lib/crypto";
import { isProduction } from "@/lib/env";
import type { Role, User } from "@/generated/prisma/client";

// Prefiks __Host- wymusza Secure, Path=/ i brak Domain; na http://localhost używamy zwykłej nazwy.
const COOKIE = isProduction ? "__Host-mp_session" : "mp_session";
const ABSOLUTE_MS = 24 * 3_600_000;
const IDLE_MS = 8 * 3_600_000;
const TOUCH_MS = 5 * 60_000;

export interface CurrentSession {
  id: string;
  twoFactorPassed: boolean;
  user: User;
}

export async function createSession(userId: string, twoFactorPassed: boolean): Promise<void> {
  const token = randomToken();
  const userAgent = (await headers()).get("user-agent")?.slice(0, 200) ?? null;
  await db.session.create({
    data: {
      tokenHash: sha256(token),
      userId,
      twoFactorPassed,
      userAgent,
      expiresAt: new Date(Date.now() + ABSOLUTE_MS),
    },
  });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: ABSOLUTE_MS / 1000,
  });
}

/** Sesja z bieżącego żądania (także niepełna – przed 2FA). Sprawdzana w bazie przy każdym żądaniu. */
export const getSession = cache(async (): Promise<CurrentSession | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } });
  if (!session) return null;

  const now = Date.now();
  const expired = session.expiresAt.getTime() <= now || now - session.lastSeenAt.getTime() > IDLE_MS;
  if (expired || !session.user.active) {
    await db.session.deleteMany({ where: { id: session.id } });
    return null;
  }
  if (now - session.lastSeenAt.getTime() > TOUCH_MS) {
    await db.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date(now) } });
  }
  return { id: session.id, twoFactorPassed: session.twoFactorPassed, user: session.user };
});

export async function destroyCurrentSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: sha256(token) } });
  store.delete(COOKIE);
}

export async function destroyAllSessions(userId: string): Promise<void> {
  await db.session.deleteMany({ where: { userId } });
}

/**
 * Bramka autoryzacji – wywoływana na początku każdej strony panelu i każdej akcji serwerowej.
 * Wpuszcza tylko po haśle + 2FA + zmianie hasła startowego; opcjonalnie wymaga roli.
 */
export async function requireUser(options: { role?: Role } = {}): Promise<User> {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  const { user } = session;
  if (!session.twoFactorPassed) redirect(user.totpEnabled ? "/admin/login/2fa" : "/admin/2fa-setup");
  if (user.mustChangePassword) redirect("/admin/zmiana-hasla");
  if (options.role && user.role !== options.role) redirect("/admin?brak-uprawnien=1");
  return user;
}

export async function requireOwner(): Promise<User> {
  return requireUser({ role: "OWNER" });
}

/** Sesja po poprawnym haśle, ale przed drugim składnikiem. */
export async function requirePasswordStage(): Promise<CurrentSession> {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}
