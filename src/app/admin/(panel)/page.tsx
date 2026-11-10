import type { Metadata } from "next";
import Link from "next/link";
import { ActionButton, ActionForm } from "@/components/admin/ActionForm";
import { Empty, PageHeader, Section, StatusBadge, TableWrap } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { ACTIVE_BOOKING_STATUSES, formatPhone } from "@/lib/labels";
import { addDays, formatDateShortPl, startOfWeek, warsawDate, warsawTime, warsawToUtc } from "@/lib/time";
import { setBookingStatus } from "./rezerwacje/actions";

export const metadata: Metadata = { title: "Pulpit" };

const bookingInclude = { customer: true, vehicle: true, services: true } as const;

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireUser();
  const query = await searchParams;
  const today = warsawDate(new Date());
  const dayStart = warsawToUtc(today, "00:00");
  const dayEnd = warsawToUtc(addDays(today, 1), "00:00");
  const weekStart = warsawToUtc(startOfWeek(today), "00:00");
  const weekEnd = warsawToUtc(addDays(startOfWeek(today), 7), "00:00");
  const last30 = new Date(dayStart.getTime() - 30 * 86_400_000);
  const active = [...ACTIVE_BOOKING_STATUSES];

  const [todayBookings, pending, weekCount, newInquiries, completed30, noShow30, online30] = await Promise.all([
    db.booking.findMany({
      where: { startsAt: { gte: dayStart, lt: dayEnd }, status: { in: [...active, "COMPLETED"] } },
      include: bookingInclude,
      orderBy: { startsAt: "asc" },
    }),
    db.booking.findMany({ where: { status: "PENDING" }, include: bookingInclude, orderBy: { startsAt: "asc" }, take: 20 }),
    db.booking.count({ where: { startsAt: { gte: weekStart, lt: weekEnd }, status: { in: [...active, "COMPLETED"] } } }),
    db.inquiry.count({ where: { status: "NEW" } }),
    db.booking.count({ where: { status: "COMPLETED", startsAt: { gte: last30 } } }),
    db.booking.count({ where: { status: "NO_SHOW", startsAt: { gte: last30 } } }),
    db.booking.count({ where: { source: "ONLINE", createdAt: { gte: last30 } } }),
  ]);

  const stats = [
    { label: "Wizyty dziś", value: todayBookings.length, href: `/admin/kalendarz?data=${today}` },
    { label: "Do potwierdzenia", value: pending.length, href: "/admin/rezerwacje?status=PENDING" },
    { label: "Wizyty w tym tygodniu", value: weekCount, href: "/admin/kalendarz?widok=tydzien" },
    { label: "Nowe zapytania", value: newInquiries, href: "/admin/zapytania?status=NEW" },
    { label: "Zakończone (30 dni)", value: completed30, href: "/admin/rezerwacje?status=COMPLETED" },
    { label: "Nieobecności (30 dni)", value: noShow30, href: "/admin/rezerwacje?status=NO_SHOW" },
    { label: "Rezerwacje online (30 dni)", value: online30, href: "/admin/rezerwacje" },
  ];

  return (
    <>
      <PageHeader title="Pulpit">
        <Link href="/admin/rezerwacje/nowa" className="btn btn-primary btn-sm">
          Dodaj wizytę
        </Link>
      </PageHeader>

      {query.haslo && <p className="border-ok text-ok mb-4 rounded-md border px-3 py-2 text-sm font-medium">Hasło zostało zmienione.</p>}
      {query["brak-uprawnien"] && (
        <p className="border-danger text-danger mb-4 rounded-md border px-3 py-2 text-sm font-medium">Ta część panelu jest dostępna tylko dla właściciela.</p>
      )}

      <ul className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {stats.map((s) => (
          <li key={s.label}>
            <Link href={s.href} className="card hover:border-line-strong block h-full no-underline">
              <span className="font-display text-fg block text-3xl font-extrabold">{s.value}</span>
              <span className="text-muted text-sm">{s.label}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Dzisiejsze wizyty">
          {todayBookings.length === 0 ? (
            <Empty>Brak wizyt na dziś.</Empty>
          ) : (
            <TableWrap>
              <table className="table-mp">
                <thead>
                  <tr>
                    <th scope="col">Godz.</th>
                    <th scope="col">Klient / pojazd</th>
                    <th scope="col">Usługi</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {todayBookings.map((b) => (
                    <tr key={b.id}>
                      <td className="whitespace-nowrap">
                        <Link href={`/admin/rezerwacje/${b.id}`} className="link font-semibold">
                          {warsawTime(b.startsAt)}
                        </Link>
                        <span className="text-muted block text-xs">st. {b.bay}</span>
                      </td>
                      <td>
                        {b.customer.name}
                        <span className="text-muted block text-xs">
                          {b.vehicle.make} {b.vehicle.model} · {b.vehicle.plate}
                        </span>
                      </td>
                      <td>{b.services.map((s) => s.name).join(", ")}</td>
                      <td>
                        <StatusBadge status={b.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </Section>

        <Section title="Czekają na potwierdzenie">
          {pending.length === 0 ? (
            <Empty>Wszystkie rezerwacje są potwierdzone.</Empty>
          ) : (
            <ul className="divide-line divide-y">
              {pending.map((b) => (
                <li key={b.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                  <div className="text-sm">
                    <Link href={`/admin/rezerwacje/${b.id}`} className="link font-semibold">
                      {formatDateShortPl(b.startsAt)}, {warsawTime(b.startsAt)}
                    </Link>
                    <span className="block">
                      {b.customer.name} · {formatPhone(b.customer.phone)}
                    </span>
                    <span className="text-muted block">
                      {b.vehicle.make} {b.vehicle.model} · {b.services.map((s) => s.name).join(", ")}
                    </span>
                  </div>
                  <ActionForm action={setBookingStatus}>
                    <input type="hidden" name="id" value={b.id} />
                    <input type="hidden" name="to" value="CONFIRMED" />
                    <ActionButton className="btn btn-primary btn-sm">Potwierdź</ActionButton>
                  </ActionForm>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </>
  );
}
