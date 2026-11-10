import type { Metadata } from "next";
import { ActionButton, ActionForm } from "@/components/admin/ActionForm";
import { PageHeader, Section } from "@/components/admin/ui";
import { Field, SelectField, TextAreaField } from "@/components/form";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { REFRIGERANT_LABEL, VEHICLE_TYPE_LABEL } from "@/lib/labels";
import { formatDuration, isDateString, isTimeString, warsawDate } from "@/lib/time";
import { createManualBooking } from "../actions";

export const metadata: Metadata = { title: "Nowa wizyta" };

export default async function NewBookingPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireUser();
  const query = await searchParams;
  const date = query.data && isDateString(query.data) ? query.data : warsawDate(new Date());
  const time = query.godzina && isTimeString(query.godzina) ? query.godzina : "08:00";
  const customer = query.klient ? await db.customer.findFirst({ where: { id: query.klient, anonymizedAt: null }, include: { vehicles: { take: 1, orderBy: { createdAt: "desc" } } } }) : null;
  const vehicle = customer?.vehicles[0];
  const categories = await db.serviceCategory.findMany({
    orderBy: { sortOrder: "asc" },
    include: { services: { where: { active: true }, orderBy: { sortOrder: "asc" } } },
  });

  return (
    <>
      <PageHeader title="Nowa wizyta" />
      <ActionForm action={createManualBooking} className="space-y-6">
        <Section title="Usługi">
          <div className="grid gap-6 md:grid-cols-2">
            {categories
              .filter((c) => c.services.length > 0)
              .map((c) => (
                <fieldset key={c.id}>
                  <legend className="label">{c.name}</legend>
                  <ul className="space-y-2">
                    {c.services.map((s) => (
                      <li key={s.id}>
                        <label className="flex items-start gap-3 text-sm">
                          <input type="checkbox" name="serviceIds" value={s.id} className="accent-accent mt-0.5 h-6 w-6 shrink-0" />
                          <span>
                            {s.name} <span className="text-muted">({formatDuration(s.durationMin)})</span>
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </fieldset>
              ))}
          </div>
          <div className="mt-5 max-w-sm">
            <SelectField label="Czynnik klimatyzacji (jeśli dotyczy)" name="refrigerant" defaultValue="UNKNOWN">
              {Object.entries(REFRIGERANT_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectField>
          </div>
        </Section>

        <Section title="Termin">
          <div className="grid max-w-md grid-cols-2 gap-4">
            <Field label="Data" name="date" type="date" required defaultValue={date} />
            <Field label="Godzina" name="time" type="time" required step={900} defaultValue={time} />
          </div>
          <p className="text-muted mt-3 text-sm">
            Panel pozwala umówić wizytę także poza godzinami otwarcia. System sam wybierze wolne stanowisko; jeśli wszystkie są zajęte, zgłosi konflikt.
          </p>
        </Section>

        <Section title="Klient">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Imię i nazwisko" name="name" required autoComplete="off" defaultValue={customer?.name} maxLength={80} />
            <Field label="Telefon" name="phone" type="tel" required autoComplete="off" defaultValue={customer?.phone} />
            <Field label="E-mail" name="email" type="email" autoComplete="off" defaultValue={customer?.email} hint="Bez adresu klient nie dostanie potwierdzenia ani przypomnienia." />
          </div>
        </Section>

        <Section title="Pojazd">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Marka" name="make" required defaultValue={vehicle?.make} maxLength={40} />
            <Field label="Model" name="model" required defaultValue={vehicle?.model} maxLength={60} />
            <Field label="Rok produkcji" name="year" required inputMode="numeric" defaultValue={vehicle?.year ?? undefined} />
            <Field label="Nr rejestracyjny" name="plate" required defaultValue={vehicle?.plate} />
            <Field label="VIN" name="vin" defaultValue={vehicle?.vin ?? undefined} maxLength={17} />
            <Field label="Przebieg (km)" name="mileage" inputMode="numeric" defaultValue={vehicle?.mileage ?? undefined} />
            <SelectField label="Typ pojazdu" name="type" defaultValue={vehicle?.type ?? "CAR"}>
              {Object.entries(VEHICLE_TYPE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectField>
          </div>
          <div className="mt-4">
            <TextAreaField label="Opis usterki / zlecenia" name="description" maxLength={1000} />
          </div>
        </Section>

        <ActionButton>Zapisz wizytę</ActionButton>
      </ActionForm>
    </>
  );
}
