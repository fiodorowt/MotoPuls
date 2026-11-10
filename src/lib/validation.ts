import { z } from "zod";

/** Wspólne schematy Zod – te same reguły w przeglądarce i na serwerze. */

const text = (min: number, max: number, label: string) =>
  z
    .string({ error: `${label}: pole wymagane` })
    .trim()
    .min(min, `${label}: pole wymagane`)
    .max(max, `${label}: najwyżej ${max} znaków`);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Najwyżej ${max} znaków`)
    .optional()
    .transform((v) => (v ? v : undefined));

export const phoneSchema = z
  .string({ error: "Podaj numer telefonu" })
  .transform((v) => v.replace(/[\s\-()]/g, ""))
  .pipe(z.string().regex(/^\+?\d{9,15}$/, "Podaj poprawny numer telefonu (np. 600 700 800)"));

export const emailSchema = z
  .string({ error: "Podaj adres e-mail" })
  .trim()
  .toLowerCase()
  .pipe(z.email("Podaj poprawny adres e-mail").max(254));

const currentYear = () => new Date().getFullYear();

const yearSchema = z.coerce
  .number({ error: "Podaj rok produkcji" })
  .int("Podaj rok produkcji")
  .min(1950, "Rok produkcji od 1950")
  .refine((y) => y <= currentYear() + 1, "Rok produkcji nie może być z przyszłości");

const optionalInt = (max: number, message: string) =>
  z
    .union([z.literal(""), z.coerce.number().int(message).min(0, message).max(max, message)])
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : v));

const plateSchema = z
  .string({ error: "Podaj numer rejestracyjny" })
  .transform((v) => v.replace(/[\s-]/g, "").toUpperCase())
  .pipe(z.string().regex(/^[A-Z0-9]{4,8}$/, "Podaj poprawny numer rejestracyjny (np. CB 12345)"));

const vinSchema = z
  .string()
  .transform((v) => v.replace(/\s/g, "").toUpperCase())
  .pipe(z.union([z.literal(""), z.string().regex(/^[A-HJ-NPR-Z0-9]{17}$/, "VIN ma 17 znaków (bez liter I, O, Q)")]))
  .optional()
  .transform((v) => (v ? v : undefined));

export const vehicleSchema = z.object({
  make: text(2, 40, "Marka"),
  model: text(1, 60, "Model"),
  year: yearSchema,
  plate: plateSchema,
  vin: vinSchema,
  mileage: optionalInt(2_000_000, "Podaj przebieg w km"),
  type: z.enum(["CAR", "VAN"], { error: "Wybierz typ pojazdu" }),
  description: optionalText(1000),
});

export const customerSchema = z.object({
  name: text(2, 80, "Imię"),
  phone: phoneSchema,
  email: emailSchema,
  terms: z.literal(true, { error: "Akceptacja regulaminu jest wymagana" }),
  marketing: z.boolean().default(false),
});

export const refrigerantSchema = z.enum(["R134A", "R1234YF", "UNKNOWN"]);

export const bookingRequestSchema = z.object({
  serviceIds: z.array(z.string().min(1).max(40)).min(1, "Wybierz co najmniej jedną usługę").max(8, "Najwyżej 8 usług"),
  refrigerant: refrigerantSchema.optional(),
  vehicle: vehicleSchema,
  start: z.iso.datetime({ error: "Wybierz termin" }),
  customer: customerSchema,
});
export type BookingRequest = z.infer<typeof bookingRequestSchema>;

/** Wizyta dodawana ręcznie w panelu – bez zgód, e-mail opcjonalny. */
export const adminBookingSchema = z.object({
  serviceIds: bookingRequestSchema.shape.serviceIds,
  refrigerant: refrigerantSchema.optional(),
  vehicle: vehicleSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Wybierz datę"),
  time: z.string().regex(/^([01]\d|2[0-3]):(00|15|30|45)$/, "Godzina w siatce co 15 minut"),
  customer: z.object({
    name: text(2, 80, "Imię i nazwisko"),
    phone: phoneSchema,
    email: z.union([z.literal(""), emailSchema]).transform((v) => v || ""),
  }),
});

const inquiryBase = {
  name: text(2, 80, "Imię i nazwisko"),
  phone: phoneSchema,
  email: emailSchema,
  privacy: z.literal(true, { error: "Potwierdź zapoznanie się z klauzulą informacyjną" }),
};

export const contactSchema = z.object({
  ...inquiryBase,
  message: text(10, 2000, "Wiadomość"),
});

export const partsSchema = z.object({
  ...inquiryBase,
  make: text(2, 40, "Marka"),
  model: text(1, 60, "Model"),
  year: yearSchema,
  vin: vinSchema,
  part: text(2, 200, "Nazwa części"),
  message: optionalText(2000),
});

export const fleetSchema = z.object({
  ...inquiryBase,
  company: text(2, 120, "Nazwa firmy"),
  nip: z
    .string()
    .transform((v) => v.replace(/[\s-]/g, ""))
    .pipe(z.union([z.literal(""), z.string().regex(/^\d{10}$/, "NIP ma 10 cyfr")]))
    .optional()
    .transform((v) => (v ? v : undefined)),
  fleetSize: z.coerce.number({ error: "Podaj liczbę pojazdów" }).int().min(1, "Podaj liczbę pojazdów").max(10_000),
  message: optionalText(2000),
});

export type FieldErrors = Record<string, string>;

/** Spłaszcza błędy Zod do mapy „ścieżka.pola → pierwszy komunikat”. */
export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
