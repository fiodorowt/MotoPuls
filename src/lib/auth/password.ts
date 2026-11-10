import { randomInt } from "node:crypto";
import { hash, verify } from "@node-rs/argon2";

/** Parametry zgodne z zaleceniami OWASP dla Argon2id (19 MiB, 2 iteracje, 1 wątek). */
const ARGON2_OPTIONS = {
  algorithm: 2, // Argon2id
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 128;

const COMMON = new Set([
  "123456789012",
  "password1234",
  "haslo1234567",
  "qwertyuiopas",
  "motopuls1234",
  "admin1234567",
  "zaq12wsxcde3",
]);

export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

/** Zwraca komunikat błędu albo null, gdy hasło spełnia politykę (długość zamiast wymuszania znaków specjalnych). */
export function passwordPolicyError(password: string, email?: string): string | null {
  if (password.length < PASSWORD_MIN) return `Hasło musi mieć co najmniej ${PASSWORD_MIN} znaków.`;
  if (password.length > PASSWORD_MAX) return `Hasło może mieć najwyżej ${PASSWORD_MAX} znaków.`;
  const lower = password.toLowerCase();
  if (COMMON.has(lower) || /^(.)\1+$/.test(password)) return "To hasło jest zbyt łatwe do odgadnięcia.";
  const local = email?.split("@")[0]?.toLowerCase();
  if (local && local.length >= 4 && lower.includes(local)) return "Hasło nie może zawierać adresu e-mail.";
  return null;
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

/** Hasło startowe: 20 znaków bez mylących się liter (0/O, 1/l). */
export function generatePassword(length = 20): string {
  return Array.from({ length }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
}
