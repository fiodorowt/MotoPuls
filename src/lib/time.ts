import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

/** Warsztat działa w jednej strefie – wszystkie obliczenia terminów robimy w niej, a w bazie trzymamy UTC. */
export const TZ = "Europe/Warsaw";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isDateString(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function isTimeString(value: string): boolean {
  return TIME_RE.test(value);
}

/** Data (YYYY-MM-DD) i godzina zegarowa (HH:mm) w Warszawie → chwila w UTC. */
export function warsawToUtc(date: string, time: string): Date {
  return fromZonedTime(`${date}T${time}:00`, TZ);
}

export function warsawDate(instant: Date): string {
  return formatInTimeZone(instant, TZ, "yyyy-MM-dd");
}

export function warsawTime(instant: Date): string {
  return formatInTimeZone(instant, TZ, "HH:mm");
}

/** Arytmetyka na samych datach kalendarzowych (bez stref i zmiany czasu). */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 1 = poniedziałek … 7 = niedziela */
export function isoWeekday(date: string): number {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Poniedziałek tygodnia, w którym leży podana data. */
export function startOfWeek(date: string): string {
  return addDays(date, 1 - isoWeekday(date));
}

const dateFmt = new Intl.DateTimeFormat("pl-PL", {
  timeZone: TZ,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const shortFmt = new Intl.DateTimeFormat("pl-PL", {
  timeZone: TZ,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function formatDatePl(instant: Date): string {
  return dateFmt.format(instant);
}

export function formatDateShortPl(instant: Date): string {
  return shortFmt.format(instant);
}

export function formatDateTimePl(instant: Date): string {
  return `${formatDatePl(instant)}, godz. ${warsawTime(instant)}`;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} godz.` : `${h} godz. ${m} min`;
}

export const WEEKDAYS_PL = ["poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota", "niedziela"] as const;
