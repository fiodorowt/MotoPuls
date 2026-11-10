import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton, ActionForm } from "@/components/admin/ActionForm";
import { Empty, PageHeader, Section, TableWrap } from "@/components/admin/ui";
import { Field, SelectField, TextAreaField } from "@/components/form";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { VEHICLE_TYPE_LABEL, formatPhone } from "@/lib/labels";
import { addFleetVehicle, deleteFleet, removeFleetVehicle, updateFleet } from "../actions";

export const metadata: Metadata = { title: "Klient flotowy" };

export default async function FleetPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const fleet = await db.fleetAccount.findUnique({
    where: { id },
    include: {
      vehicles: { include: { customer: { select: { id: true, name: true } } }, orderBy: { plate: "asc" } },
      customers: { where: { anonymizedAt: null }, orderBy: { name: "asc" } },
    },
  });
  if (!fleet) notFound();

  return (
    <>
      <PageHeader title={fleet.companyName} />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Section title="Dane firmy">
            <ActionForm action={updateFleet} className="space-y-4">
              <input type="hidden" name="id" value={fleet.id} />
              <Field label="Nazwa firmy" name="companyName" required defaultValue={fleet.companyName} maxLength={120} />
              <Field label="NIP" name="nip" inputMode="numeric" defaultValue={fleet.nip ?? ""} maxLength={13} />
              <Field label="Osoba kontaktowa" name="contactName" defaultValue={fleet.contactName ?? ""} maxLength={80} />
              <Field label="Telefon" name="phone" type="tel" defaultValue={fleet.phone ?? ""} />
              <Field label="E-mail" name="email" type="email" defaultValue={fleet.email ?? ""} />
              <TextAreaField label="Uwagi" name="notes" rows={4} defaultValue={fleet.notes ?? ""} maxLength={2000} />
              <ActionButton className="btn btn-secondary btn-sm">Zapisz dane</ActionButton>
            </ActionForm>
          </Section>

          <Section title="Kierowcy / osoby zgłaszające">
            {fleet.customers.length === 0 ? (
              <Empty>Brak przypisanych klientów. Przypisz klienta do floty na jego karcie (pole „Klient flotowy”).</Empty>
            ) : (
              <ul className="space-y-2 text-sm">
                {fleet.customers.map((c) => (
                  <li key={c.id}>
                    <Link href={`/admin/klienci/${c.id}`} className="link font-semibold">
                      {c.name}
                    </Link>{" "}
                    · {formatPhone(c.phone)}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {user.role === "OWNER" && (
            <Section title="Usuń klienta flotowego">
              <p className="text-muted mb-3 text-sm">Klienci i ich pojazdy pozostaną w bazie bez przypisania do floty.</p>
              <ActionForm action={deleteFleet} confirm={`Usunąć firmę ${fleet.companyName}?`}>
                <input type="hidden" name="id" value={fleet.id} />
                <ActionButton className="btn btn-danger btn-sm">Usuń firmę</ActionButton>
              </ActionForm>
            </Section>
          )}
        </div>

        <div className="space-y-6">
          <Section title={`Pojazdy floty (${fleet.vehicles.length})`}>
            {fleet.vehicles.length === 0 ? (
              <Empty>Brak pojazdów.</Empty>
            ) : (
              <TableWrap>
                <table className="table-mp">
                  <thead>
                    <tr>
                      <th scope="col">Pojazd</th>
                      <th scope="col">Rejestracja</th>
                      <th scope="col">Kierowca</th>
                      <th scope="col">
                        <span className="sr-only">Akcje</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {fleet.vehicles.map((v) => (
                      <tr key={v.id}>
                        <td>
                          {v.make} {v.model}
                          <span className="text-muted block text-xs">
                            {VEHICLE_TYPE_LABEL[v.type]}
                            {v.year ? ` · ${v.year}` : ""}
                          </span>
                        </td>
                        <td>{v.plate}</td>
                        <td>
                          {v.customer ? (
                            <Link href={`/admin/klienci/${v.customer.id}`} className="link">
                              {v.customer.name}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>
                          <ActionForm action={removeFleetVehicle} confirm={`Usunąć pojazd ${v.plate} z floty?`}>
                            <input type="hidden" name="id" value={v.id} />
                            <ActionButton className="btn btn-danger btn-sm">Usuń</ActionButton>
                          </ActionForm>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            )}
          </Section>

          <Section title="Dodaj pojazd">
            <ActionForm action={addFleetVehicle} resetOnSuccess className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="fleetAccountId" value={fleet.id} />
              <Field label="Marka" name="make" required maxLength={40} />
              <Field label="Model" name="model" required maxLength={60} />
              <Field label="Nr rejestracyjny" name="plate" required maxLength={10} />
              <Field label="Rok produkcji" name="year" inputMode="numeric" maxLength={4} />
              <Field label="VIN" name="vin" maxLength={17} />
              <SelectField label="Typ" name="type" defaultValue="VAN">
                <option value="CAR">{VEHICLE_TYPE_LABEL.CAR}</option>
                <option value="VAN">{VEHICLE_TYPE_LABEL.VAN}</option>
              </SelectField>
              <div className="sm:col-span-2">
                <ActionButton className="btn btn-secondary btn-sm">Dodaj pojazd</ActionButton>
              </div>
            </ActionForm>
          </Section>
        </div>
      </div>
    </>
  );
}
