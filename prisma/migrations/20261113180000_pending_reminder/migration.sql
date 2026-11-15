-- MP-012: przypomnienie dla warsztatu o nieobsłużonych rezerwacjach PENDING (addytywnie, z wartością domyślną).
-- Cofnięcie (ręcznie): ALTER TABLE "Settings" DROP COLUMN "pendingReminderHours", DROP COLUMN "pendingDigestSentAt";
ALTER TABLE "Settings" ADD COLUMN "pendingReminderHours" INTEGER NOT NULL DEFAULT 12;
ALTER TABLE "Settings" ADD COLUMN "pendingDigestSentAt" TIMESTAMP(3);
