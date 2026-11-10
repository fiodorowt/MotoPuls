import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CancelForm } from "@/components/booking/CancelForm";
import { PageHeader } from "@/components/site/Sections";
import { canCustomerCancel } from "@/lib/booking";
import { db } from "@/lib/db";
import { BOOKING_STATUS_LABEL, REFRIGERANT_LABEL, formatPhone, formatPrice, telHref } from "@/lib/labels";
import { rateLimitByIp } from "@/lib/rate-limit";
import { fullAddress, getSettings } from "@/lib/settings";
import { formatDateTimePl, formatDuration } from "@/lib/time";

// Link zawiera token dostępu – strona nie może trafić do indeksu ani przekazywać adresu dalej.
export const metadata: Metadata = {
  title: "Twoja rezerwacja",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const STATUS_HINT: Record<string, string> = {
  PENDING: "Czekamy na potwierdzenie terminu przez warsztat. Damy znać e-mailem.",
  CONFIRMED: "Termin jest potwierdzony. Do zobaczenia!",
  IN_PROGRESS: "Auto jest u nas w warsztacie.",
  COMPLETED: "Wizyta zakończona. Dziękujemy!",
  CANCELLED: "Rezerwacja została anulowana.",
  NO_SHOW: "Wizyta nie odbyła się.",
};

export default async function BookingStatusPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ nowa?: string }>;
}) {
  const [{ token }, query] = await Promise.all([params, searchParams]);
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) notFound();
  if (!(await rateLimitByIp("booking-view", 60, 600))) notFound();

  const [booking, settings] = await Promise.all([
    db.booking.findUnique({ where: { token }, include: { services: true, vehicle: true, customer: true } }),
    getSettings(),
  ]);
  if (!booking || booking.customer.anonymizedAt) notFound();

  const durationMin = Math.round((booking.endsAt.getTime() - booking.startsAt.getTime()) / 60_000);
  const cancellable = canCustomerCancel(booking, settings.cancelHoursBefore);
  const active = booking.status === "PENDING" || booking.status === "CONFIRMED";
  const phone = settings.phones[0];

  return (
    <>
      <PageHeader
        eyebrow="Twoja rezerwacja"
        title={query.nowa ? "Dziękujemy! Rezerwacja przyjęta" : "Szczegóły wizyty"}
        lead={query.nowa ? "Potwierdzenie wysłaliśmy na Twój adres e-mail. Ten link pozwala w każdej chwili sprawdzić status wizyty." : undefined}
      />
      <div className="container-page grid gap-6 pb-16 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <p>
            <span className="badge">{BOOKING_STATUS_LABEL[booking.status]}</span>
          </p>
          <p className="text-muted mt-2">{STATUS_HINT[booking.status]}</p>
          <dl className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <dt className="text-muted text-sm">Termin</dt>
              <dd className="text-lg font-bold">{formatDateTimePl(booking.startsAt)}</dd>
              <dd className="text-muted text-sm">Przewidywany czas: ok. {formatDuration(durationMin)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted text-sm">Usługi</dt>
              <dd>
                <ul className="list-disc pl-5">
                  {booking.services.map((s) => (
                    <li key={s.serviceId}>
                      {s.name} <span className="text-muted">({formatPrice(s.priceFrom, s.priceTo)})</span>
                    </li>
                  ))}
                </ul>
              </dd>
              {booking.refrigerant && <dd className="text-muted mt-1 text-sm">Czynnik: {REFRIGERANT_LABEL[booking.refrigerant]}</dd>}
            </div>
            <div>
              <dt className="text-muted text-sm">Pojazd</dt>
              <dd>
                {booking.vehicle.make} {booking.vehicle.model}
                {booking.vehicle.year ? ` (${booking.vehicle.year})` : ""}, {booking.vehicle.plate}
              </dd>
            </div>
            <div>
              <dt className="text-muted text-sm">Adres warsztatu</dt>
              <dd>{fullAddress(settings)}</dd>
            </div>
          </dl>
        </div>

        <aside className="card h-fit">
          <h2 className="text-xl">Zmiana planów?</h2>
          {cancellable ? (
            <>
              <p className="text-muted mt-2 text-sm">
                Wizytę możesz anulować online najpóźniej {settings.cancelHoursBefore} godz. przed terminem.
              </p>
              <CancelForm token={token} />
            </>
          ) : active ? (
            <p className="text-muted mt-2 text-sm">
              Do wizyty zostało mniej niż {settings.cancelHoursBefore} godz. – anulowanie online nie jest już możliwe.
              Zadzwoń do nas.
            </p>
          ) : (
            <p className="text-muted mt-2 text-sm">Chcesz umówić nowy termin?</p>
          )}
          <div className="mt-4 flex flex-col gap-3">
            {phone && (
              <a href={telHref(phone)} className="btn btn-secondary">
                Zadzwoń: {formatPhone(phone)}
              </a>
            )}
            {!active && (
              <Link href="/rezerwacja" className="btn btn-primary">
                Umów nową wizytę
              </Link>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
