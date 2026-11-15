import { audit } from "./audit";
import { db } from "./db";
import { notifyBooking, notifyPendingDigest } from "./email/notify";
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
    await tx.booking.updateMany({ where: { customerId }, data: { description: null, internalNote: null, cancelReason: null } });
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

/** Klucz w `Inquiry.data` (typ PREMIUM) z adresem odbioru auta; ustawiany w `(public)/actions.ts`. */
export const PICKUP_ADDRESS_KEY = "Adres odbioru";

/**
 * Po ilu dniach od zamknięcia zapytania PREMIUM usuwamy z niego sam adres odbioru (reszta zapytania żyje do `retentionMonths`).
 * DO UZUPEŁNIENIA przez właściciela, domyślnie 30. Liczone od `updatedAt` zamkniętego zapytania.
 */
export const PICKUP_ADDRESS_RETENTION_DAYS = 30;

/** Sprzątanie danych technicznych: wygasłe sesje, tokeny, liczniki limitów, stare zamknięte zapytania. */
export async function cleanup(now: Date = new Date()): Promise<void> {
  const settings = await db.settings.findUniqueOrThrow({ where: { id: 1 } });
  const inquiryCutoff = new Date(now);
  inquiryCutoff.setMonth(inquiryCutoff.getMonth() - settings.retentionMonths);
  await Promise.all([
    db.session.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.passwordResetToken.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.rateLimit.deleteMany({ where: { windowStart: { lt: new Date(now.getTime() - 86_400_000) } } }),
    // Polityka prywatności: zapytania każdego statusu nie dłużej niż retentionMonths od złożenia.
    db.inquiry.deleteMany({
      where: { OR: [{ status: "CLOSED", updatedAt: { lt: inquiryCutoff } }, { createdAt: { lt: inquiryCutoff } }] },
    }),
  ]);
  await stripPickupAddresses(new Date(now.getTime() - PICKUP_ADDRESS_RETENTION_DAYS * 86_400_000));
}

/** Usuwa z zamkniętych zapytań PREMIUM sam adres odbioru (pozostałe pola `data` zostają). */
async function stripPickupAddresses(cutoff: Date): Promise<void> {
  const rows = await db.inquiry.findMany({
    where: { type: "PREMIUM", status: "CLOSED", updatedAt: { lt: cutoff } },
    select: { id: true, data: true },
  });
  for (const { id, data } of rows) {
    if (!data || typeof data !== "object" || Array.isArray(data) || !(PICKUP_ADDRESS_KEY in data)) continue;
    const rest = { ...(data as Record<string, unknown>) };
    delete rest[PICKUP_ADDRESS_KEY];
    // Surowy UPDATE nie przesuwa updatedAt (Prisma ustawiłaby je na "teraz").
    await db.$executeRaw`UPDATE "Inquiry" SET "data" = ${JSON.stringify(rest)}::jsonb WHERE id = ${id}`;
  }
}

/**
 * Zbiorcze przypomnienie dla warsztatu o rezerwacjach PENDING czekających dłużej niż próg z ustawień
 * (D-18 a). Maksymalnie raz na dobę (czasu warszawskiego), nie przed 9:00, bez automatycznego anulowania.
 * Zwraca liczbę rezerwacji w wysłanym mailu (0 = nic nie wysłano).
 */
export async function sendPendingDigest(now: Date = new Date()): Promise<number> {
  if (warsawTime(now) < REMINDERS_FROM) return 0;
  const settings = await db.settings.findUniqueOrThrow({ where: { id: 1 } });
  if (settings.pendingReminderHours <= 0) return 0;

  const stale = await db.booking.findMany({
    where: { status: "PENDING", createdAt: { lte: new Date(now.getTime() - settings.pendingReminderHours * 3_600_000) } },
    include: { vehicle: true, services: true },
    orderBy: { startsAt: "asc" },
    take: 50,
  });
  if (stale.length === 0) return 0;

  // Warunkowe zajęcie dnia: przy równoległych uruchomieniach tylko jedno wyśle mail.
  const today = warsawToUtc(warsawDate(now), "00:00");
  const { count } = await db.settings.updateMany({
    where: { id: 1, OR: [{ pendingDigestSentAt: null }, { pendingDigestSentAt: { lt: today } }] },
    data: { pendingDigestSentAt: now },
  });
  if (count !== 1) return 0;

  await notifyPendingDigest(stale, settings.pendingReminderHours);
  await audit({
    actor: "system",
    action: "booking.pending_digest",
    entity: "Booking",
    details: { count: stale.length, thresholdHours: settings.pendingReminderHours },
  });
  return stale.length;
}
