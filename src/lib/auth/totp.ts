import { Secret, TOTP } from "otpauth";

const PERIOD = 30;

export function newTotpSecret(): string {
  return new Secret({ size: 20 }).base32;
}

function totpFor(secretBase32: string, email: string): TOTP {
  return new TOTP({
    issuer: "Moto Puls",
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: PERIOD,
    secret: Secret.fromBase32(secretBase32),
  });
}

export function totpUri(secretBase32: string, email: string): string {
  return totpFor(secretBase32, email).toString();
}

/**
 * Sprawdza kod z tolerancją ±1 okna. Zwraca numer kroku, który trzeba zapisać,
 * aby ten sam kod nie mógł zostać użyty drugi raz – albo null, gdy kod jest błędny.
 */
export function verifyTotp(
  secretBase32: string,
  email: string,
  code: string,
  lastStep: number | null,
  now: number = Date.now(),
): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const delta = totpFor(secretBase32, email).validate({ token: code, window: 1, timestamp: now });
  if (delta === null) return null;
  const step = Math.floor(now / 1000 / PERIOD) + delta;
  if (lastStep !== null && step <= lastStep) return null;
  return step;
}

export function currentTotp(secretBase32: string, email: string, now: number = Date.now()): string {
  return totpFor(secretBase32, email).generate({ timestamp: now });
}
