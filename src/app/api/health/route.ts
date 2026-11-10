import { db } from "@/lib/db";

/** Kontrola żywotności dla Dockera / monitoringu. Nie ujawnia żadnych szczegółów. */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ status: "error" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
