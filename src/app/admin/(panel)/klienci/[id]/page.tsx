import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton, ActionForm } from "@/components/admin/ActionForm";
import { Empty, PageHeader, Section, StatusBadge, TableWrap } from "@/components/admin/ui";
import { Field, SelectField, TextAreaField } from "@/components/form";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { VEHICLE_TYPE_LABEL } from "@/lib/labels";
import { formatDateShortPl, warsawTime } from "@/lib/time";
import { addCustomerNote, anonymizeCustomerAction, deleteCustomerNote, updateCustomer } from "../actions";

export const metadata: Metadata = { title: "Klient" };

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const [customer, fleets] = await Promise.all([
    db.customer.findUnique({
      where: { id },
      include: {
        vehicles: { orderBy: { createdAt: "desc" } },
        bookings: { include: { services: true, vehicle: true }, orderBy: { startsAt: "desc" }, take: 100 },
        notes: { include: { author: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
      },
    }),
    db.fleetAccount.findMany({ orderBy: { companyName: "asc" }, select: { id: true, companyName: true } }),
  ]);
  if (!customer) notFound();
  const anonymized = customer.anonymizedAt !== null;

  return (
    <>
      <PageHeader title={customer.name}>
        {!anonymized && (
          <Link href={`/admin/rezerwacje/nowa?klient=${customer.id}`} className="btn btn-primary btn-sm">
            Umów wizytę
          </Link>
        )}
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Section title="Dane kontaktowe">
            {anonymized ? (
              <Empty>Dane osobowe tego klienta zostały usunięte {formatDateShortPl(customer.anonymizedAt ?? new Date())}. Historia wizyt została zachowana do statystyk.</Empty>
            ) : (
              <ActionForm action={updateCustomer} className="space-y-4">
                <input type="hidden" name="id" value={customer.id} />
                <Field label="Imię i nazwisko" name="name" required defaultValue={customer.name} maxLength={80} />
                <Field label="Telefon" name="phone" type="tel" required defaultValue={customer.phone} />
                <Field label="E-mail" name="email" type="email" defaultValue={customer.email} />
                <SelectField label="Klient flotowy" name="fleetAccountId" defaultValue={customer.fleetAccountId ?? ""}>
                  <option value="">— nie dotyczy —</option>
                  {fleets.map((fleet) => (
                    <option key={fleet.id} value={fleet.id}>
                      {fleet.companyName}
                    </option>
                  ))}
                </SelectField>
                <p className="text-muted text-sm">
                  Zgoda marketingowa: {customer.marketingConsent ? `tak (od ${formatDateShortPl(customer.marketingConsentAt ?? customer.createdAt)})` : "nie"}
                </p>
                <ActionButton className="btn btn-secondary btn-sm">Zapisz dane</ActionButton>
              </ActionForm>
            )}
          </Section>

          <Section title="Pojazdy">
            {customer.vehicles.length === 0 ? (
              <Empty>Brak pojazdów.</Empty>
            ) : (
              <ul className="space-y-2 text-sm">
                {customer.vehicles.map((v) => (
                  <li key={v.id}>
                    <span className="font-semibold">
                      {v.make} {v.model}
                    </span>
                    {v.year ? ` (${v.year})` : ""} · {v.plate} · {VEHICLE_TYPE_LABEL[v.type]}
                    {v.vin && <span className="text-muted block">VIN: {v.vin}</span>}
                    {v.mileage !== null && <span className="text-muted block">Przebieg: {v.mileage.toLocaleString("pl-PL")} km</span>}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {user.role === "OWNER" && !anonymized && (
            <Section title="RODO">
              <p className="text-muted mb-4 text-sm">
                Eksport realizuje prawo dostępu i przenoszenia danych. Usunięcie jest nieodwracalne: dane osobowe i notatki znikają, aktywne wizyty są anulowane, a
                zanonimizowana historia zostaje do statystyk.
              </p>
              <div className="flex flex-wrap gap-3">
                <a href={`/admin/klienci/${customer.id}/eksport`} className="btn btn-secondary btn-sm">
                  Eksportuj dane (JSON)
                </a>
                <ActionForm action={anonymizeCustomerAction} confirm={`Trwale usunąć dane osobowe klienta ${customer.name}? Tej operacji nie można cofnąć.`}>
                  <input type="hidden" name="id" value={customer.id} />
                  <ActionButton className="btn btn-danger btn-sm">Usuń dane klienta</ActionButton>
                </ActionForm>
              </div>
            </Section>
          )}
        </div>

        <div className="space-y-6">
          {!anonymized && (
            <Section title="Notatki wewnętrzne">
              <ActionForm action={addCustomerNote} resetOnSuccess className="space-y-3">
                <input type="hidden" name="customerId" value={customer.id} />
                <TextAreaField label="Nowa notatka" name="body" required rows={3} maxLength={2000} />
                <ActionButton className="btn btn-secondary btn-sm">Dodaj notatkę</ActionButton>
              </ActionForm>
              <ul className="divide-line mt-4 divide-y text-sm">
                {customer.notes.map((note) => (
                  <li key={note.id} className="flex items-start justify-between gap-3 py-3">
                    <div>
                      <p className="whitespace-pre-wrap">{note.body}</p>
                      <p className="text-muted mt-1 text-xs">
                        {note.author?.name ?? "usunięty użytkownik"} · {formatDateShortPl(note.createdAt)}
                      </p>
                    </div>
                    <ActionForm action={deleteCustomerNote} confirm="Usunąć notatkę?">
                      <input type="hidden" name="id" value={note.id} />
                      <ActionButton className="btn btn-danger btn-sm">Usuń</ActionButton>
                    </ActionForm>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section title="Historia wizyt">
            {customer.bookings.length === 0 ? (
              <Empty>Brak wizyt.</Empty>
            ) : (
              <TableWrap>
                <table className="table-mp">
                  <thead>
                    <tr>
                      <th scope="col">Termin</th>
                      <th scope="col">Pojazd / usługi</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customer.bookings.map((b) => (
                      <tr key={b.id}>
                        <td className="whitespace-nowrap">
                          <Link href={`/admin/rezerwacje/${b.id}`} className="link">
                            {formatDateShortPl(b.startsAt)}, {warsawTime(b.startsAt)}
                          </Link>
                        </td>
                        <td>
                          {b.vehicle.make} {b.vehicle.model}
                          <span className="text-muted block text-xs">{b.services.map((s) => s.name).join(", ")}</span>
                        </td>
                        <td>
                          <StatusBadge status={b.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            )}
          </Section>
        </div>
      </div>
    </>
  );
}
