import { holidayName } from "./holidays";
import { addDays, timeToMinutes, minutesToTime, warsawDate, warsawToUtc } from "./time";

/** Rozdzielczość siatki rezerwacji. Każda wizyta zajmuje całe 15-minutowe odcinki na jednym stanowisku. */
export const SLOT_MIN = 15;
const SLOT_MS = SLOT_MIN * 60_000;

export interface DayHours {
  closed: boolean;
  open: string;
  close: string;
}

export interface AvailabilityInput {
  /** Dzień w Warszawie, YYYY-MM-DD */
  date: string;
  hours: DayHours | undefined;
  /** Dni wolne dodane przez admina (YYYY-MM-DD) */
  closedDates: ReadonlySet<string>;
  bays: number;
  /** Zajęte odcinki – klucze z `slotKey` */
  occupied: ReadonlySet<string>;
  durationMin: number;
  now: Date;
  minLeadHours: number;
  maxDaysAhead: number;
  /** Co ile minut proponować początek wizyty (domyślnie 30) */
  stepMin?: number;
}

export interface AvailableStart {
  start: Date;
  /** Godzina zegarowa w Warszawie, HH:mm */
  time: string;
  /** Pierwsze wolne stanowisko (1..bays) */
  bay: number;
}

export function slotKey(bay: number, slotStart: Date): string {
  return `${bay}|${slotStart.toISOString()}`;
}

export function roundUpToSlot(minutes: number): number {
  return Math.max(SLOT_MIN, Math.ceil(minutes / SLOT_MIN) * SLOT_MIN);
}

/** Początki wszystkich 15-minutowych odcinków zajmowanych przez wizytę. */
export function slotStartsFor(start: Date, durationMin: number): Date[] {
  const count = roundUpToSlot(durationMin) / SLOT_MIN;
  return Array.from({ length: count }, (_, i) => new Date(start.getTime() + i * SLOT_MS));
}

export function whyClosed(
  date: string,
  hours: DayHours | undefined,
  closedDates: ReadonlySet<string>,
): string | null {
  const holiday = holidayName(date);
  if (holiday) return holiday;
  if (closedDates.has(date)) return "Dzień wolny";
  if (!hours || hours.closed) return "Nieczynne";
  if (timeToMinutes(hours.close) <= timeToMinutes(hours.open)) return "Nieczynne";
  return null;
}

/** Okno pracy danego dnia jako chwile UTC (uwzględnia zmianę czasu). */
export function dayWindow(date: string, hours: DayHours): { open: Date; close: Date } {
  return { open: warsawToUtc(date, hours.open), close: warsawToUtc(date, hours.close) };
}

export function isWithinBookingHorizon(date: string, now: Date, maxDaysAhead: number): boolean {
  const today = warsawDate(now);
  return date >= today && date <= addDays(today, maxDaysAhead);
}

/**
 * Wolne terminy rozpoczęcia wizyty danego dnia.
 * Termin jest wolny, gdy na co najmniej jednym stanowisku wszystkie odcinki
 * wizyty mieszczą się w godzinach otwarcia i żaden nie jest zajęty.
 */
export function availableStarts(input: AvailabilityInput): AvailableStart[] {
  const { date, hours, closedDates, bays, occupied, now } = input;
  if (bays < 1 || !isWithinBookingHorizon(date, now, input.maxDaysAhead)) return [];
  if (whyClosed(date, hours, closedDates) !== null || !hours) return [];

  const duration = roundUpToSlot(input.durationMin);
  const step = input.stepMin ?? 30;
  const { close } = dayWindow(date, hours);
  const earliest = now.getTime() + input.minLeadHours * 3_600_000;
  const openMin = timeToMinutes(hours.open);
  const closeMin = timeToMinutes(hours.close);
  const result: AvailableStart[] = [];

  // Iterujemy po czasie zegarowym, a każdy kandydat przeliczamy na UTC osobno –
  // dzięki temu dni ze zmianą czasu (23 lub 25 godzin) nie przesuwają siatki.
  for (let minute = openMin; minute + duration <= closeMin; minute += step) {
    const time = minutesToTime(minute);
    const start = warsawToUtc(date, time);
    if (start.getTime() < earliest) continue;
    if (start.getTime() + duration * 60_000 > close.getTime()) continue;

    const slots = slotStartsFor(start, duration);
    for (let bay = 1; bay <= bays; bay++) {
      if (slots.every((slot) => !occupied.has(slotKey(bay, slot)))) {
        result.push({ start, time, bay });
        break;
      }
    }
  }
  return result;
}

/** Stanowiska, na których cała wizyta jest wolna – w kolejności do próbowania przy zapisie. */
export function freeBays(start: Date, durationMin: number, bays: number, occupied: ReadonlySet<string>): number[] {
  const slots = slotStartsFor(start, durationMin);
  const free: number[] = [];
  for (let bay = 1; bay <= bays; bay++) {
    if (slots.every((slot) => !occupied.has(slotKey(bay, slot)))) free.push(bay);
  }
  return free;
}
