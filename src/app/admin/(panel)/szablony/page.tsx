import type { Metadata } from "next";
import { ActionButton, ActionForm } from "@/components/admin/ActionForm";
import { PageHeader } from "@/components/admin/ui";
import { Field, TextAreaField } from "@/components/form";
import { requireOwner } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { TEMPLATE_VARIABLES } from "@/lib/email/templates";
import { resetTemplate, saveTemplate } from "./actions";

export const metadata: Metadata = { title: "Szablony e-maili" };

export default async function TemplatesPage() {
  await requireOwner();
  const templates = await db.emailTemplate.findMany({ orderBy: { label: "asc" } });

  return (
    <>
      <PageHeader title="Szablony e-maili" />
      <p className="text-muted mb-6 max-w-3xl text-sm">
        Treść jest zwykłym tekstem – wiadomość dostaje szatę graficzną marki automatycznie, a link w osobnej linii staje się przyciskiem. Dostępne zmienne:{" "}
        <code className="break-words">{TEMPLATE_VARIABLES}</code>. Stopka z danymi firmy jest dodawana do każdej wiadomości.
      </p>
      <ul className="space-y-2">
        {templates.map((template) => (
          <li key={`${template.key}:${template.subject}:${template.body.length}`}>
            <details className="card">
              <summary className="cursor-pointer font-semibold">{template.label}</summary>
              <div className="mt-4 space-y-4">
                <ActionForm action={saveTemplate} className="space-y-4">
                  <input type="hidden" name="key" value={template.key} />
                  <Field label="Temat" name="subject" required defaultValue={template.subject} maxLength={200} />
                  <TextAreaField label="Treść" name="body" required rows={12} defaultValue={template.body} maxLength={5000} />
                  <ActionButton className="btn btn-secondary btn-sm">Zapisz szablon</ActionButton>
                </ActionForm>
                <ActionForm action={resetTemplate} confirm="Przywrócić domyślną treść tego szablonu?">
                  <input type="hidden" name="key" value={template.key} />
                  <ActionButton className="btn btn-danger btn-sm">Przywróć domyślny</ActionButton>
                </ActionForm>
              </div>
            </details>
          </li>
        ))}
      </ul>
    </>
  );
}
