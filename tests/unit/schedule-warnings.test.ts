import { describe, expect, it } from "vitest";
import { scheduleWarnings } from "@/lib/slots";
import { warsawToUtc } from "@/lib/time";

const weekday = { closed: false, open: "08:00", close: "17:00" };
const none = new Set<string>();

function check(date: string, from: string, to: string, hours = weekday, closed = none) {
  return scheduleWarnings({ start: warsawToUtc(date, from), end: warsawToUtc(date, to), hours, closedDates: closed });
}

describe("scheduleWarnings", () => {
  it("wizyta w godzinach pracy: brak ostrzeżeń", () => {
    expect(check("2027-03-09", "10:00", "11:00")).toEqual([]);
    expect(check("2027-03-09", "08:00", "17:00")).toEqual([]);
  });
  it("przed otwarciem i po zamknięciu", () => {
    expect(check("2027-03-09", "07:45", "08:45")).toHaveLength(1);
    expect(check("2027-03-09", "16:30", "17:15")).toHaveLength(1);
  });
  it("święto, dzień wolny i dzień nieczynny", () => {
    expect(check("2027-01-06", "10:00", "11:00")[0]).toMatch(/Trzech Króli/);
    expect(check("2027-03-09", "10:00", "11:00", weekday, new Set(["2027-03-09"]))[0]).toMatch(/Dzień wolny/);
    expect(check("2027-03-07", "10:00", "11:00", { ...weekday, closed: true })[0]).toMatch(/Nieczynne/);
  });
  it("brak godzin dla dnia traktowany jako nieczynny", () => {
    const warnings = scheduleWarnings({
      start: warsawToUtc("2027-03-09", "10:00"),
      end: warsawToUtc("2027-03-09", "11:00"),
      hours: undefined,
      closedDates: none,
    });
    expect(warnings).toHaveLength(1);
  });
  it("wizyta przechodząca na następny dzień jest ostrzeżeniem", () => {
    const warnings = scheduleWarnings({
      start: warsawToUtc("2027-03-09", "16:00"),
      end: warsawToUtc("2027-03-10", "09:00"),
      hours: weekday,
      closedDates: none,
    });
    expect(warnings.length).toBeGreaterThan(0);
  });
});
