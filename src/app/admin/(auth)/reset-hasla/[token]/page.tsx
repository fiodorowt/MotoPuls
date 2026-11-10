import type { Metadata } from "next";
import { ActionButton, ActionForm } from "@/components/admin/ActionForm";
import { NewPasswordFields } from "@/components/admin/PasswordFields";
import { resetPassword } from "../../actions";

export const metadata: Metadata = { title: "Nowe hasło", referrer: "no-referrer" };

export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <>
      <h1 className="text-2xl">Ustaw nowe hasło</h1>
      <p className="text-muted mt-2 text-sm">Po zmianie hasła wszystkie aktywne sesje zostaną wylogowane. Kod 2FA nadal będzie wymagany.</p>
      <ActionForm action={resetPassword} className="mt-6 space-y-5">
        <input type="hidden" name="token" value={token} />
        <NewPasswordFields />
        <ActionButton className="btn btn-primary w-full">Zapisz hasło</ActionButton>
      </ActionForm>
    </>
  );
}
