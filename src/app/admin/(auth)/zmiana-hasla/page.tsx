import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ActionButton, ActionForm } from "@/components/admin/ActionForm";
import { NewPasswordFields } from "@/components/admin/PasswordFields";
import { Field } from "@/components/form";
import { getSession } from "@/lib/auth/session";
import { changePassword } from "../actions";

export const metadata: Metadata = { title: "Zmiana hasła" };

export default async function ChangePasswordPage() {
  const session = await getSession();
  if (!session?.twoFactorPassed) redirect("/admin/login");
  return (
    <>
      <h1 className="text-2xl">Ustaw własne hasło</h1>
      {session.user.mustChangePassword && (
        <p className="text-muted mt-2 text-sm">Hasło startowe jest jednorazowe. Zanim przejdziesz dalej, ustaw własne.</p>
      )}
      <ActionForm action={changePassword} className="mt-6 space-y-5">
        <Field label="Obecne hasło" name="current" type="password" required autoComplete="current-password" />
        <NewPasswordFields />
        <ActionButton className="btn btn-primary w-full">Zmień hasło</ActionButton>
      </ActionForm>
    </>
  );
}
