import { addDays } from "./time";

/** Niedziela wielkanocna – algorytm Meeusa/Jonesa/Butchera (kalendarz gregoriański). */
export function easterSunday(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Dni ustawowo wolne od pracy w Polsce: data (YYYY-MM-DD) → nazwa. */
export function polishHolidays(year: number): Map<string, string> {
  const easter = easterSunday(year);
  const holidays = new Map<string, string>([
    [`${year}-01-01`, "Nowy Rok"],
    [`${year}-01-06`, "Święto Trzech Króli"],
    [easter, "Wielkanoc"],
    [addDays(easter, 1), "Poniedziałek Wielkanocny"],
    [`${year}-05-01`, "Święto Pracy"],
    [`${year}-05-03`, "Święto Konstytucji 3 Maja"],
    [addDays(easter, 49), "Zesłanie Ducha Świętego"],
    [addDays(easter, 60), "Boże Ciało"],
    [`${year}-08-15`, "Wniebowzięcie NMP"],
    [`${year}-11-01`, "Wszystkich Świętych"],
    [`${year}-11-11`, "Święto Niepodległości"],
    [`${year}-12-25`, "Boże Narodzenie"],
    [`${year}-12-26`, "Drugi dzień Bożego Narodzenia"],
  ]);
  // Wigilia jest dniem ustawowo wolnym od 2025 r.
  if (year >= 2025) holidays.set(`${year}-12-24`, "Wigilia");
  return holidays;
}

export function holidayName(date: string): string | undefined {
  return polishHolidays(Number(date.slice(0, 4))).get(date);
}
