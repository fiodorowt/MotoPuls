import { audit } from "./audit";
import { db } from "./db";
import { notifyBooking } from "./email/notify";
import { addDays, warsawDate, warsawTime, warsawToUtc } from "./time";

/** Harmonogram może odpytywać co godzinę – przypomnień nie wysyłamy jednak w nocy. */
const REMINDERS_FROM = "09:00";

/** Przypomnienia dla wizyt przypadających jutro (wg czasu warszawskiego). Bezpieczne przy wielokrotnym uruchomieniu. */
export async function sendReminders(now: Date = new Date()): Promise<number> {
  if (warsawTime(now) < REMINDERS_FROM) return 0;
  const tomorrow = addDays(warsawDate(now), 1);
  const bookings = await db.booking.findMany({
    where: {
      status: { in: ["PENDING", "CONFIRMED"] },
      reminderSentAt: null,
      startsAt: { gte: warsawToUtc(tomorrow, "00:00"), lt: warsawToUtc(addDays(tomorrow, 1), "00:00") },
    },
    select: { id: true },
  });
  let sent = 0;
  for (const { id } of bookings) {
    // Najpierw oznaczamy (warunkowo), potem wysyłamy – równoległe uruchomienie nie wyśle dubla.
    const { count } = await db.booking.updateMany({ where: { id, reminderSentAt: null }, data: { reminderSentAt: now } });
    if (count === 1) {
      await notifyBooking(id, "booking_reminder");
      sent++;
    }
  }
  return sent;
}

export const ANONYMIZED_NAME = "Dane usunięte";

/** Nieodwracalnie usuwa dane osobowe klienta, zachowując statystykę wizyt. */
export async function anonymizeCustomer(customerId: string, actor: { email: string; id?: string }): Promise<void> {
  await db.$transaction(async (tx) => {
    await tx.customer.update({
      where: { id: customerId },
      data: {
        name: ANONYMIZED_NAME,
        phone: "",
        email: "",
        marketingConsent: false,
        marketingConsentAt: null,
        fleetAccountId: null,
        anonymizedAt: new Date(),
      },
    });
    await tx.vehicle.updateMany({ where: { customerId }, data: { plate: "—", vin: null, mileage: null } });
    await tx.booking.updateMany({ where: { customerId }, data: { description: null, internalNote: null } });
    await tx.note.deleteMany({ where: { customerId } });
    // Aktywne wizyty tracą sens bez danych kontaktowych – zwalniamy ich terminy.
    const active = await tx.booking.findMany({
      where: { customerId, status: { in: ["PENDING", "CONFIRMED"] } },
      select: { id: true },
    });
    const ids = active.map((b) => b.id);
    await tx.bookingSlot.deleteMany({ where: { bookingId: { in: ids } } });
    await tx.booking.updateMany({ where: { id: { in: ids } }, data: { status: "CANCELLED", cancelledAt: new Date() } });
  });
  await audit({
    actor: actor.email,
    userId: actor.id,
    action: "customer.anonymize",
    entity: "Customer",
    entityId: customerId,
  });
}

/** Automatyczna anonimizacja klientów bez aktywności dłużej niż skonfigurowany okres. */
export async function anonymizeInactiveCustomers(now: Date = new Date()): Promise<number> {
  const settings = await db.settings.findUniqueOrThrow({ where: { id: 1 } });
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - settings.retentionMonths);
  const candidates = await db.customer.findMany({
    where: {
      anonymizedAt: null,
      createdAt: { lt: cutoff },
      bookings: { none: { endsAt: { gte: cutoff } } },
    },
    select: { id: true },
    take: 500,
  });
  for (const { id } of candidates) await anonymizeCustomer(id, { email: "system" });
  return candidates.length;
}

/** Sprzątanie danych technicznych: wygasłe sesje, tokeny, liczniki limitów, stare zamknięte zapytania. */
export async function cleanup(now: Date = new Date()): Promise<void> {
  const settings = await db.settings.findUniqueOrThrow({ where: { id: 1 } });
  const inquiryCutoff = new Date(now);
  inquiryCutoff.setMonth(inquiryCutoff.getMonth() - settings.retentionMonths);
  await Promise.all([
    db.session.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.passwordResetToken.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.rateLimit.deleteMany({ where: { windowStart: { lt: new Date(now.getTime() - 86_400_000) } } }),
    db.inquiry.deleteMany({ where: { status: "CLOSED", updatedAt: { lt: inquiryCutoff } } }),
  ]);
}
