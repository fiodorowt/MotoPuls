"use server";

import { z } from "zod";
import { audit } from "@/lib/audit";
import { f, runAction } from "@/lib/admin/run";
import { db, isUniqueViolation } from "@/lib/db";
import type { FormState } from "@/lib/form-state";
import { emailSchema, phoneSchema } from "@/lib/validation";

const companySchema = z.object({
  brandName: f.str(2, 60, "Nazwa marki"),
  legalName: f.str(2, 200, "Pełna nazwa"),
  nip: z
    .string()
    .transform((v) => v.replace(/[\s-]/g, ""))
    .pipe(z.string().regex(/^\d{10}$/, "NIP ma 10 cyfr")),
  street: f.str(2, 120, "Ulica"),
  postalCode: z.string().trim().regex(/^\d{2}-\d{3}$/, "Kod pocztowy w formacie 00-000"),
  city: f.str(2, 80, "Miejscowość"),
  phones: z
    .string()
    .transform((v) => v.split(/[\n,;]/).map((p) => p.trim()).filter(Boolean))
    .pipe(z.array(phoneSchema).min(1, "Podaj co najmniej jeden telefon").max(4, "Najwyżej 4 numery telefonu")),
  email: emailSchema,
  facebookUrl: z.union([z.literal(""), z.url("Podaj pełny adres strony na Facebooku").startsWith("https://", "Adres musi zaczynać się od https://").max(200)]),
  latitude: z.coerce.number({ error: "Szerokość geograficzna: podaj liczbę" }).min(-90).max(90),
  longitude: z.coerce.number({ error: "Długość geograficzna: podaj liczbę" }).min(-180).max(180),
  directions: f.str(2, 1000, "Wskazówki dojazdu"),
  tagline: f.str(2, 200, "Hasło"),
  about: f.str(2, 4000, "O firmie"),
  pricingNote: z.string().trim().max(500, "Uwaga do cennika: najwyżej 500 znaków").default(""),
});

export async function saveCompany(_prev: FormState, formData: FormData): Promise<FormState> {
  return runAction(formData, { schema: companySchema, owner: true }, async (data, user) => {
    await db.settings.update({ where: { id: 1 }, data });
    await audit({ actor: user.email, userId: user.id, action: "settings.company", entity: "Settings" });
  });
}

const bookingConfigSchema = z.object({
  bays: f.int(1, 10, "Liczba stanowisk"),
  autoConfirm: f.checkbox,
  cancelHoursBefore: f.int(0, 240, "Anulowanie (godziny)"),
  minLeadHours: f.int(0, 240, "Najwcześniejszy termin (godziny)"),
  maxDaysAhead: f.int(1, 365, "Kalendarz do przodu (dni)"),
  retentionMonths: f.int(6, 120, "Retencja danych (miesiące)"),
});

export async function saveBookingConfig(_prev: FormState, formData: FormData): Promise<FormState> {
  return runAction(formData, { schema: bookingConfigSchema, owner: true }, async (data, user) => {
    // Nie zmniejszamy liczby stanowisk, dopóki na usuwanych są przyszłe wizyty lub blokady.
    const orphaned = await db.bookingSlot.count({ where: { bay: { gt: data.bays }, slotStart: { gte: new Date() } } });
    if (orphaned > 0) {
      return { ok: false, message: "Na stanowiskach, które chcesz usunąć, są przyszłe wizyty lub blokady. Najpierw je przenieś." };
    }
    await db.settings.update({ where: { id: 1 }, data });
    await audit({ actor: user.email, userId: user.id, action: "settings.booking", entity: "Settings", details: data });
  });
}

const dayShape = Object.fromEntries(
  [1, 2, 3, 4, 5, 6, 7].flatMap((d) => [
    [`closed_${d}`, f.checkbox],
    [`open_${d}`, f.time],
    [`close_${d}`, f.time],
  ]),
);

export async function saveOpeningHours(_prev: FormState, formData: FormData): Promise<FormState> {
  return runAction(formData, { schema: z.object(dayShape), owner: true }, async (data, user) => {
    const rows = [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
      weekday,
      closed: data[`closed_${weekday}`] === true,
      open: String(data[`open_${weekday}`]),
      close: String(data[`close_${weekday}`]),
    }));
    if (rows.some((r) => !r.closed && r.open >= r.close)) {
      return { ok: false, message: "Godzina zamknięcia musi być późniejsza niż otwarcia." };
    }
    await db.$transaction(rows.map(({ weekday, ...hours }) => db.openingHours.upsert({ where: { weekday }, update: hours, create: { weekday, ...hours } })));
    await audit({ actor: user.email, userId: user.id, action: "settings.hours", entity: "OpeningHours" });
  });
}

export async function addClosedDay(_prev: FormState, formData: FormData): Promise<FormState> {
  return runAction(formData, { schema: z.object({ date: f.date, reason: f.str(2, 120, "Powód") }), owner: true }, async ({ date, reason }, user) => {
    try {
      await db.closedDay.create({ data: { date: new Date(`${date}T00:00:00Z`), reason } });
    } catch (error) {
      if (isUniqueViolation(error)) return { ok: false, message: "Ten dzień jest już na liście." };
      throw error;
    }
    await audit({ actor: user.email, userId: user.id, action: "closed_day.create", entity: "ClosedDay", details: { date } });
    return { ok: true, message: "Dzień dodany. Istniejące wizyty z tego dnia pozostają – sprawdź kalendarz." };
  });
}

export async function removeClosedDay(_prev: FormState, formData: FormData): Promise<FormState> {
  return runAction(formData, { schema: z.object({ id: f.id }), owner: true }, async ({ id }, user) => {
    await db.closedDay.delete({ where: { id } });
    await audit({ actor: user.email, userId: user.id, action: "closed_day.delete", entity: "ClosedDay", entityId: id });
    return { ok: true, message: "Usunięto." };
  });
}
