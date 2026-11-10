import type { Metadata } from "next";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { ActionButton, ActionForm } from "@/components/admin/ActionForm";
import { Field } from "@/components/form";
import { requirePasswordStage } from "@/lib/auth/session";
import { newTotpSecret, totpUri } from "@/lib/auth/totp";
import { encrypt } from "@/lib/crypto";
import { enableTwoFactor, logout } from "../actions";

export const metadata: Metadata = { title: "Konfiguracja 2FA" };

export default async function TwoFactorSetupPage() {
  const { user, twoFactorPassed } = await requirePasswordStage();
  if (user.totpEnabled) redirect(twoFactorPassed ? "/admin" : "/admin/login/2fa");

  // Sekret nie trafia do bazy, dopóki użytkownik nie potwierdzi kodem, że aplikacja działa.
  const secret = newTotpSecret();
  const qr = await QRCode.toDataURL(totpUri(secret, user.email), { margin: 1, width: 220 });

  return (
    <>
      <h1 className="text-2xl">Włącz weryfikację dwuetapową</h1>
      <p className="text-muted mt-2 text-sm">
        Panel wymaga drugiego składnika logowania. Zeskanuj kod aplikacją uwierzytelniającą (Google Authenticator,
        Aegis, 2FAS), a potem wpisz 6-cyfrowy kod.
      </p>
      <img src={qr} alt="Kod QR do skonfigurowania aplikacji uwierzytelniającej" width={220} height={220} className="mx-auto mt-5 rounded-md bg-white p-2" />
      <p className="text-muted mt-4 text-sm">
        Nie możesz zeskanować? Wpisz ręcznie klucz: <code className="text-fg font-mono break-all">{secret}</code>
      </p>
      <ActionForm action={enableTwoFactor} className="mt-6 space-y-5">
        <input type="hidden" name="setup" value={encrypt(`${user.id}:${secret}`, "totp-setup")} />
        <Field label="Kod z aplikacji" name="code" required inputMode="numeric" autoComplete="one-time-code" maxLength={7} />
        <ActionButton className="btn btn-primary w-full">Włącz 2FA</ActionButton>
      </ActionForm>
      <form action={logout} className="mt-4">
        <button type="submit" className="link text-sm">
          Wyloguj
        </button>
      </form>
    </>
  );
}
