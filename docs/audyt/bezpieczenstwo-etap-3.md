# Przegląd bezpieczeństwa i prywatności – etap 3 (Moto Puls Premium)

Gałąź: `mp/etap-3-premium`, zakres: `git diff main...HEAD` poza `docs/` (commity `dfaa1de`, `13610bf`; 22 pliki kodu, testów i dokumentacji głównej).
Tryb: tylko odczyt kodu, bez uruchamiania aplikacji i bez połączeń z produkcją. Punkt odniesienia: `SECURITY.md` (ryzyka 1–17)
i `docs/audyt/bezpieczenstwo-etap-1.md` (ustalenia W1, D1–D5 nie są tu powtarzane).

## Werdykt

**WDRAŻAĆ MOŻNA** – brak ustaleń blokujących. Funkcja jest domyślnie wyłączona (`premiumEnabled=false`), a przy wyłączonej
fladze serwer odrzuca zgłoszenia i `/premium` daje 404. Ustalenia W1 i W2 (polityka prywatności i retencja adresu odbioru)
trzeba zamknąć **przed włączeniem flagi** w panelu, nie przed wdrożeniem kodu. W3 jest istniejącą wcześniej słabością
wszystkich formularzy zapytań, którą Premium dziedziczy.

## Co sprawdzono i jest w porządku

| Obszar | Wynik | Źródło |
|---|---|---|
| Uprawnienia do ustawień Premium | [FAKT] `savePremium` używa `runAction(..., { owner: true })` → `requireOwner()`; strona ustawień też `requireOwner` | `src/app/admin/(panel)/ustawienia/actions.ts:117-118`, `src/lib/admin/run.ts:25` |
| Dziennik zmian | [FAKT] wpis `settings.premium` z samymi flagami, bez treści notatek | `src/app/admin/(panel)/ustawienia/actions.ts:120-126` |
| Walidacja ustawień | [FAKT] `premiumPriceNote` 2–200 znaków, `premiumPickupNote` ≤ 500, flagi przez `f.checkbox` | `ustawienia/actions.ts:109-114` |
| Flaga po stronie serwera | [FAKT] `sendPremiumInquiry` czyta `Settings` z bazy przy każdym żądaniu i odrzuca zgłoszenie przy `premiumEnabled=false` | `src/app/(public)/actions.ts:75-78` |
| Antyspam, limit IP, RODO | [FAKT] Premium przechodzi przez wspólne `handleInquiry`: `rateLimitByIp("inquiry", 5, 600)`, honeypot + token + Turnstile, `privacy: z.literal(true)` | `src/app/(public)/actions.ts:23-36`, `src/lib/validation.ts:101-106` |
| Walidacja Zod serwerowa | [FAKT] limity długości wszystkich pól; adres odbioru odrzucany przy wyłączonym odbiorze, wymagany (≥ 5 znaków) przy zaznaczonym, usuwany gdy `pickup` puste | `src/lib/validation.ts:153-174` |
| Adres odbioru tylko przy fladze | [FAKT] pole renderowane tylko przy `pickupEnabled`, a serwer niezależnie od UI odrzuca payload z adresem | `src/components/site/InquiryForms.tsx:154`, `validation.ts:164-169`; testy `tests/integration/premium.test.ts:82-96`, `tests/unit/premium-schema.test.ts:26-43` |
| Brak wpływu na kalendarz | [FAKT] zgłoszenie tworzy tylko `Inquiry`; test sprawdza brak zmian w `Booking/BookingSlot/Block` | `actions.ts:38-48`, `tests/integration/premium.test.ts:47` |
| Mail do warsztatu | [FAKT] `notifyInquiry(type, name)` – tylko imię, rodzaj i link do panelu; adres, telefon, e‑mail i pojazd nie trafiają do maila. Temat bez danych klienta i oczyszczony z `\r\n` | `src/lib/email/notify.ts:98-105`, `notify.ts:36`, `src/lib/email/templates.ts:104-109` |
| Escapowanie HTML maila | [FAKT] `renderHtml` escapuje każdą linię (`escapeHtml`), znacznik powstaje tylko dla linii będącej samym URL http(s) | `src/lib/email/templates.ts:129-160` (patrz jednak W3) |
| XSS z `premiumPriceNote` / `premiumPickupNote` | [FAKT] wartości wstawiane jako tekst JSX (escapowane przez React); brak `dangerouslySetInnerHTML` poza JSON-LD i skryptem motywu; pola Premium nie trafiają do JSON-LD | `src/app/(public-detail)/premium/page.tsx:49`, `src/app/(public)/page.tsx:144`, `InquiryForms.tsx:122`; `grep dangerouslySetInnerHTML src` |
| 404 przy wyłączonej fladze | [FAKT] `notFound()` w grupie `(public-detail)` (bez `loading.tsx`, więc prawdziwy status 404); test E2E T5.4 | `premium/page.tsx:26-27`, `src/app/(public-detail)/layout.tsx`, `tests/e2e/02b-premium.spec.ts:36-43` |
| Sitemap | [FAKT] `/premium` dodawane tylko przy włączonej fladze; `select` ogranicza odczyt do jednej kolumny | `src/app/sitemap.ts:20-25` |
| Panel zapytań – `Inquiry.data` | [FAKT] klucze i wartości renderowane jako tekst JSX (`String(value)`), dostęp `requireUser`; filtr `typ` walidowany listą z `INQUIRY_TYPE_LABEL` | `src/app/admin/(panel)/zapytania/[id]/page.tsx:14-17,55-60`, `zapytania/page.tsx:12-18` |
| Eksport CSV | [FAKT] eksport zapytań (tylko OWNER) nie zawiera `data`, więc adres odbioru nie wychodzi w CSV | `src/app/admin/eksport/[kind]/route.ts:58-63,70` |
| AuditLog bez PII | [FAKT] `inquiry.create` zapisuje tylko `{ type }` | `src/app/(public)/actions.ts:49` |
| Logi | [FAKT] diff nie dodaje żadnego `console.*`; istniejące logi maila nie zawierają adresatów ani treści | `src/lib/email/send.ts:42,69` |
| Migracje addytywne | [FAKT] `ADD VALUE IF NOT EXISTS` w osobnej migracji; kolumny `Settings` z wartościami domyślnymi, instrukcja cofnięcia w komentarzu | `prisma/migrations/20261115100000_inquiry_type_premium/migration.sql:2`, `20261115100100_premium_settings/migration.sql:2-6` |
| `npm audit --omit=dev` | [FAKT] `found 0 vulnerabilities` (uruchomione 2026-11-15) | – |
| Sekrety w diffie | [FAKT] brak plików `.env*` w diffie, brak kluczy/haseł/URL z poświadczeniami; dane testowe w domenie `motopuls.test` | `git diff main...HEAD` (grep), `tests/e2e/02b-premium.spec.ts:73` |

## Ustalenia

### BLOKUJĄCE

Brak.

### WAŻNE

**W1. Polityka prywatności nie obejmuje formularza Premium ani adresu odbioru auta.** (przed włączeniem flagi)
- [FAKT] Sekcja polityki wymienia tylko „kontaktowy, zapytanie o części, zapytanie flotowe”, a zakres danych nie wspomina
  o adresie/miejscu odbioru: `src/app/(public)/polityka-prywatnosci/page.tsx:39-43`.
- [FAKT] Klauzula przy formularzu odsyła do tej polityki: `src/components/site/InquiryForms.tsx:39-40`.
- [ZAŁOŻENIE] Adres miejsca odbioru (często dom klienta) to nowa kategoria danych o lokalizacji; brak jej w informacji z art. 13 RODO
  jest niezgodnością przejrzystości.
- [REKOMENDACJA] Dopisać „zgłoszenie Moto Puls Premium” do nagłówka i „adres odbioru pojazdu (jeśli wybrano odbiór)” do zakresu,
  z celem „organizacja odbioru pojazdu” i okresem z W2. Treść do zatwierdzenia przez właściciela (dokumenty prawne = otwarta decyzja).

**W2. Adres odbioru może leżeć w bazie bezterminowo; polityka obiecuje maks. `retentionMonths`.** (przed włączeniem odbioru)
- [FAKT] `cleanup()` usuwa wyłącznie zapytania `status: "CLOSED"` starsze niż `retentionMonths` (liczone od `updatedAt`):
  `src/lib/maintenance.ts:98`. Zapytania `NEW` i `IN_PROGRESS` nie są nigdy usuwane ani anonimizowane.
- [FAKT] `anonymizeCustomer` nie dotyka `Inquiry` (zapytania nie są powiązane z `Customer`): `src/lib/maintenance.ts:36-70`.
- [FAKT] Polityka deklaruje: „Zapytania z formularzy: do czasu załatwienia sprawy, nie dłużej niż {retentionMonths} miesięcy”:
  `polityka-prywatnosci/page.tsx:62`.
- [FAKT] `SECURITY.md:76` mówi „automatycznej retencji zapytań nadal brak” – to nieścisłe (retencja jest, ale tylko dla `CLOSED`).
- [ZAŁOŻENIE] Luka istniała już dla wszystkich typów zapytań; Premium dokłada dane bardziej wrażliwe (adres), a każda zmiana statusu
  lub notatki przesuwa `updatedAt`, wydłużając przechowywanie.
- [REKOMENDACJA]
  1. W `cleanup()` usuwać zapytania **każdego statusu** z `createdAt < cutoff` (zgodnie z polityką), np.
     `db.inquiry.deleteMany({ where: { OR: [{ status: "CLOSED", updatedAt: { lt: cutoff } }, { createdAt: { lt: cutoff } }] } })`.
  2. Krótsza retencja samego adresu: w `cleanup()` dla `type: "PREMIUM"` zamkniętych ponad N dni (propozycja 30, DO UZUPEŁNIENIA
     przez właściciela) usuwać klucz „Adres odbioru” z `data` (aktualizacja JSON z zachowaniem reszty pól) albo zrobić to od razu
     przy zmianie statusu na `CLOSED` w `updateInquiry` (`src/app/admin/(panel)/zapytania/actions.ts:16-21`).
  3. Test jednostkowy/integracyjny w `tests/integration` na obie reguły; poprawić `SECURITY.md:76` i polityka `:62`.

**W3. Imię z formularza może wstrzyknąć do maila warsztatu klikalny przycisk „Otwórz” z dowolnym URL (istniejące wcześniej, dotyczy też Premium).**
- [FAKT] `name` jest walidowane tylko długością i `trim()`, bez zakazu znaków nowej linii: `src/lib/validation.ts:5-10,102`.
- [FAKT] `{{imie}}` trafia do treści szablonu `workshop_inquiry` (`src/lib/email/templates.ts:107`); w treści (inaczej niż w temacie,
  `notify.ts:36`) znaki `\n` nie są usuwane (`notify.ts:32`).
- [FAKT] `renderHtml` zamienia każdą linię będącą samym `https?://\S+` na stylizowany przycisk: `templates.ts:148-152`.
- [ZAŁOŻENIE] Żądanie wysłane z pominięciem przeglądarki (imię `"Jan\n\nhttps://zly.example/x"`) da w mailu do warsztatu
  markowy przycisk do strony atakującego – wektor phishingu na właściciela (np. fałszywe logowanie do panelu). Przejście
  antyspamu jest możliwe (token z publicznej strony), limit 5/10 min na IP ogranicza skalę, nie sam atak.
- [REKOMENDACJA] (a) w `fillTemplate`/`sendTemplate` oczyszczać wartości zmiennych z `\r\n  ` (zamiana na spację) dla
  zmiennych pochodzących od klienta (`imie`, `pojazd`, `powod` zostawić wieloliniowe świadomie); (b) w `text()` dla pól
  jednoliniowych dodać `.regex(/^[^\r\n\u0000-\u001f]*$/)`; (c) test jednostkowy `renderHtml(fillTemplate(...))` z imieniem
  zawierającym URL po nowej linii.

### DROBNE

**D1. Cofnięcie kodu po przyjęciu zgłoszeń PREMIUM złamie panel zapytań.**
- [FAKT] Wartości enuma nie da się usunąć; komentarz migracji to opisuje: `prisma/migrations/20261115100000_inquiry_type_premium/migration.sql:3`.
- [ZAŁOŻENIE] Po rollbacku aplikacji do `main` (stary klient Prisma i `INQUIRY_TYPE_LABEL` bez `PREMIUM`) odczyt wiersza `type=PREMIUM`
  w `zapytania/page.tsx` i eksporcie CSV zakończy się błędem deserializacji/`undefined` etykiety.
- [REKOMENDACJA] Dopisać do README (sekcja Premium) procedurę cofnięcia: przed rollbackiem kodu wyeksportować i usunąć lub
  przepisać zgłoszenia `PREMIUM` (np. `UPDATE "Inquiry" SET type='CONTACT' WHERE type='PREMIUM'`), wartość enuma zostawić.

**D2. Brak testu odmowy dla pracownika przy `savePremium`.**
- [FAKT] Ochrona istnieje (`owner: true`), ale testy Premium sprawdzają tylko ścieżkę właściciela: `tests/e2e/02b-premium.spec.ts:45-53`,
  `tests/integration/premium.test.ts` (brak przypadku `EMPLOYEE`).
- [REKOMENDACJA] Test integracyjny: sesja `EMPLOYEE` → `savePremium` rzuca/przekierowuje i `Settings` bez zmian, brak wpisu `settings.premium`.

**D3. `sendPremiumInquiry` sprawdza flagę przed limitem IP.**
- [FAKT] Odczyt `Settings` i odpowiedź „niedostępne” następują przed `rateLimitByIp`: `src/app/(public)/actions.ts:76-79`.
- [ZAŁOŻENIE] Jedno zapytanie po kluczu głównym na żądanie – ryzyko obciążenia znikome; odnotowane dla spójności.
- [REKOMENDACJA] Opcjonalnie przenieść sprawdzenie flagi do callbacku po limicie (np. parametr `guard` w `handleInquiry`).

**D4. Sitemap zależy teraz od bazy.**
- [FAKT] `sitemap()` wykonuje zapytanie do `Settings`: `src/app/sitemap.ts:22`.
- [ZAŁOŻENIE] Przy niedostępnej bazie `/sitemap.xml` zwróci 500 zamiast listy stron statycznych.
- [REKOMENDACJA] `try/catch` z powrotem do `PAGES` bez `/premium`.

**D5. Nieścisłość w `SECURITY.md` pkt 17.**
- [FAKT] `SECURITY.md:76` – „automatycznej retencji zapytań nadal brak”; faktycznie jest retencja dla `CLOSED` (`maintenance.ts:98`).
- [REKOMENDACJA] Zmienić na: „zamknięte zapytania są usuwane po `retentionMonths` od ostatniej zmiany; otwarte – bez limitu (patrz W2)”.

## Podsumowanie dla właściciela

Kod Premium można wdrożyć z wyłączoną flagą. Przed włączeniem oferty w panelu: uzupełnić politykę prywatności (W1),
ustalić i wdrożyć retencję adresu odbioru (W2) oraz – niezależnie od Premium – zabezpieczyć maile warsztatu przed
wstrzyknięciem linku przez imię (W3).
