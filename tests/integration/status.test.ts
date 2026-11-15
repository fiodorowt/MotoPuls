import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  BookingError,
  SlotTakenError,
  cancelByCustomer,
  changeBookingStatus,
  createBooking,
  getAvailability,
} from "@/lib/booking";
import { db } from "@/lib/db";
import { holidayName } from "@/lib/holidays";
import { BOOKING_TRANSITIONS, type BookingStatus } from "@/lib/labels";
import { sendReminders } from "@/lib/maintenance";
import { addDays, isoWeekday, warsawDate } from "@/lib/time";
import { at, bookingInput, futureWorkday, resetData, shortService, slotCount } from "./helpers";
import { mailsTo, outbox } from "./mail";

vi.mock("@/lib/email/send", async () => (await import("./mail")).mailMock());

const actor = { email: "int-owner@motopuls.test", id: "int-user" };
const ALL: BookingStatus[] = ["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"];
let day: string;

beforeEach(async () => {
  await resetData();
  day = await futureWorkday(3);
});

async function onlineBooking(time = "10:00") {
  return createBooking(await bookingInput(at(day, time), { source: "ONLINE" }));
}

async function emailOf(customerId: string) {
  return (await db.customer.findUniqueOrThrow({ where: { id: customerId } })).email;
}

describe("T2.1-T2.3 status początkowy", () => {
  it("T2.1 autoConfirm=false: ONLINE = PENDING, mail booking_received, odcinki zajęte", async () => {
    const booking = await onlineBooking();
    expect(booking.status).toBe("PENDING");
    expect(await slotCount()).toBeGreaterThan(0);
    const mails = mailsTo(await emailOf(booking.customerId));
    expect(mails).toHaveLength(1);
    expect(mails[0]?.subject).toContain("Przyjęliśmy");
    // Powiadomienie do warsztatu o nowej rezerwacji online.
    expect(mailsTo("warsztat@motopuls.test")).toHaveLength(1);
  });

  it("T2.2 autoConfirm=true: ONLINE = CONFIRMED, mail booking_confirmed z .ics", async () => {
    await db.settings.update({ where: { id: 1 }, data: { autoConfirm: true } });
    const booking = await onlineBooking();
    expect(booking.status).toBe("CONFIRMED");
    const mail = mailsTo(await emailOf(booking.customerId))[0];
    expect(mail?.subject).toContain("potwierdzona");
    expect(mail?.ics?.method).toBe("PUBLISH");
  });

  it("T2.3 ADMIN = CONFIRMED także przy autoConfirm=false", async () => {
    const booking = await createBooking(await bookingInput(at(day, "10:00"), { source: "ADMIN", actor }));
    expect(booking.status).toBe("CONFIRMED");
  });
});

describe("T2.4 macierz przejść statusów", () => {
  const cases = ALL.flatMap((from) => ALL.map((to) => ({ from, to })));

  it.each(cases)("$from -> $to", async ({ from, to }) => {
    const booking = await onlineBooking();
    await db.booking.update({ where: { id: booking.id }, data: { status: from } });
    if (BOOKING_TRANSITIONS[from].includes(to)) {
      await changeBookingStatus(booking.id, to, actor);
      expect((await db.booking.findUniqueOrThrow({ where: { id: booking.id } })).status).toBe(to);
    } else {
      await expect(changeBookingStatus(booking.id, to, actor)).rejects.toBeInstanceOf(BookingError);
      expect((await db.booking.findUniqueOrThrow({ where: { id: booking.id } })).status).toBe(from);
    }
  });
});

describe("T2.5 równoległe zmiany statusu", () => {
  it("PENDING: potwierdzenie i anulowanie naraz - dokładnie jedno przechodzi", async () => {
    const booking = await onlineBooking();
    const results = await Promise.allSettled([
      changeBookingStatus(booking.id, "CONFIRMED", actor),
      changeBookingStatus(booking.id, "CANCELLED", actor),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const failed = results.find((r) => r.status === "rejected");
    expect(failed?.status === "rejected" && failed.reason).toBeInstanceOf(BookingError);
    const final = (await db.booking.findUniqueOrThrow({ where: { id: booking.id } })).status;
    const slots = await slotCount();
    // Spójność: odcinki są zwolnione wtedy i tylko wtedy, gdy wizyta jest anulowana.
    expect(final === "CANCELLED" ? slots === 0 : slots > 0).toBe(true);
  });
});

describe("T2.6 zwalnianie terminu", () => {
  it.each(["CANCELLED", "NO_SHOW"] as const)("%s zwalnia odcinki i termin wraca do dostępnych", async (to) => {
    await db.settings.update({ where: { id: 1 }, data: { bays: 1 } });
    const service = await shortService();
    const booking = await createBooking(await bookingInput(at(day, "10:00"), { source: "ADMIN", actor }));
    const iso = at(day, "10:00").toISOString();
    expect((await getAvailability(day, 1, service.durationMin))[0]?.times.some((t) => t.iso === iso)).toBe(false);

    await changeBookingStatus(booking.id, to, actor);

    expect(await slotCount()).toBe(0);
    expect((await getAvailability(day, 1, service.durationMin))[0]?.times.some((t) => t.iso === iso)).toBe(true);
    await expect(createBooking(await bookingInput(at(day, "10:00"), { source: "ONLINE" }))).resolves.toBeTruthy();
  });

  it("anulowanie wysyła mail booking_cancelled z .ics CANCEL", async () => {
    const booking = await onlineBooking();
    outbox.length = 0;
    await changeBookingStatus(booking.id, "CANCELLED", actor);
    const mail = mailsTo(await emailOf(booking.customerId))[0];
    expect(mail?.subject).toContain("anulowana");
    expect(mail?.ics?.method).toBe("CANCEL");
  });
});

describe("T2.7 okno anulowania przez klienta", () => {
  it("dokładnie cancelHoursBefore godzin przed: OK; minutę mniej: błąd", async () => {
    await db.settings.update({ where: { id: 1 }, data: { cancelHoursBefore: 24 } });
    const a = await onlineBooking("10:00");
    const b = await onlineBooking("11:00");
    const exactly = new Date(a.startsAt.getTime() - 24 * 3_600_000);
    const tooLate = new Date(b.startsAt.getTime() - (24 * 60 - 1) * 60_000);

    await cancelByCustomer(a.token, exactly);
    expect((await db.booking.findUniqueOrThrow({ where: { id: a.id } })).status).toBe("CANCELLED");

    await expect(cancelByCustomer(b.token, tooLate)).rejects.toBeInstanceOf(BookingError);
    expect((await db.booking.findUniqueOrThrow({ where: { id: b.id } })).status).toBe("PENDING");
  });
});

describe("T3.1 koniec wizyty a zamknięcie (godziny z bazy)", () => {
  it("ONLINE: start o zamknięciu minus czas usługi przechodzi, 15 minut później już nie", async () => {
    const service = await shortService();
    const dur = Math.ceil(service.durationMin / 15) * 15;
    const hours = await db.openingHours.findUniqueOrThrow({ where: { weekday: isoWeekday(day) } });
    const [h, m] = hours.close.split(":").map(Number);
    const close = (h ?? 0) * 60 + (m ?? 0);
    const fmt = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
    await expect(createBooking(await bookingInput(at(day, fmt(close - dur)), { source: "ONLINE" }))).resolves.toBeTruthy();
    await expect(createBooking(await bookingInput(at(day, fmt(close - dur + 15)), { source: "ONLINE" }))).rejects.toBeInstanceOf(
      SlotTakenError,
    );
  });
});

function nextWeekdayHoliday(): string {
  let date = addDays(warsawDate(new Date()), 14);
  for (let i = 0; i < 365; i++) {
    if (holidayName(date) && isoWeekday(date) <= 5) return date;
    date = addDays(date, 1);
  }
  throw new Error("brak święta w roku");
}

describe("T3.3 dni wolne i święta (obejście UI)", () => {
  it("ClosedDay i święto: ONLINE z ręcznie podanym startem jest odrzucane", async () => {
    await db.closedDay.create({ data: { date: new Date(`${day}T00:00:00Z`), reason: "Inwentaryzacja" } });
    await expect(createBooking(await bookingInput(at(day, "10:00"), { source: "ONLINE" }))).rejects.toBeInstanceOf(SlotTakenError);

    const holiday = nextWeekdayHoliday();
    await expect(createBooking(await bookingInput(at(holiday, "10:00"), { source: "ONLINE" }))).rejects.toBeInstanceOf(SlotTakenError);
    expect(await db.booking.count()).toBe(0);
  });
});

describe("T3.4 przypomnienia", () => {
  it("nie przed 9:00, raz o 9:00, drugi przebieg nic", async () => {
    const booking = await createBooking(await bookingInput(at(day, "10:00"), { source: "ADMIN", actor }));
    const eve = addDays(day, -1);
    const email = await emailOf(booking.customerId);
    outbox.length = 0;

    expect(await sendReminders(at(eve, "08:59"))).toBe(0);
    expect(mailsTo(email)).toHaveLength(0);

    expect(await sendReminders(at(eve, "09:00"))).toBe(1);
    expect(mailsTo(email)).toHaveLength(1);
    expect(mailsTo(email)[0]?.subject).toContain("Przypomnienie");

    expect(await sendReminders(at(eve, "10:00"))).toBe(0);
    expect(mailsTo(email)).toHaveLength(1);
  });

  it.each(["2026-10-25", "2027-03-28"])("dzień zmiany czasu %s: przypomnienie dzień wcześniej o 9:00", async (dstDay) => {
    const booking = await createBooking(await bookingInput(at(dstDay, "10:00"), { source: "ADMIN", actor }));
    // Dwa dni wcześniej wizyta jeszcze nie jest "jutrzejsza".
    expect(await sendReminders(at(addDays(dstDay, -2), "12:00"))).toBe(0);
    expect(await sendReminders(at(addDays(dstDay, -1), "09:00"))).toBe(1);
    expect((await db.booking.findUniqueOrThrow({ where: { id: booking.id } })).reminderSentAt).not.toBeNull();
  });

  it("anulowana wizyta nie dostaje przypomnienia", async () => {
    const booking = await createBooking(await bookingInput(at(day, "10:00"), { source: "ADMIN", actor }));
    await changeBookingStatus(booking.id, "CANCELLED", actor);
    outbox.length = 0;
    expect(await sendReminders(at(addDays(day, -1), "09:00"))).toBe(0);
  });
});
