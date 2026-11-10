import { describe, expect, it } from "vitest";
import { easterSunday, holidayName, polishHolidays } from "@/lib/holidays";
import {
  availableStarts,
  freeBays,
  roundUpToSlot,
  slotKey,
  slotStartsFor,
  whyClosed,
  type AvailabilityInput,
  type DayHours,
} from "@/lib/slots";
import { addDays, isoWeekday, startOfWeek, warsawDate, warsawTime, warsawToUtc } from "@/lib/time";

const HOURS: DayHours = { closed: false, open: "08:00", close: "17:00" };

function input(overrides: Partial<AvailabilityInput>): AvailabilityInput {
  return {
    date: "2026-11-16", // poniedziałek
    hours: HOURS,
    closedDates: new Set(),
    bays: 2,
    occupied: new Set(),
    durationMin: 60,
    now: new Date("2026-11-10T09:00:00Z"),
    minLeadHours: 12,
    maxDaysAhead: 60,
    ...overrides,
  };
}

function occupy(bay: number, date: string, from: string, minutes: number): string[] {
  return slotStartsFor(warsawToUtc(date, from), minutes).map((s) => slotKey(bay, s));
}

describe("czas w strefie Europe/Warsaw", () => {
  it("zimą Warszawa to UTC+1, latem UTC+2", () => {
    expect(warsawToUtc("2026-01-15", "08:00").toISOString()).toBe("2026-01-15T07:00:00.000Z");
    expect(warsawToUtc("2026-07-15", "08:00").toISOString()).toBe("2026-07-15T06:00:00.000Z");
  });

  it("przelicza chwilę UTC z powrotem na datę i godzinę warszawską", () => {
    const instant = new Date("2026-07-15T22:30:00Z");
    expect(warsawDate(instant)).toBe("2026-07-16");
    expect(warsawTime(instant)).toBe("00:30");
  });

  it("liczy dni tygodnia i początek tygodnia na samych datach", () => {
    expect(isoWeekday("2026-11-16")).toBe(1);
    expect(isoWeekday("2026-11-22")).toBe(7);
    expect(startOfWeek("2026-11-19")).toBe("2026-11-16");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("polskie święta", () => {
  it("wyznacza Wielkanoc", () => {
    expect(easterSunday(2025)).toBe("2025-04-20");
    expect(easterSunday(2026)).toBe("2026-04-05");
    expect(easterSunday(2027)).toBe("2027-03-28");
  });

  it("zawiera święta stałe i ruchome", () => {
    const h = polishHolidays(2026);
    expect(h.get("2026-04-06")).toBe("Poniedziałek Wielkanocny");
    expect(h.get("2026-06-04")).toBe("Boże Ciało");
    expect(h.get("2026-05-24")).toBe("Zesłanie Ducha Świętego");
    expect(h.get("2026-11-11")).toBe("Święto Niepodległości");
    expect(h.get("2026-12-24")).toBe("Wigilia");
  });

  it("Wigilia jest wolna dopiero od 2025 r.", () => {
    expect(holidayName("2024-12-24")).toBeUndefined();
    expect(holidayName("2025-12-24")).toBe("Wigilia");
  });
});

describe("siatka odcinków", () => {
  it("zaokrągla czas trwania w górę do 15 minut", () => {
    expect(roundUpToSlot(1)).toBe(15);
    expect(roundUpToSlot(45)).toBe(45);
    expect(roundUpToSlot(50)).toBe(60);
  });

  it("wizyta 60 min zajmuje cztery kolejne odcinki", () => {
    const slots = slotStartsFor(warsawToUtc("2026-11-16", "10:00"), 60);
    expect(slots.map(warsawTime)).toEqual(["10:00", "10:15", "10:30", "10:45"]);
  });
});

describe("dostępne terminy", () => {
  it("proponuje terminy co 30 min mieszczące się w godzinach otwarcia", () => {
    const starts = availableStarts(input({ durationMin: 60 }));
    expect(starts[0]?.time).toBe("08:00");
    expect(starts.at(-1)?.time).toBe("16:00");
    expect(starts).toHaveLength(17);
  });

  it("długa wizyta musi skończyć się przed zamknięciem", () => {
    const starts = availableStarts(input({ durationMin: 240 }));
    expect(starts.at(-1)?.time).toBe("13:00");
  });

  it("nie proponuje terminów w dni zamknięte, święta i dni wolne admina", () => {
    expect(availableStarts(input({ hours: { ...HOURS, closed: true } }))).toEqual([]);
    expect(availableStarts(input({ hours: undefined }))).toEqual([]);
    expect(availableStarts(input({ date: "2026-11-11" }))).toEqual([]); // Święto Niepodległości (środa)
    expect(availableStarts(input({ closedDates: new Set(["2026-11-16"]) }))).toEqual([]);
    expect(whyClosed("2026-11-11", HOURS, new Set())).toBe("Święto Niepodległości");
    expect(whyClosed("2026-11-16", HOURS, new Set())).toBeNull();
  });

  it("szanuje minimalne wyprzedzenie i horyzont rezerwacji", () => {
    const now = warsawToUtc("2026-11-16", "07:00");
    const starts = availableStarts(input({ now, minLeadHours: 3 }));
    expect(starts[0]?.time).toBe("10:00");

    expect(availableStarts(input({ date: "2026-11-09" }))).toEqual([]); // przeszłość
    expect(availableStarts(input({ date: "2027-02-01", maxDaysAhead: 60 }))).toEqual([]); // za daleko
  });

  it("przydziela drugie stanowisko, gdy pierwsze jest zajęte", () => {
    const occupied = new Set(occupy(1, "2026-11-16", "10:00", 60));
    const starts = availableStarts(input({ occupied }));
    expect(starts.find((s) => s.time === "10:00")?.bay).toBe(2);
    expect(starts.find((s) => s.time === "09:00")?.bay).toBe(1);
  });

  it("ukrywa termin, gdy wszystkie stanowiska kolidują – także częściowo", () => {
    const occupied = new Set([...occupy(1, "2026-11-16", "10:00", 60), ...occupy(2, "2026-11-16", "10:30", 30)]);
    const times = availableStarts(input({ occupied, durationMin: 60 })).map((s) => s.time);
    // 09:30–10:30 koliduje ze stanowiskiem 1, ale mieści się na stanowisku 2
    expect(times).toContain("09:30");
    // 10:00–11:00 i 10:30–11:30 kolidują na obu stanowiskach
    expect(times).not.toContain("10:00");
    expect(times).not.toContain("10:30");
    expect(times).toContain("11:00");
  });

  it("przy jednym stanowisku zajęty odcinek blokuje nakładające się wizyty", () => {
    const occupied = new Set(occupy(1, "2026-11-16", "12:00", 30));
    const times = availableStarts(input({ bays: 1, occupied, durationMin: 90 })).map((s) => s.time);
    expect(times).not.toContain("11:00");
    expect(times).not.toContain("11:30");
    expect(times).not.toContain("12:00");
    expect(times).toContain("10:30");
    expect(times).toContain("12:30");
  });

  it("freeBays zwraca tylko stanowiska wolne na całą wizytę", () => {
    const occupied = new Set(occupy(1, "2026-11-16", "10:45", 15));
    expect(freeBays(warsawToUtc("2026-11-16", "10:00"), 60, 2, occupied)).toEqual([2]);
    expect(freeBays(warsawToUtc("2026-11-16", "11:00"), 60, 2, occupied)).toEqual([1, 2]);
  });
});

describe("zmiana czasu", () => {
  const sundayOpen = input({ now: new Date("2026-10-01T00:00:00Z"), maxDaysAhead: 400 });

  it("jesienią (25.10.2026) 08:00 to już UTC+1, dzień wcześniej jeszcze UTC+2", () => {
    const saturday = availableStarts({ ...sundayOpen, date: "2026-10-24" });
    const sunday = availableStarts({ ...sundayOpen, date: "2026-10-25" });
    expect(saturday[0]?.start.toISOString()).toBe("2026-10-24T06:00:00.000Z");
    expect(sunday[0]?.start.toISOString()).toBe("2026-10-25T07:00:00.000Z");
    // Liczba terminów nie zależy od 25-godzinnej doby
    expect(sunday).toHaveLength(saturday.length);
    expect(sunday.map((s) => s.time)).toEqual(saturday.map((s) => s.time));
  });

  it("wiosną (28.03.2027) 08:00 to już UTC+2 i siatka się nie przesuwa", () => {
    // Wielkanoc 2027 wypada 28 marca, więc sprawdzamy sąsiedni wtorek oraz sobotę przed zmianą
    const before = availableStarts({ ...sundayOpen, date: "2027-03-27" });
    const after = availableStarts({ ...sundayOpen, date: "2027-03-30" });
    expect(before[0]?.start.toISOString()).toBe("2027-03-27T07:00:00.000Z");
    expect(after[0]?.start.toISOString()).toBe("2027-03-30T06:00:00.000Z");
    expect(after.map((s) => s.time)).toEqual(before.map((s) => s.time));
  });

  it("godziny otwarcia obejmujące noc zmiany czasu nie wypuszczają wizyty poza zamknięcie", () => {
    const night: DayHours = { closed: false, open: "00:00", close: "06:00" };
    // 25.10.2026: doba ma 25 h, okno 00:00–06:00 trwa realnie 7 h
    const starts = availableStarts({ ...sundayOpen, date: "2026-10-25", hours: night, durationMin: 120 });
    const close = warsawToUtc("2026-10-25", "06:00").getTime();
    for (const s of starts) expect(s.start.getTime() + 120 * 60_000).toBeLessThanOrEqual(close);
    // Zajęcie odcinka liczone w UTC blokuje dokładnie tę chwilę, a nie „tę samą godzinę zegarową”
    const first = starts[0];
    expect(first).toBeDefined();
    const occupied = new Set([slotKey(1, first!.start)]);
    const again = availableStarts({ ...sundayOpen, date: "2026-10-25", hours: night, durationMin: 120, bays: 1, occupied });
    expect(again.some((s) => s.start.getTime() === first!.start.getTime())).toBe(false);
  });
});
