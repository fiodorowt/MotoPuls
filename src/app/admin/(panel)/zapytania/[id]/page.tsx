import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActionButton, ActionForm } from "@/components/admin/ActionForm";
import { InquiryBadge, PageHeader, Section } from "@/components/admin/ui";
import { SelectField, TextAreaField } from "@/components/form";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { INQUIRY_STATUS_LABEL, INQUIRY_TYPE_LABEL, formatPhone, telHref } from "@/lib/labels";
import { formatDateTimePl } from "@/lib/time";
import { deleteInquiry, updateInquiry } from "../actions";

export const metadata: Metadata = { title: "Zapytanie" };

function extraFields(data: unknown): [string, string][] {
  if (!data || typeof data !== "object" || Array.isArray(data)) return [];
  return Object.entries(data).map(([key, value]) => [key, String(value)]);
}

export default async function InquiryPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const inquiry = await db.inquiry.findUnique({ where: { id } });
  if (!inquiry) notFound();

  return (
    <>
      <PageHeader title={`Zapytanie: ${INQUIRY_TYPE_LABEL[inquiry.type]}`}>
        <InquiryBadge status={inquiry.status} />
      </PageHeader>
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Treść zgłoszenia">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted">Otrzymano</dt>
            <dd>{formatDateTimePl(inquiry.createdAt)}</dd>
            <dt className="text-muted">Od</dt>
            <dd>{inquiry.name}</dd>
            {inquiry.company && (
              <>
                <dt className="text-muted">Firma</dt>
                <dd>{inquiry.company}</dd>
              </>
            )}
            <dt className="text-muted">Telefon</dt>
            <dd>
              <a href={telHref(inquiry.phone)} className="link">
                {formatPhone(inquiry.phone)}
              </a>
            </dd>
            <dt className="text-muted">E-mail</dt>
            <dd className="break-all">
              <a href={`mailto:${inquiry.email}`} className="link">
                {inquiry.email}
              </a>
            </dd>
            {extraFields(inquiry.data).map(([key, value]) => (
              <div key={key} className="contents">
                <dt className="text-muted">{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          {inquiry.message && <p className="border-line mt-4 border-t pt-4 text-sm whitespace-pre-wrap">{inquiry.message}</p>}
        </Section>

        <div className="space-y-6">
          <Section title="Obsługa">
            <ActionForm action={updateInquiry} className="space-y-4">
              <input type="hidden" name="id" value={inquiry.id} />
              <SelectField label="Status" name="status" defaultValue={inquiry.status}>
                {Object.entries(INQUIRY_STATUS_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </SelectField>
              <TextAreaField label="Notatka wewnętrzna" name="internalNote" rows={4} defaultValue={inquiry.internalNote ?? ""} maxLength={2000} />
              <ActionButton className="btn btn-secondary btn-sm">Zapisz</ActionButton>
            </ActionForm>
          </Section>
          {user.role === "OWNER" && (
            <Section title="Usuń zapytanie">
              <ActionForm action={deleteInquiry} confirm="Trwale usunąć to zapytanie?">
                <input type="hidden" name="id" value={inquiry.id} />
                <ActionButton className="btn btn-danger btn-sm">Usuń</ActionButton>
              </ActionForm>
            </Section>
          )}
        </div>
      </div>
    </>
  );
}
