"use client";

import Link from "next/link";
import { useActionState, type ReactNode } from "react";
import { sendContact, sendFleetInquiry, sendPartsInquiry } from "@/app/(public)/actions";
import { AntispamFields, CheckboxField, Field, FormAlert, SubmitButton, TextAreaField } from "@/components/form";
import { EMPTY_FORM, type FormState } from "@/lib/form-state";

interface FormProps {
  token: string;
  /** Nazwa administratora danych do klauzuli informacyjnej */
  controller: string;
}

function InquiryShell({
  action,
  token,
  controller,
  submitLabel,
  children,
}: FormProps & {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  children: (state: FormState) => ReactNode;
}) {
  const [state, formAction] = useActionState(action, EMPTY_FORM);
  if (state.ok) return <FormAlert state={state} />;
  const v = state.values ?? {};
  const e = state.errors ?? {};
  return (
    <form action={formAction} className="relative space-y-5" noValidate>
      <FormAlert state={state} />
      {children(state)}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Imię i nazwisko" name="name" required autoComplete="name" defaultValue={v.name} error={e.name} />
        <Field label="Telefon" name="phone" type="tel" required autoComplete="tel" inputMode="tel" defaultValue={v.phone} error={e.phone} />
      </div>
      <Field label="E-mail" name="email" type="email" required autoComplete="email" defaultValue={v.email} error={e.email} />
      <CheckboxField name="privacy" required defaultChecked={v.privacy === "on"} error={e.privacy}>
        Zapoznałem(-am) się z informacją o przetwarzaniu danych. Administratorem danych jest {controller}. Dane
        wykorzystamy wyłącznie do odpowiedzi na to zapytanie (art. 6 ust. 1 lit. f RODO). Szczegóły i Twoje prawa
        opisuje{" "}
        <Link href="/polityka-prywatnosci" className="link">
          polityka prywatności
        </Link>
        .
      </CheckboxField>
      <AntispamFields token={token} />
      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  );
}

export function ContactForm(props: FormProps) {
  return (
    <InquiryShell {...props} action={sendContact} submitLabel="Wyślij wiadomość">
      {(state) => (
        <TextAreaField label="Wiadomość" name="message" required rows={5} defaultValue={state.values?.message} error={state.errors?.message} />
      )}
    </InquiryShell>
  );
}

export function PartsForm(props: FormProps) {
  return (
    <InquiryShell {...props} action={sendPartsInquiry} submitLabel="Wyślij zapytanie o część">
      {({ values: v = {}, errors: e = {} }) => (
        <>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Marka" name="make" required defaultValue={v.make} error={e.make} />
            <Field label="Model" name="model" required defaultValue={v.model} error={e.model} />
            <Field label="Rok produkcji" name="year" required inputMode="numeric" maxLength={4} defaultValue={v.year} error={e.year} />
          </div>
          <Field
            label="Numer VIN"
            name="vin"
            maxLength={17}
            autoCapitalize="characters"
            hint="17 znaków z dowodu rejestracyjnego (pole E). Z numerem VIN dobierzemy część bez pomyłek."
            defaultValue={v.vin}
            error={e.vin}
          />
          <Field label="Nazwa części" name="part" required hint="Np. klocki hamulcowe przód, filtr kabinowy." defaultValue={v.part} error={e.part} />
          <TextAreaField label="Dodatkowe informacje" name="message" rows={3} defaultValue={v.message} error={e.message} />
        </>
      )}
    </InquiryShell>
  );
}

export function FleetForm(props: FormProps) {
  return (
    <InquiryShell {...props} action={sendFleetInquiry} submitLabel="Wyślij zapytanie flotowe">
      {({ values: v = {}, errors: e = {} }) => (
        <>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Nazwa firmy" name="company" required autoComplete="organization" defaultValue={v.company} error={e.company} />
            <Field label="NIP" name="nip" inputMode="numeric" defaultValue={v.nip} error={e.nip} />
          </div>
          <Field label="Liczba pojazdów" name="fleetSize" required inputMode="numeric" defaultValue={v.fleetSize} error={e.fleetSize} />
          <TextAreaField
            label="Czego potrzebujesz?"
            name="message"
            rows={4}
            hint="Np. marki i roczniki aut, zakres obsługi, oczekiwane terminy."
            defaultValue={v.message}
            error={e.message}
          />
        </>
      )}
    </InquiryShell>
  );
}
