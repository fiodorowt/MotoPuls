import { beforeEach, describe, expect, it, vi } from "vitest";
import { createBooking } from "@/lib/booking";
import { sign } from "@/lib/crypto";
import { db } from "@/lib/db";
import { at, bookingInput, futureWorkday, resetData } from "./helpers";
import { outbox } from "./mail";

vi.mock("@/lib/email/send", async () => (await import("./mail")).mailMock());
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": "203.0.113.7" }) }));

const { sendPremiumInquiry } = await import("@/app/(public)/actions");
const empty = { ok: false, message: "" };

function token(ageMs = 60_000): string {
  const ts = String(Date.now() - ageMs);
  return `${ts}.${sign(ts, "form-token")}`;
}

function form(extra: Record<string, string> = {}): FormData {
  const fd = new FormData();
  const fields: Record<string, string> = {
    name: "Jan Testowy",
    phone: "601 202 303",
    email: "jan.premium@motopuls.test",
    vehicle: "Audi A6 2016",
    message: "Auto wymaga indywidualnej obsługi.",
    privacy: "on",
    form_token: token(),
    website: "",
    ...extra,
  };
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

async function setPremium(data: { premiumEnabled?: boolean; premiumPickupEnabled?: boolean }) {
  await db.settings.update({ where: { id: 1 }, data });
}

beforeEach(async () => {
  await resetData();
  await db.inquiry.deleteMany();
  await setPremium({ premiumEnabled: true, premiumPickupEnabled: false });
});

describe("T5.1 / MP-035 zgłoszenie Premium nie dotyka rezerwacji", () => {
  it("nie tworzy ani nie zmienia Booking, BookingSlot i Block, także przy kolidującym terminie", async () => {
    const day = await futureWorkday(4);
    await createBooking(await bookingInput(at(day, "10:00"), { source: "ONLINE" }));
    const snapshot = async () => ({
      bookings: await db.booking.findMany({ orderBy: { id: "asc" } }),
      slots: await db.bookingSlot.findMany({ orderBy: { id: "asc" } }),
      blocks: await db.block.findMany({ orderBy: { id: "asc" } }),
    });
    const before = await snapshot();
    expect(before.bookings).toHaveLength(1);

    const result = await sendPremiumInquiry(empty, form({ preferredDate: `${day} 10:00` }));
    expect(result.ok).toBe(true);

    // Równość obejmuje updatedAt i wszystkie pola istniejących wierszy.
    expect(await snapshot()).toEqual(before);
    expect(await db.inquiry.count({ where: { type: "PREMIUM" } })).toBe(1);
  });
});

describe("T5.2 zapis i powiadomienie właściciela", () => {
  it("zapisuje Inquiry(PREMIUM) z danymi w data i wysyła mail do warsztatu bez danych klienta", async () => {
    const result = await sendPremiumInquiry(empty, form({ preferredDate: "w przyszłym tygodniu" }));
    expect(result.ok).toBe(true);
    const inquiry = await db.inquiry.findFirstOrThrow({ where: { type: "PREMIUM" } });
    expect(inquiry.data).toMatchObject({ Pojazd: "Audi A6 2016", "Preferowany termin": "w przyszłym tygodniu", "Odbiór auta": "Nie" });
    expect(outbox).toHaveLength(1);
    expect(outbox[0]?.to).toBe("warsztat@motopuls.test");
    expect(outbox[0]?.subject).toContain("Premium");
    expect(outbox[0]?.text).not.toContain("601 202 303");
    expect(outbox[0]?.text).not.toContain("jan.premium@motopuls.test");
  });
});

describe("T5.3 odbiór auta", () => {
  it("flaga wyłączona: payload z adresem odbioru jest odrzucony i nic się nie zapisuje", async () => {
    const result = await sendPremiumInquiry(empty, form({ pickup: "on", pickupAddress: "Bydgoszcz, Dworcowa 1" }));
    expect(result.ok).toBe(false);
    expect(await db.inquiry.count()).toBe(0);
  });

  it("flaga włączona: adres odbioru trafia do data", async () => {
    await setPremium({ premiumPickupEnabled: true });
    const result = await sendPremiumInquiry(empty, form({ pickup: "on", pickupAddress: "Bydgoszcz, Dworcowa 1" }));
    expect(result.ok).toBe(true);
    const inquiry = await db.inquiry.findFirstOrThrow({ where: { type: "PREMIUM" } });
    expect(inquiry.data).toMatchObject({ "Odbiór auta": "Tak", "Adres odbioru": "Bydgoszcz, Dworcowa 1" });
  });
});

describe("MP-032 ustawienia Premium", () => {
  it("premiumEnabled=false: serwer odrzuca zgłoszenie", async () => {
    await setPremium({ premiumEnabled: false });
    const result = await sendPremiumInquiry(empty, form());
    expect(result.ok).toBe(false);
    expect(await db.inquiry.count()).toBe(0);
  });

  it("domyślne wartości kolumn: flagi wyłączone, notatka ceny z D-3", async () => {
    const rows = await db.$queryRawUnsafe<{ column_name: string; column_default: string }[]>(
      `SELECT column_name, column_default FROM information_schema.columns WHERE table_name = 'Settings' AND column_name LIKE 'premium%'`,
    );
    const defaults = Object.fromEntries(rows.map((r) => [r.column_name, r.column_default]));
    expect(defaults.premiumEnabled).toBe("false");
    expect(defaults.premiumPickupEnabled).toBe("false");
    expect(defaults.premiumPriceNote).toContain("Cena ustalana indywidualnie");
  });
});

describe("T5.5 antyspam", () => {
  it("honeypot wypełniony: odrzucone", async () => {
    const result = await sendPremiumInquiry(empty, form({ website: "http://spam.example" }));
    expect(result.ok).toBe(false);
    expect(await db.inquiry.count()).toBe(0);
  });

  it("limit zgłoszeń z jednego IP: szóste w oknie odrzucone", async () => {
    for (let i = 0; i < 5; i++) expect((await sendPremiumInquiry(empty, form())).ok).toBe(true);
    const sixth = await sendPremiumInquiry(empty, form());
    expect(sixth.ok).toBe(false);
    expect(sixth.message).toContain("Zbyt wiele");
    expect(await db.inquiry.count()).toBe(5);
  });
});
