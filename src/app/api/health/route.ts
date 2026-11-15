import { db } from "@/lib/db";
import { mailStatus } from "@/lib/email/status";

/** Kontrola żywotności dla Dockera / monitoringu. Nie ujawnia szczegółów; `mail` to tylko flaga ok/outbox/disabled. */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok", mail: mailStatus() }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ status: "error" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
