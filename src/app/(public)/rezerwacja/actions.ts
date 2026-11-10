"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { antispamError } from "@/lib/antispam";
import { BookingError, SlotTakenError, cancelByCustomer, createBooking, getAvailability, resolveServices, type DayAvailability } from "@/lib/booking";
import { rateLimitByIp } from "@/lib/rate-limit";
import { getSettings } from "@/lib/settings";
import { addDays, isDateString, warsawDate } from "@/lib/time";
import { bookingRequestSchema, fieldErrors, type FieldErrors } from "@/lib/validation";

const PAGE_DAYS = 14;
const TOO_MANY = "Zbyt wiele prób w krótkim czasie. Odczekaj chwilę albo zadzwoń do warsztatu.";

export type AvailabilityResult =
  | { ok: true; days: DayAvailability[]; durationMin: number; hasEarlier: boolean; hasLater: boolean }
  | { ok: false; message: string };

const availabilityInput = z.object({
  serviceIds: bookingRequestSchema.shape.serviceIds,
  fromDate: z.string().refine(isDateString),
});

/** Wolne terminy na 14 dni od wskazanej daty – liczone wyłącznie na serwerze. */
export async function loadAvailability(serviceIds: string[], fromDate: string): Promise<AvailabilityResult> {
  if (!(await rateLimitByIp("availability", 60, 60))) return { ok: false, message: TOO_MANY };
  const parsed = availabilityInput.safeParse({ serviceIds, fromDate });
  if (!parsed.success) return { ok: false, message: "Nieprawidłowe dane. Odśwież stronę." };
  try {
    const settings = await getSettings();
    const today = warsawDate(new Date());
    const last = addDays(today, settings.maxDaysAhead);
    const from = parsed.data.fromDate < today ? today : parsed.data.fromDate > last ? last : parsed.data.fromDate;
    const { durationMin } = await resolveServices(parsed.data.serviceIds);
    const days = await getAvailability(from, PAGE_DAYS, durationMin);
    return { ok: true, days, durationMin, hasEarlier: from > today, hasLater: addDays(from, PAGE_DAYS) <= last };
  } catch (error) {
    if (error instanceof BookingError) return { ok: false, message: error.message };
    throw error;
  }
}

export type SubmitResult =
  | { ok: true; token: string }
  | { ok: false; message: string; errors?: FieldErrors; slotTaken?: boolean };

export interface AntispamInput {
  website: string;
  form_token: string;
  turnstile: string;
}

export async function submitBooking(payload: unknown, antispam: AntispamInput): Promise<SubmitResult> {
  if (!(await rateLimitByIp("booking", 5, 3600))) return { ok: false, message: TOO_MANY };
  const spam = await antispamError({ honeypot: antispam?.website, token: antispam?.form_token, turnstile: antispam?.turnstile });
  if (spam) return { ok: false, message: spam };

  const parsed = bookingRequestSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, message: "Popraw zaznaczone pola.", errors: fieldErrors(parsed.error) };
  const data = parsed.data;
  try {
    const booking = await createBooking({
      serviceIds: data.serviceIds,
      refrigerant: data.refrigerant,
      start: new Date(data.start),
      vehicle: data.vehicle,
      customer: { name: data.customer.name, phone: data.customer.phone, email: data.customer.email, marketing: data.customer.marketing },
      source: "ONLINE",
    });
    return { ok: true, token: booking.token };
  } catch (error) {
    if (error instanceof SlotTakenError) return { ok: false, message: error.message, slotTaken: true };
    if (error instanceof BookingError) return { ok: false, message: error.message };
    throw error;
  }
}

export type CancelState = { ok: boolean; message?: string };

/** Anulowanie przez klienta z linku w e-mailu. Token jest jedynym uwierzytelnieniem, stąd limit prób. */
export async function cancelBooking(_prev: CancelState, formData: FormData): Promise<CancelState> {
  if (!(await rateLimitByIp("booking-cancel", 10, 600))) return { ok: false, message: TOO_MANY };
  const token = String(formData.get("token") ?? "");
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return { ok: false, message: "Nieprawidłowy link." };
  try {
    await cancelByCustomer(token);
  } catch (error) {
    if (error instanceof BookingError) return { ok: false, message: error.message };
    throw error;
  }
  revalidatePath(`/rezerwacja/${token}`);
  return { ok: true, message: "Rezerwacja została anulowana." };
}
