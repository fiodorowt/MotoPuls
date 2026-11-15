import { beforeEach, describe, expect, it, vi } from "vitest";
import { changeBookingStatus, createBooking } from "@/lib/booking";
import { db } from "@/lib/db";
import { sendPendingDigest } from "@/lib/maintenance";
import { addDays, warsawDate } from "@/lib/time";
import { at, bookingInput, futureWorkday, resetData } from "./helpers";
import { mailsTo, outbox } from "./mail";

vi.mock("@/lib/email/send", async () => (await import("./mail")).mailMock());

const actor = { email: "int-owner@motopuls.test", id: "int-user" };
const WORKSHOP = "warsztat@motopuls.test";
let day: string;

beforeEach(async () => {
  await resetData();
  await db.settings.update({ where: { id: 1 }, data: { pendingReminderHours: 12, pendingDigestSentAt: null } });
  day = await futureWorkday(2);
});

async function pendingCreatedHoursAgo(hours: number, time = "10:00", now = new Date()) {
  const booking = await createBooking(await bookingInput(at(day, time), { source: "ONLINE" }));
  await db.booking.update({ where: { id: booking.id }, data: { createdAt: new Date(now.getTime() - hours * 3_600_000) } });
  outbox.length = 0;
  return booking;
}

describe("MP-012 przypomnienie o nieobsłużonych PENDING", () => {
  const now = () => at(warsawDate(new Date()), "10:00");

  it("wysyła zbiorczy mail tylko o rezerwacjach starszych niż próg", async () => {
    const stale = await pendingCreatedHoursAgo(13, "10:00", now());
    await db.booking.update({ where: { id: stale.id }, data: { createdAt: new Date(now().getTime() - 13 * 3_600_000) } });
    const fresh = await createBooking(await bookingInput(at(day, "12:00"), { source: "ONLINE" }));
    await db.booking.update({ where: { id: fresh.id }, data: { createdAt: new Date(now().getTime() - 2 * 3_600_000) } });
    outbox.length = 0;

    expect(await sendPendingDigest(now())).toBe(1);
    const mails = mailsTo(WORKSHOP);
    expect(mails).toHaveLength(1);
    expect(mails[0]?.subject).toContain("1");
    expect(mails[0]?.text).toContain(`/admin/rezerwacje/${stale.id}`);
    expect(mails[0]?.text).not.toContain(`/admin/rezerwacje/${fresh.id}`);
  });

  it("maksymalnie raz na dobę; kolejnego dnia znowu", async () => {
    await pendingCreatedHoursAgo(20, "10:00", now());
    expect(await sendPendingDigest(now())).toBe(1);
    expect(await sendPendingDigest(new Date(now().getTime() + 2 * 3_600_000))).toBe(0);
    expect(mailsTo(WORKSHOP)).toHaveLength(1);
    const tomorrow = at(addDays(warsawDate(now()), 1), "10:00");
    expect(await sendPendingDigest(tomorrow)).toBe(1);
    expect(mailsTo(WORKSHOP)).toHaveLength(2);
  });

  it("równoległe uruchomienia wysyłają jeden mail", async () => {
    await pendingCreatedHoursAgo(20, "10:00", now());
    const results = await Promise.all([sendPendingDigest(now()), sendPendingDigest(now()), sendPendingDigest(now())]);
    expect(results.reduce((a, b) => a + b, 0)).toBe(1);
    expect(mailsTo(WORKSHOP)).toHaveLength(1);
  });

  it("brak zaległych PENDING: nic nie wychodzi i dzień nie jest zużyty", async () => {
    expect(await sendPendingDigest(now())).toBe(0);
    expect(mailsTo(WORKSHOP)).toHaveLength(0);
    await pendingCreatedHoursAgo(20, "10:00", now());
    expect(await sendPendingDigest(now())).toBe(1);
  });

  it("potwierdzona lub odrzucona rezerwacja nie jest zaległa; brak auto-anulowania", async () => {
    const a = await pendingCreatedHoursAgo(30, "10:00", now());
    await changeBookingStatus(a.id, "CONFIRMED", actor);
    outbox.length = 0;
    expect(await sendPendingDigest(now())).toBe(0);

    const b = await pendingCreatedHoursAgo(30, "11:00", now());
    expect(await sendPendingDigest(now())).toBe(1);
    expect((await db.booking.findUniqueOrThrow({ where: { id: b.id } })).status).toBe("PENDING");
  });

  it("nie przed 9:00 czasu warszawskiego", async () => {
    await pendingCreatedHoursAgo(20, "10:00", now());
    expect(await sendPendingDigest(at(warsawDate(now()), "08:59"))).toBe(0);
    expect(await sendPendingDigest(at(warsawDate(now()), "09:00"))).toBe(1);
  });

  it("próg 0 wyłącza przypomnienia", async () => {
    await db.settings.update({ where: { id: 1 }, data: { pendingReminderHours: 0 } });
    await pendingCreatedHoursAgo(50, "10:00", now());
    expect(await sendPendingDigest(now())).toBe(0);
  });

  it("wysyłka z zapisem w dzienniku bez danych osobowych klienta", async () => {
    const booking = await pendingCreatedHoursAgo(20, "10:00", now());
    const customer = await db.customer.findUniqueOrThrow({ where: { id: booking.customerId } });
    await sendPendingDigest(now());
    const logs = await db.auditLog.findMany({ where: { action: "booking.pending_digest" } });
    expect(logs).toHaveLength(1);
    expect(JSON.stringify(logs[0])).not.toContain(customer.email);
    expect(JSON.stringify(logs[0])).not.toContain(customer.phone);
  });
});
