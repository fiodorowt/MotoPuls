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
