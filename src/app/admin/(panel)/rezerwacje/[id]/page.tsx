import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton, ActionForm } from "@/components/admin/ActionForm";
import { PageHeader, Section, StatusBadge } from "@/components/admin/ui";
import { Field, SelectField, TextAreaField } from "@/components/form";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  BOOKING_STATUS_LABEL,
  BOOKING_TRANSITIONS,
  REFRIGERANT_LABEL,
  VEHICLE_TYPE_LABEL,
  formatPhone,
  formatPrice,
  telHref,
  type BookingStatus,
} from "@/lib/labels";
import { getSettings } from "@/lib/settings";
import { formatDateTimePl, formatDuration, warsawDate, warsawTime } from "@/lib/time";
import { rescheduleBooking, saveBookingNote, setBookingStatus } from "../actions";

export const metadata: Metadata = { title: "Rezerwacja" };

const ACTION_LABEL: Record<BookingStatus, string> = {
  PENDING: "",
  CONFIRMED: "Potwierdź",
  IN_PROGRESS: "Rozpocznij realizację",
  COMPLETED: "Zakończ",
  CANCELLED: "Anuluj wizytę",
  NO_SHOW: "Klient nie przyjechał",
};

export default async function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const [booking, settings] = await Promise.all([
    db.booking.findUnique({ where: { id }, include: { customer: true, vehicle: true, services: true } }),
    getSettings(),
  ]);
  if (!booking) notFound();
  const { customer, vehicle } = booking;
  const duration = Math.round((booking.endsAt.getTime() - booking.startsAt.getTime()) / 60_000);
  const movable = booking.status === "PENDING" || booking.status === "CONFIRMED";
  const transitions = BOOKING_TRANSITIONS[booking.status];

  return (
    <>
      <PageHeader title={`Wizyta: ${formatDateTimePl(booking.startsAt)}`}>
        <Link href={`/admin/kalendarz?data=${warsawDate(booking.startsAt)}`} className="btn btn-secondary btn-sm">
          Pokaż w kalendarzu
        </Link>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Szczegóły">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted">Status</dt>
            <dd>
              <StatusBadge status={booking.status} />
            </dd>
            <dt className="text-muted">Czas</dt>
            <dd>
              {warsawTime(booking.startsAt)}–{warsawTime(booking.endsAt)} ({formatDuration(duration)}), stanowisko {booking.bay}
            </dd>
            <dt className="text-muted">Źródło</dt>
            <dd>{booking.source === "ONLINE" ? "Rezerwacja online" : "Dodana w panelu"}</dd>
            <dt className="text-muted">Klient</dt>
            <dd>
              <Link href={`/admin/klienci/${customer.id}`} className="link">
                {customer.name}
              </Link>
              {customer.phone && (
                <>
                  {" · "}
                  <a href={telHref(customer.phone)} className="link">
                    {formatPhone(customer.phone)}
                  </a>
                </>
              )}
              {customer.email && <span className="block break-all">{customer.email}</span>}
            </dd>
            <dt className="text-muted">Pojazd</dt>
            <dd>
              {vehicle.make} {vehicle.model}
              {vehicle.year ? ` (${vehicle.year})` : ""} · {vehicle.plate} · {VEHICLE_TYPE_LABEL[vehicle.type]}
              {vehicle.vin && <span className="block">VIN: {vehicle.vin}</span>}
              {vehicle.mileage !== null && <span className="block">Przebieg: {vehicle.mileage.toLocaleString("pl-PL")} km</span>}
            </dd>
            <dt className="text-muted">Usługi</dt>
            <dd>
              <ul>
                {booking.services.map((s) => (
                  <li key={s.serviceId}>
                    {s.name} <span className="text-muted">({formatDuration(s.durationMin)}, {formatPrice(s.priceFrom, s.priceTo)})</span>
                  </li>
                ))}
              </ul>
            </dd>
            {booking.refrigerant && (
              <>
                <dt className="text-muted">Czynnik</dt>
                <dd>{REFRIGERANT_LABEL[booking.refrigerant]}</dd>
              </>
            )}
            {booking.description && (
              <>
                <dt className="text-muted">Opis usterki</dt>
                <dd className="whitespace-pre-wrap">{booking.description}</dd>
              </>
            )}
          </dl>
        </Section>

        <div className="space-y-6">
          <Section title="Zmiana statusu">
            {transitions.length === 0 ? (
              <p className="text-muted text-sm">Wizyta ma status końcowy: {BOOKING_STATUS_LABEL[booking.status]}.</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {transitions.map((to) => {
                  const destructive = to === "CANCELLED" || to === "NO_SHOW";
                  return (
                    <ActionForm
                      key={to}
                      action={setBookingStatus}
                      confirm={destructive ? `${ACTION_LABEL[to]}? Termin zostanie zwolniony.` : undefined}
                    >
                      <input type="hidden" name="id" value={booking.id} />
                      <input type="hidden" name="to" value={to} />
                      <ActionButton className={destructive ? "btn btn-danger btn-sm" : "btn btn-primary btn-sm"}>{ACTION_LABEL[to]}</ActionButton>
                    </ActionForm>
                  );
                })}
              </div>
            )}
            <p className="text-muted mt-3 text-sm">Klient dostaje e-mail przy potwierdzeniu, rozpoczęciu, zakończeniu i anulowaniu.</p>
          </Section>

          {movable && (
            <Section title="Przenieś na inny termin">
              <ActionForm action={rescheduleBooking} className="grid gap-4 sm:grid-cols-3">
                <input type="hidden" name="id" value={booking.id} />
                <Field label="Data" name="date" type="date" required defaultValue={warsawDate(booking.startsAt)} />
                <Field label="Godzina" name="time" type="time" required step={900} defaultValue={warsawTime(booking.startsAt)} />
                <SelectField label="Stanowisko" name="bay" defaultValue={String(booking.bay)}>
                  {Array.from({ length: settings.bays }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </SelectField>
                <div className="sm:col-span-3">
                  <ActionButton className="btn btn-secondary btn-sm">Przenieś</ActionButton>
                </div>
              </ActionForm>
            </Section>
          )}

          <Section title="Notatka wewnętrzna">
            <ActionForm action={saveBookingNote} className="space-y-4">
              <input type="hidden" name="id" value={booking.id} />
              <TextAreaField label="Notatka (niewidoczna dla klienta)" name="internalNote" defaultValue={booking.internalNote ?? ""} maxLength={2000} />
              <ActionButton className="btn btn-secondary btn-sm">Zapisz notatkę</ActionButton>
            </ActionForm>
          </Section>
        </div>
      </div>
    </>
  );
}
