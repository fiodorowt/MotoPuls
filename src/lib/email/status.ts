/** Stan poczty wychodzącej: `ok` (SMTP), `outbox` (zapis do .mail-outbox w dev/testach), `disabled` (produkcja bez SMTP - klienci nie dostają e-maili). */
export type MailStatus = "ok" | "outbox" | "disabled";

export function mailStatus(source: { NODE_ENV?: string; SMTP_HOST?: string } = process.env): MailStatus {
  if (source.SMTP_HOST) return "ok";
  return source.NODE_ENV === "production" ? "disabled" : "outbox";
}
