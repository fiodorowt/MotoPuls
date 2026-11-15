# Przegląd bezpieczeństwa: poprawki W2 i W3 (gałąź `mp/fix-inquiry-retention-and-mail-injection`)

Data: 2026-11-15. Zakres: `git diff main...HEAD` (commit `5f94f50`), odniesienie: `docs/audyt/bezpieczenstwo-etap-3.md` (W2, W3, D5).
Tryb: tylko odczyt kodu, bez E2E, bez dostępu do bazy produkcyjnej.

## Werdykt

**WDRAŻAĆ MOŻNA.** Brak ustaleń blokujących. W3 jest zamknięte dla wszystkich ścieżek, którymi dane klienta trafiają do
treści maili dziś, z jedną luką „w głąb” (W-A: zmienna `lista` dla danych zapisanych przed poprawką). W2 realizuje obie
reguły z rekomendacji i jest zgodne z polityką prywatności. Zalecane drobne poprawki można zrobić w kolejnym commicie.

## Wyniki poleceń

- [FAKT] `npm run lint`: 0 błędów; `npm run typecheck`: bez błędów.
- [FAKT] `npm test`: 7 plików, 71 testów, wszystkie przechodzą (w tym `tests/unit/mail-injection.test.ts`).
- [FAKT] `npm run test:int`: 8 plików, 94 testy, wszystkie przechodzą (w tym `tests/integration/inquiry-retention.test.ts`), na jednorazowej bazie (port 54331, `vitest.integration.config.ts:8`).
- E2E nie uruchamiano (zgodnie z poleceniem).

## (1) W3: ścieżki danych klienta do maili

| Zmienna / pole | Źródło | Ochrona po poprawce |
| --- | --- | --- |
| `imie` (wszystkie szablony rezerwacji, `workshop_inquiry`) | formularze publiczne, panel | [FAKT] walidacja `text()` z `SINGLE_LINE` (`src/lib/validation.ts:6-17,75,101,108`) + `sanitizeVars` w `sendTemplate` (`src/lib/email/notify.ts:29`) |
| `pojazd` (make/model/plate) | kreator rezerwacji, floty w panelu | [FAKT] `vehicleSchema.make/model` jednoliniowe (`validation.ts:64-65`), floty używają tych samych pól (`src/app/admin/(panel)/floty/actions.ts:39-40`), plate tylko `[A-Z0-9]`; + `sanitizeVars` |
| `uslugi`, `status`, `termin`, `link`, `anulowanie_do`, `firma/adres/telefony` | panel/ustawienia/kod | dane właściciela lub generowane; + `sanitizeVars` |
| `powod` (wyjątek wieloliniowy) | tylko pracownik przy odrzuceniu | [FAKT] akcja spłaszcza białe znaki `replace(/\s+/g, " ")` (`src/app/admin/(panel)/rezerwacje/actions.ts:39-43`); klient anulując nie podaje powodu (`src/lib/booking.ts:318`); w mailu poprzedzone „Powód: ” (`notify.ts:61`), więc nigdy nie jest linią z samym URL |
| `lista` (wyjątek wieloliniowy) | digest PENDING: data, make/model, nazwy usług, URL panelu | [FAKT] składana bez oczyszczania make/model (`notify.ts:121-126`); patrz W-A |
| Firma, część, wiadomość, NIP, adres odbioru | formularze zapytań | [FAKT] nie trafiają do maila: `notifyInquiry` przekazuje tylko `name` (`src/app/(public)/actions.ts:50`, `notify.ts:99-107`) |
| Temat | szablon + zmienne | [FAKT] zmienne już oczyszczone, dodatkowo usuwanie `\r\n` i obcięcie do 200 (`notify.ts:37`) |
| From / Reply-To / To | env / brak / e-mail klienta | [FAKT] `from: env().MAIL_FROM`, brak Reply-To (`src/lib/email/send.ts:50-55`); `to` przechodzi `z.email()` (`validation.ts:31-35`) – brak wektora wstrzyknięcia nagłówków |
| Treść text i HTML | ta sama `text` | [FAKT] oba warianty z tego samego oczyszczonego tekstu (`notify.ts:33,38`); HTML escapowany linia po linii (`templates.ts:159-172`) |
| Załącznik ICS | services, vehicle, link | [FAKT] `escapeText` zamienia `\n` na `\\n` (`src/lib/email/ics.ts:18-20`) |

- [FAKT] `renderHtml` nadal zamienia na przycisk każdą linię będącą samym `https?://\S+` (`templates.ts:164-169`). Po poprawce
  takie linie mogą pochodzić tylko z: treści szablonów (edytuje właściciel w panelu, zaufane), zmiennej `link` (generowana),
  zmiennej `lista` (URL-e panelu celowo, oraz W-A).

## (2) W2: surowy SQL i usuwanie adresu odbioru

- [FAKT] Implementacja nie używa operatora JSONB `-`: wiersze są czytane przez Prisma, klucz usuwany w JS, a całe `data`
  zapisywane `UPDATE "Inquiry" SET "data" = ${JSON.stringify(rest)}::jsonb WHERE id = ${id}` (`src/lib/maintenance.ts:116-127`).
- [FAKT] SQL injection: brak. `$executeRaw` z szablonem tagowanym parametryzuje obie wartości; nazwa tabeli/kolumny stała
  i zgodna z modelem (`prisma/schema.prisma:397-409`, brak `@@map`).
- [FAKT] Usuwany jest tylko klucz „Adres odbioru”, pozostałe pola zostają (test: `inquiry-retention.test.ts:67`); klucz zgodny
  z miejscem zapisu (`src/app/(public)/actions.ts:85`, `maintenance.ts:90`). Wiersze z `data = null`/tablicą/bez klucza są pomijane.
- [FAKT] WHERE: `type: "PREMIUM", status: "CLOSED", updatedAt < now − 30 dni` (`maintenance.ts:118`); test potwierdza, że
  PREMIUM IN_PROGRESS i CONTACT CLOSED zachowują klucz (`inquiry-retention.test.ts:68-70`).
- [FAKT] `updatedAt` nie jest przesuwany (Prisma `@updatedAt` ustawia klient, nie trigger; surowy UPDATE go nie dotyka).
- Transakcyjność: każdy UPDATE jest niezależny i idempotentny; przerwanie w połowie zostawia resztę na kolejne uruchomienie (akceptowalne). Patrz D-B (wyścig odczyt-zapis, wydajność).

## (3) Retencja zapytań w toku

- [FAKT] Nowa reguła: `OR: [{ status: "CLOSED", updatedAt < cutoff }, { createdAt < cutoff }]` (`maintenance.ts:108-110`).
  Gałąź CLOSED jest logicznie zawarta w gałęzi `createdAt` (updatedAt ≥ createdAt), więc efektywnie decyduje `createdAt`.
- [FAKT] Polityka: „do czasu załatwienia sprawy, nie dłużej niż {retentionMonths} miesięcy” (`src/app/(public)/polityka-prywatnosci/page.tsx:62`) – reguła jest zgodna.
- [FAKT] `retentionMonths` to `Int NOT NULL DEFAULT 36` (`prisma/schema.prisma:344`), panel ogranicza do 6–120 (`src/app/admin/(panel)/ustawienia/actions.ts:48`). Wartość 0/null nie jest osiągalna przez aplikację, więc ryzyko usunięcia wszystkiego naraz nie występuje (D-D: brak strażnika w samym `cleanup`).
- [ZAŁOŻENIE] Zapytanie otwarte dłużej niż 36 miesięcy jest praktycznie porzucone; ryzyko „zbyt wczesnego” usunięcia sprawy w toku jest pomijalne przy minimum 6 miesięcy.

## (4) Regresje walidacji

- [FAKT] `SINGLE_LINE = /^[^\u0000-\u001f\u007f]*$/` (`validation.ts:6`) blokuje tylko C0 i DEL; apostrof, myślnik, spacje, polskie litery
  (ą, ę, ł, ż…) przechodzą. Regex działa po `trim()`, więc końcowa nowa linia z formularza jest akceptowana (test `vehicle: "Audi A4\n"`).
- [FAKT] `phoneSchema` bez zmian: usuwa spacje, myślniki i nawiasy, dopuszcza `+` (`validation.ts:26-29`).
- [FAKT] Wszystkie pola `textarea` w formularzach publicznych (`InquiryForms.tsx:58,84,101-108,145`, `BookingWizard.tsx:332-336`) mapują
  na schematy oznaczone `multiline: true`; pole adresu odbioru to `Field` jednoliniowy (`InquiryForms.tsx:124-132`) – brak regresji UX.
- [ZAŁOŻENIE] Wewnętrzny tabulator (np. wklejony) w imieniu zostanie odrzucony z czytelnym komunikatem – akceptowalne.

## (5) Testy

- [FAKT] `mail-injection.test.ts` dowodzi działania `sanitizeVars` + `renderHtml` i walidacji, ale wywołuje `sanitizeVars` ręcznie
  (`tests/unit/mail-injection.test.ts:9`). Nie dowodzi, że `sendTemplate` go używa (usunięcie linii `notify.ts:29` nie zepsuje testu). Patrz D-C.
- [FAKT] `inquiry-retention.test.ts` dowodzi obu reguł retencji i selektywności kasowania klucza. Nie sprawdza zachowania `updatedAt`
  po kasowaniu adresu. Test gałęzi CLOSED (`:49-55`) używa `updatedAt` starszego niż `createdAt` (stan nierealny), co jest dopuszczalne jako test reguły.

## Ustalenia

### BLOKUJĄCE
Brak.

### WAŻNE

**W-A. Zmienna `lista` w mailu zbiorczym nie jest oczyszczana z nowych linii w make/model (dane sprzed poprawki).**
- [FAKT] `lista` jest wyłączona z `sanitizeVars` (`templates.ts:126`), a składana z `b.vehicle.make`/`model` bez oczyszczania (`notify.ts:121-126`).
- [FAKT] Przed poprawką `text()` nie blokowało nowych linii, więc pojazdy zapisane wcześniej mogą zawierać `\n` (produkcja działa od etapów 1–3).
- [ZAŁOŻENIE] Rezerwacja PENDING z marką `"X\nhttps://zly.example"` wygenerowałaby w digeście warsztatu przycisk „Otwórz” do dowolnego URL – ten sam wektor co W3. Dla nowych danych zamknięte walidacją.
- [REKOMENDACJA] W `notifyPendingDigest` oczyścić każdy element z danych (`make`, `model`, nazwy usług) tą samą zamianą `[\u0000-\u001f\u007f]` → spacja przed złożeniem listy; test jednostkowy. Opcjonalnie jednorazowe zapytanie liczące (bez wypisywania danych) pojazdów/klientów z `\n` w nazwie na produkcji.

### DROBNE

**D-A. Inne znaki łamania linii i sterujące spoza C0.** `SINGLE_LINE` i `sanitizeVars` nie obejmują U+0085, U+2028/U+2029 ani C1/bidi (np. U+202E)
(`validation.ts:6`, `templates.ts:135`). [FAKT] `renderHtml` dzieli tylko po `\n`, więc nie powstanie przycisk. [ZAŁOŻENIE] W części tekstowej niektóre klienty
pokażą U+2028 jako złamanie linii, a U+202E pozwala odwracać wyświetlany tekst (spoofing). [REKOMENDACJA] Rozszerzyć klasę o `\u0080-\u009f  ‪-‮⁦-⁩`.

**D-B. Kasowanie adresu: odczyt-modyfikacja-zapis zamiast operacji atomowej.** [FAKT] `maintenance.ts:117-127` czyta co uruchomienie wszystkie PREMIUM CLOSED starsze niż 30 dni
(także już oczyszczone, aż do retencji 36 mies.) i nadpisuje całe `data` wartością z JS. [REKOMENDACJA] Jedno zapytanie atomowe:
``UPDATE "Inquiry" SET "data" = "data" - ${KEY} WHERE "type" = 'PREMIUM' AND "status" = 'CLOSED' AND "updatedAt" < ${cutoff} AND "data" ? ${KEY}``
(parametryzowane, nie zmienia `updatedAt`, korzysta z wolumenu małego, bez wyścigu z równoległą edycją).

**D-C. Test W3 nie obejmuje `sendTemplate`.** [REKOMENDACJA] Test integracyjny `notifyInquiry("CONTACT", "Jan\n\nhttps://zly.example")` z odczytem `.mail-outbox` (lub mock `sendMail`) i asercją braku `href="https://zly.example` w `html`.

**D-D. Brak strażnika `retentionMonths` w `cleanup`.** [FAKT] Ograniczenie 6–120 jest tylko w akcji panelu (`ustawienia/actions.ts:48`); bezpośrednia zmiana w bazie na 0 usunęłaby wszystkie zapytania przy następnym cronie.
[REKOMENDACJA] `if (settings.retentionMonths < 1) return`-podobny strażnik dla gałęzi zapytań (i anonimizacji).

**D-E. Brak wpisu w `AuditLog` dla automatycznego usuwania.** [REKOMENDACJA] Jeden wpis `system`/`inquiry.retention` z liczbą usuniętych i oczyszczonych (bez danych osobowych), dla rozliczalności RODO.

**D-F. Test retencji nie sprawdza `updatedAt` po kasowaniu adresu.** [REKOMENDACJA] Asercja, że `updatedAt` wiersza `stale` jest równe ustawionemu przed `cleanup()`.

## Poza zakresem (przypomnienie)
- [FAKT] W1 (polityka bez formularza Premium i adresu odbioru) nadal otwarte: `polityka-prywatnosci/page.tsx:39-43`; należy zamknąć przed włączeniem flagi `premiumPickupEnabled`, łącznie z informacją o 30 dniach dla adresu.
- [FAKT] D5 zamknięte: opis w `SECURITY.md` pkt 17 odpowiada nowemu zachowaniu.
