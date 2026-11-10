"use client";

import Link from "next/link";
import { useState, useTransition, type DragEvent } from "react";
import { moveBookingTo, moveBookingToDay } from "@/app/admin/(panel)/rezerwacje/actions";
import type { FormState } from "@/lib/form-state";
import { BOOKING_STATUS_LABEL, type BookingStatus } from "@/lib/labels";

export interface BoardItem {
  id: string;
  type: "booking" | "block";
  time: string;
  title: string;
  subtitle: string;
  status?: BookingStatus;
  movable: boolean;
}

export type DayCell = { kind: "empty"; iso: string } | { kind: "skip" } | { kind: "item"; span: number; item: BoardItem };

export interface DayRow {
  time: string;
  cells: DayCell[];
}

export interface WeekDay {
  date: string;
  label: string;
  closedReason: string | null;
  today: boolean;
  items: BoardItem[];
}

const TONE: Record<BookingStatus, string> = {
  PENDING: "border-warn",
  CONFIRMED: "border-ok",
  IN_PROGRESS: "border-accent",
  COMPLETED: "border-line-strong",
  CANCELLED: "border-danger",
  NO_SHOW: "border-danger",
};

const DRAG_TYPE = "application/x-motopuls-booking";

/** Wspólna obsługa przenoszenia: przeciąganie myszą oraz tryb „Przenieś” dla ekranów dotykowych i klawiatury. */
function useMove() {
  const [movingId, setMovingId] = useState<string | null>(null);
  const [result, setResult] = useState<FormState | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<FormState>) {
    setMovingId(null);
    startTransition(async () => setResult(await action()));
  }

  function droppedId(event: DragEvent): string | null {
    event.preventDefault();
    return event.dataTransfer.getData(DRAG_TYPE) || null;
  }

  return { movingId, setMovingId, result, pending, run, droppedId };
}

function allowDrop(event: DragEvent) {
  if (event.dataTransfer.types.includes(DRAG_TYPE)) event.preventDefault();
}

function MoveStatus({ result, pending, movingId, onCancel }: { result: FormState | null; pending: boolean; movingId: string | null; onCancel: () => void }) {
  return (
    <div role="status" aria-live="polite" className="mb-3 min-h-6 text-sm">
      {pending && <p className="text-muted">Przenoszę wizytę…</p>}
      {!pending && movingId && (
        <p className="text-warn font-medium">
          Wybierz nowy termin dla zaznaczonej wizyty.{" "}
          <button type="button" className="link" onClick={onCancel}>
            Anuluj przenoszenie
          </button>
        </p>
      )}
      {!pending && !movingId && result?.message && <p className={result.ok ? "text-ok font-medium" : "text-danger font-medium"}>{result.message}</p>}
    </div>
  );
}

function ItemCard({ item, moving, onMove }: { item: BoardItem; moving: boolean; onMove?: () => void }) {
  if (item.type === "block") {
    return (
      <div className="bg-surface-2 border-danger text-muted h-full rounded-md border-l-4 px-2 py-1 text-xs">
        <span className="text-fg font-semibold">Blokada</span> · {item.time}
        <span className="block">{item.title}</span>
      </div>
    );
  }
  return (
    <div
      draggable={item.movable}
      onDragStart={(event) => {
        event.dataTransfer.setData(DRAG_TYPE, item.id);
        event.dataTransfer.effectAllowed = "move";
      }}
      className={`bg-surface-2 h-full rounded-md border-l-4 px-2 py-1 text-xs ${item.status ? TONE[item.status] : ""} ${item.movable ? "cursor-grab" : ""} ${moving ? "ring-accent ring-2" : ""}`}
    >
      <Link href={`/admin/rezerwacje/${item.id}`} className="text-fg font-semibold underline-offset-2 hover:underline">
        {item.time} {item.title}
      </Link>
      <span className="text-muted block">{item.subtitle}</span>
      <span className="flex flex-wrap items-center justify-between gap-1">
        {item.status && <span className="text-muted">{BOOKING_STATUS_LABEL[item.status]}</span>}
        {item.movable && onMove && (
          <button type="button" className="link" onClick={onMove} aria-pressed={moving}>
            {moving ? "Anuluj" : "Przenieś"}
          </button>
        )}
      </span>
    </div>
  );
}

export function DayBoard({ date, bays, rows }: { date: string; bays: number; rows: DayRow[] }) {
  const move = useMove();

  return (
    <>
      <MoveStatus result={move.result} pending={move.pending} movingId={move.movingId} onCancel={() => move.setMovingId(null)} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] table-fixed border-collapse text-sm" aria-busy={move.pending}>
          <caption className="sr-only">Plan dnia {date}: wiersze co 15 minut, kolumny to stanowiska</caption>
          <thead>
            <tr>
              <th scope="col" className="text-muted w-16 px-1 py-2 text-left text-xs font-semibold">
                Godz.
              </th>
              {Array.from({ length: bays }, (_, i) => (
                <th key={i} scope="col" className="border-line text-muted border-b px-2 py-2 text-left text-xs font-semibold">
                  Stanowisko {i + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const major = row.time.endsWith(":00") || row.time.endsWith(":30");
              return (
                <tr key={row.time} className="h-8">
                  <th scope="row" className={`text-muted px-1 text-left align-top text-xs font-normal ${major ? "border-line border-t" : ""}`}>
                    <span className={major ? "" : "sr-only"}>{row.time}</span>
                  </th>
                  {row.cells.map((cell, index) => {
                    const bay = index + 1;
                    if (cell.kind === "skip") return null;
                    if (cell.kind === "item") {
                      return (
                        <td key={bay} rowSpan={cell.span} className="border-line h-px border-l p-0.5 align-top">
                          <ItemCard
                            item={cell.item}
                            moving={move.movingId === cell.item.id}
                            onMove={() => move.setMovingId(move.movingId === cell.item.id ? null : cell.item.id)}
                          />
                        </td>
                      );
                    }
                    const { iso } = cell;
                    return (
                      <td
                        key={bay}
                        className={`border-line border-l p-0 ${major ? "border-t" : ""}`}
                        onDragOver={allowDrop}
                        onDrop={(event) => {
                          const id = move.droppedId(event);
                          if (id) move.run(() => moveBookingTo(id, iso, bay));
                        }}
                      >
                        {move.movingId ? (
                          <button
                            type="button"
                            className="hover:bg-accent hover:text-accent-ink text-muted block h-8 w-full text-xs"
                            onClick={() => {
                              const id = move.movingId;
                              if (id) move.run(() => moveBookingTo(id, iso, bay));
                            }}
                          >
                            <span className="sr-only">Przenieś na </span>
                            {row.time}
                            <span className="sr-only">, stanowisko {bay}</span>
                          </button>
                        ) : (
                          <Link
                            href={`/admin/rezerwacje/nowa?data=${date}&godzina=${row.time}`}
                            className="hover:bg-surface-2 text-muted block h-8 w-full text-center text-xs leading-8 no-underline opacity-0 hover:opacity-100 focus:opacity-100"
                          >
                            + <span className="sr-only">Dodaj wizytę o {row.time}, stanowisko {bay}</span>
                          </Link>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function WeekBoard({ days }: { days: WeekDay[] }) {
  const move = useMove();

  return (
    <>
      <MoveStatus result={move.result} pending={move.pending} movingId={move.movingId} onCancel={() => move.setMovingId(null)} />
      <ol className="grid gap-2 md:grid-cols-7" aria-busy={move.pending}>
        {days.map((day) => (
          <li
            key={day.date}
            className={`bg-surface min-h-32 rounded-lg border p-2 ${day.today ? "border-accent" : "border-line"}`}
            onDragOver={allowDrop}
            onDrop={(event) => {
              const id = move.droppedId(event);
              if (id) move.run(() => moveBookingToDay(id, day.date));
            }}
          >
            <h3 className="text-sm">
              <Link href={`/admin/kalendarz?data=${day.date}`} className="text-fg underline-offset-2 hover:underline">
                {day.label}
              </Link>
            </h3>
            {day.closedReason && <p className="text-muted text-xs">{day.closedReason}</p>}
            {move.movingId && (
              <button
                type="button"
                className="btn btn-secondary btn-sm mt-2 w-full"
                onClick={() => {
                  const id = move.movingId;
                  if (id) move.run(() => moveBookingToDay(id, day.date));
                }}
              >
                Przenieś tutaj<span className="sr-only"> ({day.label})</span>
              </button>
            )}
            <ul className="mt-2 space-y-1.5">
              {day.items.map((item) => (
                <li key={`${item.type}-${item.id}`}>
                  <ItemCard
                    item={item}
                    moving={move.movingId === item.id}
                    onMove={() => move.setMovingId(move.movingId === item.id ? null : item.id)}
                  />
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </>
  );
}
