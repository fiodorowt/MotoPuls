-- MP-031: nowy typ zgłoszenia. Osobna migracja, bo wartość enuma nie może być użyta w tej samej transakcji.
ALTER TYPE "InquiryType" ADD VALUE IF NOT EXISTS 'PREMIUM';
-- Cofnięcie: Postgres nie usuwa wartości enuma; po usunięciu zgłoszeń PREMIUM wartość można zostawić (nieużywana jest nieszkodliwa).
