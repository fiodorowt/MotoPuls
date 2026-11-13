import { runCron } from "@/lib/cron";
import { sendPendingDigest, sendReminders } from "@/lib/maintenance";

/**
 * Przypomnienia o jutrzejszych wizytach (klienci) oraz zbiorcze przypomnienie dla warsztatu
 * o nieobsłużonych rezerwacjach PENDING. Uruchamiać raz dziennie (np. 16:00) lub co godzinę;
 * oba zadania są idempotentne (reminderSentAt, pendingDigestSentAt).
 */
export async function POST(request: Request) {
  return runCron(request, async () => ({ sent: await sendReminders(), pendingDigest: await sendPendingDigest() }));
}
