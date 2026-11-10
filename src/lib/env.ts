import { z } from "zod";

const schema = z.object({
  APP_URL: z.url().default("http://localhost:3000"),
  APP_SECRET: z.string().min(32, "APP_SECRET musi mieć co najmniej 32 znaki"),
  CRON_SECRET: z.string().min(16, "CRON_SECRET musi mieć co najmniej 16 znaków"),
  DATABASE_URL: z.string().min(1),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  MAIL_FROM: z.string().default("Moto Puls <no-reply@localhost>"),
  WORKSHOP_NOTIFY_EMAIL: z.string().optional(),
  TURNSTILE_SECRET_KEY: z.string().optional(),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
  UPLOAD_DIR: z.string().default("./uploads"),
  /** Minimalny czas wypełniania formularza (antyspam); testy E2E ustawiają 0 */
  ANTISPAM_MIN_SECONDS: z.coerce.number().min(0).default(3),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/** Walidowane leniwie, żeby `next build` nie wymagał sekretów. */
export function env(): Env {
  if (!cached) {
    const emptyToUndefined = Object.fromEntries(
      Object.entries(process.env).map(([k, v]) => [k, v === "" ? undefined : v]),
    );
    const parsed = schema.safeParse(emptyToUndefined);
    if (!parsed.success) {
      const problems = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      throw new Error(`Błędna konfiguracja środowiska – ${problems}`);
    }
    cached = parsed.data;
  }
  return cached;
}

export const isProduction = process.env.NODE_ENV === "production";
