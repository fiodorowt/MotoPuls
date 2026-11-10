import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ActionButton, ActionForm } from "@/components/admin/ActionForm";
import { Field } from "@/components/form";
import { requirePasswordStage } from "@/lib/auth/session";
import { logout, verifyTwoFactor } from "../../actions";

export const metadata: Metadata = { title: "Weryfikacja dwuetapowa" };

export default async function TwoFactorPage() {
  const session = await requirePasswordStage();
  if (session.twoFactorPassed) redirect("/admin");
  if (!session.user.totpEnabled) redirect("/admin/2fa-setup");
  return (
    <>
      <h1 className="text-2xl">Kod z aplikacji</h1>
      <p className="text-muted mt-2 text-sm">Wpisz 6-cyfrowy kod z aplikacji uwierzytelniającej (np. Google Authenticator, Aegis, 2FAS).</p>
      <ActionForm action={verifyTwoFactor} className="mt-6 space-y-5">
        <Field label="Kod jednorazowy" name="code" required inputMode="numeric" autoComplete="one-time-code" maxLength={7} autoFocus />
        <ActionButton className="btn btn-primary w-full">Potwierdź</ActionButton>
      </ActionForm>
      <form action={logout} className="mt-4">
        <button type="submit" className="link text-sm">
          Wróć do logowania
        </button>
      </form>
    </>
  );
}
