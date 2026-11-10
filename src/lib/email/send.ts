import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createTransport, type Transporter } from "nodemailer";
import { env } from "@/lib/env";

export interface Mail {
  to: string;
  subject: string;
  text: string;
  html: string;
  ics?: { filename: string; content: string; method: "PUBLISH" | "CANCEL" };
}

let transport: Transporter | undefined;

function getTransport(): Transporter | null {
  const e = env();
  if (!e.SMTP_HOST) return null;
  transport ??= createTransport({
    host: e.SMTP_HOST,
    port: e.SMTP_PORT,
    secure: e.SMTP_PORT === 465,
    requireTLS: e.SMTP_PORT !== 465,
    auth: e.SMTP_USER ? { user: e.SMTP_USER, pass: e.SMTP_PASSWORD ?? "" } : undefined,
  });
  return transport;
}

/**
 * Wysyła wiadomość. Nigdy nie rzuca wyjątku – błąd poczty nie może cofnąć rezerwacji.
 * Bez konfiguracji SMTP zapisuje wiadomość do .mail-outbox (praca lokalna i testy).
 */
export async function sendMail(mail: Mail): Promise<boolean> {
  try {
    const smtp = getTransport();
    if (!smtp) {
      const dir = path.resolve(".mail-outbox");
      await mkdir(dir, { recursive: true });
      const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;
      await writeFile(path.join(dir, name), JSON.stringify(mail, null, 2), "utf8");
      return true;
    }
    await smtp.sendMail({
      from: env().MAIL_FROM,
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      attachments: mail.ics
        ? [
            {
              filename: mail.ics.filename,
              content: mail.ics.content,
              contentType: `text/calendar; charset=utf-8; method=${mail.ics.method}`,
            },
          ]
        : undefined,
    });
    return true;
  } catch (error) {
    // Bez treści i adresata – w logach nie zostawiamy danych osobowych.
    console.error("[mail] wysyłka nie powiodła się:", error instanceof Error ? error.message : "nieznany błąd");
    return false;
  }
}
