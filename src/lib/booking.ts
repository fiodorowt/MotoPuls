import { audit } from "./audit";
import { randomToken } from "./crypto";
import { db, isUniqueViolation } from "./db";
import { notifyBooking, type BookingMailKind } from "./email/notify";
import { canTransition, type BookingStatus, type Refrigerant, type VehicleType } from "./labels";
import {
  SLOT_MIN,
  availableStarts,
  freeBays,
  roundUpToSlot,
  slotKey,
  slotStartsFor,
  whyClosed,
  type DayHours,
} from "./slots";
import { addDays, isoWeekday, warsawDate, warsawToUtc } from "./time";

/** Termin został w międzyczasie zajęty (także przez równoległe żądanie). */
export class SlotTakenError extends Error {
  constructor() {
    super("Wybrany termin został właśnie zajęty. Wybierz inny.");
  }
}

/** Błąd, którego treść można bezpiecznie pokazać użytkownikowi. */
export class BookingError extends Error {}

async function scheduleConfig() {
  const [settings, hours] = await Promise.all([
    db.settings.findUniqueOrThrow({ where: { id: 1 } }),
    db.openingHours.findMany(),
  ]);
  const hoursByDay = new Map<number, DayHours>(hours.map((h) => [h.weekday, h]));
  return { settings, hoursByDay };
}

async function loadOccupied(from: Date, to: Date): Promise<Set<string>> {
  const rows = await db.bookingSlot.findMany({
    where: { slotStart: { gte: from, lt: to } },
    select: { bay: true, slotStart: true },
  });
  return new Set(rows.map((r) => slotKey(r.bay, r.slotStart)));
}

export interface DayAvailability {
  date: string;
  closedReason: string | null;
  times: { iso: string; time: string }[];
}

/** Dostępność dla kolejnych dni – jedno zapytanie o zajęte odcinki dla całego zakresu. */
export async function getAvailability(fromDate: string, days: number, durationMin: number): Promise<DayAvailability[]> {
  const { settings, hoursByDay } = await scheduleConfig();
  const toDate = addDays(fromDate, days);
  const [occupied, closedRows] = await Promise.all([
    loadOccupied(warsawToUtc(fromDate, "00:00"), warsawToUtc(toDate, "00:00")),
    db.closedDay.findMany({ where: { date: { gte: new Date(`${fromDate}T00:00:00Z`), lt: new Date(`${toDate}T00:00:00Z`) } } }),
  ]);
  const closedDates = new Set(closedRows.map((c) => c.date.toISOString().slice(0, 10)));
  const now = new Date();

  return Array.from({ length: days }, (_, i) => {
    const date = addDays(fromDate, i);
    const hours = hoursByDay.get(isoWeekday(date));
    const starts = availableStarts({
      date,
      hours,
      closedDates,
      bays: settings.bays,
      occupied,
      durationMin,
      now,
      minLeadHours: settings.minLeadHours,
      maxDaysAhead: settings.maxDaysAhead,
    });
    return {
      date,
      closedReason: whyClosed(date, hours, closedDates),
      times: starts.map((s) => ({ iso: s.start.toISOString(), time: s.time })),
    };
  });
}

export async function resolveServices(serviceIds: string[]) {
  const unique = [...new Set(serviceIds)];
  const services = await db.service.findMany({ where: { id: { in: unique }, active: true } });
  if (services.length !== unique.length) throw new BookingError("Wybrana usługa nie jest już dostępna. Odśwież stronę.");
  const durationMin = roundUpToSlot(services.reduce((sum, s) => sum + s.durationMin, 0));
  return { services, durationMin };
}

export interface CreateBookingInput {
  serviceIds: string[];
  refrigerant?: Refrigerant;
  start: Date;
  vehicle: {
    make: string;
    model: string;
    year?: number;
    plate: string;
    vin?: string;
    mileage?: number;
    type: VehicleType;
    description?: string;
  };
  customer: { name: string; phone: string; email: string; marketing?: boolean };
  source: "ONLINE" | "ADMIN";
  /** E-mail pracownika przy rezerwacji z panelu */
  actor?: { email: string; id: string };
}

/**
 * Tworzy rezerwację. Brak podwójnych rezerwacji gwarantuje unikalny indeks
 * BookingSlot(bay, slotStart): wszystkie odcinki wizyty zapisujemy w jednej transakcji,
 * więc przy wyścigu dokładnie jedno żądanie wygrywa, a przegrane próbuje kolejnego stanowiska.
 */
export async function createBooking(input: CreateBookingInput) {
  const { settings, hoursByDay } = await scheduleConfig();
  const { services, durationMin } = await resolveServices(input.serviceIds);
  const start = input.start;
  if (start.getTime() % (SLOT_MIN * 60_000) !== 0) throw new BookingError("Nieprawidłowy termin.");
  const end = new Date(start.getTime() + durationMin * 60_000);
  const date = warsawDate(start);

  const dayStart = warsawToUtc(date, "00:00");
  const dayEnd = warsawToUtc(addDays(date, 1), "00:00");
  const occupied = await loadOccupied(dayStart, new Date(Math.max(dayEnd.getTime(), end.getTime())));

  if (input.source === "ONLINE") {
    // Klient może wybrać wyłącznie termin, który wyliczyłby mu serwer.
    const closedRows = await db.closedDay.findMany({ where: { date: new Date(`${date}T00:00:00Z`) } });
    const allowed = availableStarts({
      date,
      hours: hoursByDay.get(isoWeekday(date)),
      closedDates: new Set(closedRows.map((c) => c.date.toISOString().slice(0, 10))),
      bays: settings.bays,
      occupied,
      durationMin,
      now: new Date(),
      minLeadHours: settings.minLeadHours,
      maxDaysAhead: settings.maxDaysAhead,
    });
    if (!allowed.some((s) => s.start.getTime() === start.getTime())) throw new SlotTakenError();
  }

  const needsRefrigerant = services.some((s) => s.requiresRefrigerant);
  const status: BookingStatus = input.source === "ADMIN" || settings.autoConfirm ? "CONFIRMED" : "PENDING";
  const slots = slotStartsFor(start, durationMin);
  const email = input.customer.email.toLowerCase();

  for (const bay of freeBays(start, durationMin, settings.bays, occupied)) {
    try {
      const booking = await db.$transaction(async (tx) => {
        const existing = await tx.customer.findFirst({
          where: { phone: input.customer.phone, email, anonymizedAt: null },
        });
        const customer = existing
          ? await tx.customer.update({
              where: { id: existing.id },
              data: input.customer.marketing
                ? { marketingConsent: true, marketingConsentAt: existing.marketingConsentAt ?? new Date() }
                : {},
            })
          : await tx.customer.create({
              data: {
                name: input.customer.name,
                phone: input.customer.phone,
                email,
                marketingConsent: input.customer.marketing ?? false,
                marketingConsentAt: input.customer.marketing ? new Date() : null,
              },
            });

        const known = await tx.vehicle.findFirst({ where: { customerId: customer.id, plate: input.vehicle.plate } });
        const vehicleData = {
          make: input.vehicle.make,
          model: input.vehicle.model,
          year: input.vehicle.year ?? null,
          vin: input.vehicle.vin ?? null,
          mileage: input.vehicle.mileage ?? null,
          type: input.vehicle.type,
        };
        const vehicle = known
          ? await tx.vehicle.update({ where: { id: known.id }, data: vehicleData })
          : await tx.vehicle.create({ data: { ...vehicleData, plate: input.vehicle.plate, customerId: customer.id } });

        const created = await tx.booking.create({
          data: {
            token: randomToken(),
            status,
            source: input.source,
            startsAt: start,
            endsAt: end,
            bay,
            customerId: customer.id,
            vehicleId: vehicle.id,
            description: input.vehicle.description ?? null,
            refrigerant: needsRefrigerant ? (input.refrigerant ?? "UNKNOWN") : null,
            termsAcceptedAt: input.source === "ONLINE" ? new Date() : null,
            services: {
              create: services.map((s) => ({
                serviceId: s.id,
                name: s.name,
                durationMin: s.durationMin,
                priceFrom: s.priceFrom,
                priceTo: s.priceTo,
              })),
            },
          },
        });
        // Naruszenie unikalności (bay, slotStart) wycofuje całą transakcję.
        await tx.bookingSlot.createMany({ data: slots.map((slotStart) => ({ bay, slotStart, bookingId: created.id })) });
        return created;
      });

      await audit({
        actor: input.actor?.email ?? "klient",
        userId: input.actor?.id,
        action: "booking.create",
        entity: "Booking",
        entityId: booking.id,
        details: { source: input.source, status, start: start.toISOString(), bay },
      });
      await notifyBooking(booking.id, status === "CONFIRMED" ? "booking_confirmed" : "booking_received", input.source === "ONLINE");
      return booking;
    } catch (error) {
      if (isUniqueViolation(error)) continue; // ktoś był szybszy na tym stanowisku
      throw error;
    }
  }
  throw new SlotTakenError();
}

const STATUS_MAIL: Partial<Record<BookingStatus, BookingMailKind>> = {
  CONFIRMED: "booking_confirmed",
  IN_PROGRESS: "booking_status",
  COMPLETED: "booking_status",
  CANCELLED: "booking_cancelled",
};

export async function changeBookingStatus(
  bookingId: string,
  to: BookingStatus,
  actor: { email: string; id?: string },
): Promise<void> {
  await db.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new BookingError("Nie znaleziono rezerwacji.");
    if (!canTransition(booking.status, to)) throw new BookingError("Taka zmiana statusu nie jest możliwa.");
    // Warunek na poprzedni status chroni przed dwiema równoległymi zmianami.
    const { count } = await tx.booking.updateMany({
      where: { id: bookingId, status: booking.status },
      data: { status: to, cancelledAt: to === "CANCELLED" ? new Date() : undefined },
    });
    if (count !== 1) throw new BookingError("Status został zmieniony w międzyczasie. Odśwież stronę.");
    // Anulowanie i nieobecność zwalniają termin.
    if (to === "CANCELLED" || to === "NO_SHOW") await tx.bookingSlot.deleteMany({ where: { bookingId } });
  });
  await audit({
    actor: actor.email,
    userId: actor.id,
    action: "booking.status",
    entity: "Booking",
    entityId: bookingId,
    details: { to },
  });
  const mail = STATUS_MAIL[to];
  if (mail) await notifyBooking(bookingId, mail);
}

export function canCustomerCancel(
  booking: { status: BookingStatus; startsAt: Date },
  cancelHoursBefore: number,
  now: Date = new Date(),
): boolean {
  if (booking.status !== "PENDING" && booking.status !== "CONFIRMED") return false;
  return booking.startsAt.getTime() - now.getTime() >= cancelHoursBefore * 3_600_000;
}

export async function cancelByCustomer(token: string): Promise<void> {
  const booking = await db.booking.findUnique({ where: { token } });
  const settings = await db.settings.findUniqueOrThrow({ where: { id: 1 } });
  if (!booking) throw new BookingError("Nie znaleziono rezerwacji.");
  if (!canCustomerCancel(booking, settings.cancelHoursBefore)) {
    throw new BookingError("Tej rezerwacji nie można już anulować online. Zadzwoń do warsztatu.");
  }
  await changeBookingStatus(booking.id, "CANCELLED", { email: "klient" });
}

/** Przeniesienie wizyty (przeciąganie w kalendarzu). Stare odcinki zwalniamy i nowe zajmujemy w jednej transakcji. */
export async function moveBooking(
  bookingId: string,
  newStart: Date,
  actor: { email: string; id: string },
  preferredBay?: number,
): Promise<void> {
  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw new BookingError("Nie znaleziono rezerwacji.");
  if (booking.status !== "PENDING" && booking.status !== "CONFIRMED") {
    throw new BookingError("Można przenosić tylko wizyty oczekujące i potwierdzone.");
  }
  if (newStart.getTime() % (SLOT_MIN * 60_000) !== 0) throw new BookingError("Nieprawidłowy termin.");
  const settings = await db.settings.findUniqueOrThrow({ where: { id: 1 } });
  const durationMin = Math.round((booking.endsAt.getTime() - booking.startsAt.getTime()) / 60_000);
  const newEnd = new Date(newStart.getTime() + durationMin * 60_000);
  const slots = slotStartsFor(newStart, durationMin);

  const allBays = Array.from({ length: settings.bays }, (_, i) => i + 1);
  const first = preferredBay && allBays.includes(preferredBay) ? preferredBay : booking.bay;
  const order = [first, ...allBays.filter((b) => b !== first)];

  for (const bay of order) {
    try {
      await db.$transaction(async (tx) => {
        await tx.bookingSlot.deleteMany({ where: { bookingId } });
        await tx.bookingSlot.createMany({ data: slots.map((slotStart) => ({ bay, slotStart, bookingId })) });
        await tx.booking.update({
          where: { id: bookingId },
          data: { startsAt: newStart, endsAt: newEnd, bay, reminderSentAt: null },
        });
      });
      await audit({
        actor: actor.email,
        userId: actor.id,
        action: "booking.move",
        entity: "Booking",
        entityId: bookingId,
        details: { from: booking.startsAt.toISOString(), to: newStart.toISOString(), bay },
      });
      await notifyBooking(bookingId, booking.status === "CONFIRMED" ? "booking_confirmed" : "booking_received");
      return;
    } catch (error) {
      if (isUniqueViolation(error)) continue;
      throw error;
    }
  }
  throw new SlotTakenError();
}

/** Blokada terminu (urlop, awaria). Zajmuje te same odcinki co wizyty, więc koliduje z nimi na poziomie bazy. */
export async function createBlock(
  input: { start: Date; end: Date; bay: number | null; reason: string },
  actor: { email: string; id: string },
): Promise<void> {
  const step = SLOT_MIN * 60_000;
  const start = new Date(Math.floor(input.start.getTime() / step) * step);
  const end = new Date(Math.ceil(input.end.getTime() / step) * step);
  if (end <= start) throw new BookingError("Koniec blokady musi być późniejszy niż początek.");
  if (end.getTime() - start.getTime() > 62 * 86_400_000) throw new BookingError("Blokada może trwać najwyżej 2 miesiące.");
  const settings = await db.settings.findUniqueOrThrow({ where: { id: 1 } });
  const bays = input.bay ? [input.bay] : Array.from({ length: settings.bays }, (_, i) => i + 1);
  const count = (end.getTime() - start.getTime()) / step;

  try {
    await db.$transaction(async (tx) => {
      const block = await tx.block.create({
        data: { startsAt: start, endsAt: end, bay: input.bay, reason: input.reason, createdBy: actor.email },
      });
      const data = bays.flatMap((bay) =>
        Array.from({ length: count }, (_, i) => ({
          bay,
          slotStart: new Date(start.getTime() + i * step),
          blockId: block.id,
        })),
      );
      await tx.bookingSlot.createMany({ data });
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new BookingError("W tym czasie są już wizyty lub inna blokada. Przenieś je albo zmień zakres.");
    }
    throw error;
  }
  await audit({
    actor: actor.email,
    userId: actor.id,
    action: "block.create",
    entity: "Block",
    details: { start: start.toISOString(), end: end.toISOString(), bay: input.bay },
  });
}
