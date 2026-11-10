import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { BOOKING_STATUS_LABEL, INQUIRY_TYPE_LABEL, formatPhone, type InquiryType } from "@/lib/labels";
import { formatDateTimePl } from "@/lib/time";
import { buildIcs } from "./ics";
import { sendMail, type Mail } from "./send";
import { DEFAULT_TEMPLATES, fillTemplate, renderHtml, type TemplateVars } from "./templates";

export type BookingMailKind =
  | "booking_received"
  | "booking_confirmed"
  | "booking_status"
  | "booking_cancelled"
  | "booking_reminder";

async function companyVars(): Promise<{ vars: TemplateVars; footer: string; notifyTo: string; address: string }> {
  const s = await db.settings.findUniqueOrThrow({ where: { id: 1 } });
  const address = `${s.street}, ${s.postalCode} ${s.city}`;
  const phones = s.phones.map(formatPhone).join(", ");
  return {
    vars: { firma: s.brandName, adres: address, telefony: phones },
    footer: `${s.legalName}\n${address}\ntel. ${phones} · ${s.email}`,
    notifyTo: env().WORKSHOP_NOTIFY_EMAIL ?? s.email,
    address,
  };
}

async function sendTemplate(key: string, to: string, vars: TemplateVars, footer: string, ics?: Mail["ics"]) {
  const stored = await db.emailTemplate.findUnique({ where: { key } });
  const template = stored ?? DEFAULT_TEMPLATES[key];
  if (!template) throw new Error(`Brak szablonu e-mail: ${key}`);
  const text = fillTemplate(template.body, vars);
  // Nagłówek tematu nie może zawierać znaków nowej linii (wstrzykiwanie nagłówków).
  const subject = fillTemplate(template.subject, vars).replace(/[\r\n]+/g, " ").slice(0, 200);
  return sendMail({ to, subject, text: `${text}\n\n--\n${footer}`, html: renderHtml(text, footer), ics });
}

/** E-mail do klienta o rezerwacji; przy nowej rezerwacji także powiadomienie do warsztatu. */
export async function notifyBooking(bookingId: string, kind: BookingMailKind, alsoWorkshop = false): Promise<void> {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { customer: true, vehicle: true, services: true },
  });
  if (!booking) return;
  const company = await companyVars();
  const settings = await db.settings.findUniqueOrThrow({ where: { id: 1 } });
  const appUrl = env().APP_URL;
  const services = booking.services.map((s) => s.name).join(", ");
  const vehicle = `${booking.vehicle.make} ${booking.vehicle.model} (${booking.vehicle.plate})`;

  const vars: TemplateVars = {
    ...company.vars,
    imie: booking.customer.name,
    termin: formatDateTimePl(booking.startsAt),
    uslugi: services,
    pojazd: vehicle,
    status: BOOKING_STATUS_LABEL[booking.status],
    link: `${appUrl}/rezerwacja/${booking.token}`,
    anulowanie_do: formatDateTimePl(new Date(booking.startsAt.getTime() - settings.cancelHoursBefore * 3_600_000)),
  };

  if (booking.customer.email) {
    const cancelled = kind === "booking_cancelled";
    const withIcs = kind === "booking_received" || kind === "booking_confirmed" || cancelled;
    const ics = withIcs
      ? {
          filename: "wizyta-moto-puls.ics",
          method: cancelled ? ("CANCEL" as const) : ("PUBLISH" as const),
          content: buildIcs({
            uid: `${booking.id}@motopuls`,
            start: booking.startsAt,
            end: booking.endsAt,
            summary: `Wizyta w ${company.vars.firma ?? "Moto Puls"}`,
            description: `${services}\n${vehicle}\n${vars.link}`,
            location: company.address,
            sequence: Math.floor((booking.updatedAt.getTime() - booking.createdAt.getTime()) / 1000),
            cancelled,
            organizerEmail: settings.email,
          }),
        }
      : undefined;
    await sendTemplate(kind, booking.customer.email, vars, company.footer, ics);
  }

  if (alsoWorkshop) {
    await sendTemplate(
      "workshop_new_booking",
      company.notifyTo,
      { ...vars, link: `${appUrl}/admin/rezerwacje/${booking.id}` },
      company.footer,
    );
  }
}

export async function notifyInquiry(type: InquiryType, name: string): Promise<void> {
  const company = await companyVars();
  await sendTemplate(
    "workshop_inquiry",
    company.notifyTo,
    { ...company.vars, imie: name, status: INQUIRY_TYPE_LABEL[type], link: `${env().APP_URL}/admin/zapytania` },
    company.footer,
  );
}

export async function sendPasswordReset(to: string, link: string): Promise<void> {
  const company = await companyVars();
  await sendTemplate("password_reset", to, { ...company.vars, link }, company.footer);
}
