# Etap 3: Moto Puls Premium

**Agent:** `mp-premium`, potem `mp-tester` i `mp-bezpieczenstwo`. Uruchamiane przez `/mp-etap 3`.
**Warunek startu:** etap 1 zmergowany co najmniej w zakresie MP-006 (testy integracyjne, potrzebne do MP-035). Może iść równolegle z etapem 4 w osobnym worktree (`git worktree add ../motopuls-premium -b mp/etap-3-premium`). Wartości ceny i odbioru: D-3, D-4 (do decyzji teksty domyślne, flaga wyłączona).

## Kontekst
Zapytania istnieją: model `Inquiry` (typy PARTS, FLEET, CONTACT; pole `data Json?`), akcja `handleInquiry` (`src/app/(public)/actions.ts:17-55`) z antyspamem i limitem IP, formularze `InquiryShell`/`FleetForm` w `InquiryForms.tsx`, powiadomienie `notifyInquiry` + szablon `workshop_inquiry`, panel `src/app/admin/(panel)/zapytania`. Premium to rozszerzenie tego mechanizmu (kod.md B2), NIE nowy system i NIE rezerwacja slotu.

## Zakres
- MP-031: wartość `PREMIUM` w `InquiryType` (osobna migracja `ALTER TYPE ... ADD VALUE`, sprawdzona lokalnie w Prisma 7), etykiety, filtry, widok danych z `Inquiry.data`.
- MP-032: pola `Settings`: `premiumEnabled` (domyślnie `false`), `premiumPriceNote` („Cena ustalana indywidualnie"), `premiumPickupEnabled` (`false`), `premiumPickupNote`; edycja tylko OWNER z `AuditLog`.
- MP-033: formularz zgłoszenia (Zod wspólny klient/serwer), pola odbioru tylko przy włączonej fladze, zgoda RODO, powiadomienie właściciela.
- MP-034: `/premium` (PageHeader, Section, card, CtaBand), sekcja na stronie głównej między `#floty` a `#opinie`, link w stopce i CtaBand, NAV tylko jeśli mieści się przy 1024 px, opcjonalny link w kroku 3 kreatora (bez logiki slotów), `metadata`, wpis w `sitemap.ts`.
- MP-035: test, że zgłoszenie nie tworzy ani nie zmienia `Booking`/`BookingSlot`.
- MP-036 (opcjonalnie): `.choice`/`FieldShell` bez zmiany wyglądu.

## Pliki (główne)
`prisma/schema.prisma` + migracje, `src/lib/labels.ts`, `src/app/(public)/actions.ts`, `src/components/site/InquiryForms.tsx`, `src/components/form.tsx` (MP-036), `src/app/(public)/premium/page.tsx` (nowy), `src/app/(public)/page.tsx` (sekcja), `src/components/site/Chrome.tsx` (stopka/NAV), `src/components/booking/BookingWizard.tsx` (tylko link w kroku 3), `src/app/sitemap.ts`, `src/app/admin/(panel)/{zapytania,ustawienia}/*`, `src/lib/email/templates.ts` (jeśli potrzebna etykieta), `prisma/seed-data.ts` (wartości domyślne), `tests/*`.

## Kryteria akceptacji
Kryteria MP-031…MP-035 z `docs/backlog.md` oraz T5.1-T5.6 i T8.1 PASS. Dodatkowo: strona Premium spójna z marką (zero nowych kolorów i klas), responsywna 390/768/1280; treści marketingowe bez obietnic czasu i gwarancji, oznaczone „DO ZATWIERDZENIA"; cena i odbiór wyłącznie z `Settings`.

## Zakazy
- NIE twórz `Booking`, `BookingSlot` ani `Block` ze zgłoszenia; NIE przesuwaj, nie anuluj, nie blokuj istniejących rezerwacji.
- NIE wpisuj ceny, mnożnika, zasięgu ani czasu realizacji w kod lub treść strony.
- NIE twórz osobnego modelu zgłoszeń, jeśli `Inquiry` wystarcza.
- NIE dotykaj plików SEO etapu 4 poza wpisem w `sitemap.ts` (etap 3 scala się pierwszy; uzgodnij w raporcie).
- Migracje addytywne; bez `db:deploy`; bez merge do `main`.

## Raport (do 10 linii)
Co zmieniono, wyniki testów (w tym T5.1), treści czekające na zatwierdzenie, decyzje D-3/D-4.
