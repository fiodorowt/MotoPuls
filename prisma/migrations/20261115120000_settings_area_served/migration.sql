-- MP-040 / D-21: obszar obsługi do JSON-LD (addytywne; puste = pominięte, wartość startowa tylko w seedzie).
ALTER TABLE "Settings" ADD COLUMN "areaServed" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
-- Cofnięcie (ręcznie): ALTER TABLE "Settings" DROP COLUMN "areaServed";
