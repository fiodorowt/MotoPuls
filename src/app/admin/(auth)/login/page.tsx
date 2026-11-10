import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionButton, ActionForm } from "@/components/admin/ActionForm";
import { Field } from "@/components/form";
import { getSession } from "@/lib/auth/session";
import { login } from "../actions";

export const metadata: Metadata = { title: "Logowanie" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reset?: string }> }) {
  const [session, query] = await Promise.all([getSession(), searchParams]);
  if (session?.twoFactorPassed) redirect("/admin");
  return (
    <>
      <h1 className="text-2xl">Logowanie do panelu</h1>
      {query.reset && <p className="text-ok mt-3 text-sm font-medium">Hasło zostało zmienione. Zaloguj się nowym hasłem.</p>}
      <ActionForm action={login} className="mt-6 space-y-5">
        <Field label="E-mail" name="email" type="email" required autoComplete="username" />
        <Field label="Hasło" name="password" type="password" required autoComplete="current-password" />
        <ActionButton className="btn btn-primary w-full">Zaloguj się</ActionButton>
      </ActionForm>
      <p className="mt-6 text-sm">
        <Link href="/admin/reset-hasla" className="link">
          Nie pamiętasz hasła?
        </Link>
      </p>
    </>
  );
}
