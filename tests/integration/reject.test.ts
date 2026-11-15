import { beforeEach, describe, expect, it, vi } from "vitest";
import { BookingError, createBooking, getAvailability, rejectBooking } from "@/lib/booking";
import { db } from "@/lib/db";
import { at, bookingInput, futureWorkday, resetData, shortService, slotCount } from "./helpers";
import { mailsTo, outbox } from "./mail";

vi.mock("@/lib/email/send", async () => (await import("./mail")).mailMock());

const actor = { email: "int-owner@motopuls.test", id: "int-user" };
let day: string;

beforeEach(async () => {
  await resetData();
  day = await futureWorkday(4);
});

describe("T2.8 odrzucenie rezerwacji z powodem (MP-011)", () => {
  it("PENDING -> CANCELLED, powód zapisany, sloty wolne, mail z powodem, wpis w dzienniku", async () => {
    await db.settings.update({ where: { id: 1 }, data: { bays: 1 } });
    const service = await shortService();
    const booking = await createBooking(await bookingInput(at(day, "10:00"), { source: "ONLINE" }));
    const email = (await db.customer.findUniqueOrThrow({ where: { id: booking.customerId } })).email;
    outbox.length = 0;

    await rejectBooking(booking.id, "Brak części do tego modelu", actor);

    const after = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(after.status).toBe("CANCELLED");
    expect(after.cancelReason).toBe("Brak części do tego modelu");
    expect(after.cancelledAt).not.toBeNull();
    expect(await slotCount()).toBe(0);
    const iso = at(day, "10:00").toISOString();
    expect((await getAvailability(day, 1, service.durationMin))[0]?.times.some((t) => t.iso === iso)).toBe(true);

    const mail = mailsTo(email)[0];
    expect(mail?.subject).toContain("anulowana");
    expect(mail?.text).toContain("Powód: Brak części do tego modelu");
    expect(mail?.ics?.method).toBe("CANCEL");

    const log = await db.auditLog.findFirstOrThrow({ where: { action: "booking.reject", entityId: booking.id } });
    expect(log.actor).toBe(actor.email);
    // Free-text reason must not leak into the audit log (it survives customer anonymisation).
    expect(JSON.stringify(log.details)).not.toContain("Brak części");
    expect(log.details).toMatchObject({ to: "CANCELLED", hasReason: true });
  });

  it("bez powodu: zdanie z powodem jest pomijane", async () => {
    const booking = await createBooking(await bookingInput(at(day, "10:00"), { source: "ONLINE" }));
    const email = (await db.customer.findUniqueOrThrow({ where: { id: booking.customerId } })).email;
    outbox.length = 0;
    await rejectBooking(booking.id, null, actor);
    expect((await db.booking.findUniqueOrThrow({ where: { id: booking.id } })).cancelReason).toBeNull();
    expect(mailsTo(email)[0]?.text).not.toContain("Powód");
  });

  it("odrzucić można tylko rezerwację oczekującą", async () => {
    const booking = await createBooking(await bookingInput(at(day, "10:00"), { source: "ADMIN", actor }));
    await expect(rejectBooking(booking.id, "x", actor)).rejects.toBeInstanceOf(BookingError);
    expect((await db.booking.findUniqueOrThrow({ where: { id: booking.id } })).status).toBe("CONFIRMED");
  });

  it("zwykłe anulowanie potwierdzonej wizyty działa jak dotąd (bez powodu)", async () => {
    const { changeBookingStatus } = await import("@/lib/booking");
    const booking = await createBooking(await bookingInput(at(day, "10:00"), { source: "ADMIN", actor }));
    await changeBookingStatus(booking.id, "CANCELLED", actor);
    const after = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(after.status).toBe("CANCELLED");
    expect(after.cancelReason).toBeNull();
    expect(await slotCount()).toBe(0);
  });

  it("własny szablon z bazy bez {{powod}} nadal pokazuje powód", async () => {
    await db.emailTemplate.update({
      where: { key: "booking_cancelled" },
      data: { body: "Rezerwacja {{termin}} anulowana." },
    });
    try {
      const booking = await createBooking(await bookingInput(at(day, "10:00"), { source: "ONLINE" }));
      const email = (await db.customer.findUniqueOrThrow({ where: { id: booking.customerId } })).email;
      outbox.length = 0;
      await rejectBooking(booking.id, "Brak wolnego stanowiska", actor);
      expect(mailsTo(email)[0]?.text).toContain("Powód: Brak wolnego stanowiska");
    } finally {
      const { DEFAULT_TEMPLATES } = await import("@/lib/email/templates");
      await db.emailTemplate.update({ where: { key: "booking_cancelled" }, data: { body: DEFAULT_TEMPLATES.booking_cancelled!.body } });
    }
  });
});
