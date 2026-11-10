import type { Metadata } from "next";
import { Empty, PageHeader, Pager, TableWrap, pageParam } from "@/components/admin/ui";
import { requireOwner } from "@/lib/auth/session";
import { db, type Prisma } from "@/lib/db";
import { formatDateTimePl } from "@/lib/time";

export const metadata: Metadata = { title: "Dziennik zdarzeń" };

const PAGE_SIZE = 50;

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireOwner();
  const query = await searchParams;
  const q = (query.q ?? "").trim().slice(0, 80);
  const page = pageParam(query.strona);
  const where: Prisma.AuditLogWhereInput = q
    ? { OR: [{ actor: { contains: q, mode: "insensitive" } }, { action: { contains: q, mode: "insensitive" } }, { entityId: q }] }
    : {};
  const [total, entries] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
  ]);

  return (
    <>
      <PageHeader title="Dziennik zdarzeń" />
      <form method="get" className="card mb-6 flex flex-wrap items-end gap-3" role="search">
        <div className="min-w-56 flex-1">
          <label htmlFor="q" className="label">
            Szukaj po użytkowniku, akcji lub identyfikatorze
          </label>
          <input id="q" name="q" type="search" defaultValue={q} className="input" maxLength={80} />
        </div>
        <button type="submit" className="btn btn-secondary">
          Szukaj
        </button>
      </form>

      {entries.length === 0 ? (
        <Empty>Brak wpisów.</Empty>
      ) : (
        <TableWrap>
          <table className="table-mp">
            <caption className="sr-only">Dziennik zdarzeń ({total})</caption>
            <thead>
              <tr>
                <th scope="col">Czas</th>
                <th scope="col">Kto</th>
                <th scope="col">Akcja</th>
                <th scope="col">Obiekt</th>
                <th scope="col">Szczegóły</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td className="whitespace-nowrap">{formatDateTimePl(entry.createdAt)}</td>
                  <td className="break-all">{entry.actor}</td>
                  <td>
                    <code>{entry.action}</code>
                  </td>
                  <td className="text-muted text-xs">
                    {entry.entity}
                    {entry.entityId ? ` · ${entry.entityId}` : ""}
                  </td>
                  <td className="text-muted text-xs break-all">{entry.details ? JSON.stringify(entry.details) : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}
      <Pager page={page} pages={Math.ceil(total / PAGE_SIZE)} href={(p) => `/admin/dziennik?${new URLSearchParams({ ...(q ? { q } : {}), ...(p > 1 ? { strona: String(p) } : {}) })}`} />
    </>
  );
}
