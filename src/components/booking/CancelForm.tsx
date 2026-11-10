"use client";

import { useActionState, useRef } from "react";
import { cancelBooking, type CancelState } from "@/app/(public)/rezerwacja/actions";

const INITIAL: CancelState = { ok: false };

export function CancelForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(cancelBooking, INITIAL);
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <div>
      <div role="alert">{state.message && <p className={state.ok ? "text-ok font-semibold" : "text-danger font-semibold"}>{state.message}</p>}</div>
      {!state.ok && (
        <button type="button" className="btn btn-danger mt-3" onClick={() => dialogRef.current?.showModal()}>
          Anuluj rezerwację
        </button>
      )}
      <dialog ref={dialogRef} className="modal" aria-labelledby="cancel-title">
        <h2 id="cancel-title" className="text-xl">
          Anulować wizytę?
        </h2>
        <p className="text-muted mt-2">Termin zostanie zwolniony dla innych klientów. Tej operacji nie można cofnąć.</p>
        <form action={action} className="mt-6 flex flex-wrap justify-end gap-3" onSubmit={() => dialogRef.current?.close()}>
          <input type="hidden" name="token" value={token} />
          <button type="button" className="btn btn-secondary" onClick={() => dialogRef.current?.close()}>
            Nie, zostawiam
          </button>
          <button type="submit" className="btn btn-danger" disabled={pending}>
            Tak, anuluj
          </button>
        </form>
      </dialog>
    </div>
  );
}
