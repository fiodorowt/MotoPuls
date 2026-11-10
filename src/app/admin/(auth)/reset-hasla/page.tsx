import type { Metadata } from "next";
import Link from "next/link";
import { ActionButton, ActionForm } from "@/components/admin/ActionForm";
import { Field } from "@/components/form";
import { requestPasswordReset } from "../actions";

export const metadata: Metadata = { title: "Reset hasła" };

export default function ResetRequestPage() {
  return (
    <>
      <h1 className="text-2xl">Reset hasła</h1>
      <p className="text-muted mt-2 text-sm">Podaj adres e-mail konta. Wyślemy link do ustawienia nowego hasła.</p>
      <ActionForm action={requestPasswordReset} className="mt-6 space-y-5">
        <Field label="E-mail" name="email" type="email" required autoComplete="username" />
        <ActionButton className="btn btn-primary w-full">Wyślij link</ActionButton>
      </ActionForm>
      <p className="mt-6 text-sm">
        <Link href="/admin/login" className="link">
          Wróć do logowania
        </Link>
      </p>
    </>
  );
}
