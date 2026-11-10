import "server-only";
import { env } from "./env";
import { safeEqual, sign } from "./crypto";
import { clientIp } from "./rate-limit";

const MAX_AGE_MS = 6 * 3_600_000;
export const HONEYPOT_FIELD = "website";
export const FORM_TOKEN_FIELD = "form_token";

/** Podpisany znacznik czasu renderowania formularza. */
export function issueFormToken(): string {
  const ts = Date.now().toString();
  return `${ts}.${sign(ts, "form-token")}`;
}

/**
 * Honeypot + limit czasowy + (opcjonalnie) Cloudflare Turnstile.
 * Zwraca komunikat błędu albo null. Dla botów komunikat jest celowo ogólny.
 */
export async function antispamError(fields: {
  honeypot: string | null | undefined;
  token: string | null | undefined;
  turnstile?: string | null;
}): Promise<string | null> {
  const generic = "Nie udało się wysłać formularza. Odśwież stronę i spróbuj ponownie.";
  if (fields.honeypot) return generic;

  const [ts, signature] = (fields.token ?? "").split(".");
  if (!ts || !signature || !safeEqual(signature, sign(ts, "form-token"))) return generic;
  const age = Date.now() - Number(ts);
  if (!Number.isFinite(age) || age > MAX_AGE_MS) return "Formularz wygasł. Odśwież stronę i spróbuj ponownie.";
  if (age < env().ANTISPAM_MIN_SECONDS * 1000) return "Formularz został wysłany zbyt szybko. Spróbuj ponownie za chwilę.";

  const secret = env().TURNSTILE_SECRET_KEY;
  if (secret) {
    if (!fields.turnstile) return "Potwierdź, że nie jesteś robotem.";
    try {
      const body = new URLSearchParams({ secret, response: fields.turnstile, remoteip: await clientIp() });
      const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
      const json = (await res.json()) as { success?: boolean };
      if (!json.success) return "Weryfikacja antyspamowa nie powiodła się. Spróbuj ponownie.";
    } catch {
      return "Weryfikacja antyspamowa jest chwilowo niedostępna. Spróbuj ponownie.";
    }
  }
  return null;
}
