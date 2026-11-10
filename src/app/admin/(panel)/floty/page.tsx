import type { Metadata } from "next";
import Link from "next/link";
import { ActionButton, ActionForm } from "@/components/admin/ActionForm";
import { Empty, PageHeader, Section, TableWrap } from "@/components/admin/ui";
import { Field, TextAreaField } from "@/components/form";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatPhone } from "@/lib/labels";
import { createFleet } from "./actions";

export const metadata: Metadata = { title: "Klienci flotowi" };

export default async function FleetsPage() {
  await requireUser();
  const fleets = await db.fleetAccount.findMany({
    include: { _count: { select: { vehicles: true, customers: true } } },
    orderBy: { companyName: "asc" },
  });

  return (
    <>
      <PageHeader title="Klienci flotowi" />
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Section title="Firmy">
          {fleets.length === 0 ? (
            <Empty>Brak klientów flotowych. Dodaj pierwszą firmę w formularzu obok.</Empty>
          ) : (
            <TableWrap>
              <table className="table-mp">
                <thead>
                  <tr>
                    <th scope="col">Firma</th>
                    <th scope="col">Kontakt</th>
                    <th scope="col">Pojazdy</th>
                    <th scope="col">Kierowcy</th>
                  </tr>
                </thead>
                <tbody>
                  {fleets.map((fleet) => (
                    <tr key={fleet.id}>
                      <td>
                        <Link href={`/admin/floty/${fleet.id}`} className="link font-semibold">
                          {fleet.companyName}
                        </Link>
                        {fleet.nip && <span className="text-muted block text-xs">NIP {fleet.nip}</span>}
                      </td>
                      <td>
                        {fleet.contactName ?? "—"}
                        {fleet.phone && <span className="text-muted block text-xs">{formatPhone(fleet.phone)}</span>}
                      </td>
                      <td>{fleet._count.vehicles}</td>
                      <td>{fleet._count.customers}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </Section>

        <Section title="Dodaj firmę">
          <ActionForm action={createFleet} className="space-y-4">
            <Field label="Nazwa firmy" name="companyName" required maxLength={120} />
            <Field label="NIP" name="nip" inputMode="numeric" maxLength={13} />
            <Field label="Osoba kontaktowa" name="contactName" maxLength={80} />
            <Field label="Telefon" name="phone" type="tel" />
            <Field label="E-mail" name="email" type="email" />
            <TextAreaField label="Uwagi (np. warunki współpracy)" name="notes" rows={3} maxLength={2000} />
            <ActionButton>Dodaj firmę</ActionButton>
          </ActionForm>
        </Section>
      </div>
    </>
  );
}
