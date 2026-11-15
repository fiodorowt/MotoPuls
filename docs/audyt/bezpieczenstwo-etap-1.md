# Przegląd bezpieczeństwa i prywatności – etap 1 (rezerwacje, fundament)

Gałąź: `mp/etap-1-rezerwacje-fundament`, zakres: `git diff main...HEAD` poza `docs/` (43 pliki).
Tryb: tylko odczyt kodu, bez uruchamiania aplikacji i bez połączeń z produkcją. Punkt odniesienia: `SECURITY.md` (ryzyka 1–16;
nowe pozycje 14–16 dopisane w tym etapie nie są tu powtarzane jako nowe ustalenia).

## Werdykt

**WDRAŻAĆ MOŻNA** – brak ustaleń blokujących. Ustalenie W1 (powód odrzucenia zostaje w dzienniku po anonimizacji)
warto poprawić przed albo zaraz po wdrożeniu; pozostałe to drobne utwardzenia.

## Ustalenia

### BLOKUJĄCE

Brak.

### WAŻNE

**W1. Powód odrzucenia trafia do `AuditLog.details` i nie znika przy anonimizacji klienta.**
- [FAKT] `src/lib/booking.ts:279` zapisuje `details: { to, reason }` dla `booking.reject` (i dla każdego `CANCELLED` z powodem).
- [FAKT] `src/lib/maintenance.ts:51` zeruje `Booking.cancelReason`, ale nie rusza `AuditLog`; `cleanup()` (`src/lib/maintenance.ts`, koniec pliku)
  nie usuwa starych wpisów dziennika, więc tekst zostaje bezterminowo. Dziennik jest widoczny tylko dla właściciela
  (`src/app/admin/(panel)/dziennik/page.tsx:12`, `requireOwner`).
- [FAKT] `SECURITY.md` pkt 15 mówi, że pole jest zerowane przy anonimizacji – to prawda tylko dla kolumny w `Booking`, kopia w dzienniku zostaje.
  Pole to wolny tekst pracownika; formularz prosi o niewpisywanie danych osobowych, ale tego nie wymusza.
- Skutek: [ZAŁOŻENIE] jeśli pracownik wpisze w powodzie dane osobowe, anonimizacja (RODO, art. 17) jest niepełna.
- [REKOMENDACJA] Najprostsze: w `changeBookingStatus` zapisywać w dzienniku tylko `{ to, hasReason: true }` (treść jest w `Booking.cancelReason`
  i w wysłanym mailu). Alternatywa: w `anonymizeCustomer` czyścić `details.reason` we wpisach `AuditLog` z `entity = "Booking"` i `entityId`
  w rezerwacjach klienta. Po zmianie poprawić `SECURITY.md` pkt 15 i dodać test integracyjny (anonimizacja → brak powodu w dzienniku).

### DROBNE

**D1. `GET /api/health` publicznie ujawnia stan poczty.**
- [FAKT] `src/app/api/health/route.ts:8` zwraca `mail: "ok" | "outbox" | "disabled"` bez uwierzytelnienia. Nie ujawnia hosta, użytkownika
  ani adresów (`src/lib/email/status.ts:4-6`), więc to nie jest wyciek konfiguracji ani sekretów.
- [ZAŁOŻENIE] Wartość `disabled` mówi postronnym, że maile (w tym reset hasła i potwierdzenia) nie wychodzą – informacja pomocna np. przy
  próbach podszywania się pod warsztat. Ryzyko niskie.
- [REKOMENDACJA] Zostawić publicznie tylko `status`, a `mail` zwracać wyłącznie przy nagłówku `Authorization: Bearer <CRON_SECRET>`
  (istniejący mechanizm porównania w stałym czasie z `src/lib/cron.ts`) albo przenieść do trasy cron. Komunikat na pulpicie właściciela
  (`src/app/admin/(panel)/page.tsx:64`) wystarcza do diagnozy.

**D2. Wyścig w `rejectBooking`: odrzucenie może anulować rezerwację potwierdzoną w międzyczasie.**
- [FAKT] `src/lib/booking.ts:296` sprawdza `PENDING` poza transakcją, a `changeBookingStatus` (`src/lib/booking.ts:297` → transakcja) czyta status
  na nowo i dopuszcza przejście `CONFIRMED → CANCELLED`. Przy równoległym „Potwierdź” i „Odrzuć” klient potwierdzonej wizyty może dostać
  mail o odrzuceniu z powodem. Nie jest to obejście uprawnień (obie akcje wymagają `requireUser`), tylko integralność danych.
- [REKOMENDACJA] Przekazać do `changeBookingStatus` opcję `expectedFrom: "PENDING"` sprawdzaną wewnątrz transakcji (w `updateMany` jest już
  warunek na poprzedni status, wystarczy porównać z oczekiwanym).

**D3. `TRUNCATE` w helperze testów integracyjnych bez strażnika bazy.**
- [FAKT] `tests/integration/helpers.ts:11` czyści m.in. `Customer`, `Booking`, `AuditLog`. Adres bazy jest ustawiony na sztywno na
  `localhost:54331` (`vitest.integration.config.ts`, sekcja `test.env`), a baza powstaje w `tests/integration/global-setup.ts`, więc dziś
  nie ma ścieżki do produkcji.
- [REKOMENDACJA] Obrona w głąb: na początku `resetData()` sprawdzić, że `DATABASE_URL` wskazuje `localhost:54331`, inaczej rzucić błąd.

**D4. `.dockerignore` nie obejmuje nowych katalogów baz testowych.**
- [FAKT] `.gitignore` ma teraz `.pgdata-e2e*/` i `.pgdata-int/`, a `.dockerignore:8-9` tylko `.pgdata` i `.pgdata-e2e`. Przy lokalnym
  `docker build` katalogi typu `.pgdata-e2e-2` lub pozostawiona `.pgdata-int` trafią do kontekstu i etapu `builder` (`COPY . .`, `Dockerfile:14`).
  Do obrazu końcowego nie przechodzą (kopiowany jest tylko `standalone`, `static`, `public`). Dane w nich są testowe.
- [REKOMENDACJA] Dopisać `.pgdata-e2e*` i `.pgdata-int` do `.dockerignore`.

**D5. Wyjątek CSP w teście responsywności jest szeroki.**
- [FAKT] `tests/e2e/04-responsive.spec.ts:29-30` ignoruje każdy błąd konsoli zawierający `style-src` na `/`.
- Ocena: to **hałas, nie luka** – [FAKT] produkcyjna polityka (`src/proxy.ts:16`) to `style-src 'self' 'nonce-…'` bez `unsafe-inline`,
  a komunikat oznacza, że przeglądarka **zablokowała** styl, czyli CSP działa. Komponenty nie mają atrybutów `style=` (grep `src/**/*.tsx`).
  [ZAŁOŻENIE] źródłem jest styl wstrzykiwany przez framework lub bibliotekę na stronie głównej; skutek co najwyżej kosmetyczny.
  Ryzyko: szeroki filtr może ukryć przyszłą, inną regresję CSP na `/`.
- [REKOMENDACJA] Zawęzić filtr do dokładnej treści znanego komunikatu (np. konkretny hash lub element) i dopisać zadanie w backlogu na
  znalezienie źródła. Nie dodawać `unsafe-inline`; jeśli styl jest potrzebny, użyć nonce lub `style-src-attr` z hashem.

## Sprawdzone bez uwag

| Obszar | Wynik |
| --- | --- |
| Sekrety w kodzie i historii | [FAKT] W diffie tylko wartości testowe dla jednorazowych baz na `localhost` (`tests/e2e/db.ts:9`, `tests/integration/global-setup.ts`, `vitest.integration.config.ts`); w całej historii Git dodany był tylko `.env.example` (same placeholdery). Skan wzorców kluczy (AWS/GitHub/Slack/Stripe) na gałęzi: 0. Brak nowych zmiennych środowiskowych, `src/lib/env.ts` i `.env.example` bez zmian. |
| Autoryzacja nowych akcji | [FAKT] `rejectPendingBooking` i `rescheduleBooking` przez `runAction` → `requireUser` (`src/lib/admin/run.ts:25`); `moveBookingTo`/`moveBookingToDay` przez `runMove` → `requireUser` (`src/app/admin/(panel)/rezerwacje/actions.ts:89`); `pendingReminderHours` tylko w `saveBookingConfig` z `owner: true` (`src/app/admin/(panel)/ustawienia/actions.ts:52`). |
| `force` przy przenoszeniu | [FAKT] Dostępne dla każdego zalogowanego pracownika z 2FA – zgodne z decyzją D-19 a (`SECURITY.md` pkt 16). Argument akcji rzutowany ściśle (`force === true`, `actions.ts`), z formularza przez `f.checkbox`. Zdarzenie w `AuditLog` z `outsideHours` i listą ostrzeżeń (`src/lib/booking.ts`, `booking.move`). Nowe ryzyko nie powstaje. |
| AuditLog | [FAKT] `booking.reject` (z powodem – patrz W1), `booking.move` z `outsideHours`, `booking.pending_digest` (tylko liczba i próg, bez danych osobowych). |
| Walidacja i XSS | [FAKT] Powód: Zod `max(300)`, zwijanie białych znaków do jednej linii (`actions.ts`, `rejectSchema`). HTML maila escapowany (`src/lib/email/templates.ts:129-157`); linia z powodem ma prefiks `Powód: `, więc nie zamieni się w przycisk-link. Temat maila czyszczony z `\r\n` (`src/lib/email/notify.ts:36`), a powód i tak nie występuje w temacie. Panel renderuje powód przez React (`rezerwacje/[id]/page.tsx:109`). Strona klienta `rezerwacja/[token]` powodu nie wyświetla. |
| Lista do warsztatu (MP-012) | [FAKT] `notifyPendingDigest` zawiera termin, markę/model, usługi i link do panelu (ID rezerwacji, nie token klienta); bez imion, telefonów i e-maili (`src/lib/email/notify.ts`). Wywołanie tylko z trasy cron z sekretem. |
| Logi | [FAKT] Jedyny nowy log: `src/lib/email/send.ts` – jednorazowe ostrzeżenie bez adresów i treści. |
| Anonimizacja | [FAKT] `cancelReason` zerowany (`src/lib/maintenance.ts:51`); wyjątek – kopia w dzienniku (W1). |
| Migracje | [FAKT] Obie addytywne, kolumny opcjonalne lub z wartością domyślną, z instrukcją cofnięcia w komentarzu (`prisma/migrations/20261113170000_booking_cancel_reason`, `20261113180000_pending_reminder`). Schemat: poza trzema polami tylko wyrównanie białych znaków. |
| Helpery testowe (sesje w bazie) | [FAKT] `tests/e2e/db.ts` łączy się wyłącznie z `localhost:${E2E_DB_PORT}`, nie jest importowany z `src/`, katalog `tests` jest w `.dockerignore`. W `src/` brak przełączników typu „tryb testowy” omijających logowanie (grep `E2E`, `NODE_ENV.*test`). Nie może trafić na produkcję. |
| Trasa `(public-detail)` | [FAKT] Ta sama strona (zmiana nazwy pliku, 0 linii różnicy), zachowane `noindex`, `no-referrer`, limit na IP; `no-store` dziedziczony z układu publicznego. |
| Zależności | [FAKT] `npm audit --omit=dev`: 0 podatności (13.11.2026). |

## Aktualizacje dokumentów po poprawkach

- `SECURITY.md` pkt 15: doprecyzować los powodu w dzienniku (po W1).
- `SECURITY.md` pkt 14: dopisać, że flaga `mail` w `/api/health` jest publiczna (albo że wymaga sekretu, po D1).
