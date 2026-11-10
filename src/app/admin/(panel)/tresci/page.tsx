import type { Metadata } from "next";
import { ActionButton, ActionForm } from "@/components/admin/ActionForm";
import { Empty, PageHeader, Section } from "@/components/admin/ui";
import { CheckboxField, Field, TextAreaField } from "@/components/form";
import { requireOwner } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { deleteMedia, deleteTestimonial, saveContentBlock, saveMedia, saveTestimonial, uploadMedia } from "./actions";

export const metadata: Metadata = { title: "Treści" };

interface TestimonialValues {
  id?: string;
  author?: string;
  text?: string;
  rating?: number;
  published?: boolean;
  sortOrder?: number;
}

function TestimonialForm({ item }: { item: TestimonialValues }) {
  return (
    <ActionForm action={saveTestimonial} resetOnSuccess={!item.id} className="space-y-4">
      {item.id && <input type="hidden" name="id" value={item.id} />}
      <div className="grid gap-4 sm:grid-cols-[1fr_7rem_7rem]">
        <Field label="Autor" name="author" required defaultValue={item.author} maxLength={80} />
        <Field label="Ocena (1–5)" name="rating" required inputMode="numeric" defaultValue={item.rating ?? 5} />
        <Field label="Kolejność" name="sortOrder" required inputMode="numeric" defaultValue={item.sortOrder ?? 0} />
      </div>
      <TextAreaField label="Treść opinii" name="text" required rows={3} defaultValue={item.text} maxLength={1000} />
      <CheckboxField name="published" defaultChecked={item.published ?? true}>
        Pokazuj na stronie
      </CheckboxField>
      <ActionButton className="btn btn-secondary btn-sm">{item.id ? "Zapisz opinię" : "Dodaj opinię"}</ActionButton>
    </ActionForm>
  );
}

export default async function ContentPage() {
  await requireOwner();
  const [blocks, testimonials, media] = await Promise.all([
    db.contentBlock.findMany({ orderBy: { label: "asc" } }),
    db.testimonial.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] }),
    db.media.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] }),
  ]);

  return (
    <>
      <PageHeader title="Treści strony" />
      <div className="space-y-6">
        <Section title="Teksty">
          <p className="text-muted mb-4 text-sm">Krótkie teksty wyświetlane na stronie publicznej (zwykły tekst, bez formatowania).</p>
          <ul className="space-y-2">
            {blocks.map((block) => (
              <li key={block.key}>
                <details className="border-line rounded-md border px-4 py-3">
                  <summary className="cursor-pointer text-sm font-semibold">{block.label}</summary>
                  <ActionForm action={saveContentBlock} className="mt-4 space-y-4">
                    <input type="hidden" name="key" value={block.key} />
                    <Field label="Tytuł" name="title" required defaultValue={block.title} maxLength={200} />
                    <TextAreaField label="Treść" name="body" required rows={5} defaultValue={block.body} maxLength={2000} />
                    <ActionButton className="btn btn-secondary btn-sm">Zapisz tekst</ActionButton>
                  </ActionForm>
                </details>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Opinie klientów">
          <p className="text-muted mb-4 text-sm">Publikuj wyłącznie prawdziwe opinie, na których publikację masz zgodę autora.</p>
          {testimonials.length === 0 && <Empty>Brak opinii – sekcja opinii nie jest wyświetlana na stronie.</Empty>}
          <ul className="space-y-2">
            {testimonials.map((item) => (
              <li key={item.id}>
                <details className="border-line rounded-md border px-4 py-3">
                  <summary className="cursor-pointer text-sm font-semibold">
                    {item.author} · {item.rating}/5{!item.published && <span className="badge text-muted ml-2">ukryta</span>}
                  </summary>
                  <div className="mt-4 space-y-4">
                    <TestimonialForm item={item} />
                    <ActionForm action={deleteTestimonial} confirm={`Usunąć opinię: ${item.author}?`}>
                      <input type="hidden" name="id" value={item.id} />
                      <ActionButton className="btn btn-danger btn-sm">Usuń opinię</ActionButton>
                    </ActionForm>
                  </div>
                </details>
              </li>
            ))}
          </ul>
          <details className="border-line mt-4 rounded-md border border-dashed px-4 py-3">
            <summary className="cursor-pointer text-sm font-semibold">+ Dodaj opinię</summary>
            <div className="mt-4">
              <TestimonialForm item={{}} />
            </div>
          </details>
        </Section>

        <Section title="Zdjęcia warsztatu">
          <p className="text-muted mb-4 text-sm">
            JPG, PNG, WebP lub AVIF do 5 MB. Zdjęcia są automatycznie zmniejszane, a dane EXIF (w tym lokalizacja) usuwane. Nie publikuj zdjęć z widocznymi tablicami
            rejestracyjnymi ani twarzami bez zgody.
          </p>
          <ActionForm action={uploadMedia} resetOnSuccess className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Field label="Plik" name="file" type="file" required accept="image/jpeg,image/png,image/webp,image/avif" />
            <Field label="Opis zdjęcia (tekst alternatywny)" name="alt" required maxLength={200} />
            <ActionButton className="btn btn-secondary">Wgraj zdjęcie</ActionButton>
          </ActionForm>

          {media.length > 0 && (
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {media.map((item) => (
                <li key={item.id} className="border-line rounded-md border p-3">
                  <img src={`/media/${item.id}`} alt={item.alt} width={item.width} height={item.height} loading="lazy" className="mb-3 aspect-video w-full rounded object-cover" />
                  <ActionForm action={saveMedia} className="space-y-3">
                    <input type="hidden" name="id" value={item.id} />
                    <Field label="Opis" name="alt" required defaultValue={item.alt} maxLength={200} />
                    <Field label="Kolejność" name="sortOrder" required inputMode="numeric" defaultValue={item.sortOrder} />
                    <CheckboxField name="published" defaultChecked={item.published}>
                      Pokazuj na stronie
                    </CheckboxField>
                    <ActionButton className="btn btn-secondary btn-sm">Zapisz</ActionButton>
                  </ActionForm>
                  <div className="mt-2">
                    <ActionForm action={deleteMedia} confirm="Usunąć to zdjęcie?">
                      <input type="hidden" name="id" value={item.id} />
                      <ActionButton className="btn btn-danger btn-sm">Usuń</ActionButton>
                    </ActionForm>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </>
  );
}
