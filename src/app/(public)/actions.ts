"use server";

import type { z } from "zod";
import { FORM_TOKEN_FIELD, HONEYPOT_FIELD, antispamError } from "@/lib/antispam";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { notifyInquiry } from "@/lib/email/notify";
import { formValues, type FormState } from "@/lib/form-state";
import type { InquiryType } from "@/lib/labels";
import { rateLimitByIp } from "@/lib/rate-limit";
import { contactSchema, fieldErrors, fleetSchema, partsSchema } from "@/lib/validation";

const SENT = "Dziękujemy! Wiadomość dotarła – odezwiemy się najszybciej, jak to możliwe.";

/** Wspólna ścieżka trzech formularzy zapytań: limit, antyspam, walidacja, zapis, powiadomienie. */
async function handleInquiry<S extends z.ZodType<{ name: string; phone: string; email: string }>>(
  type: InquiryType,
  schema: S,
  formData: FormData,
  toRecord: (data: z.infer<S>) => { company?: string; message: string; data?: Record<string, string | number> },
): Promise<FormState> {
  const values = formValues(formData);
  if (!(await rateLimitByIp("inquiry", 5, 600))) {
    return { ok: false, message: "Zbyt wiele wiadomości w krótkim czasie. Spróbuj ponownie za kilka minut albo zadzwoń.", values };
  }
  const spam = await antispamError({
    honeypot: values[HONEYPOT_FIELD],
    token: values[FORM_TOKEN_FIELD],
    turnstile: values["cf-turnstile-response"],
  });
  if (spam) return { ok: false, message: spam, values };

  const parsed = schema.safeParse({ ...values, privacy: values.privacy === "on" });
  if (!parsed.success) {
    return { ok: false, message: "Popraw zaznaczone pola.", errors: fieldErrors(parsed.error), values };
  }
  const record = toRecord(parsed.data);
  const inquiry = await db.inquiry.create({
    data: {
      type,
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email,
      company: record.company,
      message: record.message,
      data: record.data,
    },
  });
  await audit({ actor: "klient", action: "inquiry.create", entity: "Inquiry", entityId: inquiry.id, details: { type } });
  await notifyInquiry(type, parsed.data.name);
  return { ok: true, message: SENT };
}

export async function sendContact(_prev: FormState, formData: FormData): Promise<FormState> {
  return handleInquiry("CONTACT", contactSchema, formData, (d) => ({ message: d.message }));
}

export async function sendPartsInquiry(_prev: FormState, formData: FormData): Promise<FormState> {
  return handleInquiry("PARTS", partsSchema, formData, (d) => ({
    message: d.message ?? "",
    data: { Marka: d.make, Model: d.model, Rocznik: d.year, VIN: d.vin ?? "—", Część: d.part },
  }));
}

export async function sendFleetInquiry(_prev: FormState, formData: FormData): Promise<FormState> {
  return handleInquiry("FLEET", fleetSchema, formData, (d) => ({
    company: d.company,
    message: d.message ?? "",
    data: { NIP: d.nip ?? "—", "Liczba pojazdów": d.fleetSize },
  }));
}
