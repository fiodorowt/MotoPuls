import { runCron } from "@/lib/cron";
import { sendReminders } from "@/lib/maintenance";

/** Przypomnienia o jutrzejszych wizytach – uruchamiać raz dziennie (np. 16:00) lub co godzinę. */
export async function POST(request: Request) {
  return runCron(request, async () => ({ sent: await sendReminders() }));
}
