import { vi } from "vitest";
import type { Mail } from "@/lib/email/send";

/** Poczta zapisywana w pamięci zamiast do .mail-outbox (bez importów z logiki aplikacji, by nie tworzyć cykli). */
export const outbox: Mail[] = [];

export function mailMock() {
  return {
    sendMail: vi.fn(async (mail: Mail) => {
      outbox.push(mail);
      return true;
    }),
  };
}

export function mailsTo(address: string): Mail[] {
  return outbox.filter((m) => m.to === address);
}
