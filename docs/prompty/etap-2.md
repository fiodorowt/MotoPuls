# Etap 2: SMS z potwierdzeniem terminu

**Agent:** `mp-sms`, potem `mp-tester` i `mp-bezpieczenstwo`. Uruchamiane przez `/mp-etap 2`.
**Warunek startu:** etap 1 zmergowany co najmniej w zakresie MP-003 (cron), MP-006 (testy integracyjne), MP-016 (punkt zaczepienia kanałów). Wysyłka produkcyjna (adapter dostawcy, MP-025 część 2, włączenie flagi) wymaga D-5; zgoda SMS wymaga D-6, D-20; szablon D-24. Bez decyzji: tylko tryb testowy.

## Kontekst
Istnieje wyłącznie e-mail: `src/lib/email/send.ts` (tryb bez SMTP zapisuje do `.mail-outbox`), `notify.ts` (`notifyBooking`, po MP-016 z listą kanałów), szablony `EmailTemplate` edytowane przez właściciela w `src/app/admin/(panel)/szablony`, przypomnienia `maintenance.ts`. Ścieżki CONFIRMED: `changeBookingStatus`, `createBooking` przy `autoConfirm` i źródle ADMIN (`src/lib/booking.ts`). Wzoruj się na tym; NIE twórz równoległego systemu powiadomień.

## Zakres
- MP-023: 2-3 opcje dostawcy w `docs/decyzje.md` (D-5) z cenami ze źródła (URL, data), kosztem segmentu GSM-7/UCS-2, szacunkiem dla 100/300/600 wizyt/mies. Nie wybierasz sam.
- MP-024: migracja addytywna (`Customer.smsConsent/smsConsentAt`, tabela `SmsLog` z `@@unique([bookingId, kind])`), anonimizacja obejmuje nowe pola.
- MP-025: `SmsProvider`, `TestSmsProvider` (`.sms-outbox`, zero sieci), zmienne `SMS_ENABLED=false`, `SMS_PROVIDER=test`, `SMS_API_TOKEN`, `SMS_SENDER`, `SMS_MONTHLY_LIMIT` w `.env.example` i `src/lib/env.ts`, bezpiecznik miesięczny (Europe/Warsaw), maskowanie numeru.
- MP-026: szablon `sms_booking_confirmed` w `EmailTemplate`, licznik znaków/segmentów, transliteracja wg D-24.
- MP-027: wysyłka po CONFIRMED przez kanał z MP-016, idempotencja, ponowienia w `maintenance` (maks. 3), błąd nie cofa zatwierdzenia.
- MP-028: checkbox zgody SMS w kroku 4 (wzór `marketing`), pole w ręcznej rezerwacji wg D-20, Zod dla +48; treści zgody i polityki „DO ZATWIERDZENIA".
- MP-029: status SMS w szczególe rezerwacji, licznik na pulpicie, ponowienie tylko OWNER.
- MP-030: tylko jeśli D-5 obejmuje przypomnienia.

## Pliki (główne)
`prisma/schema.prisma` + nowa migracja, `src/lib/sms/*` (nowe: provider, test provider, segmenty, normalizacja numeru), `src/lib/email/notify.ts`, `src/lib/email/templates.ts`, `src/lib/booking.ts` (tylko wywołanie kanału, jeśli MP-016 tego nie pokrył), `src/lib/maintenance.ts`, `src/lib/env.ts`, `.env.example`, `src/components/booking/BookingWizard.tsx` (krok 4), schematy Zod klienta, `src/app/admin/(panel)/{rezerwacje,szablony,ustawienia}/*`, `src/app/(public)/polityka-prywatnosci/page.tsx` (tylko znacznik DO ZATWIERDZENIA), `.gitignore` (`.sms-outbox`), `tests/{unit,integration,e2e}/*`, `README.md`, `SECURITY.md`.

## Kryteria akceptacji
Kryteria MP-023…MP-029 z `docs/backlog.md` oraz T6.1-T6.9 z `docs/testy.md` PASS (mock/tryb testowy). Dodatkowo:
- Domyślna konfiguracja (`SMS_ENABLED=false`) nie wykonuje żadnego wywołania sieciowego; E2E używa `SMS_PROVIDER=test`.
- Jedna rezerwacja = maks. 1 SMS potwierdzający, także przy równoległych zatwierdzeniach.
- Klucz API tylko po stronie serwera; numer w logach i panelu zmaskowany.
- Raport zawiera szacunek miesięcznego kosztu (wzór z D-5 i ceny z MP-023).

## Zakazy
- NIE wysyłaj prawdziwych SMS-ów (ani na numer właściciela) bez osobnej, wyraźnej zgody użytkownika po bramce B2.
- NIE wybieraj dostawcy, nie zakładaj konta u dostawcy, nie wpisuj kluczy.
- NIE publikuj treści prawnych jako ostatecznych; tylko „DO ZATWIERDZENIA".
- NIE zmieniaj logiki slotów, statusów ani maili poza dodaniem kanału.
- NIE wysyłaj SMS bez zgody (`smsConsent=false`) ani do rezerwacji ręcznych wbrew D-20.
- Migracje addytywne; bez `db:deploy`; bez merge do `main`.

## Raport (do 10 linii)
Co zmieniono, wyniki testów, szacunek kosztu, decyzje blokujące włączenie produkcyjne.
