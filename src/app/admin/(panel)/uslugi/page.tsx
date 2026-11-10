import type { Metadata } from "next";
import { ActionButton, ActionForm } from "@/components/admin/ActionForm";
import { PageHeader } from "@/components/admin/ui";
import { CheckboxField, Field, TextAreaField } from "@/components/form";
import { requireOwner } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/labels";
import { formatDuration } from "@/lib/time";
import { deleteService, saveCategory, saveService } from "./actions";

export const metadata: Metadata = { title: "Usługi" };

interface ServiceValues {
  id?: string;
  categoryId: string;
  name?: string;
  description?: string;
  priceFrom?: number | null;
  priceTo?: number | null;
  durationMin?: number;
  active?: boolean;
  requiresRefrigerant?: boolean;
  sortOrder?: number;
}

function ServiceForm({ service }: { service: ServiceValues }) {
  return (
    <ActionForm action={saveService} resetOnSuccess={!service.id} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {service.id && <input type="hidden" name="id" value={service.id} />}
      <input type="hidden" name="categoryId" value={service.categoryId} />
      <div className="sm:col-span-2">
        <Field label="Nazwa usługi" name="name" required defaultValue={service.name} maxLength={120} />
      </div>
      <Field label="Czas (min)" name="durationMin" required inputMode="numeric" defaultValue={service.durationMin ?? 60} hint="Wielokrotność 15 minut" />
      <Field label="Kolejność" name="sortOrder" required inputMode="numeric" defaultValue={service.sortOrder ?? 0} />
      <Field label="Cena od (zł)" name="priceFrom" inputMode="numeric" defaultValue={service.priceFrom ?? ""} />
      <Field label="Cena do (zł)" name="priceTo" inputMode="numeric" defaultValue={service.priceTo ?? ""} />
      <div className="sm:col-span-2">
        <Field label="Opis" name="description" defaultValue={service.description} maxLength={1000} />
      </div>
      <CheckboxField name="active" defaultChecked={service.active ?? true}>
        Widoczna w ofercie i rezerwacji
      </CheckboxField>
      <CheckboxField name="requiresRefrigerant" defaultChecked={service.requiresRefrigerant ?? false}>
        Pytaj o czynnik klimatyzacji
      </CheckboxField>
      <div className="sm:col-span-2 lg:col-span-4">
        <ActionButton className="btn btn-secondary btn-sm">{service.id ? "Zapisz usługę" : "Dodaj usługę"}</ActionButton>
      </div>
    </ActionForm>
  );
}

export default async function ServicesPage() {
  await requireOwner();
  const categories = await db.serviceCategory.findMany({
    include: { services: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] } },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <>
      <PageHeader title="Usługi i cennik" />
      <p className="text-muted mb-6 max-w-3xl text-sm">
        Ceny są orientacyjne („od–do”); puste pola oznaczają wycenę indywidualną. Czas trwania decyduje o długości rezerwowanego terminu. Zmiany nie wpływają na już
        umówione wizyty.
      </p>
      <div className="space-y-6">
        {categories.map((category) => (
          <section key={category.id} className="card">
            <h2 className="mb-4 text-lg">{category.name}</h2>

            <details className="border-line mb-4 rounded-md border px-4 py-3">
              <summary className="cursor-pointer text-sm font-semibold">Edytuj opis kategorii</summary>
              <ActionForm action={saveCategory} className="mt-4 space-y-4">
                <input type="hidden" name="id" value={category.id} />
                <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
                  <Field label="Nazwa" name="name" required defaultValue={category.name} maxLength={80} />
                  <Field label="Kolejność" name="sortOrder" required inputMode="numeric" defaultValue={category.sortOrder} />
                </div>
                <Field label="Krótki opis (kafelek na stronie głównej)" name="summary" required defaultValue={category.summary} maxLength={300} />
                <TextAreaField label="Opis na stronie usług" name="description" required rows={5} defaultValue={category.description} maxLength={4000} />
                <ActionButton className="btn btn-secondary btn-sm">Zapisz kategorię</ActionButton>
              </ActionForm>
            </details>

            <ul className="space-y-2">
              {category.services.map((service) => (
                <li key={service.id}>
                  <details className="border-line rounded-md border px-4 py-3">
                    <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="font-semibold">
                        {service.name}
                        {!service.active && <span className="badge text-muted ml-2">wyłączona</span>}
                      </span>
                      <span className="text-muted">
                        {formatDuration(service.durationMin)} · {formatPrice(service.priceFrom, service.priceTo)}
                      </span>
                    </summary>
                    <div className="mt-4 space-y-4">
                      <ServiceForm service={service} />
                      <ActionForm action={deleteService} confirm={`Usunąć usługę „${service.name}”? Jeśli ma historię wizyt, zostanie tylko wyłączona.`}>
                        <input type="hidden" name="id" value={service.id} />
                        <ActionButton className="btn btn-danger btn-sm">Usuń usługę</ActionButton>
                      </ActionForm>
                    </div>
                  </details>
                </li>
              ))}
            </ul>

            <details className="border-line mt-4 rounded-md border border-dashed px-4 py-3">
              <summary className="cursor-pointer text-sm font-semibold">+ Dodaj usługę w tej kategorii</summary>
              <div className="mt-4">
                <ServiceForm service={{ categoryId: category.id }} />
              </div>
            </details>
          </section>
        ))}
      </div>
    </>
  );
}
