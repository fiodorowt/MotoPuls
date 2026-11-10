import { runCron } from "@/lib/cron";
import { anonymizeInactiveCustomers, cleanup } from "@/lib/maintenance";

/** Retencja danych (RODO) i sprzątanie danych technicznych – uruchamiać raz na dobę. */
export async function POST(request: Request) {
  return runCron(request, async () => {
    const anonymized = await anonymizeInactiveCustomers();
    await cleanup();
    return { anonymized };
  });
}
