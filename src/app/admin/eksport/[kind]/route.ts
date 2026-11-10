import { audit } from "@/lib/audit";
import { requireOwner } from "@/lib/auth/session";
import { toCsv } from "@/lib/csv";
import { db } from "@/lib/db";
import { BOOKING_STATUS_LABEL, INQUIRY_STATUS_LABEL, INQUIRY_TYPE_LABEL } from "@/lib/labels";
import { warsawDate, warsawTime } from "@/lib/time";

const MAX_ROWS = 20_000;

type Cell = string | number | null;

async function bookings(): Promise<{ header: string[]; rows: Cell[][] }> {
  const data = await db.booking.findMany({
    include: { customer: true, vehicle: true, services: true },
    orderBy: { startsAt: "desc" },
    take: MAX_ROWS,
  });
  return {
    header: ["Data", "Godzina", "Status", "Stanowisko", "Klient", "Telefon", "E-mail", "Pojazd", "Rejestracja", "Usługi", "Źródło"],
    rows: data.map((b) => [
      warsawDate(b.startsAt),
      warsawTime(b.startsAt),
      BOOKING_STATUS_LABEL[b.status],
      b.bay,
      b.customer.name,
      b.customer.phone,
      b.customer.email,
      `${b.vehicle.make} ${b.vehicle.model}`,
      b.vehicle.plate,
      b.services.map((s) => s.name).join(", "),
      b.source === "ONLINE" ? "online" : "panel",
    ]),
  };
}

async function customers(): Promise<{ header: string[]; rows: Cell[][] }> {
  const data = await db.customer.findMany({
    where: { anonymizedAt: null },
    include: { vehicles: true, fleetAccount: true, _count: { select: { bookings: true } } },
    orderBy: { name: "asc" },
    take: MAX_ROWS,
  });
  return {
    header: ["Klient", "Telefon", "E-mail", "Flota", "Pojazdy", "Liczba wizyt", "Zgoda marketingowa", "Dodano"],
    rows: data.map((c) => [
      c.name,
      c.phone,
      c.email,
      c.fleetAccount?.companyName ?? "",
      c.vehicles.map((v) => `${v.make} ${v.model} (${v.plate})`).join(", "),
      c._count.bookings,
      c.marketingConsent ? "tak" : "nie",
      warsawDate(c.createdAt),
    ]),
  };
}

async function inquiries(): Promise<{ header: string[]; rows: Cell[][] }> {
  const data = await db.inquiry.findMany({ orderBy: { createdAt: "desc" }, take: MAX_ROWS });
  return {
    header: ["Data", "Rodzaj", "Status", "Imię i nazwisko", "Firma", "Telefon", "E-mail", "Treść"],
    rows: data.map((i) => [warsawDate(i.createdAt), INQUIRY_TYPE_LABEL[i.type], INQUIRY_STATUS_LABEL[i.status], i.name, i.company ?? "", i.phone, i.email, i.message]),
  };
}

const EXPORTS: Record<string, () => Promise<{ header: string[]; rows: Cell[][] }>> = { rezerwacje: bookings, klienci: customers, zapytania: inquiries };

/** Eksport CSV – tylko właściciel; każde pobranie trafia do dziennika zdarzeń. */
export async function GET(_request: Request, { params }: { params: Promise<{ kind: string }> }) {
  const user = await requireOwner();
  const { kind } = await params;
  const build = Object.hasOwn(EXPORTS, kind) ? EXPORTS[kind] : undefined;
  if (!build) return new Response(null, { status: 404 });

  const { header, rows } = await build();
  await audit({ actor: user.email, userId: user.id, action: "export.csv", entity: kind, details: { rows: rows.length } });

  return new Response(toCsv(header, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="motopuls-${kind}-${warsawDate(new Date())}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
