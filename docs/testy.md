# Plan testów Moto Puls

Data: 2026-11-13. Powiązanie: kryteria akceptacji w `docs/backlog.md`. Wyniki wykonania dopisuje `mp-tester` w sekcji „Wyniki" (PASS/FAIL, komenda, skrócone wyjście).
Zasada 5 CLAUDE.md: wyłącznie dane testowe, jednorazowa baza, poczta do `.mail-outbox`, SMS do `.sms-outbox` (mock). Nigdy produkcja, prawdziwi klienci, prawdziwe SMS-y.

## Poziomy i narzędzia

| Poziom | Narzędzie | Gdzie | Baza | Komenda | Stan |
|---|---|---|---|---|---|
| Jednostkowe | Vitest | `tests/unit/**/*.test.ts` | brak | `npm test` | [FAKT] 3 pliki, 54 testy zielone (kod.md D3) |
| Integracyjne | Vitest (osobny projekt) | `tests/integration/**/*.test.ts` | embedded-postgres, jednorazowa, migracje + seed (port 54331) | `npm run test:int` | [FAKT] zrobione (MP-006): `vitest.integration.config.ts`, baza na porcie 54331, `.pgdata-int` usuwany po teście; poczta przechwytywana w pamięci (`tests/integration/mail.ts`) |
| E2E | Playwright | `tests/e2e/*.spec.ts`, wspólne `shared.ts` | `scripts/e2e-server.ts` (embedded-postgres, port 3100, `SMTP_HOST=""`) | `npm run test:e2e` | [FAKT] 2 pliki; `workers: 1`, kolejność ma znaczenie |
| Statyczne | ESLint, tsc, build | — | — | `npm run lint`, `typecheck`, `build` | [FAKT] zielone 2026-11-13 |
| Wydajność | Lighthouse CLI, curl | — | produkcja tylko do odczytu (GET) | ręcznie | DO ZROBIENIA (MP-004, MP-043) |

Zasady pisania:
- Czas: `vi.setSystemTime` lub wstrzyknięte `now`; strefa zawsze `Europe/Warsaw` (`src/lib/time.ts`), asercje na UTC w bazie.
- Współbieżność: `Promise.allSettled` na prawdziwej bazie (nie na mockach Prisma), asercje na liczbie wierszy `Booking`/`BookingSlot`.
- Izolacja integracyjnych: czyszczenie tabel transakcyjnych przed każdym plikiem; ustawienia (`Settings`) przywracane po teście.
- E2E: nowe scenariusze z unikalnymi danymi (np. numer rejestracyjny z losowym sufiksem), niezależne od kolejności tam, gdzie to możliwe.
- Logi testów bez prawdziwych danych osobowych; dane fikcyjne w domenie `.test`.

## T1. Współbieżność i kolizje rezerwacji (MP-007)

| ID | Warunek | Kroki | Oczekiwany wynik | Poziom |
|---|---|---|---|---|
| T1.1 | `bays=2`, wolny termin | 5 równoległych `createBooking` (ONLINE) na ten sam start | Dokładnie 2 sukcesy (stanowiska 1 i 2), 3× `SlotTakenError`; liczba `BookingSlot` = 2 × liczba odcinków | integracyjny |
| T1.2 | `bays=1` | 2 równoległe: online + ręczna (ADMIN) | 1 sukces, 1 błąd; brak osieroconych `Booking` | integracyjny |
| T1.3 | Wizyty A (10:00) i B (12:00) na stanowisku 1, `bays=1` | `moveBooking(B → 10:00)` | `BookingError`/`SlotTakenError`; B ma stare odcinki bez zmian | integracyjny |
| T1.4 | Wizyta 10:00, `bays=1` | `createBlock` 9:00-11:00 | Czytelny błąd kolizji; brak bloku | integracyjny |
| T1.5 | Blokada 9:00-11:00 | `createBooking` na 10:00 (ADMIN i ONLINE) | Odrzucone; ONLINE nie widzi terminu w `availableStarts` | integracyjny |
| T1.6 | Wizyta trwająca kilka odcinków 15 min | Równoległe rezerwacje częściowo nachodzące (start +15 min) | Najwyżej tyle, ile stanowisk; brak częściowych zapisów | integracyjny |

## T2. Statusy i przejścia (MP-008, MP-011)

| ID | Warunek | Kroki | Oczekiwany wynik | Poziom |
|---|---|---|---|---|
| T2.1 | `autoConfirm=false` | Rezerwacja ONLINE | Status PENDING, mail `booking_received` w outbox, sloty zajęte | integracyjny + E2E |
| T2.2 | `autoConfirm=true` | Rezerwacja ONLINE | CONFIRMED, mail `booking_confirmed` z `.ics` | integracyjny |
| T2.3 | — | Rezerwacja ADMIN | CONFIRMED | integracyjny |
| T2.4 | Każda para statusów | `changeBookingStatus(from → to)` | Dozwolone wg `BOOKING_TRANSITIONS` (`src/lib/labels.ts:18-25`) przechodzą, pozostałe `BookingError`, status bez zmian | integracyjny (tabela parametryczna) |
| T2.5 | PENDING | 2 równoległe zmiany (CONFIRMED i CANCELLED) | Dokładnie jedna przechodzi, druga „zmieniony w międzyczasie" | integracyjny |
| T2.6 | CONFIRMED | CANCELLED lub NO_SHOW | `BookingSlot` usunięte, termin wraca do `availableStarts` | integracyjny |
| T2.7 | `cancelHoursBefore=24` | `cancelByCustomer` przy 24 h 0 min i 23 h 59 min przed | Pierwsze OK, drugie `BookingError` | integracyjny |
| T2.8 | Odrzucenie z powodem (MP-011) | „Odrzuć" PENDING z powodem | CANCELLED, `cancelReason` zapisany, mail z powodem, `AuditLog`, slot wolny | integracyjny + E2E |

## T3. Godziny, dni wolne, strefa i zmiana czasu (MP-008, MP-013, MP-014)
[FAKT] Część pokrywa `tests/unit/slots.test.ts` (czyste funkcje, w tym 25.10.2026 i 28.03.2027). Poniżej dopisujemy brakujące granice na poziomie serwera.

| ID | Warunek | Kroki | Oczekiwany wynik | Poziom |
|---|---|---|---|---|
| T3.1 | Godziny z bazy (np. pn 8:00-17:00; wartości z `OpeningHours`, nie z testu) | Usługa 60 min: start o zamknięcie − 60 min oraz − 45 min | Pierwszy dostępny, drugi nie (wizyta nie wychodzi poza zamknięcie) | jednostkowy + integracyjny |
| T3.2 | Pierwsza minuta | Start dokładnie o otwarciu i 15 min przed | Pierwszy OK, drugi niedostępny | jednostkowy |
| T3.3 | `ClosedDay` i święto (np. 11.11) | `createBooking` ONLINE z ręcznie podanym startem (obejście UI) | Odrzucone przez serwer (`booking.ts:119-133`) | integracyjny |
| T3.4 | Przypomnienia | `sendReminders` o 8:59 i 9:00 Warsaw; drugi raz o 10:00; dzień zmiany czasu (25.10.2026) | Przed 9:00 nic; o 9:00 raz; drugi przebieg nic; poprawna data „jutro" przez zmianę czasu | integracyjny |
| T3.5 | Przeniesienie admina na niedzielę (MP-013) | `moveBooking` bez i z potwierdzeniem | Bez: ostrzeżenie, brak zmiany; z: zapis + `AuditLog` | integracyjny + E2E |
| T3.6 | Zmiana godzin w ustawieniach (MP-014) | Widok tygodnia kalendarza | Okno zgodne z `OpeningHours` | E2E |
| T3.7 | Minimalne wyprzedzenie i horyzont | Start < `minLeadHours` i > `maxDaysAhead` | Niedostępne online | jednostkowy |

## T4. Uprawnienia i widoczność statusu (MP-009)

| ID | Warunek | Kroki | Oczekiwany wynik | Poziom |
|---|---|---|---|---|
| T4.1 | Nowa rezerwacja | Wejście na link klienta | Badge „Oczekuje…", podpowiedź o potwierdzeniu | E2E |
| T4.2 | Link klienta | Anulowanie przez dialog | Badge „Anulowana" bez ręcznego odświeżenia; termin wolny w kreatorze | E2E |
| T4.3 | Konto EMPLOYEE (seed testowy) | Wejście na ustawienia, użytkowników, szablony, eksport; wywołanie akcji `owner: true` | Brak dostępu, brak zmian w bazie | E2E + integracyjny |
| T4.4 | Konto EMPLOYEE | Zatwierdzenie i odrzucenie PENDING | Dozwolone (zgodnie ze zleceniem: pracownik = rezerwacje, kalendarz) | E2E |
| T4.5 | Brak sesji | Wywołanie akcji admina / `/api/cron/*` bez sekretu | Odmowa (istnieje test crona) | E2E |

## T5. Premium (MP-031…MP-035)

| ID | Warunek | Kroki | Oczekiwany wynik | Poziom |
|---|---|---|---|---|
| T5.1 | Istniejące wizyty w dniu D | Zgłoszenie Premium z preferowanym terminem kolidującym w D | Liczba `Booking` i `BookingSlot` bez zmian; `updatedAt` istniejących bez zmian | integracyjny + E2E |
| T5.2 | — | Poprawne zgłoszenie | `Inquiry(type=PREMIUM)`, mail do warsztatu w outbox, widoczne w `zapytania` z filtrem | E2E |
| T5.3 | `premiumPickupEnabled=false` | Formularz | Brak pól odbioru; payload z adresem odrzucony przez serwer | E2E + integracyjny |
| T5.4 | `premiumEnabled=false` | Wejście na `/premium` | 404 lub brak CTA (wg MP-032) | E2E |
| T5.5 | Antyspam | Honeypot wypełniony; > limit zgłoszeń z IP | Odrzucone | integracyjny |
| T5.6 | Responsywność | `/premium` w 390/768/1280 | Brak poziomego przewijania, jeden H1, CTA widoczne | E2E |

## T6. SMS w trybie testowym (MP-024…MP-030)
Zawsze `SMS_PROVIDER=test` lub mock `vi.fn`; żadnego prawdziwego klucza w testach.

| ID | Warunek | Kroki | Oczekiwany wynik | Poziom |
|---|---|---|---|---|
| T6.1 | `SMS_ENABLED=true`, zgoda | Zatwierdzenie PENDING | Dokładnie 1 wywołanie dostawcy, `SmsLog` SENT, numer zmaskowany w logu | integracyjny + E2E (`.sms-outbox`) |
| T6.2 | `SMS_ENABLED=false` | Zatwierdzenie | 0 wywołań | integracyjny |
| T6.3 | Brak zgody | Zatwierdzenie | 0 wywołań, `SmsLog` SKIPPED lub brak | integracyjny |
| T6.4 | Równolegle | 2× zatwierdzenie / zatwierdzenie + `autoConfirm` | 1 SMS (unikalność `(bookingId, kind)`) | integracyjny |
| T6.5 | Dostawca rzuca błąd | Zatwierdzenie | Status CONFIRMED zostaje; `SmsLog` FAILED; `maintenance` ponawia maks. 3 razy | integracyjny |
| T6.6 | Limit = N, wysłano N w bieżącym miesiącu | Zatwierdzenie | SKIPPED + ostrzeżenie dla właściciela; licznik zeruje się 1. dnia miesiąca (Warsaw) | integracyjny |
| T6.7 | Numer | `+48 881 765 880`, `881765880`, `0048…`, numer zagraniczny/niepoprawny | Normalizacja do +48 lub błąd walidacji wg schematu | jednostkowy |
| T6.8 | Szablon | Treść z polskimi znakami | Licznik segmentów UCS-2; po transliteracji GSM-7 (wg D-24) | jednostkowy |
| T6.9 | Uprawnienia | EMPLOYEE próbuje ponowić SMS | Odmowa; OWNER może, z `AuditLog` | E2E |

## T7. Panel klienta (MP-050…MP-057)

| ID | Warunek | Kroki | Oczekiwany wynik | Poziom |
|---|---|---|---|---|
| T7.1 | Klienci A i B | A otwiera adresy/ID wizyt i pojazdów B (URL, akcje serwerowe) | 404/odmowa, brak danych B w odpowiedzi | integracyjny + E2E |
| T7.2 | Link logowania | Użycie drugi raz; po 15 min | Odrzucone | integracyjny |
| T7.3 | E-mail nieistniejący | Prośba o link | Odpowiedź identyczna jak dla istniejącego | E2E |
| T7.4 | Sesja klienta | Wejście na `/admin` | Brak dostępu | E2E |
| T7.5 | Anonimizacja | Klient anonimizowany | Brak logowania, sesje usunięte | integracyjny |
| T7.6 | `RepairRecord` niewidoczny | Klient przegląda historię | Rekord niewidoczny | E2E |

## T8. Frontend i SEO (MP-017…MP-021, MP-037…MP-049)

| ID | Kroki | Oczekiwany wynik | Poziom |
|---|---|---|---|
| T8.1 | 10 stron publicznych × 390/768/1280 | `scrollWidth == clientWidth`, jeden H1, CTA widoczne, brak błędów konsoli | E2E (pętla) |
| T8.2 | Kreator: „Dalej" z pustym wymaganym polem (390 px) | Fokus na pierwszym `[aria-invalid=true]` | E2E |
| T8.3 | Kreator: 500 przy pierwszym pobraniu terminów (`page.route`) | Przycisk „Spróbuj ponownie" → terminy | E2E |
| T8.4 | Baner cookies przy 390x844 | Wysokość ≤ 25% widoku, fokus na banerze | E2E |
| T8.5 | Title/description wszystkich stron | Title ≤ 60, description 140-160 znaków | E2E |
| T8.6 | `/uslugi/[slug]` znany/nieznany | 200 + canonical / 404 | E2E |
| T8.7 | Analityka (jeśli MP-047) | Przed zgodą zero żądań do domen analityki; CSP przy fladze `false` identyczny jak dziś | E2E (`page.on('request')`) |
| T8.8 | Kontrast | Pary `muted/surface-2`, `disabled` | jednostkowy (`contrast.test.ts`) |
| T8.9 | Zimny start (MP-004) | 3× pierwsze żądanie po > 20 min bezczynności | TTFB < 2 s (zapis wyników) | ręcznie (curl) |

## Regresja (każdy etap)
Istniejące `01-booking.spec.ts` (przepływ 5 kroków, `.ics`, CSP, token nieistniejący, cron bez sekretu) i `02-admin.spec.ts` (2FA, zmiana hasła, bramki) muszą pozostać zielone. Plus T8.1.

## Macierz: zadanie → testy

| Zadania | Testy |
|---|---|
| MP-006, MP-007 | T1.1-T1.6 |
| MP-008 | T2.1-T2.7, T3.1-T3.4, T3.7 |
| MP-009 | T4.1-T4.5 |
| MP-011 | T2.8 |
| MP-013, MP-014 | T3.5, T3.6 |
| MP-017, MP-018, MP-019 | T8.2, T8.3, T8.1 |
| MP-004 | T8.9 |
| MP-024…MP-030 | T6.1-T6.9 |
| MP-031…MP-035 | T5.1-T5.6 |
| MP-037, MP-039, MP-041, MP-047, MP-049 | T8.5, T8.4, T8.6, T8.7, T8.8 |
| MP-050…MP-057 | T7.1-T7.6 |

## Pokrycie etapu 1 (implementacja `mp-rezerwacje`)

| Zadanie | Testy | Gdzie |
|---|---|---|
| MP-006, MP-007 | T1.1-T1.6 | `tests/integration/concurrency.test.ts` |
| MP-008 | T2.1-T2.7, T3.1, T3.3, T3.4 | `tests/integration/status.test.ts` (T3.2 i T3.7 pokrywa `tests/unit/slots.test.ts`) |
| MP-011 | T2.8 | `tests/integration/reject.test.ts`, E2E `03-booking-flows.spec.ts` |
| MP-012 | (bez numeru w planie) przypomnienie o PENDING | `tests/integration/pending-digest.test.ts` |
| MP-013 | T3.5 | `tests/unit/schedule-warnings.test.ts`, `tests/integration/move-warnings.test.ts`, E2E (formularz przeniesienia; przeciąganie w kalendarzu nie ma testu E2E) |
| MP-002 | stan poczty | `tests/unit/mail-status.test.ts` |
| MP-009 | T4.1-T4.4 | `tests/e2e/03-booking-flows.spec.ts` (sesje pracowników z bazy testowej: `tests/e2e/db.ts`) |
| MP-017, MP-018, MP-019 | T8.2, T8.3, loader | `tests/e2e/03-booking-flows.spec.ts` |

Uwaga: `(public)/loading.tsx` powoduje strumieniowanie odpowiedzi ze statusem 200, więc strony wywołujące `notFound()`
(np. `rezerwacja/[token]`, w przyszłości `uslugi/[slug]`) leżą w grupie `(public-detail)`, poza granicą ładowania. Test
"link z nieistniejącym tokenem" (404) pilnuje tego w regresji.

## Wyniki
(uzupełnia `mp-tester` po każdym etapie: data, gałąź, commit, PASS/FAIL per ID, dowody, werdykt)

### Etap 1 (`mp/etap-1-rezerwacje-fundament`, HEAD 603a645 + 2 zmiany testów) - tester niezależny, 2026-11-13

Środowisko: Windows, Node 22, E2E z `E2E_DB_PORT=54353 E2E_DB_DIR=.pgdata-e2e-t2` (porty 54330 i 54342 zajmują niewidoczne procesy-duchy po przerwanych biegach; patrz uwaga niżej).

| Komenda | Wynik |
|---|---|
| `npm run lint` | PASS (0 błędów) |
| `npm run typecheck` | PASS |
| `npm test` | PASS: 5 plików, 62 testy |
| `npm run test:int` | PASS: 5 plików, 76 testów (3 migracje zastosowane na czystej bazie, port 54331) |
| `npm run test:e2e` | PASS: 22/22 (59 s), w tym nowy `02a-mail-warning.spec.ts` |
| `npm run build` | PASS |
| `playwright test tests/e2e/04-responsive.spec.ts --repeat-each=8` (przed poprawką filtra) | 22/24 PASS, 2 FAIL (390 i 768 px) przez błąd CSP opisany w BŁĄD-1 |

Kryteria akceptacji (PASS = istnieje test, który dowodzi zachowania; sprawdzono asercje, nie tylko zielony wynik):

| Zadanie | Kryterium | Wynik | Dowód |
|---|---|---|---|
| MP-002 | Prod bez SMTP: log jednorazowy, ostrzeżenie dla właściciela, flaga w `/api/health`; dev bez zmian | PASS | `tests/unit/mail-status.test.ts` (3); NOWE `tests/e2e/02a-mail-warning.spec.ts`: `/api/health` = `{status:"ok",mail:"disabled"}`, OWNER widzi alert, EMPLOYEE nie. Uwaga: E2E działa na buildzie produkcyjnym bez SMTP, więc tam ostrzeżenie JEST widoczne (backlog dopuszcza) |
| MP-006 | `test:int` startuje czystą bazę i kończy bez pozostałości | PASS | `npm run test:int`: migracje, 76 testów; `.pgdata-int` nie zostaje |
| MP-007 | T1.1-T1.6, brak osieroconych `BookingSlot` | PASS | `concurrency.test.ts` (7 testów, `Promise.allSettled`, liczenie wierszy `BookingSlot`) |
| MP-008 | T2.1-T2.7, T3.1, T3.3, T3.4 (DST 25.10.2026 i 28.03.2027) | PASS | `status.test.ts`: macierz przejść parametryczna, 2 równoległe zmiany = jedna przechodzi, granica okna anulowania (24 h 0 min OK, minuta mniej błąd) |
| MP-009 | T4.1-T4.4 | PASS (T4.3 słabszy, patrz uwaga) | E2E `03-booking-flows.spec.ts` testy 15-19 |
| MP-011 | Odrzucenie zwalnia termin, mail z powodem, wpis w dzienniku; anulowanie bez zmian | PASS | `reject.test.ts` (5), E2E T2.8+T4.4 |
| MP-012 | Mail raz dziennie, tylko gdy są zaległe PENDING, bez auto-anulowania, próg edytowalny | PASS | `pending-digest.test.ts` (8): próg, raz na dobę, równoległe uruchomienia = 1 mail, nie przed 9:00, próg 0 wyłącza, brak PII w dzienniku |
| MP-013 | Przeniesienie poza godziny/święto bez `force` nic nie zapisuje; z `force` zapis + log; w godzinach bez zmian; `force` nie omija kolizji | PASS | `move-warnings.test.ts` (6), `schedule-warnings.test.ts`, E2E T3.5 (formularz). Przeciąganie w kalendarzu: brak testu E2E (znana luka) |
| MP-017 | Fokus na pierwszym `aria-invalid` (390 i 1280) | PASS | E2E T8.2 x2 |
| MP-018 | Przycisk „Spróbuj ponownie" po 500 | PASS | E2E T8.3 |
| MP-019 | Loader zamiast pustej strony; 404 tokenu nadal 404 | PASS | E2E MP-019 + regresja „nieistniejący token" |
| T8.1 | 10 stron x 390/768/1280: brak przewijania, 1 H1, brak błędów konsoli | PASS po poprawce filtra; flaky przed (BŁĄD-1) | `04-responsive.spec.ts` |

Zmiany testów wykonane przez testera: dodano `tests/e2e/02a-mail-warning.spec.ts` (MP-002, nazwa `02a` celowo przed `03`, bo `03` zamyka wspólną pulę `db.ts`); w `04-responsive.spec.ts` filtr znanego błędu CSP nie zależy już od adresu strony.

#### Błędy i uwagi

| ID | Ważność | Opis | Odtworzenie | Status |
|---|---|---|---|---|
| BŁĄD-1 | Niska-średnia | Losowy błąd konsoli „Applying inline style violates ... style-src" na dowolnej stronie publicznej. Źródło: wbudowany `<next-route-announcer>` Next.js (`node_modules/next/dist/client/components/app-router-announcer.js:21,26`) ustawia `style.cssText`; CSP z `src/proxy.ts:16` ma tylko `style-src 'self' 'nonce-…'` (bez `style-src-attr`), więc style są blokowane. Skutek: ukryty element ogłaszający trasę (czytniki ekranu) może nie mieć stylu `position:absolute; clip…`, czyli tekst tytułu może stać się widoczny na dole strony. NIE pochodzi z gałęzi: `proxy.ts` nie jest w diffie, w komponentach brak `style=`, w HTML brak atrybutów `style`. Sonda `securitypolicyviolation`: `/` 22/25 odwiedzin, `/uslugi` 3/25, `/klimatyzacja` 0/25 (`violatedDirective: style-src-attr`, element `NEXT-ROUTE-ANNOUNCER`). Dlatego T8.1 był flaky. | `npx playwright test tests/e2e/04-responsive.spec.ts --repeat-each=8` (przed poprawką filtra: 2 z 24 padły) | Otwarte, do naprawy w kodzie (np. skrót/hash dla `style-src-attr` albo `style-src-attr 'unsafe-inline'` ocenione pod kątem ryzyka; zdecyduje właściciel/implementator). Test teraz ignoruje ten jeden komunikat |
| UWAGA-1 | Niska | T4.3: powtórzenie akcji właściciela sesją pracownika sprawdza tylko brak nowego wpisu `settings.booking` w `AuditLog` i brak CSV, nie wartość ustawień. Wystarcza do dowodu braku zapisu, ale słabsze niż porównanie wiersza `Settings` | `tests/e2e/03-booking-flows.spec.ts` ok. linii 249-258 | Do rozważenia |
| UWAGA-2 | Niska | Środowisko: przerwane biegi E2E zostawiają niewidoczne procesy trzymające porty 54330 i 54342 (netstat pokazuje PID bez procesu w `tasklist`). Kolejny bieg na tym porcie wiesza się na `initdb` lub nie startuje. Obejście: inny `E2E_DB_PORT` i `E2E_DB_DIR` | `netstat -ano | grep 54342` | Informacja |
| UWAGA-3 | Informacja | `[mail] SMTP_HOST nie jest ustawiony` pojawia się w logu E2E, bo serwer E2E to build produkcyjny. Zgodne z kryterium MP-002 | log `npm run test:e2e` | OK |

Werdykt etapu 1 (tester): PRZEPUSZCZAM, z warunkiem odnotowania BŁĘDU-1 (istnieje w main, nie jest regresją).

### Etap 3 (`mp/etap-3-premium`) - implementacja `mp-premium`, 2026-11-15

| Zadanie | Testy | Gdzie |
|---|---|---|
| MP-031, MP-032 | T5.4, domyślne wartości kolumn, wpis `settings.premium` | `tests/integration/premium.test.ts`, `tests/e2e/02b-premium.spec.ts` |
| MP-033 | T5.2, T5.3, schemat Zod | `tests/unit/premium-schema.test.ts`, integracyjny + E2E |
| MP-035 | T5.1 (także z terminem kolidującym) | `tests/integration/premium.test.ts` (równość pełnych wierszy Booking/BookingSlot/Block przed i po), E2E (liczności) |
| MP-034 | T5.6 (390/768/1280, strona i sekcja na głównej), sitemap | `tests/e2e/02b-premium.spec.ts` (`/premium` ma 404 przy wyłączonej fladze, więc nie wchodzi do pętli T8.1) |
| (T5.5) | honeypot, limit IP | `tests/integration/premium.test.ts` |

Trasa `/premium` leży w `(public-detail)` (notFound). Spec nazwany `02b`, bo `03` zamyka wspólną pulę `db.ts`.

### Etap 3: wyniki niezależnego testera (2026-11-15)

Środowisko: `E2E_DB_PORT=54381 E2E_DB_DIR=.pgdata-e2e-tp`; dane wyłącznie testowe (baza jednorazowa, poczta do `.mail-outbox`/pamięci).

| Kontrola | Wynik | Dowód |
|---|---|---|
| `npm run lint`, `typecheck` | PASS | bez ostrzeżeń |
| `npm test` | PASS | 67/67 (6 plików) |
| `npm run test:int` | PASS | 91/91 (7 plików; było 84, dopisano 7) |
| `npm run build` | PASS | |
| `npm run test:e2e` | PASS | 31/31 (było 30, dopisano 1) |

| Kryterium | Werdykt | Dowód (asercje przeczytane) |
|---|---|---|
| T5.1 / MP-035 | PASS | `premium.test.ts`: `toEqual` pełnych wierszy Booking/BookingSlot/Block (z `updatedAt`) przed i po, termin kolidujący; E2E: liczności |
| T5.2 mail do właściciela | PASS | outbox 1 mail do `warsztat@…`, temat „Premium”, tekst bez telefonu i e-maila klienta (integracyjny i E2E) |
| Flagi domyślnie wyłączone | PASS | domyślne kolumny z `information_schema`; E2E: `/premium` 404, brak `#premium`, linku i wpisu w sitemap |
| Cena i odbiór z Settings | PASS (dopisany test) | NOWY E2E: zmiana `premiumPriceNote`/`premiumPickupNote` w bazie widoczna na stronie |
| T5.3 adres odbioru przy fladze off | PASS | integracyjny + schemat Zod; NOWY: sam `pickupAddress` bez zaznaczenia też odrzucony |
| Edycja ustawień tylko OWNER | PASS (dopisany test) | NOWY `premium-owner.test.ts`: pracownik i brak sesji dostają redirect, ustawienia i dziennik bez zmian; właściciel zapisuje, wpis `settings.premium` bez treści notatek, Zod odrzuca za krótką cenę |
| T5.5 antyspam / RODO / Zod | PASS (rozszerzone) | honeypot, limit 5/IP; NOWE: brak zgody, zły e-mail, krótki opis, brak pojazdu, brak/świeży `form_token` |
| T5.6 responsywność | PASS (E2E) | 390/768/1280: `scrollWidth<=clientWidth`, 1 H1, CTA widoczne. Kontroli wzrokowej w przeglądarce nie wykonano (brak zrzutów), tylko pomiar |

#### Flaky MP-019 (`03-booking-flows.spec.ts:133`, etap 1)
- Seria 20x (1 worker): 80/80 PASS. Seria 40x z 6 workerami (obciążenie): 1 FAIL, 39 PASS, czyli test jest zależny od czasu, nie ma realnego błędu aplikacji.
- Przyczyna [ZAŁOŻENIE, spójne z objawem]: loader pochodzi z prefetchu trasy. Test opóźnia tylko żądanie RSC bez nagłówka `next-router-prefetch`. Pod obciążeniem klik następuje, gdy prefetch `/rezerwacja` jeszcze trwa, więc nawigacja korzysta z niego i opóźniane żądanie nie powstaje; loader mignie krócej niż polling asercji.
- Poprawka TESTU (zastosowana): przed `goto("/")` rejestracja `waitForResponse` prefetchu `/rezerwacja` i oczekiwanie na niego przed instalacją routingu i kliknięciem. Po poprawce: 60/60 PASS przy 6 workerach. Kod aplikacji bez zmian.

#### Błędy
Brak błędów blokujących w Premium. Uwaga niska: BŁĄD-1 (CSP `style-src-attr`, `next-route-announcer`) nadal otwarty, bez zmian względem etapu 1.

Werdykt etapu 3 (tester): PRZEPUSZCZAM.

### Etap 4, część SEO i treści (`mp/etap-4-seo`), 2026-11-15

Zakres: MP-037, MP-038, MP-039, MP-020 (pasek mobilny), MP-040 (część), MP-042, MP-043 (pomiar i analiza), MP-049. Pominięte do decyzji: MP-041, MP-044, MP-045, MP-046, MP-047, MP-048.
Testy: `tests/e2e/05-seo.spec.ts` (T8.4, T8.5, MP-037/038/049), `tests/e2e/02c-seo-data.spec.ts` (MP-040/042; przed `03`, bo `03` zamyka pulę `db.ts`), `tests/unit/jsonld.test.ts`, `tests/unit/lastmod.test.ts`, `tests/unit/contrast.test.ts` (T8.8: `fg/muted/accent-text` na `surface-2`; para `disabled` pominięta, bo to przyciemnienie przez `opacity`, nie osobny kolor). T8.6 i T8.7 nie dotyczą tego zakresu (MP-041, MP-047).

| ID | Wynik | Dowód |
|---|---|---|
| MP-037 / T8.5 | PASS | title <= 60, description 140-160, unikalne, canonical, 10 stron; H1 z miejscowością na `/kontakt`, `/dla-firm`, `/czesci-zamienne` |
| MP-038 | PASS | brak "historię napraw", "priorytet", "pilnujemy terminów" na `/dla-firm`; treść do zatwierdzenia przez właściciela (MP-058 przywraca po etapie 5) |
| MP-039 / T8.4 | PASS | baner 390x844: 330 px (39,1%) przed, 180 px (21,3%) po; 768: 17,8%, 1280: 22,8%; fokus na banerze, po decyzji na `#tresc`, brak pułapki fokusu |
| MP-020 | PASS | "Umów wizytę" w jednej linii przy 360 i 390 px |
| MP-040 | PASS | JSON-LD tylko na `/` i `/kontakt`, `hasOfferCatalog` bez cen, `areaServed` z Settings, puste pole pomijane |
| MP-042 | PASS | `lastmod` z `AuditLog` (regulamin i polityka bez daty), `/favicon.ico` 200 |
| MP-049 / T8.8 | PASS | jedna linia pulsu na `/rezerwacja`; nowe pary kontrastu zielone; `aria-label` paska postępu |

Komendy (E2E z `E2E_DB_PORT=54401 E2E_DB_DIR=.pgdata-e2e-s`): `npm run lint` PASS; `npm run typecheck` PASS; `npm test` PASS (9 plików, 84 testy); `npm run test:int` PASS (8 plików, 95 testów); `npm run test:e2e` PASS (44/44, 1,4 min); `npm run build` PASS.

### Pomiary MP-043 (zmierzone, nie docelowe)

Warunki: 2026-11-15 ok. 17:00 (CET), Lighthouse 13.6.0, mobile (emulacja Moto G, throttling symulowany: RTT 150 ms, 1,6 Mb/s, CPU x4), Chromium z Playwrighta w trybie `--headless`, jedna maszyna (Windows, łącze domowe). Produkcja: wyłącznie żądania GET na `https://motopuls.onrender.com/`, po rozgrzaniu. Lokalnie: build produkcyjny (`next build` + serwer na `http://localhost:3100`, baza testowa), czyli BEZ HTTPS i bez Cloudflare; wyników lokalnych nie porównuj wprost z produkcją. Przebiegi, w których Lighthouse zgłosił błąd NO_NAVSTART (3 z 9 na produkcji), pominięto.

**TTFB (curl).** Produkcja, pierwsze żądanie po bezczynności (zimny start): 17,99 s (całość 18,19 s); kolejne dwa: 0,97 s i 0,65 s. Rozgrzana, 3 próby na stronę: `/` 0,39 / 0,25 / 0,33 s; `/klimatyzacja` 0,25 / 0,14 / 0,28 s; `/rezerwacja` 0,26 / 0,16 / 0,20 s. Lokalnie: 9-68 ms.

**Produkcja (stary kod; po wdrożeniu tej gałęzi pomiar do powtórzenia).**

| Strona | Wydajność | LCP (ms) | TBT (ms) | CLS | a11y / zalecane praktyki / SEO |
|---|---|---|---|---|---|
| `/` (2 przebiegi) | 99, 99 | 1239, 1200 | 137, 119 | 0, 0 | 100 / 100 / 100 |
| `/klimatyzacja` (3) | 100, 100, 100 | 973, 990, 999 | 46, 38, 55 | 0, 0, 0,053 | 100 / 100 / 100 |
| `/rezerwacja` (2) | 88, 88 | 3559, 3563 | 190, 161 | 0, 0,013 | 96 / 96 / 100 |

**Lokalnie przed (commit 169749c) i po (HEAD), 4 przebiegi każdy.**

| Strona | Przed: wydajność / LCP / CLS | Po: wydajność / LCP / CLS |
|---|---|---|
| `/` | 95, 69, 69, 100 / 1087, 4432, 4344, 954 / 0, 0,224, 0,224, 0,002 | 98, 99, 99, 74 / 951, 945, 943, 4348 / 0,002, 0, 0,002, 0,224 |
| `/klimatyzacja` | 99 x4 / 893-954 / 0,051-0,063 | 99 x4 / 915-943 / 0,047-0,063 |
| `/rezerwacja` | 82-83 / 4408-4415 / 0,010-0,017; a11y 96 | 79-83 / 4264-4421 / 0,017; a11y 100 |

Wnioski [FAKT z pomiarów]: (1) zmiany SEO nie pogorszyły wyników (w granicach rozrzutu); (2) `/` ma dwumodalny wynik, w obu seriach 1-2 przebiegi z LCP ok. 4,3 s i CLS 0,224 (przyczyna nie ustalona, niezależna od tej gałęzi); (3) na `/rezerwacja` LCP to akapit banera cookies, rysowany dopiero po hydratacji (serwer nie zna zgody), stąd LCP 3,5-4,4 s; baner jest teraz o połowę niższy, ale nadal jest elementem LCP; (4) a11y 96 na produkcji to `aria-progressbar-name` (naprawione w tej gałęzi); `inspector-issues` (CSP) wpływa na praktyki 96 na `/rezerwacja`.

Czcionki [FAKT, `/` lokalnie, 593 KB całości]: 4 pliki woff2 ok. 312 KB: Archivo latin 91 KB i latin-ext 87 KB, Inter latin 49 KB i latin-ext 86 KB; `font-display: swap` w 10 regułach; podzbiór latin-ext jest potrzebny dla polskich znaków. Skrypty JS ok. 150 KB (transfer), CSS 8,7 KB.

Rekomendacje (BEZ zmian w CSP i cache, do decyzji i przeglądu `mp-bezpieczenstwo`): [REKOMENDACJA] (a) renderować baner po stronie serwera na podstawie ciasteczka (`cookies()` w layoutcie, który i tak jest dynamiczny), żeby LCP nie czekał na hydratację; (b) preload tylko `inter-latin` i `archivo-latin` (reszta ładowana na żądanie) oraz rozważyć węższy zakres osi `wdth` Archivo (najcięższe pliki); (c) zbadać źródło CLS 0,224 na `/` (kandydaci: wymiana czcionki, baner, hero) w Chrome DevTools Performance; (d) zimny start Render nadal 18 s (MP-004, D-9); (e) po wdrożeniu powtórzyć ten pomiar na produkcji.

### Etap 4: wyniki niezależnego testera (`mp/etap-4-seo`), 2026-11-15

Zakres: MP-037, 038, 039, 040 (część), 042, 043, 049, 020; T8.1, T8.4-T8.8. Kod aplikacji nie był zmieniany. Dopisane testy: `tests/integration/seo-data.test.ts` (akcja panelu `saveCompany` i migracje), `tests/e2e/02d-seo-tester.spec.ts` (przed `03`, bo `03` zamyka pulę `db.ts`), pomocnicze `setCompanyAddress` i `coordinates` w `tests/e2e/db.ts`.

**Komendy (uruchomione naprawdę).** `npm run lint` PASS (0 błędów); `npm run typecheck` PASS; `npm test` PASS (9 plików, 84 testy); `npm run test:int` PASS (9 plików, 103 testy, w tym 9 nowych); E2E (`E2E_DB_PORT=54421 E2E_DB_DIR=.pgdata-e2e-t4 npx playwright test --output=<katalog tymczasowy>`) PASS 50/50 (1,8 min; 44 istniejące + 6 nowych); `npm run build` PASS.
Uwaga o środowisku: pierwszy przebieg E2E dał 3 FAIL (zerwany trace, `/premium` 500, ENOENT w `test-results`), bo równolegle chodziły inne przebiegi Playwrighta, a port 3100, `.next-e2e` i `test-results` są wspólne. Powtórzenie z osobnym `--output` dało 50/50. To nie błąd produktu, ale ograniczenie równoległego testowania (UWAGA-3).

| Kryterium | Wynik | Dowód |
|---|---|---|
| MP-037 / T8.5 title i description | PASS | `05-seo.spec.ts`: 10 stron publicznych, title 10-60, description 140-160, canonical = adres, unikalność |
| MP-037 `/kontakt` z Settings | PASS (test dopisany) | `02d`: po `UPDATE Settings` (street/city) title i H1 zawierają nowe miasto, description nowy adres i bez "Modra", nadal 140-160; po przywróceniu wraca "Białe Błota". Wcześniejszy test sprawdzał tylko wartość z seeda, nie dowodził pochodzenia z bazy |
| MP-038 `/dla-firm` | PASS | `05-seo`: brak "historię napraw", "historia napraw", "priorytet", "pilnujemy terminów", "przypominamy o przeglądach" w `main` i w description; zrzut 390 px zgodny |
| MP-039 / T8.4 baner | PASS | 390x844: wysokość <= 25%, oba przyciski >= 48 px i równej szerokości, fokus na banerze, brak pułapki fokusu, po decyzji fokus na `#tresc`; 768/1280 <= 40% i w granicach ekranu |
| MP-039 brak żądań zewnętrznych | PASS (test dopisany) | `02d`: na `/kontakt` przed zgodą i po "Tylko niezbędne" zero żądań poza localhost i zero iframe OSM; po "Zgoda także na mapę" iframe jest |
| MP-020 pasek mobilny | PASS (wzmocniony) | `02d` przy 360 i 390: oba linki równej wysokości (różnica <= 1 px), cel >= 44 px, tekst "Umów wizytę" w jednym wierszu (`getClientRects`). Istniejący test sprawdzał tylko wysokość <= 52 |
| MP-040 JSON-LD | PASS | `02c`: AutoRepair tylko na `/` i `/kontakt` (1 blok), brak na 5 pozostałych; `hasOfferCatalog` bez "price"; `areaServed` z Settings, puste = klucz pominięty; `jsonld.test.ts` to samo na generatorze. Dopisane (`02d`): `geo` = 53.0952/17.9285 (wartości z `main`, bez zmian), brak `priceRange`, "zł" i znaku `<` w JSON |
| MP-040 zapis `areaServed` akcją panelu | PASS (test dopisany) | `seo-data.test.ts`: właściciel: parsowanie linii/przecinków/średników, trim, deduplikacja, zapis + wpis `settings.company` w AuditLog; puste pole czyści; > 20 pozycji i > 80 znaków odrzucone bez zapisu; pracownik dostaje redirect i nic się nie zmienia; zapis nie rusza współrzędnych |
| MP-042 sitemap | PASS | `02c`: `lastmod` z AuditLog, regulamin i polityka bez `lastmod`. Dopisane (`02d`): każdy `<loc>` zwraca 200, `/premium` nieobecny przy wyłączonej fladze (przy włączonej: `02b`) |
| MP-042 favicon | PASS (zaostrzone) | `02d`: 200, `content-type` dokładnie `image/x-icon`, nagłówek pliku `00 00 01 00` (ICO) |
| MP-043 pomiar | NIE POWTARZANO | liczby implementatora (Lighthouse, TTFB, czcionki) przejrzane pod kątem opisu warunków, nie weryfikowane. Zastrzeżenia: na `/` wynik dwumodalny (LCP ok. 4,3 s, CLS 0,224 w 1-2 z 4 przebiegów), przyczyna nieustalona; na produkcji `/` i `/rezerwacja` zmierzono 2 przebiegi, backlog wymaga 3 |
| MP-049 / T8.8 | PASS | jedna linia pulsu na `/rezerwacja`, progressbar z nazwą "Postęp rezerwacji", kontrast `fg/muted/accent-text` na `surface-2` >= 4,5 (unit). Para `disabled` pominięta świadomie (przyciemnienie przez `opacity`) |
| T8.1 przewijanie poziome | PASS | `04-responsive` 390/768/1280 x 10 stron (200, 1 H1, brak przewijania, brak błędów konsoli poza znanym BŁĄD-1); dopisane `02d`: te same strony także przy 360x740 |
| T8.6 / T8.7 | N/D | MP-041 i MP-047 poza zakresem etapu |
| Regresja rezerwacji i Premium | PASS | pełny E2E 50/50 (01-booking, 03-booking-flows, 02b-premium) i integracyjne 103/103 (concurrency, status, premium) |

**Migracje.**
- `20261115120000_settings_area_served`: PASS. `ADD COLUMN "areaServed" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]`: addytywna, odwracalna (DROP COLUMN w komentarzu), bez backfillu. Test sprawdza `NOT NULL` i domyślną pustą tablicę.
- `20261115120100_fleet_copy_soften`: PASS. Tylko `UPDATE ... WHERE key/slug AND body/description = <dokładna dawna treść z seeda>`, więc zmienia wyłącznie wiersze nieedytowane przez właściciela. Test na bazie testowej: (a) dawna treść jest zamieniana, nowa bez "priorytet" i "histori"; (b) tekst własny właściciela w `fleet_intro` i w kategorii `floty` pozostaje bez zmian po dwukrotnym uruchomieniu (idempotentna). Nadpisanie dawnego tekstu jest bez kopii, cofnięcie opisano w komentarzu.

**Wizualnie (Playwright 390x844, zrzuty obejrzane).** `/` i `/rezerwacja` z banerem: kompaktowy (3 linie tekstu, 2 równorzędne przyciski obok siebie, "Zgoda także na mapę" zawija się do 2 wierszy), zasłania dolną część hero/listy usług, ale nie pasek mobilny; tekst czytelny. Po wyborze: pasek "Zadzwoń / Umów wizytę" w jednej linii, równa wysokość. `/dla-firm`: H1 "Obsługa flot samochodowych – Białe Błota", lead i wstęp bez obietnic historii i priorytetu, jedna linia pulsu.

**Lista błędów i uwag.**

| ID | Ważność | Opis | Kroki | Status |
|---|---|---|---|---|
| UWAGA-1 | Niska (opisana w README) | Po migracji na istniejącej bazie `Settings.areaServed` = `[]` (seed ma `update: {}`), więc JSON-LD produkcji straci `areaServed` (dziś zakodowane Białe Błota/Bydgoszcz) do czasu uzupełnienia pola w panelu | Migracja na kopii starej bazy, otworzyć `/`, sprawdzić JSON-LD | Do działania właściciela po wdrożeniu; alternatywa (rekomendacja, wymaga zgody): `UPDATE` w migracji ustawiający wartość startową tylko gdy tablica pusta |
| UWAGA-2 | Kosmetyczna | `prisma/schema.prisma`: wiersz `tagline` po dodaniu `areaServed` ma zepsute wyrównanie; `npx prisma format` to poprawi | `git diff main...HEAD -- prisma/schema.prisma` | Otwarte |
| UWAGA-3 | Niska (infrastruktura testów) | Równoległe przebiegi E2E kolidują: stały port 3100, wspólny `.next-e2e` i `test-results` (`E2E_DB_PORT` zmienia tylko bazę). Fałszywe FAIL (500 na `/premium`, ENOENT trace) | Dwa jednoczesne `npm run test:e2e` | Obejście: jeden przebieg naraz i `--output=<własny katalog>`; poprawka w `playwright.config.ts`/`scripts/e2e-server.ts` poza moim zakresem |
| BŁĄD-1 (istniejący) | Niska-średnia | CSP `style-src-attr` a `next-route-announcer`, otwarty od etapu 1, nie z tej gałęzi | patrz wyżej | Otwarte |

Brak błędów blokujących w zakresie etapu 4.

Werdykt etapu 4 (niezależny tester): PRZEPUSZCZAM (z uwagami UWAGA-1..3; UWAGA-1 do świadomej decyzji przy wdrożeniu).
