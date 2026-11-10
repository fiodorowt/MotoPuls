"use client";

import Script from "next/script";
import { useId, type ComponentProps, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/lib/form-state";

interface FieldProps extends Omit<ComponentProps<"input">, "className"> {
  label: string;
  name: string;
  error?: string;
  hint?: string;
}

export function Field({ label, error, hint, required, ...input }: FieldProps) {
  const id = useId();
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
        {!required && <span className="text-muted font-normal"> (opcjonalnie)</span>}
      </label>
      <input id={id} className="input" required={required} aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...input} />
      {hint && (
        <p id={`${id}-hint`} className="text-muted mt-1.5 text-sm">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}

interface TextAreaProps extends Omit<ComponentProps<"textarea">, "className"> {
  label: string;
  name: string;
  error?: string;
  hint?: string;
}

export function TextAreaField({ label, error, hint, required, rows = 4, ...textarea }: TextAreaProps) {
  const id = useId();
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
        {!required && <span className="text-muted font-normal"> (opcjonalnie)</span>}
      </label>
      <textarea id={id} rows={rows} className="input" required={required} aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...textarea} />
      {hint && (
        <p id={`${id}-hint`} className="text-muted mt-1.5 text-sm">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}

interface SelectProps extends Omit<ComponentProps<"select">, "className"> {
  label: string;
  name: string;
  error?: string;
  children: ReactNode;
}

export function SelectField({ label, error, children, ...select }: SelectProps) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <select id={id} className="input" aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined} {...select}>
        {children}
      </select>
      {error && (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}

interface CheckboxProps extends Omit<ComponentProps<"input">, "className" | "type" | "children"> {
  name: string;
  error?: string;
  children: ReactNode;
}

export function CheckboxField({ error, children, ...input }: CheckboxProps) {
  const id = useId();
  return (
    <div>
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          className="accent-accent mt-0.5 h-6 w-6 shrink-0"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          {...input}
        />
        <label htmlFor={id} className="text-muted text-sm">
          {children}
        </label>
      </div>
      {error && (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}

export function SubmitButton({ children, className = "btn btn-primary" }: { children: ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending}>
      {pending ? "Wysyłanie…" : children}
    </button>
  );
}

/** Komunikat wyniku formularza – ogłaszany przez czytniki ekranu. */
export function FormAlert({ state }: { state: FormState }) {
  return (
    <div role="status" aria-live="polite">
      {state.message && (
        <p
          className={`rounded-md border px-4 py-3 text-sm font-medium ${state.ok ? "border-ok text-ok" : "border-danger text-danger"}`}
        >
          {state.message}
        </p>
      )}
    </div>
  );
}

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

/** Pola antyspamowe: pułapka (honeypot), podpisany znacznik czasu i – jeśli skonfigurowano – Turnstile. */
export function AntispamFields({ token }: { token: string }) {
  return (
    <>
      <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
        <label>
          Strona WWW (zostaw puste)
          <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>
      <input type="hidden" name="form_token" value={token} />
      {TURNSTILE_SITE_KEY && (
        <>
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" />
          <div className="cf-turnstile" data-sitekey={TURNSTILE_SITE_KEY} data-theme="auto" />
        </>
      )}
    </>
  );
}
