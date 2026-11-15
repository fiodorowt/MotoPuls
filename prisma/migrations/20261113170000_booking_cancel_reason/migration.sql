-- MP-011: powód odrzucenia rezerwacji (addytywnie, kolumna opcjonalna).
-- Cofnięcie (ręcznie, bez utraty innych danych): ALTER TABLE "Booking" DROP COLUMN "cancelReason";
ALTER TABLE "Booking" ADD COLUMN "cancelReason" TEXT;
