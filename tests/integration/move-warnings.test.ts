import { beforeEach, describe, expect, it, vi } from "vitest";
import { MoveWarningError, createBooking, moveBooking } from "@/lib/booking";
import { db } from "@/lib/db";
import { addDays, isoWeekday, warsawDate } from "@/lib/time";
import { at, bookingInput, futureWorkday, resetData } from "./helpers";
import { outbox } from "./mail";

vi.mock("@/lib/email/send", async () => (await import("./mail")).mailMock());

const actor = { email: "int-owner@motopuls.test", id: "int-user" };
let day: string;

beforeEach(async () => {
  await resetData();
  day = await futureWorkday(2);
});

function nextSunday(): string {
  let d = addDays(warsawDate(new Date()), 14);
  while (isoWeekday(d) !== 7) d = addDays(d, 1);
  return d;
}

async function moves() {
  return db.auditLog.findMany({ where: { action: "booking.move" } });
}

describe("T3.5 przenoszenie poza godziny i święta (MP-013)", () => {
  it("niedziela bez potwierdzenia: ostrzeżenie, brak zmiany, brak maila i wpisu", async () => {
    const booking = await createBooking(await bookingInput(at(day, "10:00"), { source: "ADMIN", actor }));
    outbox.length = 0;
    const sunday = nextSunday();

    const error = await moveBooking(booking.id, at(sunday, "10:00"), actor).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(MoveWarningError);
    expect((error as MoveWarningError).warnings.join(" ")).toMatch(/Nieczynne/);

    const after = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(after.startsAt.toISOString()).toBe(at(day, "10:00").toISOString());
    expect(outbox).toHaveLength(0);
    expect(await moves()).toHaveLength(0);
  });

  it("z potwierdzeniem (force): zapis, mail i wpis w dzienniku z flagą poza godzinami", async () => {
    const booking = await createBooking(await bookingInput(at(day, "10:00"), { source: "ADMIN", actor }));
    const sunday = nextSunday();
    await moveBooking(booking.id, at(sunday, "10:00"), actor, undefined, { force: true });

    const after = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(after.startsAt.toISOString()).toBe(at(sunday, "10:00").toISOString());
    const [log] = await moves();
    expect(JSON.stringify(log?.details)).toContain('"outsideHours":true');
  });

  it("poza godzinami w dzień roboczy (po zamknięciu) też wymaga potwierdzenia", async () => {
    const booking = await createBooking(await bookingInput(at(day, "10:00"), { source: "ADMIN", actor }));
    await expect(moveBooking(booking.id, at(day, "18:00"), actor)).rejects.toBeInstanceOf(MoveWarningError);
    await expect(moveBooking(booking.id, at(day, "07:00"), actor)).rejects.toBeInstanceOf(MoveWarningError);
  });

  it("dzień wolny (ClosedDay) wymaga potwierdzenia", async () => {
    const booking = await createBooking(await bookingInput(at(day, "10:00"), { source: "ADMIN", actor }));
    const other = addDays(day, 7);
    await db.closedDay.create({ data: { date: new Date(`${other}T00:00:00Z`), reason: "Test" } });
    await expect(moveBooking(booking.id, at(other, "10:00"), actor)).rejects.toBeInstanceOf(MoveWarningError);
  });

  it("przeniesienie w godzinach pracy działa jak dotąd, bez flagi w dzienniku", async () => {
    const booking = await createBooking(await bookingInput(at(day, "10:00"), { source: "ADMIN", actor }));
    await moveBooking(booking.id, at(day, "13:00"), actor);
    const after = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(after.startsAt.toISOString()).toBe(at(day, "13:00").toISOString());
    const [log] = await moves();
    expect(JSON.stringify(log?.details)).not.toContain("outsideHours");
  });

  it("force nie omija kolizji terminów", async () => {
    await db.settings.update({ where: { id: 1 }, data: { bays: 1 } });
    const sunday = nextSunday();
    await createBooking(await bookingInput(at(sunday, "10:00"), { source: "ADMIN", actor }));
    const b = await createBooking(await bookingInput(at(day, "10:00"), { source: "ADMIN", actor }));
    await expect(moveBooking(b.id, at(sunday, "10:00"), actor, undefined, { force: true })).rejects.not.toBeInstanceOf(MoveWarningError);
  });
});
