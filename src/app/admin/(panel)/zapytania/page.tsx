import type { Metadata } from "next";
import Link from "next/link";
import { CsvLink, Empty, InquiryBadge, PageHeader, Pager, TableWrap, pageParam } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth/session";
import { db, type Prisma } from "@/lib/db";
import { INQUIRY_STATUS_LABEL, INQUIRY_TYPE_LABEL, type InquiryStatus, type InquiryType } from "@/lib/labels";
import { formatDateTimePl } from "@/lib/time";

export const metadata: Metadata = { title: "Zapytania" };

const PAGE_SIZE = 30;
const TYPES = Object.keys(INQUIRY_TYPE_LABEL) as InquiryType[];
const STATUSES = Object.keys(INQUIRY_STATUS_LABEL) as InquiryStatus[];

export default async function InquiriesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  const query = await searchParams;
  const type = TYPES.find((t) => t === query.typ);
  const status = STATUSES.find((s) => s === query.status);
  const page = pageParam(query.strona);

  const where: Prisma.InquiryWhereInput = { ...(type ? { type } : {}), ...(status ? { status } : {}) };
  const [total, inquiries] = await Promise.all([
    db.inquiry.count({ where }),
    db.inquiry.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
  ]);

  return (
    <>
      <PageHeader title="Skrzynka zapytań">
        {user.role === "OWNER" && <CsvLink kind="zapytania" />}
      </PageHeader>

      <form method="get" className="card mb-6 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="typ" className="label">
            Rodzaj
          </label>
          <select id="typ" name="typ" defaultValue={type ?? ""} className="input">
            <option value="">Wszystkie</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {INQUIRY_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="status" className="label">
            Status
          </label>
          <select id="status" name="status" defaultValue={status ?? ""} className="input">
            <option value="">Wszystkie</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {INQUIRY_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-secondary">
          Filtruj
        </button>
      </form>

      {inquiries.length === 0 ? (
        <Empty>Brak zapytań spełniających kryteria.</Empty>
      ) : (
        <TableWrap>
          <table className="table-mp">
            <caption className="sr-only">Zapytania ({total})</caption>
            <thead>
              <tr>
                <th scope="col">Data</th>
                <th scope="col">Rodzaj</th>
                <th scope="col">Od</th>
                <th scope="col">Treść</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {inquiries.map((inquiry) => (
                <tr key={inquiry.id}>
                  <td className="whitespace-nowrap">
                    <Link href={`/admin/zapytania/${inquiry.id}`} className="link">
                      {formatDateTimePl(inquiry.createdAt)}
                    </Link>
                  </td>
                  <td>{INQUIRY_TYPE_LABEL[inquiry.type]}</td>
                  <td>
                    {inquiry.name}
                    {inquiry.company && <span className="text-muted block text-xs">{inquiry.company}</span>}
                  </td>
                  <td className="max-w-80 truncate">{inquiry.message || "—"}</td>
                  <td>
                    <InquiryBadge status={inquiry.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}
      <Pager
        page={page}
        pages={Math.ceil(total / PAGE_SIZE)}
        href={(p) => `/admin/zapytania?${new URLSearchParams({ ...(type ? { typ: type } : {}), ...(status ? { status } : {}), ...(p > 1 ? { strona: String(p) } : {}) })}`}
      />
    </>
  );
}
