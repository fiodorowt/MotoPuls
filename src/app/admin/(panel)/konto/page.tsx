import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, Section } from "@/components/admin/ui";
import { getSession, requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { ROLE_LABEL } from "@/lib/labels";
import { formatDateTimePl } from "@/lib/time";
import { logoutEverywhere } from "../../(auth)/actions";

export const metadata: Metadata = { title: "Moje konto" };

export default async function AccountPage() {
  const user = await requireUser();
  const [current, sessions] = await Promise.all([
    getSession(),
    db.session.findMany({ where: { userId: user.id, expiresAt: { gt: new Date() } }, orderBy: { lastSeenAt: "desc" } }),
  ]);

  return (
    <>
      <PageHeader title="Moje konto" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Dane logowania">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted">Imię i nazwisko</dt>
            <dd>{user.name}</dd>
            <dt className="text-muted">E-mail</dt>
            <dd className="break-all">{user.email}</dd>
            <dt className="text-muted">Rola</dt>
            <dd>{ROLE_LABEL[user.role]}</dd>
            <dt className="text-muted">Weryfikacja dwuetapowa</dt>
            <dd>włączona (aplikacja z kodami)</dd>
          </dl>
          <Link href="/admin/zmiana-hasla" className="btn btn-secondary btn-sm mt-4">
            Zmień hasło
          </Link>
        </Section>

        <Section title="Aktywne sesje">
          <ul className="divide-line divide-y text-sm">
            {sessions.map((session) => (
              <li key={session.id} className="py-2">
                <span className="font-semibold">{session.id === current?.id ? "To urządzenie" : "Inne urządzenie"}</span>
                <span className="text-muted block text-xs break-words">
                  ostatnia aktywność: {formatDateTimePl(session.lastSeenAt)}
                  {session.userAgent ? ` · ${session.userAgent.slice(0, 120)}` : ""}
                </span>
              </li>
            ))}
          </ul>
          <form action={logoutEverywhere} className="mt-4">
            <button type="submit" className="btn btn-danger btn-sm">
              Wyloguj ze wszystkich urządzeń
            </button>
          </form>
        </Section>
      </div>
    </>
  );
}
