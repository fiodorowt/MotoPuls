import type { Metadata } from "next";
import { ActionButton, ActionForm } from "@/components/admin/ActionForm";
import { PageHeader, Section } from "@/components/admin/ui";
import { CheckboxField, Field, SelectField } from "@/components/form";
import { requireOwner } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { ROLE_LABEL } from "@/lib/labels";
import { createUser, resetUserPassword, resetUserTwoFactor, updateUser } from "./actions";

export const metadata: Metadata = { title: "Użytkownicy" };

function RoleOptions() {
  return (
    <>
      <option value="EMPLOYEE">{ROLE_LABEL.EMPLOYEE} – rezerwacje, klienci, zapytania</option>
      <option value="OWNER">{ROLE_LABEL.OWNER} – pełny dostęp</option>
    </>
  );
}

export default async function UsersPage() {
  const me = await requireOwner();
  const users = await db.user.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] });

  return (
    <>
      <PageHeader title="Użytkownicy panelu" />
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          {users.map((user) => (
            <section key={user.id} className="card">
              <h2 className="text-lg">
                {user.name}
                {user.id === me.id && <span className="badge text-muted ml-2">to Ty</span>}
                {!user.active && <span className="badge border-danger text-danger ml-2">wyłączone</span>}
              </h2>
              <p className="text-muted mb-4 text-sm break-all">
                {user.email} · 2FA: {user.totpEnabled ? "włączone" : "do skonfigurowania"}
                {user.mustChangePassword ? " · czeka na zmianę hasła startowego" : ""}
              </p>
              <ActionForm action={updateUser} className="grid gap-4 sm:grid-cols-2 sm:items-end">
                <input type="hidden" name="id" value={user.id} />
                <Field label="Imię i nazwisko" name="name" required defaultValue={user.name} maxLength={80} />
                <SelectField label="Rola" name="role" defaultValue={user.role}>
                  <RoleOptions />
                </SelectField>
                <CheckboxField name="active" defaultChecked={user.active}>
                  Konto aktywne
                </CheckboxField>
                <div>
                  <ActionButton className="btn btn-secondary btn-sm">Zapisz</ActionButton>
                </div>
              </ActionForm>
              {user.id !== me.id && (
                <div className="border-line mt-4 flex flex-wrap gap-3 border-t pt-4">
                  <ActionForm action={resetUserPassword} confirm={`Wygenerować nowe hasło jednorazowe dla: ${user.name}? Obecne przestanie działać.`}>
                    <input type="hidden" name="id" value={user.id} />
                    <ActionButton className="btn btn-secondary btn-sm">Resetuj hasło</ActionButton>
                  </ActionForm>
                  <ActionForm action={resetUserTwoFactor} confirm={`Zresetować 2FA dla: ${user.name}?`}>
                    <input type="hidden" name="id" value={user.id} />
                    <ActionButton className="btn btn-secondary btn-sm">Resetuj 2FA</ActionButton>
                  </ActionForm>
                </div>
              )}
            </section>
          ))}
        </div>

        <Section title="Dodaj użytkownika">
          <ActionForm action={createUser} resetOnSuccess className="space-y-4">
            <Field label="Imię i nazwisko" name="name" required maxLength={80} />
            <Field label="E-mail (login)" name="email" type="email" required autoComplete="off" />
            <SelectField label="Rola" name="role" defaultValue="EMPLOYEE">
              <RoleOptions />
            </SelectField>
            <p className="text-muted text-sm">System wygeneruje hasło jednorazowe i pokaże je tutaj tylko raz. Nowa osoba ustawi własne hasło i 2FA przy pierwszym logowaniu.</p>
            <ActionButton>Utwórz konto</ActionButton>
          </ActionForm>
        </Section>
      </div>
    </>
  );
}
