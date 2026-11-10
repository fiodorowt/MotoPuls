"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { loadAvailability, submitBooking, type AvailabilityResult } from "@/app/(public)/rezerwacja/actions";
import { Icon } from "@/components/Icon";
import { TurboLoader } from "@/components/brand/Logo";
import { PulseProgress } from "@/components/brand/Pulse";
import { AntispamFields, CheckboxField, Field, SelectField, TextAreaField } from "@/components/form";
import { REFRIGERANT_LABEL, VEHICLE_TYPE_LABEL, formatPhone, formatPrice, type Refrigerant } from "@/lib/labels";
import { formatDuration } from "@/lib/time";
import { customerSchema, fieldErrors, vehicleSchema, type FieldErrors } from "@/lib/validation";

export interface WizardService {
  id: string;
  name: string;
  description: string;
  durationMin: number;
  priceFrom: number | null;
  priceTo: number | null;
  requiresRefrigerant: boolean;
}

export interface WizardCategory {
  slug: string;
  name: string;
  services: WizardService[];
}

interface Props {
  categories: WizardCategory[];
  token: string;
  controller: string;
  autoConfirm: boolean;
  today: string;
}

const STEPS = ["Usługi", "Pojazd", "Termin", "Twoje dane", "Podsumowanie"] as const;
const REFRIGERANTS: Refrigerant[] = ["R134A", "R1234YF", "UNKNOWN"];

const dayFmt = new Intl.DateTimeFormat("pl-PL", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const longFmt = new Intl.DateTimeFormat("pl-PL", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const asDate = (date: string) => new Date(`${date}T00:00:00Z`);

function shiftDate(date: string, days: number): string {
  const d = asDate(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

type Availability = Extract<AvailabilityResult, { ok: true }>;

export function BookingWizard({ categories, token, controller, autoConfirm, today }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [refrigerant, setRefrigerant] = useState<Refrigerant | "">("");
  const [vehicle, setVehicle] = useState({ make: "", model: "", year: "", plate: "", vin: "", mileage: "", type: "CAR", description: "" });
  const [customer, setCustomer] = useState({ name: "", phone: "", email: "", terms: false, marketing: false });
  const [slot, setSlot] = useState<{ iso: string; time: string; date: string } | null>(null);
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(false);

  // Po zmianie kroku fokus trafia na nagłówek – czytnik ekranu ogłasza nowy krok.
  useEffect(() => {
    if (mounted.current) headingRef.current?.focus();
    mounted.current = true;
  }, [step]);

  const allServices = categories.flatMap((c) => c.services);
  const selected = allServices.filter((s) => serviceIds.includes(s.id));
  const totalMin = selected.reduce((sum, s) => sum + s.durationMin, 0);
  const needsRefrigerant = selected.some((s) => s.requiresRefrigerant);

  function go(to: number) {
    setMessage(null);
    setErrors({});
    setStep(to);
  }

  function toggleService(id: string) {
    setServiceIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
    // Inny zestaw usług to inny czas wizyty – poprzednio wybrany termin przestaje obowiązywać.
    setSlot(null);
    setAvailability(null);
  }

  function fetchAvailability(fromDate: string) {
    startTransition(async () => {
      const result = await loadAvailability(serviceIds, fromDate);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setAvailability(result);
      setActiveDate(result.days.find((d) => d.times.length > 0)?.date ?? null);
    });
  }

  function submitServices() {
    const next: FieldErrors = {};
    if (serviceIds.length === 0) next.serviceIds = "Wybierz co najmniej jedną usługę.";
    if (serviceIds.length > 8) next.serviceIds = "Wybierz najwyżej 8 usług – większy zakres ustalimy telefonicznie.";
    if (needsRefrigerant && !refrigerant) next.refrigerant = "Wybierz czynnik albo zaznacz „Nie wiem”.";
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    go(2);
  }

  function submitVehicle() {
    const parsed = vehicleSchema.safeParse(vehicle);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    go(3);
    if (!availability) fetchAvailability(today);
  }

  function submitSlot() {
    if (!slot) {
      setErrors({ start: "Wybierz dzień i godzinę wizyty." });
      return;
    }
    go(4);
  }

  function submitCustomer() {
    const parsed = customerSchema.safeParse(customer);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    go(5);
  }

  function onStepSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step === 1) submitServices();
    else if (step === 2) submitVehicle();
    else if (step === 3) submitSlot();
    else if (step === 4) submitCustomer();
    else confirm(new FormData(event.currentTarget));
  }

  function confirm(form: FormData) {
    if (!slot) return;
    setMessage(null);
    startTransition(async () => {
      const result = await submitBooking(
        {
          serviceIds,
          refrigerant: needsRefrigerant && refrigerant ? refrigerant : undefined,
          vehicle,
          start: slot.iso,
          customer,
        },
        {
          website: String(form.get("website") ?? ""),
          form_token: String(form.get("form_token") ?? ""),
          turnstile: String(form.get("cf-turnstile-response") ?? ""),
        },
      );
      if (result.ok) {
        router.push(`/rezerwacja/${result.token}?nowa=1`);
        return;
      }
      setMessage(result.message);
      if (result.slotTaken) {
        setSlot(null);
        setStep(3);
        fetchAvailability(availability?.days[0]?.date ?? today);
        return;
      }
      if (result.errors) {
        // Błędy z serwera mają ścieżki „vehicle.make”, „customer.email” – wracamy do właściwego kroku.
        const keys = Object.keys(result.errors);
        const flat = Object.fromEntries(Object.entries(result.errors).map(([k, v]) => [k.replace(/^(vehicle|customer)\./, ""), v]));
        setErrors(flat);
        if (keys.some((k) => k.startsWith("vehicle."))) setStep(2);
        else if (keys.some((k) => k.startsWith("customer."))) setStep(4);
        else if (keys.includes("start")) setStep(3);
        else setStep(1);
      }
    });
  }

  const activeDay = availability?.days.find((d) => d.date === activeDate);
  const firstDate = availability?.days[0]?.date ?? today;
  const lastDate = availability?.days.at(-1)?.date ?? today;

  return (
    <div>
      <PulseProgress step={step} total={STEPS.length} />
      <ol className="mt-2 mb-8 grid grid-cols-5 gap-1 text-center text-xs sm:text-sm">
        {STEPS.map((label, index) => (
          <li
            key={label}
            aria-current={step === index + 1 ? "step" : undefined}
            className={step === index + 1 ? "text-accent-text font-bold" : index + 1 < step ? "text-fg" : "text-muted"}
          >
            <span className="sm:hidden">{index + 1}</span>
            <span className="hidden sm:inline">
              {index + 1}. {label}
            </span>
          </li>
        ))}
      </ol>

      <form onSubmit={onStepSubmit} noValidate className="relative">
        <h2 ref={headingRef} tabIndex={-1} className="text-2xl outline-none sm:text-3xl">
          Krok {step} z {STEPS.length}: {STEPS[step - 1]}
        </h2>

        <div role="alert" className="mt-4">
          {message && <p className="border-danger text-danger rounded-md border px-4 py-3 text-sm font-medium">{message}</p>}
        </div>

        {step === 1 && (
          <div className="mt-4 space-y-8">
            <p className="text-muted">Zaznacz wszystko, co chcesz zrobić podczas jednej wizyty. Czasy sumujemy automatycznie.</p>
            {categories.map((c) => (
              <fieldset key={c.slug}>
                <legend className="font-display mb-3 text-lg font-extrabold">{c.name}</legend>
                <ul className="grid gap-3 md:grid-cols-2">
                  {c.services.map((s) => {
                    const checked = serviceIds.includes(s.id);
                    return (
                      <li key={s.id}>
                        <label className={`card flex h-full cursor-pointer items-start gap-3 ${checked ? "border-accent" : ""}`}>
                          <input
                            type="checkbox"
                            className="accent-accent mt-0.5 h-6 w-6 shrink-0"
                            checked={checked}
                            onChange={() => toggleService(s.id)}
                          />
                          <span>
                            <span className="block font-semibold">{s.name}</span>
                            <span className="text-muted mt-1 block text-sm">{s.description}</span>
                            <span className="mt-2 block text-sm font-semibold">
                              ok. {formatDuration(s.durationMin)} · {formatPrice(s.priceFrom, s.priceTo)}
                            </span>
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </fieldset>
            ))}
            {errors.serviceIds && <p className="field-error">{errors.serviceIds}</p>}

            {needsRefrigerant && (
              <fieldset className="card" aria-describedby="refrigerant-hint">
                <legend className="font-display px-1 text-lg font-extrabold">Jaki czynnik chłodniczy ma Twoje auto?</legend>
                <p id="refrigerant-hint" className="text-muted mb-4 text-sm">
                  Auta produkowane od ok. 2017 roku mają zwykle czynnik R1234yf, starsze – R134a. Informację znajdziesz
                  na naklejce pod maską. Obsługujemy oba.
                </p>
                <div className="flex flex-col gap-3">
                  {REFRIGERANTS.map((r) => (
                    <label key={r} className="flex min-h-11 cursor-pointer items-center gap-3">
                      <input
                        type="radio"
                        name="refrigerant"
                        className="accent-accent h-5 w-5"
                        checked={refrigerant === r}
                        onChange={() => setRefrigerant(r)}
                      />
                      {REFRIGERANT_LABEL[r]}
                    </label>
                  ))}
                </div>
                {errors.refrigerant && <p className="field-error">{errors.refrigerant}</p>}
              </fieldset>
            )}

            <p className="border-line bg-surface sticky bottom-20 rounded-md border px-4 py-3 text-sm font-semibold md:bottom-4" aria-live="polite">
              {selected.length === 0
                ? "Nie wybrano jeszcze żadnej usługi."
                : `Wybrane usługi: ${selected.length} · łączny czas ok. ${formatDuration(totalMin)}`}
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="mt-4 space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Marka" name="make" required autoComplete="off" value={vehicle.make} onChange={(e) => setVehicle({ ...vehicle, make: e.target.value })} error={errors.make} />
              <Field label="Model" name="model" required autoComplete="off" value={vehicle.model} onChange={(e) => setVehicle({ ...vehicle, model: e.target.value })} error={errors.model} />
              <Field label="Rok produkcji" name="year" required inputMode="numeric" maxLength={4} value={vehicle.year} onChange={(e) => setVehicle({ ...vehicle, year: e.target.value })} error={errors.year} />
              <Field label="Numer rejestracyjny" name="plate" required autoCapitalize="characters" autoComplete="off" value={vehicle.plate} onChange={(e) => setVehicle({ ...vehicle, plate: e.target.value })} error={errors.plate} />
              <Field label="Numer VIN" name="vin" maxLength={17} autoCapitalize="characters" autoComplete="off" hint="17 znaków – ułatwia dobór części." value={vehicle.vin} onChange={(e) => setVehicle({ ...vehicle, vin: e.target.value })} error={errors.vin} />
              <Field label="Przebieg (km)" name="mileage" inputMode="numeric" value={vehicle.mileage} onChange={(e) => setVehicle({ ...vehicle, mileage: e.target.value })} error={errors.mileage} />
            </div>
            <SelectField label="Typ pojazdu" name="type" value={vehicle.type} onChange={(e) => setVehicle({ ...vehicle, type: e.target.value })} error={errors.type}>
              {Object.entries(VEHICLE_TYPE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectField>
            <TextAreaField
              label="Opis usterki lub uwagi"
              name="description"
              rows={4}
              maxLength={1000}
              hint="Co się dzieje, od kiedy, w jakich warunkach? To pomoże nam się przygotować."
              value={vehicle.description}
              onChange={(e) => setVehicle({ ...vehicle, description: e.target.value })}
              error={errors.description}
            />
          </div>
        )}

        {step === 3 && (
          <div className="mt-4 space-y-6">
            <p className="text-muted">
              Pokazujemy wyłącznie realnie wolne terminy. Przewidywany czas wizyty: ok. {formatDuration(availability?.durationMin ?? totalMin)}.
            </p>
            {pending && !availability && <TurboLoader label="Sprawdzamy wolne terminy…" />}
            {availability && (
              <>
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={!availability.hasEarlier || pending}
                    onClick={() => fetchAvailability(shiftDate(firstDate, -14))}
                  >
                    ← Wcześniej
                  </button>
                  <p className="text-muted text-center text-sm" aria-live="polite">
                    {dayFmt.format(asDate(firstDate))} – {dayFmt.format(asDate(lastDate))}
                  </p>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={!availability.hasLater || pending}
                    onClick={() => fetchAvailability(shiftDate(firstDate, 14))}
                  >
                    Później →
                  </button>
                </div>

                <fieldset disabled={pending}>
                  <legend className="label">Dzień</legend>
                  <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                    {availability.days.map((d) => {
                      const free = d.times.length;
                      const active = d.date === activeDate;
                      return (
                        <li key={d.date}>
                          <button
                            type="button"
                            disabled={free === 0}
                            aria-pressed={active}
                            onClick={() => setActiveDate(d.date)}
                            className={`flex min-h-16 w-full flex-col items-center justify-center rounded-md border px-2 py-2 text-sm ${
                              active ? "border-accent bg-accent text-accent-ink font-bold" : "border-line-strong bg-surface"
                            } disabled:border-line disabled:text-muted disabled:cursor-not-allowed disabled:bg-transparent`}
                          >
                            <span className="capitalize">{dayFmt.format(asDate(d.date))}</span>
                            <span className="text-xs">{free > 0 ? `wolne: ${free}` : (d.closedReason ?? "brak terminów")}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </fieldset>

                {activeDay ? (
                  <fieldset disabled={pending}>
                    <legend className="label capitalize">Godzina – {longFmt.format(asDate(activeDay.date))}</legend>
                    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                      {activeDay.times.map((t) => {
                        const active = slot?.iso === t.iso;
                        return (
                          <li key={t.iso}>
                            <button
                              type="button"
                              aria-pressed={active}
                              onClick={() => {
                                setSlot({ iso: t.iso, time: t.time, date: activeDay.date });
                                setErrors({});
                              }}
                              className={`min-h-12 w-full rounded-md border px-2 font-semibold ${
                                active ? "border-accent bg-accent text-accent-ink" : "border-line-strong bg-surface"
                              }`}
                            >
                              {t.time}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </fieldset>
                ) : (
                  <p className="card text-muted">W tym okresie nie ma wolnych terminów. Sprawdź kolejne dni albo zadzwoń – postaramy się pomóc.</p>
                )}
              </>
            )}
            {errors.start && <p className="field-error">{errors.start}</p>}
            {slot && (
              <p className="font-semibold" aria-live="polite">
                Wybrany termin: {longFmt.format(asDate(slot.date))}, godz. {slot.time}
              </p>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="mt-4 space-y-5">
            <Field label="Imię i nazwisko" name="name" required autoComplete="name" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} error={errors.name} />
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Telefon" name="phone" type="tel" required inputMode="tel" autoComplete="tel" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} error={errors.phone} />
              <Field label="E-mail" name="email" type="email" required autoComplete="email" hint="Wyślemy tu potwierdzenie i link do zarządzania wizytą." value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} error={errors.email} />
            </div>
            <p className="text-muted text-sm">
              Administratorem danych jest {controller}. Dane wykorzystamy do umówienia i realizacji wizyty (art. 6 ust.
              1 lit. b RODO). Szczegóły i Twoje prawa opisuje{" "}
              <Link href="/polityka-prywatnosci" className="link" target="_blank">
                polityka prywatności<span className="sr-only"> (otwiera się w nowej karcie)</span>
              </Link>
              .
            </p>
            <CheckboxField name="terms" required checked={customer.terms} onChange={(e) => setCustomer({ ...customer, terms: e.target.checked })} error={errors.terms}>
              Akceptuję{" "}
              <Link href="/regulamin-rezerwacji" className="link" target="_blank">
                regulamin rezerwacji<span className="sr-only"> (otwiera się w nowej karcie)</span>
              </Link>{" "}
              (wymagane).
            </CheckboxField>
            <CheckboxField name="marketing" checked={customer.marketing} onChange={(e) => setCustomer({ ...customer, marketing: e.target.checked })}>
              Chcę otrzymywać e-mailem informacje o promocjach i przypomnienia o przeglądach (opcjonalnie; zgodę można
              wycofać w każdej chwili).
            </CheckboxField>
          </div>
        )}

        {step === 5 && slot && (
          <div className="mt-4 space-y-5">
            <dl className="card grid gap-x-8 gap-y-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <dt className="text-muted text-sm">Termin</dt>
                <dd className="text-lg font-bold capitalize">
                  {longFmt.format(asDate(slot.date))}, godz. {slot.time}
                </dd>
                <dd className="text-muted text-sm">Przewidywany czas: ok. {formatDuration(availability?.durationMin ?? totalMin)}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted text-sm">Usługi</dt>
                <dd>
                  <ul className="list-disc pl-5">
                    {selected.map((s) => (
                      <li key={s.id}>
                        {s.name} <span className="text-muted">({formatPrice(s.priceFrom, s.priceTo)})</span>
                      </li>
                    ))}
                  </ul>
                </dd>
                {needsRefrigerant && refrigerant && <dd className="text-muted mt-1 text-sm">Czynnik: {REFRIGERANT_LABEL[refrigerant]}</dd>}
              </div>
              <div>
                <dt className="text-muted text-sm">Pojazd</dt>
                <dd>
                  {vehicle.make} {vehicle.model} ({vehicle.year}), {vehicle.plate.toUpperCase()}
                </dd>
                {vehicle.description && <dd className="text-muted mt-1 text-sm whitespace-pre-line">{vehicle.description}</dd>}
              </div>
              <div>
                <dt className="text-muted text-sm">Kontakt</dt>
                <dd>{customer.name}</dd>
                <dd>{formatPhone(customer.phone)}</dd>
                <dd className="break-all">{customer.email}</dd>
              </div>
            </dl>
            <p className="text-muted text-sm">
              {autoConfirm
                ? "Po wysłaniu rezerwacja zostanie od razu potwierdzona – szczegóły wyślemy e-mailem."
                : "Po wysłaniu rezerwacja czeka na potwierdzenie przez warsztat. O potwierdzeniu poinformujemy e-mailem."}
            </p>
            <AntispamFields token={token} />
          </div>
        )}

        <div className="mt-8 flex flex-wrap justify-between gap-3">
          {step > 1 ? (
            <button type="button" className="btn btn-secondary" onClick={() => go(step - 1)} disabled={pending}>
              Wstecz
            </button>
          ) : (
            <span />
          )}
          <button type="submit" className="btn btn-primary" disabled={pending} aria-busy={pending}>
            {step < 5 ? (
              <>
                Dalej
                <Icon name="arrow" />
              </>
            ) : pending ? (
              "Wysyłanie…"
            ) : (
              <>
                <Icon name="check" />
                Rezerwuję wizytę
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
