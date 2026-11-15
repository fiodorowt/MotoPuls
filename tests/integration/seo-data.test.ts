// Etap 4 (niezależny tester): zapis areaServed przez akcję panelu oraz migracje 20261115120000 i 20261115120100.
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { sha256 } from "@/lib/crypto";
import { db } from "@/lib/db";
import { SETTINGS } from "../../prisma/seed-data";

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

const { saveCompany } = await import("@/app/admin/(panel)/ustawienia/actions");
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

/** Pełny formularz firmy z wartościami z seeda; `extra` nadpisuje pola. */
function companyForm(extra: Record<string, string> = {}): FormData {
  const fd = new FormData();
  const base: Record<string, string> = {
    brandName: SETTINGS.brandName,
    legalName: SETTINGS.legalName,
    nip: SETTINGS.nip,
    street: SETTINGS.street,
    postalCode: SETTINGS.postalCode,
    city: SETTINGS.city,
    phones: SETTINGS.phones.join("\n"),
    email: SETTINGS.email,
    facebookUrl: SETTINGS.facebookUrl,
    latitude: String(SETTINGS.latitude),
    longitude: String(SETTINGS.longitude),
    directions: SETTINGS.directions,
    areaServed: "",
    tagline: SETTINGS.tagline,
    about: SETTINGS.about,
    pricingNote: "",
  };
  for (const [k, v] of Object.entries({ ...base, ...extra })) fd.set(k, v);
  return fd;
}

/** Wykonuje instrukcje SQL z pliku migracji (bez komentarzy). */
async function runMigration(name: string): Promise<void> {
  const sql = readFileSync(path.resolve("prisma/migrations", name, "migration.sql"), "utf8")
    .split("\n")
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n");
  for (const statement of sql.split(/;\s*(?:\n|$)/).map((s) => s.trim()).filter(Boolean)) await db.$executeRawUnsafe(statement);
}

const OLD_INTRO = "Auto firmowe ma jeździć, a nie stać. Ustalimy stałe warunki, priorytetowe terminy i jedną osobę do kontaktu.";
const OLD_FLEET =
  "Prowadzimy obsługę serwisową samochodów firmowych: przeglądy, naprawy bieżące, klimatyzację i diagnostykę. Ustalamy stałe warunki współpracy, pilnujemy terminów i prowadzimy historię każdego pojazdu.";

beforeEach(async () => {
  await db.session.deleteMany();
  await db.user.deleteMany({ where: { email: { endsWith: "@motopuls.test" } } });
  await db.settings.update({ where: { id: 1 }, data: { areaServed: [] } });
  currentToken = undefined;
});

describe("MP-040 zapis areaServed przez akcję panelu", () => {
  it("właściciel: lista z linii/przecinków jest czyszczona, bez duplikatów, zapisana i trafia do dziennika", async () => {
    await loginAs("OWNER");
    const result = await saveCompany(empty, companyForm({ areaServed: " Białe Błota\nBydgoszcz, Białe Błota ;; Łochowo " }));
    expect(result.ok).toBe(true);
    const s = await db.settings.findUniqueOrThrow({ where: { id: 1 } });
    expect(s.areaServed).toEqual(["Białe Błota", "Bydgoszcz", "Łochowo"]);
    expect(await db.auditLog.count({ where: { action: "settings.company" } })).toBeGreaterThan(0);
  });

  it("puste pole czyści obszar (JSON-LD go pominie)", async () => {
    await db.settings.update({ where: { id: 1 }, data: { areaServed: ["Stare"] } });
    await loginAs("OWNER");
    expect((await saveCompany(empty, companyForm({ areaServed: "  \n " }))).ok).toBe(true);
    expect((await db.settings.findUniqueOrThrow({ where: { id: 1 } })).areaServed).toEqual([]);
  });

  it("zapis firmy nie zmienia współrzędnych względem seeda", async () => {
    await loginAs("OWNER");
    await saveCompany(empty, companyForm({ areaServed: "Test" }));
    const s = await db.settings.findUniqueOrThrow({ where: { id: 1 } });
    expect([s.latitude, s.longitude]).toEqual([53.0952, 17.9285]); // wartości z main (PLACEHOLDER właściciela)
  });

  it("odrzuca ponad 20 pozycji i zbyt długą nazwę, nic nie zapisuje", async () => {
    await loginAs("OWNER");
    const many = Array.from({ length: 21 }, (_, i) => `M${i}`).join("\n");
    expect((await saveCompany(empty, companyForm({ areaServed: many }))).ok).toBe(false);
    expect((await saveCompany(empty, companyForm({ areaServed: "x".repeat(81) }))).ok).toBe(false);
    expect((await db.settings.findUniqueOrThrow({ where: { id: 1 } })).areaServed).toEqual([]);
  });

  it("pracownik nie może zapisać (przekierowanie), obszar bez zmian", async () => {
    await loginAs("EMPLOYEE");
    await expect(saveCompany(empty, companyForm({ areaServed: "Haker" }))).rejects.toThrow("NEXT_REDIRECT");
    expect((await db.settings.findUniqueOrThrow({ where: { id: 1 } })).areaServed).toEqual([]);
  });
});

describe("migracje etapu 4", () => {
  it("settings_area_served: kolumna jest NOT NULL z domyślną pustą tablicą (addytywnie)", async () => {
    const rows = await db.$queryRawUnsafe<{ is_nullable: string; column_default: string }[]>(
      `SELECT is_nullable, column_default FROM information_schema.columns WHERE table_name='Settings' AND column_name='areaServed'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.is_nullable).toBe("NO");
    expect(rows[0]!.column_default).toMatch(/ARRAY\[\]/);
  });

  it("fleet_copy_soften: zamienia dawną treść startową", async () => {
    await db.contentBlock.update({ where: { key: "fleet_intro" }, data: { body: OLD_INTRO } });
    await db.serviceCategory.update({ where: { slug: "floty" }, data: { description: OLD_FLEET } });
    await runMigration("20261115120100_fleet_copy_soften");
    const block = await db.contentBlock.findUniqueOrThrow({ where: { key: "fleet_intro" } });
    const cat = await db.serviceCategory.findUniqueOrThrow({ where: { slug: "floty" } });
    expect(block.body).not.toMatch(/priorytet/i);
    expect(cat.description).not.toMatch(/histori/i);
  });

  it("fleet_copy_soften: NIE nadpisuje tekstów zmienionych przez właściciela i jest idempotentna", async () => {
    const mine = "Nasz własny tekst o flotach, edytowany w panelu.";
    await db.contentBlock.update({ where: { key: "fleet_intro" }, data: { body: mine } });
    await db.serviceCategory.update({ where: { slug: "floty" }, data: { description: `${mine} 2` } });
    await runMigration("20261115120100_fleet_copy_soften");
    await runMigration("20261115120100_fleet_copy_soften");
    expect((await db.contentBlock.findUniqueOrThrow({ where: { key: "fleet_intro" } })).body).toBe(mine);
    expect((await db.serviceCategory.findUniqueOrThrow({ where: { slug: "floty" } })).description).toBe(`${mine} 2`);
  });
});
