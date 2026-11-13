@AGENTS.md

# Moto Puls: zasady projektu

Strona i system rezerwacji warsztatu Moto Puls (Białe Błota k. Bydgoszczy). Produkcja: https://motopuls.onrender.com/.
Odpowiadaj po polsku. Kod, nazwy i commity po angielsku, teksty dla użytkownika po polsku.

## Stos (potwierdzony w repo)
Next.js 16 (App Router), TypeScript strict, PostgreSQL + Prisma 7, Tailwind CSS 4, Zod, Nodemailer (SMTP), Argon2 + TOTP (2FA), Vitest (`tests/unit`) i Playwright (`tests/e2e`), Docker + Caddy. Wymaga Node 22+.
**Next.js 16 różni się od tego, co znasz.** Zanim napiszesz kod, przeczytaj odpowiedni przewodnik w `node_modules/next/dist/docs/` (po `npm install`).

## Komendy
`npm install`, `npm run db:dev` (wbudowana baza lokalna), `npm run db:migrate`, `npm run db:seed`, `npm run dev`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`, `npm run build`.
Przed każdym commitem: lint, typecheck, test i build muszą przejść.

## Mapa kodu (co już istnieje, nie duplikuj)
- `prisma/schema.prisma`: User/Session (role OWNER, EMPLOYEE), Customer, Vehicle, FleetAccount, Booking (statusy PENDING, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW), BookingSlot (unikalne `bay + slotStart` = blokada podwójnej rezerwacji w bazie), Block, ClosedDay, OpeningHours, Settings (m.in. `bays`, `autoConfirm`, `minLeadHours`), Service, Inquiry (typy PARTS, FLEET, CONTACT), EmailTemplate, ContentBlock, Testimonial, Media, AuditLog, RateLimit.
- `src/lib/`: `booking.ts`, `slots.ts`, `time.ts`, `settings.ts`, `email/notify.ts` (powiadomienia), `cron.ts` i `maintenance.ts` (zadania cykliczne, przypomnienia), `rate-limit.ts`, `antispam.ts`, `audit.ts`, `auth/*`.
- Publiczne: `src/app/(public)/*` (strona, usługi, klimatyzacja, dla-firm, części, o-nas, kontakt, rezerwacja 5-krokowa, link klienta `rezerwacja/[token]`, regulamin, polityka). SEO: `sitemap.ts`, `robots.ts`, JSON-LD `AutoRepair` w `(public)/layout.tsx`.
- Admin: `src/app/admin/(panel)/*` (rezerwacje, kalendarz, klienci, floty, zapytania, usługi, treści, szablony, ustawienia, użytkownicy, dziennik, eksport CSV).
- Dokumenty: `README.md`, `SECURITY.md` (znane ryzyka, aktualizuj go zamiast tworzyć duplikat), `PROMPT.md` (pierwotne zlecenie).
- Czego NIE MA (do zrobienia): SMS (jest tylko e-mail), oferta Premium, konta klientów i panel klienta, historia napraw i kosztów pojazdu.

## Dane i konfiguracja
Dane firmy, godziny (`OpeningHours`), ustawienia i treści są w BAZIE i edytowane w panelu. Wartości startowe: `prisma/seed-data.ts`. Nie hardkoduj ich w komponentach. Adres, telefony i e-mail firmy pochodzą z `Settings`; nie wymyślaj ani nie zmieniaj ich.

## Otwarte decyzje właściciela (docs/decyzje.md)
Godziny otwarcia: baza i strona mają pn–pt 8:00–17:00, sob. i niedz. nieczynne, a zlecenie zakłada pn–pt 8–18, sob. 8–16, niedziela do potwierdzenia. Do decyzji nie zmieniaj godzin. Ewentualna zmiana to edycja w panelu lub w seedzie, nie w kodzie. Pozostałe decyzje: zasób/stanowiska, cena Premium, dostawca i limit SMS, treści prawne, domena i hosting (README opisuje VPS/Docker i Vercel, produkcja stoi na Render: audytor sprawdza stan faktyczny).

## Zasady nadrzędne
1. Najpierw analiza i plan, potem kod. Implementacja po akceptacji backlogu przez użytkownika.
2. Twierdzenia w raportach oznacz [FAKT] (źródło: plik:linia lub URL), [ZAŁOŻENIE] albo [REKOMENDACJA]. Brak danych = „DO UZUPEŁNIENIA", nigdy zgadywanie. Nie wymyślaj usług, cen, opinii, certyfikatów.
3. Najpierw sprawdź, co istnieje, i rozszerzaj. Nie zmieniaj frameworka, nie usuwaj działających funkcji, nie twórz duplikatów (np. dla Premium rozważ rozszerzenie `Inquiry` zamiast nowego mechanizmu, dla SMS wzoruj się na `notify.ts` i `EmailTemplate`).
4. Sekrety tylko w zmiennych środowiskowych (`.env` poza Git, `.env.example` z placeholderami; nowe zmienne dopisz do `.env.example` i `src/lib/env.ts`). Nigdy nie wypisuj kluczy ani danych klientów.
5. Testy tylko na danych testowych (jednorazowa baza E2E), bez prawdziwych klientów, rezerwacji i SMS-ów.
6. Migracje Prisma: addytywne i odwracalne, najpierw na bazie lokalnej. Nie uruchamiaj `db:deploy` na produkcji bez zgody.
7. Gałąź na zadanie `mp/<ID>-krotka-nazwa`, małe commity z „dlaczego". Nie merguj do `main` i nie wdrażaj bez zgody użytkownika.
8. Usługi zewnętrzne (SMS, analityka) za interfejsem, z flagą włączenia i trybem testowym. Podaj szacunek miesięcznego kosztu.
9. Obsługa błędów, logi bez danych osobowych (maskuj telefony i e-maile), kontrola uprawnień na każdej akcji admina, wpisy do `AuditLog` dla zmian wrażliwych.
10. Responsywność 390/768/1280 px i spójność z obecnym wyglądem (ciemny motyw, hasło „Puls Twojego auta").

## Definicja „zrobione"
Lint, typecheck, testy jednostkowe i E2E oraz build przechodzą, funkcja uruchomiona i sprawdzona, brak sekretów w diffie, README/SECURITY/docs zaktualizowane, kryteria akceptacji z backlogu spełnione, commit na gałęzi zadania.

## Dokumentacja agentów
`docs/audyt/*.md` (raporty), `docs/backlog.md`, `docs/roadmapa.md`, `docs/testy.md`, `docs/decyzje.md`, `docs/prompty/etap-N.md`.
Długie wyniki zapisuj do `docs/`, a do rozmowy zwracaj podsumowanie (maks. 15 linii). Czytaj tylko potrzebne pliki i filtruj wyjście poleceń.
