import type { Metadata } from "next";
import Link from "next/link";
import { ActionButton, ActionForm } from "@/components/admin/ActionForm";
import { DayBoard, WeekBoard, type BoardItem, type DayCell, type DayRow, type WeekDay } from "@/components/admin/CalendarBoards";
import { Empty, PageHeader, Section } from "@/components/admin/ui";
import { Field, SelectField } from "@/components/form";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getOpeningHours, getSettings } from "@/lib/settings";
import { SLOT_MIN, whyClosed } from "@/lib/slots";
import {
  WEEKDAYS_PL,
  addDays,
  formatDatePl,
  formatDateShortPl,
  isDateString,
  isoWeekday,
  minutesToTime,
  startOfWeek,
  timeToMinutes,
  warsawDate,
  warsawTime,
  warsawToUtc,
} from "@/lib/time";
import { addBlock, removeBlock } from "../rezerwacje/actions";

export const metadata: Metadata = { title: "Kalendarz" };

type View = "dzien" | "tydzien" | "miesiac";
const VIEWS: { value: View; label: string }[] = [
  { value: "dzien", label: "Dzień" },
  { value: "tydzien", label: "Tydzień" },
  { value: "miesiac", label: "Miesiąc" },
];

const VISIBLE_STATUSES = ["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED"] as const;

async function loadRange(from: string, toExclusive: string) {
  const start = warsawToUtc(from, "00:00");
  const end = warsawToUtc(toExclusive, "00:00");
  const [bookings, blocks, closedRows] = await Promise.all([
    db.booking.findMany({
      where: { startsAt: { lt: end }, endsAt: { gt: start }, status: { in: [...VISIBLE_STATUSES] } },
      include: { customer: true, vehicle: true },
      orderBy: { startsAt: "asc" },
    }),
    db.block.findMany({ where: { startsAt: { lt: end }, endsAt: { gt: start } }, orderBy: { startsAt: "asc" } }),
    db.closedDay.findMany({ where: { date: { gte: new Date(`${from}T00:00:00Z`), lt: new Date(`${toExclusive}T00:00:00Z`) } } }),
  ]);
  return { bookings, blocks, closedDates: new Set(closedRows.map((c) => c.date.toISOString().slice(0, 10))) };
}

type Range = Awaited<ReturnType<typeof loadRange>>;

function bookingItem(b: Range["bookings"][number]): BoardItem {
  return {
    id: b.id,
    type: "booking",
    time: warsawTime(b.startsAt),
    title: b.customer.name,
    subtitle: `${b.vehicle.make} ${b.vehicle.model} · ${b.vehicle.plate}`,
    status: b.status,
    movable: b.status === "PENDING" || b.status === "CONFIRMED",
  };
}

function blockItem(b: Range["blocks"][number]): BoardItem {
  return {
    id: b.id,
    type: "block",
    time: `${warsawTime(b.startsAt)}–${warsawTime(b.endsAt)}`,
    title: b.reason,
    subtitle: b.bay ? `stanowisko ${b.bay}` : "wszystkie stanowiska",
    movable: false,
  };
}

/** Siatka dnia: wiersze co 15 minut, kolumny = stanowiska; wizyta zajmuje komórkę z rowSpan. */
function buildDay(date: string, range: Range, bays: number, hours: { closed: boolean; open: string; close: string } | undefined) {
  const dayStart = warsawToUtc(date, "00:00").getTime();
  const dayEnd = warsawToUtc(addDays(date, 1), "00:00").getTime();
  // Pozycję liczymy na czasie zegarowym, więc dzień ze zmianą czasu nie przesuwa siatki.
  const minuteOf = (instant: Date, edge: "start" | "end") => {
    if (instant.getTime() <= dayStart) return 0;
    if (instant.getTime() >= dayEnd) return 24 * 60;
    const minute = timeToMinutes(warsawTime(instant));
    return edge === "end" && minute === 0 ? 24 * 60 : minute;
  };

  const entries = [
    ...range.bookings.map((b) => ({ item: bookingItem(b), bays: [b.bay], from: minuteOf(b.startsAt, "start"), to: minuteOf(b.endsAt, "end") })),
    ...range.blocks.map((b) => ({
      item: blockItem(b),
      bays: b.bay ? [b.bay] : Array.from({ length: bays }, (_, i) => i + 1),
      from: minuteOf(b.startsAt, "start"),
      to: minuteOf(b.endsAt, "end"),
    })),
  ].filter((e) => e.to > e.from);

  const open = hours && !hours.closed ? timeToMinutes(hours.open) : 8 * 60;
  const close = hours && !hours.closed ? timeToMinutes(hours.close) : 17 * 60;
  const bookingEdges = range.bookings.flatMap((b) => [minuteOf(b.startsAt, "start"), minuteOf(b.endsAt, "end")]);
  const first = Math.floor(Math.min(open, ...bookingEdges) / 60) * 60;
  const last = Math.ceil(Math.max(close, ...bookingEdges) / 60) * 60;
  const rowCount = (last - first) / SLOT_MIN;

  const grid: DayCell[][] = Array.from({ length: rowCount }, (_, r) =>
    Array.from({ length: bays }, (): DayCell => ({ kind: "empty", iso: warsawToUtc(date, minutesToTime(first + r * SLOT_MIN)).toISOString() })),
  );
  const overflow: BoardItem[] = [];

  for (const entry of entries) {
    const fromRow = Math.max(0, Math.floor((entry.from - first) / SLOT_MIN));
    const toRow = Math.min(rowCount, Math.ceil((entry.to - first) / SLOT_MIN));
    if (toRow <= fromRow) continue;
    for (const bay of entry.bays) {
      const col = bay - 1;
      const free = col < bays && Array.from({ length: toRow - fromRow }, (_, i) => grid[fromRow + i]?.[col]).every((c) => c?.kind === "empty");
      const row = grid[fromRow];
      if (!free || !row) {
        if (!overflow.includes(entry.item)) overflow.push(entry.item);
        continue;
      }
      row[col] = { kind: "item", span: toRow - fromRow, item: entry.item };
      for (let r = fromRow + 1; r < toRow; r++) {
        const below = grid[r];
        if (below) below[col] = { kind: "skip" };
      }
    }
  }

  const rows: DayRow[] = grid.map((cells, r) => ({ time: minutesToTime(first + r * SLOT_MIN), cells }));
  return { rows, overflow };
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireUser();
  const query = await searchParams;
  const today = warsawDate(new Date());
  const view: View = VIEWS.find((v) => v.value === query.widok)?.value ?? "dzien";
  const date = query.data && isDateString(query.data) ? query.data : today;
  const [settings, hours] = await Promise.all([getSettings(), getOpeningHours()]);

  const monthStart = `${date.slice(0, 7)}-01`;
  const nextMonth = addDays(monthStart, 32).slice(0, 7) + "-01";
  const prevMonth = addDays(monthStart, -1).slice(0, 7) + "-01";
  const weekStart = startOfWeek(date);

  const nav = {
    dzien: { prev: addDays(date, -1), next: addDays(date, 1), title: formatDatePl(warsawToUtc(date, "12:00")) },
    tydzien: {
      prev: addDays(weekStart, -7),
      next: addDays(weekStart, 7),
      title: `${formatDateShortPl(warsawToUtc(weekStart, "12:00"))} – ${formatDateShortPl(warsawToUtc(addDays(weekStart, 6), "12:00"))}`,
    },
    miesiac: {
      prev: prevMonth,
      next: nextMonth,
      title: new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${monthStart}T00:00:00Z`)),
    },
  }[view];
  const link = (v: View, d: string) => `/admin/kalendarz?widok=${v}&data=${d}`;

  let board: React.ReactNode;
  if (view === "dzien") {
    const range = await loadRange(date, addDays(date, 1));
    const dayHours = hours.get(isoWeekday(date));
    const { rows, overflow } = buildDay(date, range, settings.bays, dayHours);
    const closed = whyClosed(date, dayHours, range.closedDates);
    board = (
      <>
        {closed && <p className="text-warn mb-3 text-sm font-medium">Tego dnia warsztat jest zamknięty: {closed}.</p>}
        <DayBoard date={date} bays={settings.bays} rows={rows} />
        {overflow.length > 0 && (
          <p className="text-warn mt-3 text-sm">
            Poza siatką (nakładające się terminy lub stanowisko spoza konfiguracji): {overflow.map((i) => `${i.time} ${i.title}`).join("; ")}
          </p>
        )}
      </>
    );
  } else if (view === "tydzien") {
    const range = await loadRange(weekStart, addDays(weekStart, 7));
    const days: WeekDay[] = Array.from({ length: 7 }, (_, i) => {
      const d = addDays(weekStart, i);
      return {
        date: d,
        label: `${WEEKDAYS_PL[i]?.slice(0, 3)}. ${d.slice(8)}.${d.slice(5, 7)}`,
        closedReason: whyClosed(d, hours.get(isoWeekday(d)), range.closedDates),
        today: d === today,
        items: [
          ...range.blocks.filter((b) => warsawDate(b.startsAt) <= d && warsawDate(new Date(b.endsAt.getTime() - 1)) >= d).map(blockItem),
          ...range.bookings.filter((b) => warsawDate(b.startsAt) === d).map(bookingItem),
        ],
      };
    });
    board = <WeekBoard days={days} />;
  } else {
    const gridStart = startOfWeek(monthStart);
    const gridEnd = addDays(startOfWeek(addDays(nextMonth, -1)), 7);
    const range = await loadRange(gridStart, gridEnd);
    const counts = new Map<string, number>();
    for (const b of range.bookings) counts.set(warsawDate(b.startsAt), (counts.get(warsawDate(b.startsAt)) ?? 0) + 1);
    const weeks: string[][] = [];
    for (let d = gridStart; d < gridEnd; d = addDays(d, 7)) weeks.push(Array.from({ length: 7 }, (_, i) => addDays(d, i)));
    board = (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] table-fixed border-collapse text-sm">
          <caption className="sr-only">Liczba wizyt w poszczególnych dniach miesiąca</caption>
          <thead>
            <tr>
              {WEEKDAYS_PL.map((w) => (
                <th key={w} scope="col" className="text-muted px-2 py-2 text-left text-xs font-semibold">
                  {w.slice(0, 3)}.
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week) => (
              <tr key={week[0]}>
                {week.map((d) => {
                  const count = counts.get(d) ?? 0;
                  const closed = whyClosed(d, hours.get(isoWeekday(d)), range.closedDates);
                  const inMonth = d.slice(0, 7) === monthStart.slice(0, 7);
                  return (
                    <td key={d} className={`border-line h-24 border p-0 align-top ${inMonth ? "" : "opacity-50"}`}>
                      <Link href={link("dzien", d)} className={`hover:bg-surface-2 text-fg block h-full p-2 no-underline ${d === today ? "bg-surface-2" : ""}`}>
                        <span className={`font-display font-bold ${d === today ? "text-accent-text" : ""}`}>{Number(d.slice(8))}</span>
                        {count > 0 && (
                          <span className="badge border-accent text-accent-text mt-1 block w-fit">
                            {count} <span className="sr-only">wizyt</span>
                          </span>
                        )}
                        {closed && <span className="text-muted mt-1 block text-xs">{closed}</span>}
                      </Link>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const upcomingBlocks = await db.block.findMany({ where: { endsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" }, take: 30 });

  return (
    <>
      <PageHeader title="Kalendarz">
        <Link href={`/admin/rezerwacje/nowa?data=${date}`} className="btn btn-primary btn-sm">
          Dodaj wizytę
        </Link>
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={link(view, nav.prev)} className="btn btn-secondary btn-sm" aria-label="Poprzedni okres">
            ←
          </Link>
          <Link href={link(view, today)} className="btn btn-secondary btn-sm">
            Dziś
          </Link>
          <Link href={link(view, nav.next)} className="btn btn-secondary btn-sm" aria-label="Następny okres">
            →
          </Link>
          <h2 className="ml-2 text-lg">{nav.title}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <form method="get" className="flex items-center gap-2">
            <input type="hidden" name="widok" value={view} />
            <label htmlFor="cal-date" className="sr-only">
              Przejdź do daty
            </label>
            <input id="cal-date" type="date" name="data" defaultValue={date} className="input min-h-10 w-auto py-1" />
            <button type="submit" className="btn btn-secondary btn-sm">
              Pokaż
            </button>
          </form>
          <ul className="flex gap-1" aria-label="Widok kalendarza">
            {VIEWS.map((v) => (
              <li key={v.value}>
                <Link href={link(v.value, date)} aria-current={v.value === view ? "page" : undefined} className={`btn btn-sm ${v.value === view ? "btn-primary" : "btn-secondary"}`}>
                  {v.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="card mb-6">{board}</div>
      {view !== "miesiac" && (
        <p className="text-muted mb-6 text-sm">
          Wizyty oczekujące i potwierdzone można przeciągać myszą albo użyć przycisku „Przenieś” i wskazać nowy termin. Klient dostaje e-mail z nowym terminem.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Zablokuj termin (urlop, awaria, szkolenie)">
          <ActionForm action={addBlock} resetOnSuccess className="grid gap-4 sm:grid-cols-2">
            <Field label="Od – data" name="fromDate" type="date" required defaultValue={date} />
            <Field label="Od – godzina" name="fromTime" type="time" required step={900} defaultValue="08:00" />
            <Field label="Do – data" name="toDate" type="date" required defaultValue={date} />
            <Field label="Do – godzina" name="toTime" type="time" required step={900} defaultValue="17:00" />
            <SelectField label="Stanowisko" name="bay" defaultValue="">
              <option value="">Wszystkie</option>
              {Array.from({ length: settings.bays }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </SelectField>
            <Field label="Powód" name="reason" required maxLength={200} />
            <div className="sm:col-span-2">
              <ActionButton className="btn btn-secondary btn-sm">Dodaj blokadę</ActionButton>
            </div>
          </ActionForm>
        </Section>

        <Section title="Aktywne i przyszłe blokady">
          {upcomingBlocks.length === 0 ? (
            <Empty>Brak blokad.</Empty>
          ) : (
            <ul className="divide-line divide-y text-sm">
              {upcomingBlocks.map((b) => (
                <li key={b.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                  <div>
                    <span className="font-semibold">{b.reason}</span>
                    <span className="text-muted block">
                      {formatDateShortPl(b.startsAt)} {warsawTime(b.startsAt)} – {formatDateShortPl(b.endsAt)} {warsawTime(b.endsAt)} ·{" "}
                      {b.bay ? `stanowisko ${b.bay}` : "wszystkie stanowiska"}
                    </span>
                  </div>
                  <ActionForm action={removeBlock} confirm="Usunąć blokadę? Termin znów będzie dostępny dla klientów.">
                    <input type="hidden" name="id" value={b.id} />
                    <ActionButton className="btn btn-danger btn-sm">Usuń</ActionButton>
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
