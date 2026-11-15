-- MP-032: ustawienia Moto Puls Premium (addytywne, domyślnie wyłączone).
ALTER TABLE "Settings" ADD COLUMN "premiumEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "premiumPriceNote" TEXT NOT NULL DEFAULT 'Cena ustalana indywidualnie',
ADD COLUMN "premiumPickupEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "premiumPickupNote" TEXT NOT NULL DEFAULT '';
-- Cofnięcie (ręcznie): ALTER TABLE "Settings" DROP COLUMN "premiumEnabled", DROP COLUMN "premiumPriceNote", DROP COLUMN "premiumPickupEnabled", DROP COLUMN "premiumPickupNote";
