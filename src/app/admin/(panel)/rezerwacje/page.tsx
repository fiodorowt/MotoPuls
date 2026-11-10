import type { Metadata } from "next";
import Link from "next/link";
import { CsvLink, Empty, PageHeader, Pager, StatusBadge, TableWrap, pageParam } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth/session";
import { db, type Prisma } from "@/lib/db";
import { BOOKING_STATUS_LABEL, formatPhone, type BookingStatus } from "@/lib/labels";
import { formatDateShortPl, warsawTime } from "@/lib/time";

export const metadata: Metadata = { title: "Rezerwacje" };

const PAGE_SIZE = 30;
const STATUSES = Object.keys(BOOKING_STATUS_LABEL) as BookingStatus[];

export default async function BookingsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  const query = await searchParams;
  const status = STATUSES.find((s) => s === query.status);
  const q = (query.q ?? "").trim().slice(0, 80);
  const page = pageParam(query.strona);

  const where: Prisma.BookingWhereInput = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { customer: { name: { contains: q, mode: "insensitive" } } },
            { customer: { phone: { contains: q.replace(/[\s-]/g, "") } } },
            { vehicle: { plate: { contains: q.replace(/[\s-]/g, "").toUpperCase() } } },
          ],
        }
      : {}),
  };
  const [total, bookings] = await Promise.all([
    db.booking.count({ where }),
    db.booking.findMany({
      where,
      include: { customer: true, vehicle: true, services: true },
      orderBy: { startsAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);
  const href = (p: number) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (q) params.set("q", q);
    if (p > 1) params.set("strona", String(p));
    return `/admin/rezerwacje?${params}`;
  };

  return (
    <>
      <PageHeader title="Rezerwacje">
        {user.role === "OWNER" && <CsvLink kind="rezerwacje" />}
        <Link href="/admin/rezerwacje/nowa" className="btn btn-primary btn-sm">
          Dodaj wizytę
        </Link>
      </PageHeader>

      <form method="get" className="card mb-6 flex flex-wrap items-end gap-3" role="search">
        <div className="min-w-56 flex-1">
          <label htmlFor="q" className="label">
            Szukaj (nazwisko, telefon, nr rejestracyjny)
          </label>
          <input id="q" name="q" type="search" defaultValue={q} className="input" maxLength={80} />
        </div>
        <div>
          <label htmlFor="status" className="label">
            Status
          </label>
          <select id="status" name="status" defaultValue={status ?? ""} className="input">
            <option value="">Wszystkie</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {BOOKING_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-secondary">
          Filtruj
        </button>
      </form>

      {bookings.length === 0 ? (
        <Empty>Brak rezerwacji spełniających kryteria.</Empty>
      ) : (
        <TableWrap>
          <table className="table-mp">
            <caption className="sr-only">Lista rezerwacji ({total})</caption>
            <thead>
              <tr>
                <th scope="col">Termin</th>
                <th scope="col">Klient</th>
                <th scope="col">Pojazd</th>
                <th scope="col">Usługi</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td className="whitespace-nowrap">
                    <Link href={`/admin/rezerwacje/${b.id}`} className="link font-semibold">
                      {formatDateShortPl(b.startsAt)}, {warsawTime(b.startsAt)}
                    </Link>
                  </td>
                  <td>
                    <Link href={`/admin/klienci/${b.customerId}`} className="link">
                      {b.customer.name}
                    </Link>
                    <span className="text-muted block text-xs">{formatPhone(b.customer.phone)}</span>
                  </td>
                  <td>
                    {b.vehicle.make} {b.vehicle.model}
                    <span className="text-muted block text-xs">{b.vehicle.plate}</span>
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
      <Pager page={page} pages={Math.ceil(total / PAGE_SIZE)} href={href} />
    </>
  );
}
