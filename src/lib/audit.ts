import { db, Prisma } from "./db";

export interface AuditEntry {
  /** E-mail użytkownika panelu, „klient” albo „system” */
  actor: string;
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  /** Bez danych wrażliwych (haseł, tokenów, treści wiadomości) */
  details?: Prisma.InputJsonValue;
}

export async function audit(entry: AuditEntry): Promise<void> {
  await db.auditLog.create({
    data: {
      actor: entry.actor,
      userId: entry.userId ?? null,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId ?? null,
      details: entry.details,
    },
  });
}
