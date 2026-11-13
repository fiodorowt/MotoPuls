import { beforeEach, describe, expect, it, vi } from "vitest";
import { BookingError, SlotTakenError, createBlock, createBooking, getAvailability, moveBooking } from "@/lib/booking";
import { db } from "@/lib/db";
import { at, bookingInput, futureWorkday, resetData, shortService, slotCount } from "./helpers";

vi.mock("@/lib/email/send", async () => (await import("./mail")).mailMock());

const actor = { email: "int-owner@motopuls.test", id: "int-user" };
let day: string;

beforeEach(async () => {
  await resetData();
  day = await futureWorkday(2);
});

async function setBays(bays: number) {
  await db.settings.update({ where: { id: 1 }, data: { bays } });
}

function outcomes(results: PromiseSettledResult<unknown>[]) {
  return {
    ok: results.filter((r) => r.status === "fulfilled").length,
    taken: results.filter((r) => r.status === "rejected" && r.reason instanceof SlotTakenError).length,
    other: results.filter((r) => r.status === "rejected" && !(r.reason instanceof SlotTakenError)),
  };
}

describe("T1.1 równoległe rezerwacje online (bays=2)", () => {
  it("5 żądań na ten sam start: dokładnie 2 sukcesy na różnych stanowiskach", async () => {
    const start = at(day, "10:00");
    const service = await shortService();
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, async () => createBooking(await bookingInput(start))),
    );
    const o = outcomes(results);
    expect(o.ok).toBe(2);
    expect(o.taken).toBe(3);
    expect(o.other).toEqual([]);

    const bookings = await db.booking.findMany({ include: { slots: true } });
    expect(bookings).toHaveLength(2);
    expect(bookings.map((b) => b.bay).sort()).toEqual([1, 2]);
    const segments = Math.ceil(service.durationMin / 15);
    expect(await slotCount()).toBe(2 * segments);
  });
});

describe("T1.2 online kontra ręczna", () => {
  it("bays=1: jeden sukces, brak osieroconych rezerwacji", async () => {
    await setBays(1);
    const start = at(day, "10:00");
    const results = await Promise.allSettled([
      createBooking(await bookingInput(start, { source: "ONLINE" })),
      createBooking(await bookingInput(start, { source: "ADMIN", actor })),
    ]);
    const o = outcomes(results);
    expect(o.ok).toBe(1);
    expect(o.taken).toBe(1);
    expect(await db.booking.count()).toBe(1);
    const orphanSlots = await db.bookingSlot.count({ where: { bookingId: null, blockId: null } });
    expect(orphanSlots).toBe(0);
  });
});

describe("T1.3 przeniesienie na zajęty termin", () => {
  it("B -> 10:00 zajęte przez A: błąd i B bez zmian", async () => {
    await setBays(1);
    const a = await createBooking(await bookingInput(at(day, "10:00"), { source: "ADMIN", actor }));
    const b = await createBooking(await bookingInput(at(day, "12:00"), { source: "ADMIN", actor }));
    const before = await db.bookingSlot.findMany({ where: { bookingId: b.id }, orderBy: { slotStart: "asc" } });

    await expect(moveBooking(b.id, at(day, "10:00"), actor)).rejects.toBeInstanceOf(SlotTakenError);

    const after = await db.bookingSlot.findMany({ where: { bookingId: b.id }, orderBy: { slotStart: "asc" } });
    expect(after.map((s) => s.slotStart.toISOString())).toEqual(before.map((s) => s.slotStart.toISOString()));
    const reloaded = await db.booking.findUniqueOrThrow({ where: { id: b.id } });
    expect(reloaded.startsAt.toISOString()).toBe(at(day, "12:00").toISOString());
    expect((await db.bookingSlot.count({ where: { bookingId: a.id } })) > 0).toBe(true);
  });

  it("przeniesienie na wolny termin zwalnia stare odcinki", async () => {
    await setBays(1);
    const b = await createBooking(await bookingInput(at(day, "12:00"), { source: "ADMIN", actor }));
    const count = await slotCount();
    await moveBooking(b.id, at(day, "14:00"), actor);
    expect(await slotCount()).toBe(count);
    const reloaded = await db.booking.findUniqueOrThrow({ where: { id: b.id } });
    expect(reloaded.startsAt.toISOString()).toBe(at(day, "14:00").toISOString());
  });
});

describe("T1.4 i T1.5 blokady", () => {
  it("T1.4 blokada nachodząca na wizytę: czytelny błąd, brak bloku", async () => {
    await setBays(1);
    await createBooking(await bookingInput(at(day, "10:00"), { source: "ADMIN", actor }));
    const before = await slotCount();
    await expect(
      createBlock({ start: at(day, "09:00"), end: at(day, "11:00"), bay: 1, reason: "Przegląd sprzętu" }, actor),
    ).rejects.toBeInstanceOf(BookingError);
    expect(await db.block.count()).toBe(0);
    expect(await slotCount()).toBe(before);
  });

  it("T1.5 wizyta na zablokowany termin: odrzucona (ADMIN i ONLINE), termin niewidoczny", async () => {
    await setBays(1);
    await createBlock({ start: at(day, "09:00"), end: at(day, "11:00"), bay: null, reason: "Urlop" }, actor);
    await expect(createBooking(await bookingInput(at(day, "10:00"), { source: "ADMIN", actor }))).rejects.toBeInstanceOf(SlotTakenError);
    await expect(createBooking(await bookingInput(at(day, "10:00"), { source: "ONLINE" }))).rejects.toBeInstanceOf(SlotTakenError);

    const service = await shortService();
    const [availability] = await getAvailability(day, 1, service.durationMin);
    expect(availability?.times.some((t) => t.iso === at(day, "10:00").toISOString())).toBe(false);
    expect(await db.booking.count()).toBe(0);
  });
});

describe("T1.6 wizyty nachodzące częściowo", () => {
  it("równoległe starty co 15 min nie przekraczają liczby stanowisk i nie zostawiają częściowych zapisów", async () => {
    await setBays(2);
    const service = await shortService();
    const segments = Math.ceil(service.durationMin / 15);
    const starts = ["10:00", "10:15", "10:30", "10:00", "10:15", "10:30"].map((t) => at(day, t));
    const results = await Promise.allSettled(starts.map(async (s) => createBooking(await bookingInput(s, { source: "ADMIN", actor }))));
    const o = outcomes(results);
    expect(o.other).toEqual([]);
    const bookings = await db.booking.findMany();
    expect(bookings.length).toBe(o.ok);
    // Każda zapisana wizyta ma komplet odcinków, a żadne stanowisko nie ma dubli.
    for (const b of bookings) {
      expect(await db.bookingSlot.count({ where: { bookingId: b.id } })).toBe(segments);
    }
    expect(await slotCount()).toBe(bookings.length * segments);
    const grouped = await db.bookingSlot.groupBy({ by: ["bay", "slotStart"], _count: true });
    expect(grouped.every((g) => g._count === 1)).toBe(true);
    expect(o.ok).toBeLessThanOrEqual(2 * Math.ceil(starts.length / 2));
    // Przy dwóch stanowiskach w żadnej chwili nie ma więcej niż 2 równoległych wizyt.
    const perSlot = await db.bookingSlot.groupBy({ by: ["slotStart"], _count: true });
    expect(perSlot.every((g) => g._count <= 2)).toBe(true);
  });
});
