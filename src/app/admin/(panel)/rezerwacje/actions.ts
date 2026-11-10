"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/session";
import { BookingError, SlotTakenError, changeBookingStatus, createBlock, createBooking, moveBooking } from "@/lib/booking";
import { db } from "@/lib/db";
import type { FormState } from "@/lib/form-state";
import { f, runAction } from "@/lib/admin/run";
import { isDateString, warsawTime, warsawToUtc } from "@/lib/time";
import { adminBookingSchema, fieldErrors } from "@/lib/validation";

const statusSchema = z.object({
  id: f.id,
  to: z.enum(["CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"]),
});

export async function setBookingStatus(_prev: FormState, formData: FormData): Promise<FormState> {
  return runAction(formData, { schema: statusSchema }, async ({ id, to }, user) => {
    await changeBookingStatus(id, to, user);
    return { ok: true, message: "Status zmieniony." };
  });
}

export async function saveBookingNote(_prev: FormState, formData: FormData): Promise<FormState> {
  return runAction(formData, { schema: z.object({ id: f.id, internalNote: f.opt(2000) }) }, async ({ id, internalNote }, user) => {
    await db.booking.update({ where: { id }, data: { internalNote } });
    await audit({ actor: user.email, userId: user.id, action: "booking.note", entity: "Booking", entityId: id });
  });
}

const quarter = z.string().regex(/^([01]\d|2[0-3]):(00|15|30|45)$/, "Godzina w siatce co 15 minut");
const calendarDate = f.date.refine(isDateString, "Podaj poprawną datę");

const rescheduleSchema = z.object({
  id: f.id,
  date: calendarDate,
  time: quarter,
  bay: f.optInt(1, 20, "Stanowisko"),
});

export async function rescheduleBooking(_prev: FormState, formData: FormData): Promise<FormState> {
  return runAction(formData, { schema: rescheduleSchema }, async ({ id, date, time, bay }, user) => {
    await moveBooking(id, warsawToUtc(date, time), user, bay ?? undefined);
    return { ok: true, message: "Wizyta przeniesiona. Klient dostał e-mail z nowym terminem." };
  });
}

// ---------- Kalendarz: przeciąganie (wywołania bez formularza) ----------

async function runMove(move: (user: { email: string; id: string }) => Promise<void>): Promise<FormState> {
  const user = await requireUser();
  try {
    await move(user);
  } catch (error) {
    if (error instanceof BookingError || error instanceof SlotTakenError) return { ok: false, message: error.message };
    throw error;
  }
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Wizyta przeniesiona." };
}

const moveSchema = z.object({ id: f.id, iso: z.iso.datetime(), bay: z.number().int().min(1).max(20) });

export async function moveBookingTo(id: string, iso: string, bay: number): Promise<FormState> {
  const parsed = moveSchema.safeParse({ id, iso, bay });
  if (!parsed.success) return { ok: false, message: "Nieprawidłowy termin." };
  return runMove((user) => moveBooking(parsed.data.id, new Date(parsed.data.iso), user, parsed.data.bay));
}

const moveDaySchema = z.object({ id: f.id, date: calendarDate });

/** Przeniesienie na inny dzień z zachowaniem godziny (widok tygodnia). */
export async function moveBookingToDay(id: string, date: string): Promise<FormState> {
  const parsed = moveDaySchema.safeParse({ id, date });
  if (!parsed.success) return { ok: false, message: "Nieprawidłowy termin." };
  return runMove(async (user) => {
    const booking = await db.booking.findUnique({ where: { id: parsed.data.id }, select: { startsAt: true } });
    if (!booking) throw new BookingError("Nie znaleziono rezerwacji.");
    await moveBooking(parsed.data.id, warsawToUtc(parsed.data.date, warsawTime(booking.startsAt)), user);
  });
}

// ---------- Blokady ----------

const blockSchema = z.object({
  fromDate: calendarDate,
  fromTime: quarter,
  toDate: calendarDate,
  toTime: quarter,
  bay: f.optInt(1, 20, "Stanowisko"),
  reason: f.str(2, 200, "Powód"),
});

export async function addBlock(_prev: FormState, formData: FormData): Promise<FormState> {
  return runAction(formData, { schema: blockSchema }, async (data, user) => {
    await createBlock(
      { start: warsawToUtc(data.fromDate, data.fromTime), end: warsawToUtc(data.toDate, data.toTime), bay: data.bay, reason: data.reason },
      user,
    );
    return { ok: true, message: "Blokada dodana." };
  });
}

export async function removeBlock(_prev: FormState, formData: FormData): Promise<FormState> {
  return runAction(formData, { schema: z.object({ id: f.id }) }, async ({ id }, user) => {
    // Odcinki blokady usuwa kaskada w bazie.
    await db.block.delete({ where: { id } });
    await audit({ actor: user.email, userId: user.id, action: "block.delete", entity: "Block", entityId: id });
    return { ok: true, message: "Blokada usunięta." };
  });
}

// ---------- Wizyta dodawana ręcznie ----------

export async function createManualBooking(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const text = (name: string) => {
    const value = formData.get(name);
    return typeof value === "string" ? value : "";
  };
  const parsed = adminBookingSchema.safeParse({
    serviceIds: formData.getAll("serviceIds").filter((v): v is string => typeof v === "string"),
    refrigerant: text("refrigerant") || undefined,
    vehicle: {
      make: text("make"),
      model: text("model"),
      year: text("year"),
      plate: text("plate"),
      vin: text("vin"),
      mileage: text("mileage"),
      type: text("type"),
      description: text("description"),
    },
    date: text("date"),
    time: text("time"),
    customer: { name: text("name"), phone: text("phone"), email: text("email") },
  });
  if (!parsed.success) return { ok: false, message: "Popraw błędy w formularzu.", errors: fieldErrors(parsed.error) };
  const data = parsed.data;
  if (!isDateString(data.date)) return { ok: false, message: "Podaj poprawną datę." };

  let bookingId: string;
  try {
    const booking = await createBooking({
      serviceIds: data.serviceIds,
      refrigerant: data.refrigerant,
      start: warsawToUtc(data.date, data.time),
      vehicle: data.vehicle,
      customer: data.customer,
      source: "ADMIN",
      actor: user,
    });
    bookingId = booking.id;
  } catch (error) {
    if (error instanceof BookingError || error instanceof SlotTakenError) return { ok: false, message: error.message };
    throw error;
  }
  revalidatePath("/admin", "layout");
  redirect(`/admin/rezerwacje/${bookingId}`);
}
