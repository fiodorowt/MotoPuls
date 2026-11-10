# Moto Puls – strona warsztatu, rezerwacje online i panel administracyjny

Aplikacja dla serwisu samochodowego Moto Puls (Białe Błota): publiczna strona po polsku, 5‑krokowa rezerwacja
wizyt oraz panel `/admin` dla właścicieli i pracowników.

- **Stos:** Next.js 16 (App Router) + TypeScript strict, PostgreSQL + Prisma, Tailwind CSS 4, Zod, Nodemailer (SMTP),
  Vitest + Playwright, Docker.
- **Dane firmy, godziny, cennik, treści i szablony e‑maili** są w bazie i edytuje się je w panelu
  (wartości startowe: [prisma/seed-data.ts](prisma/seed-data.ts)).
- Przegląd bezpieczeństwa i lista ryzyk: [SECURITY.md](SECURITY.md).

## Spis treści

1. [Uruchomienie lokalne](#uruchomienie-lokalne)
2. [Zmienne środowiskowe](#zmienne-środowiskowe)
3. [Testy i kontrola jakości](#testy-i-kontrola-jakości)
4. [Wdrożenie na VPS (Docker)](#wdrożenie-na-vps-docker)
5. [Wariant: Vercel + zarządzany PostgreSQL](#wariant-vercel--zarządzany-postgresql)
6. [Zadania cykliczne](#zadania-cykliczne)
7. [Kopie zapasowe](#kopie-zapasowe)
8. [Konta, hasła i 2FA](#konta-hasła-i-2fa)
9. [Co uzupełnić przed startem](#co-uzupełnić-przed-startem)
10. [Struktura projektu](#struktura-projektu)

## Uruchomienie lokalne

Wymagania: Node.js 22 lub nowszy. PostgreSQL nie musi być zainstalowany – projekt ma wbudowaną bazę deweloperską
(pakiet `embedded-postgres`). Możesz też użyć własnego serwera PostgreSQL 15+.

```bash
npm install
```

Skopiuj `.env.example` do `.env` i uzupełnij co najmniej:

| Zmienna | Wartość lokalnie |
| --- | --- |
| `APP_SECRET` | losowe ≥ 32 znaki: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `CRON_SECRET` | losowe ≥ 16 znaków (to samo polecenie) |
| `DATABASE_URL` | `postgresql://motopuls:motopuls@localhost:54329/motopuls` (wbudowana baza) |

W pierwszym terminalu uruchom bazę (zostaw włączoną):

```bash
npm run db:dev
```

W drugim terminalu – migracje, dane startowe i serwer:

```bash
npm run db:deploy
```

```bash
npm run db:seed
```

```bash
npm run dev
```

Strona: <http://localhost:3000>, panel: <http://localhost:3000/admin>.

`db:seed` przy pierwszym uruchomieniu tworzy konto właściciela (`ADMIN_EMAIL`) i **jednorazowo wypisuje w konsoli
wygenerowane hasło**. Przy pierwszym logowaniu panel wymusza konfigurację 2FA (aplikacja typu Google Authenticator,
Aegis, 2FAS) i zmianę hasła. Seed można uruchamiać wielokrotnie – nie nadpisuje istniejących danych.

Bez `SMTP_HOST` e‑maile nie są wysyłane, tylko zapisywane jako pliki JSON w `.mail-outbox/`.

## Zmienne środowiskowe

Pełna lista z komentarzami: [.env.example](.env.example). Walidacja: [src/lib/env.ts](src/lib/env.ts).

| Zmienna | Wymagana | Opis |
| --- | --- | --- |
| `APP_URL` | tak (produkcja) | Publiczny adres, np. `https://motopuls.pl` – linki w e‑mailach, sitemap, Open Graph |
| `APP_SECRET` | tak | ≥ 32 znaki. Szyfruje sekrety TOTP i podpisuje formularze. **Zmiana unieważnia 2FA wszystkich kont** |
| `CRON_SECRET` | tak | ≥ 16 znaków. Token dla `/api/cron/*` |
| `DATABASE_URL` | tak | Połączenie z PostgreSQL (w Docker Compose składane automatycznie) |
| `POSTGRES_PASSWORD` | Docker | Hasło bazy w Docker Compose |
| `DOMAIN` | Docker | Domena dla Caddy (bez `https://`) |
| `ADMIN_EMAIL`, `ADMIN_NAME` | nie | Konto właściciela tworzone przez seed |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | produkcja | Dowolny SMTP (np. Resend: host `smtp.resend.com`, użytkownik `resend`, hasło = klucz API) |
| `MAIL_FROM` | produkcja | Nadawca, np. `"Moto Puls <rezerwacje@motopuls.pl>"` (domena z SPF/DKIM) |
| `WORKSHOP_NOTIFY_EMAIL` | nie | Adres powiadomień warsztatu (domyślnie e‑mail firmy z ustawień) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | nie | Cloudflare Turnstile w formularzach (włącza się po podaniu obu kluczy) |
| `UPLOAD_DIR` | nie | Katalog zdjęć (domyślnie `./uploads`, w Dockerze wolumen `/app/uploads`) |
| `ANTISPAM_MIN_SECONDS` | nie | Minimalny czas wypełniania formularza (domyślnie 3 s) |

Sekrety trzymaj wyłącznie w `.env` / panelu hostingu. Plik `.env` jest w `.gitignore`.

## Testy i kontrola jakości

```bash
npm run typecheck
```

```bash
npm run lint
```

```bash
npm test
```

```bash
npm run test:e2e
```

- **Testy jednostkowe (Vitest):** wyliczanie slotów i kolizji, strefa Europe/Warsaw i zmiany czasu (DST),
  kontrast kolorów obu motywów (WCAG AA), eksport CSV (ochrona przed formułami), pliki `.ics`.
- **Testy E2E (Playwright):** pełna rezerwacja (5 kroków → potwierdzenie → e‑mail z `.ics`), nagłówki bezpieczeństwa
  i CSP, pierwsze logowanie do panelu (2FA + wymuszona zmiana hasła), wszystkie sekcje panelu, potwierdzenie wizyty,
  eksport CSV, wylogowanie, ponowne logowanie kodem TOTP.
  Testy same stawiają czystą bazę (port 54330), budują aplikację produkcyjnie i uruchamiają ją na porcie 3100 –
  nie dotykają bazy deweloperskiej. Jednorazowo zainstaluj przeglądarkę: `npx playwright install chromium`.
- `npm audit --omit=dev` – zależności produkcyjne bez znanych podatności (stan na dzień przekazania).

## Wdrożenie na VPS (Docker)

Zalecany wariant: jeden serwer (np. 2 vCPU / 2 GB RAM, Debian/Ubuntu) z Dockerem i wtyczką Compose.
[docker-compose.yml](docker-compose.yml) uruchamia: PostgreSQL, jednorazowe migracje + seed, aplikację,
Caddy (HTTPS) i kontener zadań cyklicznych.

> Konfiguracja Dockera nie była uruchamiana na maszynie, na której powstał projekt (brak Dockera) –
> przy pierwszym wdrożeniu sprawdź logi każdej usługi.

1. **DNS:** rekordy `A` (i ewentualnie `AAAA`) dla `twojadomena.pl` oraz `www.twojadomena.pl` → adres IP serwera.
2. **Zapora:** otwórz tylko porty 22, 80 i 443 (443 także UDP dla HTTP/3).
3. **Kod i konfiguracja:**
   ```bash
   git clone <adres-repozytorium> /opt/motopuls && cd /opt/motopuls
   cp .env.example .env && chmod 600 .env
   ```
   W `.env` ustaw: `DOMAIN`, `APP_URL=https://twojadomena.pl`, `APP_SECRET`, `CRON_SECRET`, `POSTGRES_PASSWORD`
   (długie, losowe, bez znaków specjalnych URL), `ADMIN_EMAIL`, dane SMTP i `MAIL_FROM`.
4. **Start:**
   ```bash
   docker compose up -d --build
   ```
5. **Hasło startowe właściciela** (wypisywane tylko raz, przy pierwszym seedzie):
   ```bash
   docker compose logs migrate
   ```
   Zaloguj się na `https://twojadomena.pl/admin`, skonfiguruj 2FA i ustaw własne hasło.
6. **SSL:** Caddy sam pobiera i odnawia certyfikat Let's Encrypt – wystarczy poprawny DNS i otwarte porty 80/443.
   Jeśli nie używasz subdomeny `www`, usuń drugi blok z [Caddyfile](Caddyfile).
7. **Kopie zapasowe:** dodaj zadanie cron z sekcji [Kopie zapasowe](#kopie-zapasowe).

**Aktualizacja:**

```bash
git pull && docker compose up -d --build
```

Migracje bazy wykonują się automatycznie (usługa `migrate`) przed startem nowej wersji aplikacji.

**Ważne – adres IP klienta:** limity żądań (logowanie, formularze) opierają się na nagłówku `X-Forwarded-For`.
Aplikacja musi stać za reverse proxy, które ten nagłówek **nadpisuje** (dołączony Caddyfile to robi).
Nie wystawiaj portu 3000 bezpośrednio do internetu. Jeśli przed Caddy stoi jeszcze Cloudflare lub inny proxy,
skonfiguruj `trusted_proxies` w Caddy.

## Wariant: Vercel + zarządzany PostgreSQL

Możliwy, z ograniczeniami:

1. Utwórz bazę (Neon, Supabase, Vercel Postgres…) i ustaw `DATABASE_URL` (połączenie z poolerem, `sslmode=require`).
2. W projekcie Vercel ustaw zmienne z tabeli powyżej (`APP_URL`, `APP_SECRET`, `CRON_SECRET`, SMTP…).
3. Migracje i seed uruchom z własnego komputera z `DATABASE_URL` bazy produkcyjnej:
   `npm run db:deploy`, potem `npm run db:seed` (hasło startowe pojawi się w Twojej konsoli).
4. Zadania cykliczne: endpointy wymagają metody `POST` z nagłówkiem `Authorization: Bearer <CRON_SECRET>`,
   więc użyj zewnętrznego harmonogramu (np. cron-job.org, GitHub Actions `schedule`) – patrz niżej.
5. Domenę i SSL obsługuje Vercel (Settings → Domains).

Ograniczenia: system plików Vercel jest nietrwały, więc **wgrywanie zdjęć z panelu (galeria) nie będzie działać**
bez przepisania [src/lib/upload.ts](src/lib/upload.ts) na magazyn obiektowy (S3 / Vercel Blob). Reszta aplikacji działa.
Dlatego zalecany jest wariant VPS.

## Zadania cykliczne

| Endpoint | Co robi | Jak często |
| --- | --- | --- |
| `POST /api/cron/reminders` | przypomnienia e‑mail dzień przed wizytą (wysyła dopiero po 9:00, każde tylko raz) | co godzinę |
| `POST /api/cron/maintenance` | anonimizacja nieaktywnych klientów po okresie retencji (ustawienia panelu), czyszczenie wygasłych sesji, tokenów i liczników | co godzinę lub raz dziennie |

W Docker Compose robi to usługa `cron`. Ręcznie / z zewnętrznego harmonogramu:

```bash
curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://twojadomena.pl/api/cron/reminders
```

`GET /api/health` zwraca 200, gdy aplikacja ma połączenie z bazą (do monitoringu).

## Kopie zapasowe

Skrypt [scripts/backup.sh](scripts/backup.sh) (wdrożenie Docker) zapisuje zrzut bazy (`pg_dump`, gzip) i archiwum
zdjęć do `./backups`, usuwa kopie starsze niż 14 dni (`KEEP_DAYS`).

```bash
chmod +x scripts/backup.sh && ./scripts/backup.sh
```

Codziennie o 2:30 (`crontab -e` na serwerze):

```
30 2 * * * cd /opt/motopuls && ./scripts/backup.sh >> /var/log/motopuls-backup.log 2>&1
```

- **Kopia poza serwerem:** synchronizuj katalog `backups/` na inny nośnik (np. `rclone` do zaszyfrowanego zasobu) –
  kopia na tym samym dysku nie chroni przed awarią serwera. Kopie zawierają dane osobowe: szyfruj je i ogranicz dostęp.
- **Przywracanie bazy:**
  `gunzip -c backups/db-RRRRMMDD-GGMMSS.sql.gz | docker compose exec -T db psql -U motopuls -d motopuls`
- **Przywracanie zdjęć:**
  `docker compose exec -T app tar -xzf - -C /app/uploads < backups/uploads-RRRRMMDD-GGMMSS.tar.gz`
- Zachowaj też w bezpiecznym miejscu plik `.env` – bez `APP_SECRET` nie da się odszyfrować sekretów 2FA.
- Raz na kwartał wykonaj próbne odtworzenie na osobnej bazie.
- Przy zarządzanej bazie (Neon/Supabase) włącz kopie automatyczne / PITR u dostawcy.

## Konta, hasła i 2FA

- Role: **Właściciel** (wszystko) i **Pracownik** (pulpit, kalendarz, rezerwacje, klienci, floty, zapytania).
- Nowe konta tworzy właściciel w *Użytkownicy*; panel pokazuje hasło jednorazowe tylko raz.
- Reset hasła: link „Nie pamiętasz hasła?” (e‑mail, ważny 60 min) – 2FA pozostaje wymagane.
- Zgubiony telefon z 2FA: właściciel resetuje 2FA innemu użytkownikowi w panelu.
- **Awaryjnie** (jedyny właściciel stracił dostęp) – z serwera:
  ```bash
  docker compose run --rm migrate npx tsx scripts/admin-reset.ts adres@email.pl
  ```
  (lokalnie: `npm run admin:reset -- adres@email.pl`). Ustawia nowe hasło jednorazowe, usuwa 2FA i wylogowuje wszystkie sesje.

## Co uzupełnić przed startem

W panelu (*Ustawienia*, *Usługi*, *Treści*):

- godziny otwarcia i dni zamknięte, liczba stanowisk, minimalne wyprzedzenie rezerwacji, tryb potwierdzania,
- ceny usług („od … zł”) i czasy trwania – wartości startowe są szacunkowe,
- współrzędne / link mapy i opis dojazdu (zweryfikuj pinezkę),
- treści stron, zdjęcia do galerii,
- **Polityka prywatności i Regulamin rezerwacji** – to szablony; uzupełnij odbiorców danych (hosting, dostawca poczty)
  i daj je do weryfikacji prawnikowi,
- okres retencji danych (automatyczna anonimizacja).

## Struktura projektu

```
prisma/            schemat, migracje, seed
scripts/           baza deweloperska, serwer E2E, backup, awaryjny reset konta
src/app/(public)/  strony publiczne
src/app/admin/     panel: (auth) logowanie/2FA/reset, (panel) sekcje, eksport CSV
src/app/api/       cron, health
src/components/    komponenty UI (formularze, kreator rezerwacji, panel)
src/lib/           logika: sloty i rezerwacje, auth, e-mail, RODO, walidacja (Zod), antyspam
src/proxy.ts       CSP z nonce i nagłówki dla każdego żądania
tests/unit/        Vitest
tests/e2e/         Playwright
```
