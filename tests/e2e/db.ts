/**
 * Bezpośredni dostęp do jednorazowej bazy E2E (port 54330, patrz scripts/e2e-server.ts).
 * Tylko dane testowe: sesje pracowników omijają formularz logowania i 2FA, które pokrywa 02-admin.spec.ts.
 */
import { createHash, randomBytes } from "node:crypto";
import { Pool } from "pg";

const dbPort = process.env.E2E_DB_PORT ?? "54330";
const pool = new Pool({ connectionString: `postgresql://motopuls:motopuls@localhost:${dbPort}/motopuls`, max: 2 });

export const SESSION_COOKIE = "__Host-mp_session";

export async function createStaffSession(role: "OWNER" | "EMPLOYEE", label: string): Promise<{ email: string; token: string }> {
  const email = `${role.toLowerCase()}-${label}@motopuls.test`;
  const userId = `e2e${randomBytes(9).toString("hex")}`;
  const token = randomBytes(32).toString("base64url");
  await pool.query(
    `INSERT INTO "User" (id, email, name, "passwordHash", role, active, "mustChangePassword", "totpEnabled", "updatedAt")
     VALUES ($1, $2, $3, 'e2e-not-a-real-hash', $4::"Role", true, false, true, now())`,
    [userId, email, role === "OWNER" ? "Właściciel testowy" : "Pracownik testowy", role],
  );
  await pool.query(
    `INSERT INTO "Session" (id, "tokenHash", "userId", "twoFactorPassed", "expiresAt")
     VALUES ($1, $2, $3, true, now() + interval '8 hours')`,
    [`e2e${randomBytes(9).toString("hex")}`, createHash("sha256").update(token).digest("hex"), userId],
  );
  return { email, token };
}

export async function bookingByCustomerEmail(email: string): Promise<{ id: string; token: string; status: string; cancelReason: string | null }> {
  const { rows } = await pool.query(
    `SELECT b.id, b.token, b.status::text AS status, b."cancelReason"
     FROM "Booking" b JOIN "Customer" c ON c.id = b."customerId" WHERE c.email = $1`,
    [email],
  );
  if (rows.length !== 1) throw new Error(`Oczekiwano 1 rezerwacji dla klienta testowego, jest ${rows.length}`);
  return rows[0];
}

export async function auditCount(action: string): Promise<number> {
  const { rows } = await pool.query(`SELECT count(*)::int AS n FROM "AuditLog" WHERE action = $1`, [action]);
  return rows[0].n;
}

export async function closePool(): Promise<void> {
  await pool.end();
}

/** Ustawia flagi Premium bezpośrednio w bazie testowej (stan początkowy scenariuszy MP-032..MP-034). */
export async function setPremiumFlags(enabled: boolean, pickup: boolean): Promise<void> {
  await pool.query(`UPDATE "Settings" SET "premiumEnabled" = $1, "premiumPickupEnabled" = $2 WHERE id = 1`, [enabled, pickup]);
}

export async function rowCount(table: "Booking" | "BookingSlot" | "Block" | "Inquiry"): Promise<number> {
  const { rows } = await pool.query(`SELECT count(*)::int AS n FROM "${table}"`);
  return rows[0].n;
}

export async function premiumInquiries(): Promise<{ type: string; data: Record<string, string> | null }[]> {
  const { rows } = await pool.query(`SELECT type::text AS type, data FROM "Inquiry" WHERE type = 'PREMIUM'`);
  return rows;
}

/** Ustawia teksty Premium w bazie testowej (cena i uwaga o odbiorze mają pochodzić wyłącznie z Settings). */
export async function setPremiumTexts(priceNote: string, pickupNote: string): Promise<void> {
  await pool.query(`UPDATE "Settings" SET "premiumPriceNote" = $1, "premiumPickupNote" = $2 WHERE id = 1`, [priceNote, pickupNote]);
}
