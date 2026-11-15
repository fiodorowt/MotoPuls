import { db } from "./db";

/** Najnowsza z dat wskazanych działań; brak wpisów = undefined (daty nie zgadujemy). */
export function latestOf(maxByAction: Map<string, Date>, actions: string[]): Date | undefined {
  const dates = actions.flatMap((a) => maxByAction.get(a) ?? []);
  return dates.length > 0 ? new Date(Math.max(...dates.map((d) => d.getTime()))) : undefined;
}

/** Daty ostatnich edycji treści w panelu (dziennik zmian), po jednym zapytaniu. */
export async function lastEditsByAction(actions: string[]): Promise<Map<string, Date>> {
  const rows = await db.auditLog.groupBy({ by: ["action"], where: { action: { in: actions } }, _max: { createdAt: true } });
  return new Map(rows.flatMap((r) => (r._max.createdAt ? [[r.action, r._max.createdAt] as const] : [])));
}
