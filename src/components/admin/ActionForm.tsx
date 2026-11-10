"use client";

import { createContext, useActionState, useContext, useEffect, useRef, startTransition, type FormEvent, type ReactNode } from "react";
import { EMPTY_FORM, type FormState } from "@/lib/form-state";

const PendingContext = createContext(false);

interface Props {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  children: ReactNode;
  className?: string;
  /** Pytanie potwierdzające przed operacją nieodwracalną */
  confirm?: string;
  /** Wyczyść pola po udanym zapisie (formularze „dodaj”) */
  resetOnSuccess?: boolean;
}

/**
 * Formularz panelu spięty z akcją serwerową. Wysyłka przez onSubmit (zamiast action=),
 * żeby po błędzie walidacji przeglądarka nie czyściła wpisanych wartości.
 */
export function ActionForm({ action, children, className, confirm, resetOnSuccess }: Props) {
  const [state, dispatch, pending] = useActionState(action, EMPTY_FORM);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok && resetOnSuccess) formRef.current?.reset();
  }, [state, resetOnSuccess]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (confirm && !window.confirm(confirm)) return;
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  }

  const errors = Object.values(state.errors ?? {});
  return (
    <form ref={formRef} onSubmit={onSubmit} className={className} noValidate>
      <PendingContext.Provider value={pending}>{children}</PendingContext.Provider>
      <div role="status" aria-live="polite">
        {state.message && (
          <div className={`mt-3 rounded-md border px-3 py-2 text-sm font-medium ${state.ok ? "border-ok text-ok" : "border-danger text-danger"}`}>
            <p>{state.message}</p>
            {errors.length > 0 && (
              <ul className="mt-1 list-disc pl-5 font-normal">
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </form>
  );
}

export function ActionButton({ children, className = "btn btn-primary" }: { children: ReactNode; className?: string }) {
  const pending = useContext(PendingContext);
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending}>
      {children}
    </button>
  );
}
