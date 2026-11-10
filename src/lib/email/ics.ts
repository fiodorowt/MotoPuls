export interface IcsEvent {
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  description: string;
  location: string;
  /** Rośnie przy każdej zmianie, żeby kalendarz klienta zaktualizował wpis */
  sequence: number;
  cancelled?: boolean;
  organizerEmail: string;
}

function stamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** RFC 5545: linie najwyżej 75 oktetów, kontynuacja zaczyna się spacją. */
function fold(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  let size = 0;
  for (const char of line) {
    const len = Buffer.byteLength(char, "utf8");
    const limit = parts.length === 0 ? 75 : 74;
    if (size + len > limit) {
      parts.push(current);
      current = "";
      size = 0;
    }
    current += char;
    size += len;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export function buildIcs(event: IcsEvent): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Moto Puls//Rezerwacje//PL",
    "CALSCALE:GREGORIAN",
    `METHOD:${event.cancelled ? "CANCEL" : "PUBLISH"}`,
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(event.start)}`,
    `DTEND:${stamp(event.end)}`,
    `SEQUENCE:${event.sequence}`,
    `STATUS:${event.cancelled ? "CANCELLED" : "CONFIRMED"}`,
    `SUMMARY:${escapeText(event.summary)}`,
    `DESCRIPTION:${escapeText(event.description)}`,
    `LOCATION:${escapeText(event.location)}`,
    `ORGANIZER:mailto:${event.organizerEmail}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
