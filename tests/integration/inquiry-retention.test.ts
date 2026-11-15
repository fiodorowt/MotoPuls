import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { PICKUP_ADDRESS_KEY, PICKUP_ADDRESS_RETENTION_DAYS, cleanup } from "@/lib/maintenance";

const DAY = 86_400_000;
const now = new Date();
let months: number;

async function make(over: { type?: "PREMIUM" | "CONTACT"; status?: "NEW" | "IN_PROGRESS" | "CLOSED"; createdDaysAgo?: number; updatedDaysAgo?: number }) {
  const created = new Date(now.getTime() - (over.createdDaysAgo ?? 0) * DAY);
  const row = await db.inquiry.create({
    data: {
      type: over.type ?? "CONTACT",
      status: over.status ?? "NEW",
      name: "Test",
      phone: "600000000",
      email: "t@motopuls.test",
      message: "Wiadomość testowa",
      data: { Pojazd: "Test Auto", [PICKUP_ADDRESS_KEY]: "Testowa 1, Białe Błota" },
      createdAt: created,
    },
  });
  // updatedAt ustawiamy surowym SQL (Prisma nadpisuje @updatedAt).
  const updated = new Date(now.getTime() - (over.updatedDaysAgo ?? over.createdDaysAgo ?? 0) * DAY);
  await db.$executeRaw`UPDATE "Inquiry" SET "updatedAt" = ${updated} WHERE id = ${row.id}`;
  return row.id;
}

const exists = async (id: string) => (await db.inquiry.findUnique({ where: { id } })) !== null;

beforeEach(async () => {
  await db.inquiry.deleteMany();
  months = (await db.settings.findUniqueOrThrow({ where: { id: 1 } })).retentionMonths;
});

describe("W2 retencja zapytań", () => {
  it("usuwa zapytania każdego statusu starsze niż retentionMonths, młodsze zostają", async () => {
    const old = (months + 1) * 31;
    const oldNew = await make({ status: "NEW", createdDaysAgo: old });
    const oldProgress = await make({ status: "IN_PROGRESS", createdDaysAgo: old });
    const youngNew = await make({ status: "NEW", createdDaysAgo: 10 });
    await cleanup(now);
    expect(await exists(oldNew)).toBe(false);
    expect(await exists(oldProgress)).toBe(false);
    expect(await exists(youngNew)).toBe(true);
  });

  it("zachowuje regułę CLOSED (od updatedAt), także dla młodszego createdAt", async () => {
    const closedOld = await make({ status: "CLOSED", createdDaysAgo: 5, updatedDaysAgo: (months + 1) * 31 });
    const closedFresh = await make({ status: "CLOSED", createdDaysAgo: 5, updatedDaysAgo: 1 });
    await cleanup(now);
    expect(await exists(closedOld)).toBe(false);
    expect(await exists(closedFresh)).toBe(true);
  });

  it("kasuje adres odbioru tylko dla PREMIUM CLOSED po N dniach, reszta pól zostaje", async () => {
    const n = PICKUP_ADDRESS_RETENTION_DAYS;
    const stale = await make({ type: "PREMIUM", status: "CLOSED", createdDaysAgo: n + 20, updatedDaysAgo: n + 1 });
    const fresh = await make({ type: "PREMIUM", status: "CLOSED", createdDaysAgo: n + 20, updatedDaysAgo: n - 1 });
    const open = await make({ type: "PREMIUM", status: "IN_PROGRESS", createdDaysAgo: n + 20, updatedDaysAgo: n + 1 });
    const other = await make({ type: "CONTACT", status: "CLOSED", createdDaysAgo: n + 20, updatedDaysAgo: n + 1 });
    await cleanup(now);

    const data = async (id: string) => (await db.inquiry.findUniqueOrThrow({ where: { id } })).data as Record<string, string>;
    expect(await data(stale)).toEqual({ Pojazd: "Test Auto" });
    expect((await data(stale))[PICKUP_ADDRESS_KEY]).toBeUndefined();
    expect(await data(fresh)).toHaveProperty(PICKUP_ADDRESS_KEY);
    expect(await data(open)).toHaveProperty(PICKUP_ADDRESS_KEY);
    expect(await data(other)).toHaveProperty(PICKUP_ADDRESS_KEY);
    const row = await db.inquiry.findUniqueOrThrow({ where: { id: stale } });
    expect(row.message).toBe("Wiadomość testowa");
    expect(row.name).toBe("Test");
  });
});
