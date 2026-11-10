import Link from "next/link";
import type { ReactNode } from "react";
import { BOOKING_STATUS_LABEL, INQUIRY_STATUS_LABEL, type BookingStatus, type InquiryStatus } from "@/lib/labels";

const BOOKING_TONE: Record<BookingStatus, string> = {
  PENDING: "border-warn text-warn",
  CONFIRMED: "border-ok text-ok",
  IN_PROGRESS: "border-accent text-accent-text",
  COMPLETED: "text-muted",
  CANCELLED: "border-danger text-danger",
  NO_SHOW: "border-danger text-danger",
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  return <span className={`badge ${BOOKING_TONE[status]}`}>{BOOKING_STATUS_LABEL[status]}</span>;
}

const INQUIRY_TONE: Record<InquiryStatus, string> = {
  NEW: "border-warn text-warn",
  IN_PROGRESS: "border-accent text-accent-text",
  CLOSED: "text-muted",
};

export function InquiryBadge({ status }: { status: InquiryStatus }) {
  return <span className={`badge ${INQUIRY_TONE[status]}`}>{INQUIRY_STATUS_LABEL[status]}</span>;
}

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl sm:text-3xl">{title}</h1>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function Section({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      <h2 className="mb-4 text-lg">{title}</h2>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="text-muted text-sm">{children}</p>;
}

/** Tabela przewijana w poziomie na wąskich ekranach (tablet w warsztacie). */
export function TableWrap({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto">{children}</div>;
}

export function Pager({ page, pages, href }: { page: number; pages: number; href: (page: number) => string }) {
  if (pages <= 1) return null;
  return (
    <nav aria-label="Stronicowanie" className="mt-4 flex items-center gap-3 text-sm">
      {page > 1 ? (
        <Link href={href(page - 1)} className="btn btn-secondary btn-sm">
          Poprzednia
        </Link>
      ) : null}
      <span className="text-muted">
        Strona {page} z {pages}
      </span>
      {page < pages ? (
        <Link href={href(page + 1)} className="btn btn-secondary btn-sm">
          Następna
        </Link>
      ) : null}
    </nav>
  );
}

/** Pobranie pliku z trasy API – zwykły odnośnik, bo <Link> próbowałby nawigacji po stronie klienta. */
export function CsvLink({ kind }: { kind: "rezerwacje" | "klienci" | "zapytania" }) {
  return (
    <a href={`/admin/eksport/${kind}`} download className="btn btn-secondary btn-sm">
      Eksport CSV
    </a>
  );
}

export function pageParam(value: string | undefined): number {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 10_000 ? n : 1;
}
