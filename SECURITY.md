# Przegląd bezpieczeństwa – Moto Puls

Własny przegląd kodu wykonany na koniec prac (punkt odniesienia: OWASP Top 10 i ASVS poziom 2).
To nie jest zewnętrzny audyt ani test penetracyjny – przed uruchomieniem z prawdziwymi danymi klientów warto zlecić
niezależną weryfikację.

## Zastosowane zabezpieczenia

| Obszar | Rozwiązanie |
| --- | --- |
| Hasła | argon2id; minimum 12 znaków; hasła startowe losowe, jednorazowe, z wymuszoną zmianą |
| 2FA | obowiązkowe TOTP dla każdego konta; sekret szyfrowany w bazie (AES‑GCM, klucz z `APP_SECRET`); ochrona przed ponownym użyciem kodu |
| Blokady | 5 błędnych prób → blokada konta na 15 min; limit prób logowania na adres IP; komunikat nie zdradza, czy konto istnieje |
| Sesje | losowy token, w bazie tylko jego skrót SHA‑256; cookie `__Host-` z `HttpOnly`, `Secure`, `SameSite=Lax`; „wyloguj wszędzie”; unieważnienie sesji po zmianie hasła, roli lub dezaktywacji |
| Reset hasła | jednorazowy token (w bazie skrót), ważny 60 min; odpowiedź identyczna dla istniejących i nieistniejących kont |
| Autoryzacja | sprawdzana po stronie serwera w każdej stronie panelu, akcji i trasie eksportu (`requireUser` / `requireOwner`); panel bez 2FA jest niedostępny |
| CSRF | wszystkie zmiany przez Server Actions (weryfikacja nagłówka Origin przez Next.js) + `SameSite=Lax`; trasy GET niczego nie zmieniają |
| Walidacja | schematy Zod po stronie serwera dla każdego formularza i akcji (współdzielone z klientem) |
| SQL Injection | wyłącznie Prisma (zapytania parametryzowane), brak surowego SQL z danymi użytkownika |
| XSS | React escapuje dane; CSP z nonce bez `unsafe-inline` dla skryptów i stylów; JSON‑LD escapowany; szablony e‑maili z escapowaniem zmiennych |
| Nagłówki | CSP, HSTS, `X-Content-Type-Options`, `X-Frame-Options: DENY` + `frame-ancestors 'none'`, `Referrer-Policy`, `Permissions-Policy`; `no-store` dla panelu i stron rezerwacji |
| Formularze publiczne | limit żądań na IP (licznik w bazie), honeypot, podpisany znacznik czasu, opcjonalnie Cloudflare Turnstile |
| Podwójne rezerwacje | sprawdzenie zajętości i zapis w jednej transakcji z blokadą; test jednostkowy kolizji i stref czasowych |
| Link klienta | losowy token 256 bitów w adresie; strona z `noindex`, `no-store`, `Referrer-Policy: no-referrer` |
| Upload zdjęć | tylko właściciel; limit 5 MB; weryfikacja formatu po zawartości; przekodowanie przez `sharp` do WebP (usuwa metadane i ewentualny osadzony kod); losowa nazwa pliku; serwowanie przez trasę z walidacją nazwy |
| CSV | neutralizacja formuł (`=`, `+`, `-`, `@`) – ochrona przed CSV injection; eksport tylko dla właściciela, odnotowany w dzienniku |
| Zadania cykliczne | sekret `Bearer`, porównanie w stałym czasie |
| Logi | bez danych osobowych i sekretów; błędy poczty bez treści i adresata |
| RODO | minimalizacja danych, baner cookies z realnym wyborem (mapa dopiero po zgodzie), eksport i anonimizacja klienta z panelu, automatyczna anonimizacja po okresie retencji, dziennik zdarzeń |
| Zależności | `npm audit --omit=dev`: 0 podatności w zależnościach produkcyjnych |
| Kontener | proces jako użytkownik `node`, bez uprawnień (`cap_drop: ALL`, `no-new-privileges`), baza niedostępna z zewnątrz |

## Ryzyka i znane ograniczenia

1. **Adres IP z nagłówka proxy.** Limity żądań ufają `X-Forwarded-For`. Jeśli aplikacja zostanie wystawiona
   bez proxy nadpisującego ten nagłówek, limity na IP da się obejść (blokada konta po 5 próbach działa niezależnie).
   Dołączony Caddyfile nagłówek nadpisuje.
2. **Blokada konta jako wektor DoS.** Znając e‑mail administratora, ktoś może celowo blokować konto na 15 min.
   Ograniczenie: limit prób na IP; e‑mail logowania warto mieć inny niż publiczny adres firmy.
3. **`APP_SECRET` to pojedynczy punkt krytyczny.** Wyciek pozwala odszyfrować sekrety TOTP z bazy i podpisywać
   znaczniki formularzy; utrata – wymaga ponownej konfiguracji 2FA (skrypt `admin:reset`). Brak mechanizmu rotacji klucza.
4. **Hasła jednorazowe na ekranie / w logach.** Hasło startowe z seeda trafia do konsoli (`docker compose logs migrate`),
   a hasła nowych kont są pokazywane właścicielowi w panelu. Zmiana przy pierwszym logowaniu jest wymuszona,
   ale logi z seeda warto po wdrożeniu wyczyścić.
5. **Token w adresie URL** (link klienta do rezerwacji, link resetu hasła). Może zostać w historii przeglądarki
   i logach proxy. Ograniczenia: wysoka entropia, `no-referrer`, krótka ważność resetu; link klienta pozwala
   tylko obejrzeć i odwołać jedną wizytę. Zalecane wyłączenie logowania pełnych ścieżek `/rezerwacja/*` w proxy.
6. **Brak kodów zapasowych 2FA i WebAuthn.** Utrata telefonu wymaga resetu przez innego właściciela lub skryptu
   awaryjnego na serwerze.
7. **CSP.** Dopuszcza ramkę mapy (po zgodzie) i – gdy włączony – Turnstile. Brak raportowania naruszeń (`report-to`).
8. **Kopie zapasowe nie są szyfrowane** przez skrypt i domyślnie leżą na tym samym serwerze – wymagają
   zaszyfrowanej kopii poza serwerem (README).
9. **E‑mail.** Treść potwierdzeń (termin, dane pojazdu) idzie zwykłą pocztą; dostarczalność i ochrona przed
   podszywaniem zależą od SPF/DKIM/DMARC domeny nadawcy.
10. **Brak WAF / ochrony przed DDoS** na poziomie sieci – w razie potrzeby Cloudflare przed serwerem
    (wtedy skonfigurować `trusted_proxies`).
11. **Elementy nieprzetestowane w praktyce:** konfiguracja Docker/Caddy (na maszynie deweloperskiej nie było Dockera),
    integracja Turnstile (brak kluczy), wysyłka przez prawdziwy SMTP.
12. **Narzędzia deweloperskie:** `npm audit` zgłasza podatności o średniej wadze w łańcuchu ESLint (`minimatch`) –
    nie trafiają do obrazu produkcyjnego; zaktualizować, gdy pojawi się poprawka.
13. **Dokumenty prawne** (polityka prywatności, regulamin, klauzula informacyjna) to szablony – wymagają
    uzupełnienia i weryfikacji prawnej; z dostawcami hostingu i poczty należy zawrzeć umowy powierzenia.

## Zgłaszanie problemów

Podejrzenie luki zgłoś właścicielowi serwisu (adres e‑mail firmy w stopce strony) – nie publikuj szczegółów publicznie.
