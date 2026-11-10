import "server-only";
import { timingSafeEqual } from "node:crypto";
import { sha256 } from "./crypto";
import { env } from "./env";

/** Zadania cykliczne wywołuje zewnętrzny harmonogram z nagłówkiem `Authorization: Bearer <CRON_SECRET>`. */
export function isCronAuthorized(request: Request): boolean {
  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return false;
  // Porównujemy skróty o stałej długości, w stałym czasie.
  const given = Buffer.from(sha256(header.slice(7)));
  const expected = Buffer.from(sha256(env().CRON_SECRET));
  return timingSafeEqual(given, expected);
}

export async function runCron(request: Request, job: () => Promise<Record<string, unknown>>): Promise<Response> {
  if (!isCronAuthorized(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
  try {
    return Response.json({ ok: true, ...(await job()) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[cron]", error instanceof Error ? error.message : "nieznany błąd");
    return Response.json({ ok: false }, { status: 500 });
  }
}
