import { cache } from "react";
import { db } from "./db";
import type { DayHours } from "./slots";

/** Dane firmy i konfiguracja rezerwacji – jedno źródło prawdy, edytowalne w panelu. */
export const getSettings = cache(async () => db.settings.findUniqueOrThrow({ where: { id: 1 } }));

export const getOpeningHours = cache(async (): Promise<Map<number, DayHours>> => {
  const rows = await db.openingHours.findMany();
  return new Map(rows.map((r) => [r.weekday, { closed: r.closed, open: r.open, close: r.close }]));
});

export const getContent = cache(async (): Promise<Record<string, { title: string; body: string }>> => {
  const rows = await db.contentBlock.findMany();
  return Object.fromEntries(rows.map((r) => [r.key, { title: r.title, body: r.body }]));
});

export type Settings = Awaited<ReturnType<typeof getSettings>>;

export function fullAddress(s: Pick<Settings, "street" | "postalCode" | "city">): string {
  return `${s.street}, ${s.postalCode} ${s.city}`;
}
