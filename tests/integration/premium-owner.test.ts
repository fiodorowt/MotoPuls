import { randomBytes } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { sha256 } from "@/lib/crypto";
import { db } from "@/lib/db";
import { resetData } from "./helpers";

// Sesja z prawdziwej bazy: cookie podstawiane przez mock next/headers, redirect() rzuca jak w Next.js.
let currentToken: string | undefined;
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (name === "mp_session" && currentToken ? { value: currentToken } : undefined) }),
  headers: async () => new Headers(),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

const { savePremium } = await import("@/app/admin/(panel)/ustawienia/actions");
const empty = { ok: false, message: "" };

async function loginAs(role: "OWNER" | "EMPLOYEE"): Promise<void> {
  const user = await db.user.create({
    data: {
      email: `${role.toLowerCase()}-${randomBytes(4).toString("hex")}@motopuls.test`,
      name: role,
      passwordHash: "not-a-real-hash",
      role,
      totpEnabled: true,
      mustChangePassword: false,
    },
  });
  currentToken = randomBytes(32).toString("base64url");
  await db.session.create({
    data: { tokenHash: sha256(currentToken), userId: user.id, twoFactorPassed: true, expiresAt: new Date(Date.now() + 3_600_000) },
  });
}

function form(extra: Record<string, string> = {}): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries({ premiumEnabled: "on", premiumPriceNote: "Od 500 zł (test)", premiumPickupNote: "", ...extra })) fd.set(k, v);
  return fd;
}

beforeEach(async () => {
  await resetData();
  await db.session.deleteMany();
  await db.user.deleteMany({ where: { email: { endsWith: "@motopuls.test" } } });
  await db.auditLog.deleteMany({ where: { action: "settings.premium" } });
  await db.settings.update({ where: { id: 1 }, data: { premiumEnabled: false, premiumPickupEnabled: false, premiumPriceNote: "Cena ustalana indywidualnie" } });
  currentToken = undefined;
});

describe("MP-032 edycja ustawień Premium tylko przez właściciela", () => {
  it("pracownik: akcja przekierowuje, ustawienia i dziennik bez zmian", async () => {
    await loginAs("EMPLOYEE");
    await expect(savePremium(empty, form())).rejects.toThrow("NEXT_REDIRECT");
    const s = await db.settings.findUniqueOrThrow({ where: { id: 1 } });
    expect(s.premiumEnabled).toBe(false);
    expect(s.premiumPriceNote).toBe("Cena ustalana indywidualnie");
    expect(await db.auditLog.count({ where: { action: "settings.premium" } })).toBe(0);
  });

  it("brak sesji: akcja przekierowuje do logowania", async () => {
    await expect(savePremium(empty, form())).rejects.toThrow("NEXT_REDIRECT:/admin/login");
    expect((await db.settings.findUniqueOrThrow({ where: { id: 1 } })).premiumEnabled).toBe(false);
  });

  it("właściciel: zapis i wpis settings.premium w dzienniku bez treści notatek", async () => {
    await loginAs("OWNER");
    const result = await savePremium(empty, form({ premiumPickupEnabled: "on" }));
    expect(result.ok).toBe(true);
    const s = await db.settings.findUniqueOrThrow({ where: { id: 1 } });
    expect(s).toMatchObject({ premiumEnabled: true, premiumPickupEnabled: true, premiumPriceNote: "Od 500 zł (test)" });
    const log = await db.auditLog.findFirstOrThrow({ where: { action: "settings.premium" } });
    expect(JSON.stringify(log)).not.toContain("Od 500");
  });

  it("właściciel: walidacja Zod odrzuca za krótką notatkę ceny i nic nie zapisuje", async () => {
    await loginAs("OWNER");
    const result = await savePremium(empty, form({ premiumPriceNote: "x" }));
    expect(result.ok).toBe(false);
    expect((await db.settings.findUniqueOrThrow({ where: { id: 1 } })).premiumEnabled).toBe(false);
  });
});
