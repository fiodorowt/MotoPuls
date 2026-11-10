import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "@/lib/csv";
import { buildIcs } from "@/lib/email/ics";

describe("eksport CSV", () => {
  it("neutralizuje formuły arkusza (CSV injection)", () => {
    expect(csvCell("=HYPERLINK(\"http://zlo\")")).toBe("\"'=HYPERLINK(\"\"http://zlo\"\")\"");
    expect(csvCell("+48123")).toBe("'+48123");
    expect(csvCell("-1")).toBe("'-1");
    expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)");
  });

  it("cytuje separator, cudzysłów i nowe linie", () => {
    expect(csvCell("a;b")).toBe('"a;b"');
    expect(csvCell('5" felga')).toBe('"5"" felga"');
    expect(csvCell("linia1\nlinia2")).toBe('"linia1\nlinia2"');
  });

  it("puste wartości i liczby", () => {
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
    expect(csvCell(12)).toBe("12");
  });

  it("buduje plik z BOM i CRLF", () => {
    expect(toCsv(["A", "B"], [["x", 1]])).toBe("﻿A;B\r\nx;1\r\n");
  });
});

describe("załącznik .ics", () => {
  const event = {
    uid: "abc@motopuls",
    start: new Date("2026-03-30T06:00:00Z"),
    end: new Date("2026-03-30T07:30:00Z"),
    summary: "Wizyta w Moto Puls; klimatyzacja, diagnostyka",
    description: "Linia 1\nLinia 2",
    location: "ul. Modra 26, 86-005 Białe Błota",
    sequence: 2,
    organizerEmail: "motopuls.serwis@gmail.com",
  };

  it("zapisuje czas w UTC i ucieka znaki specjalne", () => {
    const ics = buildIcs(event);
    expect(ics).toContain("DTSTART:20260330T060000Z");
    expect(ics).toContain("DTEND:20260330T073000Z");
    expect(ics).toContain("SUMMARY:Wizyta w Moto Puls\\; klimatyzacja\\, diagnostyka");
    expect(ics).toContain("DESCRIPTION:Linia 1\\nLinia 2");
    expect(ics).toContain("SEQUENCE:2");
    expect(ics).toContain("METHOD:PUBLISH");
  });

  it("anulowanie ma METHOD:CANCEL i STATUS:CANCELLED", () => {
    const ics = buildIcs({ ...event, cancelled: true });
    expect(ics).toContain("METHOD:CANCEL");
    expect(ics).toContain("STATUS:CANCELLED");
  });

  it("łamie linie dłuższe niż 75 oktetów i kończy je CRLF", () => {
    const ics = buildIcs({ ...event, description: "ąęś".repeat(60) });
    for (const line of ics.split("\r\n")) expect(Buffer.byteLength(line, "utf8")).toBeLessThanOrEqual(75);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });
});
