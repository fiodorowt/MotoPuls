import type { Metadata } from "next";
import Link from "next/link";
import { CsvLink, Empty, PageHeader, Pager, TableWrap, pageParam } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth/session";
import { db, type Prisma } from "@/lib/db";
import { formatPhone } from "@/lib/labels";
import { formatDateShortPl } from "@/lib/time";

export const metadata: Metadata = { title: "Klienci" };

const PAGE_SIZE = 30;

export default async function CustomersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  const query = await searchParams;
  const q = (query.q ?? "").trim().slice(0, 80);
  const page = pageParam(query.strona);
  const compact = q.replace(/[\s-]/g, "");

  const where: Prisma.CustomerWhereInput = {
    anonymizedAt: null,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { phone: { contains: compact } },
            { email: { contains: q, mode: "insensitive" } },
            { vehicles: { some: { plate: { contains: compact.toUpperCase() } } } },
          ],
        }
      : {}),
  };
  const [total, customers] = await Promise.all([
    db.customer.count({ where }),
    db.customer.findMany({
      where,
      include: {
        vehicles: { select: { plate: true, make: true, model: true } },
        fleetAccount: { select: { companyName: true } },
        bookings: { select: { startsAt: true }, orderBy: { startsAt: "desc" }, take: 1 },
        _count: { select: { bookings: true } },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  return (
    <>
      <PageHeader title="Klienci i pojazdy">
        {user.role === "OWNER" && <CsvLink kind="klienci" />}
      </PageHeader>

      {query.usunieto && <p className="border-ok text-ok mb-4 rounded-md border px-3 py-2 text-sm font-medium">Dane klienta zostały trwale usunięte (zanonimizowane).</p>}

      <form method="get" className="card mb-6 flex flex-wrap items-end gap-3" role="search">
        <div className="min-w-56 flex-1">
          <label htmlFor="q" className="label">
            Szukaj po nazwisku, telefonie, e-mailu lub numerze rejestracyjnym
          </label>
          <input id="q" name="q" type="search" defaultValue={q} className="input" maxLength={80} />
        </div>
        <button type="submit" className="btn btn-secondary">
          Szukaj
        </button>
      </form>

      {customers.length === 0 ? (
        <Empty>Brak klientów spełniających kryteria.</Empty>
      ) : (
        <TableWrap>
          <table className="table-mp">
            <caption className="sr-only">Lista klientów ({total})</caption>
            <thead>
              <tr>
                <th scope="col">Klient</th>
                <th scope="col">Kontakt</th>
                <th scope="col">Pojazdy</th>
                <th scope="col">Wizyty</th>
                <th scope="col">Ostatnia wizyta</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/admin/klienci/${c.id}`} className="link font-semibold">
                      {c.name}
                    </Link>
                    {c.fleetAccount && <span className="text-muted block text-xs">Flota: {c.fleetAccount.companyName}</span>}
                  </td>
                  <td>
                    {formatPhone(c.phone)}
                    <span className="text-muted block text-xs break-all">{c.email}</span>
                  </td>
                  <td>
                    {c.vehicles.map((v) => (
                      <span key={v.plate} className="block">
                        {v.make} {v.model} · {v.plate}
                      </span>
                    ))}
                  </td>
                  <td>{c._count.bookings}</td>
                  <td className="whitespace-nowrap">{c.bookings[0] ? formatDateShortPl(c.bookings[0].startsAt) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}
      <Pager page={page} pages={Math.ceil(total / PAGE_SIZE)} href={(p) => `/admin/klienci?${new URLSearchParams({ ...(q ? { q } : {}), ...(p > 1 ? { strona: String(p) } : {}) })}`} />
    </>
  );
}
