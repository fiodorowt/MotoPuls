import "server-only";
import { headers } from "next/headers";
import { db } from "./db";
import { sha256 } from "./crypto";

/**
 * Licznik w bazie (działa także przy kilku instancjach aplikacji).
 * Zwraca false, gdy limit w bieżącym oknie został przekroczony.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const windowMs = windowSeconds * 1000;
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);
  const row = await db.rateLimit.upsert({
    where: { key_windowStart: { key, windowStart } },
    create: { key, windowStart, count: 1 },
    update: { count: { increment: 1 } },
  });
  return row.count <= limit;
}

/**
 * Adres klienta z nagłówka ustawianego przez reverse proxy.
 * Aplikacja musi stać za proxy, które NADPISUJE X-Forwarded-For (patrz README).
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/** Limit per adres IP; adres trafia do bazy wyłącznie jako skrót. */
export async function rateLimitByIp(purpose: string, limit: number, windowSeconds: number): Promise<boolean> {
  return rateLimit(`${purpose}:${sha256(await clientIp()).slice(0, 32)}`, limit, windowSeconds);
}
