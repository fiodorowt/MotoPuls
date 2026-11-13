import type { CreateBookingInput } from "@/lib/booking";
import { db } from "@/lib/db";
import { outbox } from "./mail";
import { holidayName } from "@/lib/holidays";
import { addDays, isoWeekday, warsawDate, warsawToUtc } from "@/lib/time";

/** Czyści dane transakcyjne i przywraca ustawienia z seeda; usługi, godziny i szablony zostają. */
export async function resetData(): Promise<void> {
  outbox.length = 0;
  await db.$executeRawUnsafe(
    'TRUNCATE TABLE "BookingSlot", "BookingService", "Booking", "Block", "ClosedDay", "Vehicle", "Customer", "AuditLog", "RateLimit" RESTART IDENTITY CASCADE',
  );
  await db.settings.update({
    where: { id: 1 },
    data: { bays: 2, autoConfirm: false, cancelHoursBefore: 24, minLeadHours: 12, maxDaysAhead: 60 },
  });
}

/** Najbliższy dzień roboczy (wg OpeningHours, bez świąt) o podanym dniu tygodnia, co najmniej `minDaysAhead` dni od dziś. */
export async function futureWorkday(weekday: number, minDaysAhead = 10): Promise<string> {
  const hours = await db.openingHours.findUniqueOrThrow({ where: { weekday } });
  let date = addDays(warsawDate(new Date()), minDaysAhead);
  for (let i = 0; i < 400; i++) {
    if (isoWeekday(date) === weekday && !holidayName(date) && !hours.closed) return date;
    date = addDays(date, 1);
  }
  throw new Error("Brak dnia roboczego");
}

export async function shortService() {
  const services = await db.service.findMany({ where: { active: true, requiresRefrigerant: false }, orderBy: { durationMin: "asc" } });
  const service = services.find((s) => s.durationMin >= 30 && s.durationMin <= 60) ?? services[0];
  if (!service) throw new Error("Seed nie zawiera usług");
  return service;
}

let counter = 0;

export async function bookingInput(
  start: Date,
  overrides: Partial<CreateBookingInput> = {},
): Promise<CreateBookingInput> {
  const n = ++counter;
  const service = await shortService();
  return {
    serviceIds: [service.id],
    start,
    vehicle: { make: "Test", model: "Auto", plate: `TS ${String(n).padStart(5, "0")}`, type: "CAR" },
    customer: { name: `Klient ${n}`, phone: `600000${String(n).padStart(3, "0")}`, email: `klient${n}@motopuls.test` },
    source: "ONLINE",
    ...overrides,
  };
}

export function at(date: string, time: string): Date {
  return warsawToUtc(date, time);
}

export async function slotCount(): Promise<number> {
  return db.bookingSlot.count();
}
