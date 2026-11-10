import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  hkdfSync,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { env } from "./env";

/** Losowy token URL-safe; domyślnie 256 bitów entropii. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Osobny klucz na każde zastosowanie, wyprowadzony z APP_SECRET. */
function deriveKey(purpose: string): Buffer {
  return Buffer.from(hkdfSync("sha256", env().APP_SECRET, "motopuls", purpose, 32));
}

export function encrypt(plain: string, purpose: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(purpose), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64url");
}

export function decrypt(payload: string, purpose: string): string {
  const raw = Buffer.from(payload, "base64url");
  const decipher = createDecipheriv("aes-256-gcm", deriveKey(purpose), raw.subarray(0, 12));
  decipher.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
}

export function sign(data: string, purpose: string): string {
  return createHmac("sha256", deriveKey(purpose)).update(data).digest("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}
