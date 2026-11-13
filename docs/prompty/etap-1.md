# Etap 1: Rezerwacje i godziny (luki) + produkcja na Render

**Agent:** `mp-rezerwacje` (implementacja), potem `mp-tester` i `mp-bezpieczenstwo`. Uruchamiane przez `/mp-etap 1`.
**Warunek startu:** backlog zaakceptowany przez użytkownika. Zadania MP-001, MP-003, MP-004, MP-005 czekają na odpowiedź właściciela w D-9 (`docs/decyzje.md`); pozostałe mogą startować bez niej.

## Kontekst (nie buduj od zera)
System rezerwacji działa: kreator 5 kroków, `Booking` ze statusami, `BookingSlot @@unique([bay, slotStart])` jako gwarancja braku podwójnych rezerwacji, `createBooking`/`moveBooking`/`createBlock`/`changeBookingStatus`/`cancelByCustomer` w `src/lib/booking.ts`, przypomnienia w `src/lib/maintenance.ts`, cron w `src/lib/cron.ts` i `src/app/api/cron/*`, poczta w `src/lib/email/{send,notify}.ts`. Nowa rezerwacja online jest już PENDING przy `autoConfirm=false` [FAKT] `booking.ts:140`. Twoja praca: luki z `docs/audyt/kod.md` i `docs/audyt/frontend.md`.
Przed kodem przeczytaj przewodnik Next.js 16 w `node_modules/next/dist/docs/` dla dotykanych funkcji (np. `loading.js`, Server Actions).

## Zakres (ID z `docs/backlog.md`, kolejność z `docs/roadmapa.md`)
- Testy rdzenia: MP-006 (projekt Vitest `tests/integration` + embedded-postgres, skrypt `test:int`), MP-007 (współbieżność i kolizje), MP-008 (statusy, anulowanie, przypomnienia), MP-009 (E2E: Oczekuje, anulowanie, role), MP-010 (CI GitHub Actions).
- Produkcja: MP-001 (README „Wdrożenie na Render", poprawki SECURITY.md), MP-002 (ostrzeżenie o braku SMTP), MP-003 (harmonogram crona + poprawka pętli w compose), MP-004 (zimny start), MP-005 (backup i uploady), MP-022 (IP za proxy).
- Logika i panel: MP-011 (odrzucenie z powodem, wg D-10), MP-012 (przypomnienie o PENDING, wg D-18), MP-013 (ostrzeżenie przy przenoszeniu, wg D-19), MP-014 (okno kalendarza z `OpeningHours`), MP-015 (ostrzeżenie przy zmianie `bays`), MP-016 (punkt zaczepienia kanałów w `notify.ts`, bez SMS).
- Kreator i frontend: MP-018 (ponowienie terminów), MP-017 (fokus na błędzie), MP-019 (`loading.tsx`), MP-020 (pasek mobilny), MP-021 (sessionStorage, opcjonalnie).
Zadania zależne od niepodjętej decyzji pomijasz i zgłaszasz w raporcie.

## Pliki (główne)
`src/lib/booking.ts`, `src/lib/maintenance.ts`, `src/lib/cron.ts`, `src/lib/email/send.ts`, `src/lib/email/notify.ts`, `src/lib/rate-limit.ts`, `src/lib/env.ts`, `.env.example`, `prisma/schema.prisma` (tylko MP-011/MP-012: kolumny addytywne), `src/app/admin/(panel)/rezerwacje/*`, `src/app/admin/(panel)/kalendarz/page.tsx`, `src/app/admin/(panel)/ustawienia/*`, `src/components/booking/BookingWizard.tsx`, `src/components/site/Chrome.tsx`, `src/app/(public)/loading.tsx` (nowy), `vitest.config.ts` / nowy config integracyjny, `tests/integration/*` (nowe), `tests/e2e/*`, `docker-compose.yml`, `.github/workflows/*` (nowe), `README.md`, `SECURITY.md`, `docs/testy.md`.

## Kryteria akceptacji
Kryteria każdego MP z `docs/backlog.md` oraz testy T1-T4 i T8.1-T8.3, T8.9 z `docs/testy.md` PASS. Dodatkowo:
- `npm run lint`, `typecheck`, `test`, `test:int`, `test:e2e`, `build` zielone (wyniki rzeczywiste w raporcie).
- Żadna istniejąca funkcja nie zmieniła zachowania poza opisanym w zadaniu (regresja `01-booking`, `02-admin`).
- Każda nowa akcja admina: `requireUser`/`requireOwner` + `AuditLog`; logi bez telefonów i e-maili.
- README i SECURITY.md zaktualizowane (bez duplikatów dokumentów).

## Zakazy
- NIE zmieniaj wartości godzin otwarcia (D-1) ani `autoConfirm` w kodzie/seedzie.
- NIE implementuj SMS, Premium, SEO (poza punktem zaczepienia MP-016).
- NIE zastępuj `@@unique([bay, slotStart])` blokadami aplikacyjnymi; nie usuwaj pętli po stanowiskach.
- NIE uruchamiaj `db:deploy` na produkcji, nie zmieniaj konfiguracji Render, nie merguj do `main`, nie wdrażaj bez zgody użytkownika.
- NIE wpisuj sekretów (`CRON_SECRET`, `DATABASE_URL`, SMTP) do repo, workflow ani logów; tylko GitHub Secrets / panel Render (konfiguruje właściciel).
- NIE testuj na produkcji zapisami (żadnych rezerwacji na motopuls.onrender.com); pomiary produkcji tylko GET.
- Migracje wyłącznie addytywne, najpierw na bazie lokalnej, z opisem cofnięcia.

## Raport (do 10 linii)
Co zmieniono (ID), jak sprawdzono (komendy i wyniki), zadania pominięte z powodu decyzji, nowe ryzyka, co dalej.
