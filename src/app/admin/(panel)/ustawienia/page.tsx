import type { Metadata } from "next";
import { ActionButton, ActionForm } from "@/components/admin/ActionForm";
import { Empty, PageHeader, Section } from "@/components/admin/ui";
import { CheckboxField, Field, TextAreaField } from "@/components/form";
import { requireOwner } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getOpeningHours, getSettings } from "@/lib/settings";
import { WEEKDAYS_PL, formatDatePl, warsawDate } from "@/lib/time";
import { addClosedDay, removeClosedDay, saveBookingConfig, saveCompany, saveOpeningHours } from "./actions";

export const metadata: Metadata = { title: "Ustawienia" };

export default async function SettingsPage() {
  await requireOwner();
  const today = warsawDate(new Date());
  const [settings, hours, closedDays] = await Promise.all([
    getSettings(),
    getOpeningHours(),
    db.closedDay.findMany({ where: { date: { gte: new Date(`${today}T00:00:00Z`) } }, orderBy: { date: "asc" } }),
  ]);

  return (
    <>
      <PageHeader title="Ustawienia" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Dane firmy" className="lg:row-span-3">
          <ActionForm action={saveCompany} className="space-y-4">
            <Field label="Nazwa marki" name="brandName" required defaultValue={settings.brandName} maxLength={60} />
            <Field label="Pełna nazwa firmy" name="legalName" required defaultValue={settings.legalName} maxLength={200} />
            <Field label="NIP" name="nip" required inputMode="numeric" defaultValue={settings.nip} maxLength={13} />
            <Field label="Ulica i numer" name="street" required defaultValue={settings.street} maxLength={120} />
            <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
              <Field label="Kod pocztowy" name="postalCode" required defaultValue={settings.postalCode} maxLength={6} />
              <Field label="Miejscowość" name="city" required defaultValue={settings.city} maxLength={80} />
            </div>
            <TextAreaField label="Telefony (każdy w osobnej linii)" name="phones" required rows={3} defaultValue={settings.phones.join("\n")} />
            <Field label="E-mail" name="email" type="email" required defaultValue={settings.email} />
            <Field label="Facebook" name="facebookUrl" type="url" defaultValue={settings.facebookUrl} maxLength={200} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Szerokość geogr." name="latitude" required inputMode="decimal" defaultValue={settings.latitude} hint="Pozycja pinezki na mapie" />
              <Field label="Długość geogr." name="longitude" required inputMode="decimal" defaultValue={settings.longitude} />
            </div>
            <TextAreaField label="Wskazówki dojazdu" name="directions" required rows={3} defaultValue={settings.directions} maxLength={1000} />
            <Field label="Hasło na stronie głównej" name="tagline" required defaultValue={settings.tagline} maxLength={200} />
            <TextAreaField label="O firmie" name="about" required rows={6} defaultValue={settings.about} maxLength={4000} />
            <Field label="Uwaga pod cennikiem" name="pricingNote" defaultValue={settings.pricingNote} maxLength={500} />
            <ActionButton>Zapisz dane firmy</ActionButton>
          </ActionForm>
        </Section>

        <Section title="Rezerwacje">
          <ActionForm action={saveBookingConfig} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Liczba stanowisk" name="bays" required inputMode="numeric" defaultValue={settings.bays} hint="Ile aut może być obsługiwanych naraz" />
              <Field label="Kalendarz do przodu (dni)" name="maxDaysAhead" required inputMode="numeric" defaultValue={settings.maxDaysAhead} />
              <Field
                label="Najwcześniejszy termin (godz.)"
                name="minLeadHours"
                required
                inputMode="numeric"
                defaultValue={settings.minLeadHours}
                hint="Minimalne wyprzedzenie rezerwacji online"
              />
              <Field
                label="Anulowanie przez klienta (godz.)"
                name="cancelHoursBefore"
                required
                inputMode="numeric"
                defaultValue={settings.cancelHoursBefore}
                hint="Do ilu godzin przed wizytą klient może anulować sam"
              />
              <Field
                label="Retencja danych (mies.)"
                name="retentionMonths"
                required
                inputMode="numeric"
                defaultValue={settings.retentionMonths}
                hint="Po tylu miesiącach bez wizyt dane klienta są anonimizowane"
              />
            </div>
            <CheckboxField name="autoConfirm" defaultChecked={settings.autoConfirm}>
              Potwierdzaj rezerwacje online automatycznie (bez tej opcji każdą wizytę potwierdza pracownik)
            </CheckboxField>
            <ActionButton>Zapisz ustawienia rezerwacji</ActionButton>
          </ActionForm>
        </Section>

        <Section title="Godziny otwarcia">
          <ActionForm action={saveOpeningHours}>
            <table className="table-mp">
              <thead>
                <tr>
                  <th scope="col">Dzień</th>
                  <th scope="col">Otwarcie</th>
                  <th scope="col">Zamknięcie</th>
                  <th scope="col">Nieczynne</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5, 6, 7].map((weekday) => {
                  const day = hours.get(weekday) ?? { closed: true, open: "08:00", close: "16:00" };
                  const name = WEEKDAYS_PL[weekday - 1] ?? "";
                  return (
                    <tr key={weekday}>
                      <th scope="row" className="capitalize">
                        {name}
                      </th>
                      <td>
                        <input type="time" name={`open_${weekday}`} defaultValue={day.open} step={900} required className="input" aria-label={`${name}: otwarcie`} />
                      </td>
                      <td>
                        <input type="time" name={`close_${weekday}`} defaultValue={day.close} step={900} required className="input" aria-label={`${name}: zamknięcie`} />
                      </td>
                      <td>
                        <input type="checkbox" name={`closed_${weekday}`} defaultChecked={day.closed} className="accent-accent h-6 w-6" aria-label={`${name}: nieczynne`} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="mt-4">
              <ActionButton>Zapisz godziny</ActionButton>
            </div>
          </ActionForm>
        </Section>

        <Section title="Dni wolne">
          <p className="text-muted mb-4 text-sm">Święta ustawowe są blokowane automatycznie. Tutaj dodasz dodatkowe dni zamknięcia warsztatu.</p>
          {closedDays.length === 0 ? (
            <Empty>Brak zaplanowanych dni wolnych.</Empty>
          ) : (
            <ul className="divide-line mb-4 divide-y text-sm">
              {closedDays.map((day) => (
                <li key={day.id} className="flex items-center justify-between gap-3 py-2">
                  <span>
                    <span className="font-semibold">{formatDatePl(day.date)}</span> – {day.reason}
                  </span>
                  <ActionForm action={removeClosedDay}>
                    <input type="hidden" name="id" value={day.id} />
                    <ActionButton className="btn btn-danger btn-sm">Usuń</ActionButton>
                  </ActionForm>
                </li>
              ))}
            </ul>
          )}
          <ActionForm action={addClosedDay} resetOnSuccess className="grid gap-4 sm:grid-cols-[11rem_1fr_auto] sm:items-end">
            <Field label="Data" name="date" type="date" required min={today} />
            <Field label="Powód" name="reason" required maxLength={120} />
            <ActionButton className="btn btn-secondary">Dodaj</ActionButton>
          </ActionForm>
        </Section>
      </div>
    </>
  );
}
