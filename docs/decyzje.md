# Decyzje właściciela (do uzupełnienia)

Agenci nie zgadują tych wartości. Dopóki nie ma decyzji, obowiązują wartości domyślne z kolumny „Do czasu decyzji".

| # | Decyzja | Opcje / uwagi | Do czasu decyzji | Twoja decyzja |
|---|---|---|---|---|
| 1 | Godziny otwarcia | Baza (`OpeningHours`) i strona (2026-11-13): pn–pt 8:00–17:00, sob. i niedz. nieczynne. Zlecenie: pn–pt 8:00–18:00, sob. 8:00–16:00, niedziela do potwierdzenia. Zmiana to edycja w panelu admina (Ustawienia), nie w kodzie | Wartość z bazy, bez zmian | |
| 2 | Zasób rezerwacji | System używa stanowisk (`Settings.bays`, domyślnie 2). Czy to odpowiada rzeczywistości (stanowiska, podnośniki, mechanicy)? | Bez zmian | |
| 3 | Cena Premium | Przykład: 2× stawka standardowa (do zatwierdzenia) | „Cena ustalana indywidualnie" | |
| 4 | Odbiór auta (Premium) | Zasięg, koszt, godziny | „DO UZUPEŁNIENIA" | |
| 5 | Dostawca SMS i limit kosztów | Agent przygotuje 2–3 opcje ze sprawdzonymi cenami | SMS wyłączony | |
| 6 | Treści prawne | Zgoda RODO, zgoda na SMS, cookies i analityka. Wymagają zatwierdzenia przez właściciela lub prawnika | „DO ZATWIERDZENIA" | |
| 7 | Domena i hosting | Produkcja na Render (onrender.com), a README opisuje VPS/Docker i Vercel. Audytor sprawdzi stan faktyczny (baza, cron, usypianie). Własna domena poprawi SEO | Bez zmian | |
| 8 | Dane do podstron i schematu | Zdjęcia, opis zespołu, ceny orientacyjne, gwarancje, opinie (tylko prawdziwe) | „DO UZUPEŁNIENIA" | |

## Dopisane po audycie (2026-11-13)

Źródła: `docs/audyt/frontend.md`, `kod.md`, `seo.md`.

| # | Decyzja | Opcje / uwagi | Do czasu decyzji | Twoja decyzja |
|---|---|---|---|---|
| 9 | Hosting Render: usypianie, baza, cron, kopie | Pierwsze żądanie GET / miało TTFB 17,9 s (zimny start), potem 0,2–0,9 s. Konfiguracja Render jest poza repo (brak `render.yaml`). Potrzebne: plan, rodzaj bazy, cron przypomnień i anonimizacji RODO, SMTP, dysk na uploady, backup. Opcje: plan bez usypiania albo keep-alive na `/api/health` | Bez zmian | |
| 10 | „Odrzucenie" rezerwacji | Dziś to zwykłe anulowanie, bez osobnego statusu i bez powodu w mailu. Czy dodać status REJECTED i pole powodu? | Bez zmian | |
| 11 | Obietnice na /dla-firm | Strona zapowiada „historię napraw każdego auta z floty" i priorytet terminów, a systemu tej funkcji nie ma. Opcje: zbudować (panel klienta) albo złagodzić treść do czasu wdrożenia | Bez zmian | |
| 12 | Współrzędne firmy | W seedzie oznaczone PLACEHOLDER (53.0952 / 17.9285), trafiają do JSON-LD. Potrzebne dokładne dane | „DO UZUPEŁNIENIA" | |
| 13 | Pola [DO UZUPEŁNIENIA] w polityce prywatności | `polityka-prywatnosci/page.tsx:69-71`. Wymaga danych administratora i zatwierdzenia treści (powiązane z #6) | „DO ZATWIERDZENIA" | |
| 14 | Analityka i reklamy (zgoda) | Baner deklaruje brak analityki, CSP blokuje GA4/Ads/GTM. Wdrożenie wymaga kategorii zgód, Consent Mode v2 i poluzowania CSP za flagą. Czy planujesz Google Ads / GA4? | Brak analityki | |
| 15 | Domena własna | 301 z onrender.com, zmiana `APP_URL`. Część decyzji #7 | Bez zmian | |
| 16 | Podstrony usług (SEO lokalne) | Propozycja: tylko dla usług z seeda (mechanika, diagnostyka, naprawy), bez stron per miejscowość. Wymaga zatwierdzenia zakresu | Bez zmian | |
| 17 | Wizytówka Google | Stan nieznany (lista kontrolna w `seo.md`). Czy istnieje i kto ją prowadzi? | DO UZUPEŁNIENIA | |

## Opcje i wpływ na koszt dla decyzji 1-17 (uzupełnienie architekta, 2026-11-13)

Źródło: `docs/backlog.md`. Tabele powyżej pozostają bez zmian; tu dopisane są opcje, wpływ na backlog i koszt tam, gdzie go brakowało.
Ceny oznaczone [ZAŁOŻENIE] pochodzą z wiedzy ogólnej, a nie ze sprawdzenia u źródła: przed decyzją zweryfikować na stronie dostawcy (cenniki się zmieniają).

| # | Opcje | Wpływ na backlog | Koszt miesięczny |
|---|---|---|---|
| 1 | (a) zostawić pn-pt 8-17; (b) pn-pt 8-18, sob. 8-16 jak w zleceniu; (c) inne | Zero kodu: edycja w panelu (Ustawienia) lub w `seed-data.ts`. Kalendarz admina po MP-014 dopasuje się sam. JSON-LD i strona czytają bazę | 0 zł |
| 2 | (a) stanowiska jak dziś (`bays`); (b) liczyć mechaników zamiast stanowisk (ta sama liczba w `bays`); (c) osobne zasoby per usługa (np. stacja klimatyzacji) | (a)/(b) zero kodu; (c) duża zmiana modelu slotów, poza obecnym backlogiem | 0 zł dla (a)/(b) |
| 3 | (a) „cena ustalana indywidualnie"; (b) mnożnik stawki (np. 2×); (c) stała dopłata | MP-032: tekst w `Settings.premiumPriceNote`, bez liczenia ceny w kodzie | 0 zł |
| 4 | (a) bez odbioru na start; (b) odbiór w promieniu X km za stałą opłatą; (c) wycena indywidualna | MP-032/MP-033: `premiumPickupEnabled` domyślnie wyłączony | koszt operacyjny warsztatu (DO UZUPEŁNIENIA) |
| 5 | Dostawcy do porównania przez `mp-sms` (MP-023): polskie bramki SMS API (np. SMSAPI, SerwerSMS, JustSend) i globalne (np. Twilio). Agent poda ceny ze źródłem i datą | MP-025 adapter i MP-027 wysyłka produkcyjna czekają na wybór; tryb testowy może powstać wcześniej | Wzór: `liczba potwierdzeń w miesiącu × segmenty na SMS × cena segmentu` (+ ewentualne przypomnienia MP-030 ×2). Przykład wolumenu: 100 / 300 / 600 wizyt miesięcznie. Polskie znaki zmieniają kodowanie na UCS-2 (70 znaków na segment zamiast 160), więc SMS może kosztować 2-3× więcej (patrz D-24). Ceny: DO UZUPEŁNIENIA (MP-023) |
| 6 | (a) właściciel zatwierdza szablony; (b) przegląd prawnika | Blokuje publikację treści zgody SMS (MP-028), polityki (MP-045), kategorii cookies (MP-047) | (b) jednorazowy koszt prawnika: DO UZUPEŁNIENIA |
| 7 | Patrz #9 i #15 | MP-001 dokumentuje stan; README dostaje sekcję Render | patrz #9 |
| 8 | Dostarczyć zdjęcia, opis zespołu, gwarancje, opinie (tylko prawdziwe) | MP-041 (treści podstron), MP-046, galeria `/o-nas` | 0 zł (praca właściciela) |
| 9 | Usługa web: (a) darmowa z usypianiem + keep-alive (ping co 10-14 min; zużywa darmowe godziny instancji); (b) płatny plan bez usypiania. Baza: (a) darmowa Render Postgres; (b) płatna z kopiami; (c) zewnętrzny zarządzany Postgres. Cron: (a) Render Cron Job; (b) GitHub Actions `schedule` (repo jest na GitHub). Uploady: (a) Persistent Disk; (b) akceptacja utraty zdjęć przy redeployu do czasu migracji. SMTP: potwierdzić, czy ustawiony | MP-001, MP-003, MP-004, MP-005, MP-002 | [ZAŁOŻENIE, zweryfikować na render.com/pricing] web Starter ok. 7 USD; Postgres najmniejszy płatny ok. 6-7 USD; darmowa baza Render wygasa po ok. 30 dniach (ryzyko utraty danych!); Cron Job od ok. 1 USD; dysk ok. 0,25 USD/GB. GitHub Actions: [ZAŁOŻENIE] darmowy limit minut zwykle wystarcza na cron co godzinę. Razem wariant płatny: ok. 15-20 USD/mies. [ZAŁOŻENIE] |
| 10 | (a) [REKOMENDACJA] akcja „Odrzuć" = CANCELLED + pole powodu (`cancelReason`) + powód w mailu; (b) osobny status REJECTED (więcej zmian: etykiety, statystyki, filtry, przejścia); (c) bez zmian | MP-011 (wariant a: średnia trudność) | 0 zł |
| 11 | (a) [REKOMENDACJA] złagodzić treść teraz (MP-038), przywrócić po etapie 5 (MP-058); (b) zostawić | MP-038, MP-058 | 0 zł |
| 12 | Podać dokładne współrzędne (np. z pinezki w Mapach Google) | Wpis w panelu Ustawienia, zero kodu; JSON-LD i mapa zmienią się same | 0 zł |
| 13 | Uzupełnić: hosting (Render), poczta (dostawca SMTP), biuro rachunkowe, inni odbiorcy; potem zatwierdzenie (#6) | MP-045 | jak #6 |
| 14 | (a) brak analityki (dziś); (b) GA4 + Consent Mode v2; (c) GA4 + Google Ads z konwersjami; (d) analityka bez ciasteczek/samodzielnie hostowana | MP-047, MP-048 (tylko przy b/c/d) | GA4: [ZAŁOŻENIE] bezpłatne; Ads: budżet kampanii DO UZUPEŁNIENIA; (d) zależnie od narzędzia: DO UZUPEŁNIENIA |
| 15 | (a) zostać na onrender.com; (b) własna domena (np. .pl) z 301 | MP-044 | domena: opłata roczna rejestratora DO UZUPEŁNIENIA (uwaga: odnowienie bywa droższe niż 1. rok); własna domena w Render [ZAŁOŻENIE] bez dopłaty |
| 16 | Zatwierdzić listę usług z podstronami (propozycja: naprawy do 3,5 t, mechanika i elektromechanika, diagnostyka komputerowa; klimatyzacja już ma stronę) i dostarczyć/zatwierdzić treść | MP-041 | 0 zł |
| 17 | Podać URL wizytówki i kto ją prowadzi | MP-040 (`hasMap`, `sameAs`) | 0 zł |

## Nowe decyzje z planowania (2026-11-13)

| # | Decyzja | Opcje / uwagi | Do czasu decyzji | Twoja decyzja |
|---|---|---|---|---|
| 18 | Nieobsłużone rezerwacje PENDING | Dziś PENDING blokuje termin bez limitu. Opcje: (a) [REKOMENDACJA] codzienne przypomnienie mailem do warsztatu o PENDING starszych niż X godzin (np. 12 h, edytowalne); (b) jak (a) + automatyczne anulowanie po Y godzinach z mailem do klienta; (c) bez zmian. Koszt 0 zł. Backlog: MP-012 | Bez przypomnień i bez auto-anulowania | |
| 19 | Przenoszenie wizyty przez admina poza godzinami/święta | Dziś możliwe bez ostrzeżenia. Opcje: (a) [REKOMENDACJA] ostrzeżenie + potwierdzenie i wpis w dzienniku; (b) twarda blokada; (c) bez zmian. Koszt 0 zł. Backlog: MP-013 | Bez zmian | |
| 20 | SMS przy wizytach wpisanych ręcznie (telefonicznych) | Klient nie przechodzi przez formularz zgody. Opcje: (a) pole „klient zgodził się na SMS" w formularzu panelu (zgoda ustna, z datą); (b) SMS tylko dla rezerwacji online ze zgodą; (c) SMS do wszystkich (wymaga oceny prawnej, #6). Wpływ na koszt: (a)/(c) więcej SMS. Backlog: MP-027, MP-028 | (b) tylko online ze zgodą | |
| 21 | Obszar obsługi (`areaServed` w JSON-LD) | Dziś zakodowane: Białe Błota, Bydgoszcz. Podać listę miejscowości/gmin do pola w Ustawieniach. Koszt 0 zł. Backlog: MP-040 | Białe Błota, Bydgoszcz | |
| 22 | Logowanie klienta (etap 5) | (a) [REKOMENDACJA] jednorazowy link e-mail (bez haseł, mniejsze ryzyko); (b) e-mail + hasło (argon2) z resetem; (c) link SMS (koszt SMS przy każdym logowaniu). Backlog: MP-050, MP-052 | Etap 5 nie startuje | |
| 23 | Zakres danych naprawy widocznych klientowi (etap 5) | Czy pokazywać: wykonane prace, koszty części i robocizny, przebieg, etapy naprawy (diagnoza, czekamy na części…)? Kto wpisuje (pracownik czy tylko właściciel)? Retencja zgodna z `retentionMonths`? Wpływ RODO i polityki (#6). Backlog: MP-054, MP-055 | Etap 5 nie startuje | |
| 24 | Polskie znaki w SMS | (a) [REKOMENDACJA] transliteracja (ą→a…) w SMS: 160 znaków na segment, niższy koszt; (b) polskie znaki: 70 znaków na segment, ok. 2-3× więcej segmentów. Backlog: MP-026 | (a) transliteracja w trybie testowym | |

## Decyzje podjęte (2026-11-13)

Właściciel zaakceptował rekomendacje architekta. Dotyczy tylko pozycji, które miały oznaczoną [REKOMENDACJĘ].

| # | Decyzja | Wybór |
|---|---|---|
| 10 | Odrzucenie rezerwacji | (a) CANCELLED + `cancelReason` + powód w mailu (MP-011) |
| 11 | Treść /dla-firm | (a) złagodzić teraz (MP-038), przywrócić po etapie 5 (MP-058) |
| 18 | Nieobsłużone PENDING | (a) przypomnienie do warsztatu, bez auto-anulowania (MP-012) |
| 19 | Przenoszenie poza godziny | (a) ostrzeżenie + potwierdzenie + wpis w dzienniku (MP-013) |
| 22 | Logowanie klienta (etap 5) | (a) jednorazowy link e-mail |
| 24 | Polskie znaki w SMS | transliteracja |

Nadal otwarte (brak rekomendacji lub brak danych od właściciela): D-9 (Render: plan, baza, cron, SMTP, dysk, backup), D-5, D-6, D-3, D-4, D-12–D-17, D-20, D-21, D-23.

**D-9 (częściowo, 2026-11-13):** na razie baza i serwer Render darmowe, przejście na płatne przy starcie produkcyjnym. Do ustalenia: SMTP, cron, dysk na uploady, backup. Uwaga [ZAŁOŻENIE]: darmowa baza Render wygasa po ok. 30 dniach, więc dane testowe mogą zniknąć.

**D-5 (uzupełnienie, 2026-11-13):** dodatkowa opcja do rozważenia z klientem: SMS z własnej karty SIM przez aplikację-bramkę na Androidzie. Opis i ryzyka w `docs/uslugi-zewnetrzne.md`, sekcja 4. MP-023 ma sprawdzić aplikacje i regulaminy operatorów.

## D-9: stan Render i bazy, sprawdzony 2026-11-15 (tylko odczyt)

**Fakty** (Render API i zapytanie SELECT do tabeli `_prisma_migrations`):
- [FAKT] Usługa `motopuls` na Render: web service, Docker (`./Dockerfile`), region Frankfurt, plan `free`, gałąź `main`, **autoDeploy po commicie włączony** (`autoDeployTrigger: commit`). Jedyny dotychczasowy deploy: `cb5568d` z 2026-11-10, status live.
- [FAKT] Na Render NIE ma instancji Postgres. Baza to projekt Supabase `motopuls` (region eu-central-1, Postgres 17, status ACTIVE_HEALTHY).
- [FAKT] W tej bazie Prisma ma zastosowaną tylko migrację `20261110130016_init`. Sześć nowszych migracji z etapów 1, 3 i 4 NIE jest zastosowanych.
- [FAKT] `Dockerfile` kończy się `CMD ["node", "server.js"]`: kontener NIE uruchamia migracji przy starcie (w compose robi to osobny serwis `migrate`).
- [FAKT] Na koncie Render działa też darmowy web service `ideaflow-pilot-api` oraz dwie strony statyczne (inne projekty).

**Ryzyko krytyczne:** `git push` do `main` uruchomi wdrożenie nowego kodu, który czyta kolumny i wartość enuma z niezastosowanych migracji. Aplikacja zacznie zwracać błędy Prisma (m.in. na każdej stronie czytającej `Settings`). Dlatego kolejność MUSI być: najpierw `db:deploy` na bazie produkcyjnej (robi właściciel), dopiero potem push.

**Założenia do weryfikacji w cenniku/ustawieniach** [ZAŁOŻENIE]:
- Darmowy web service Render usypia po ok. 15 min bezczynności (zimny start ok. 18 s, zmierzony).
- Darmowe instancje w jednym koncie dzielą pulę ok. 750 godzin miesięcznie. Keep-alive utrzymujący `motopuls` 24/7 zużyje prawie całą pulę, więc druga darmowa usługa (`ideaflow-pilot-api`) może przestać działać.
- Darmowy web service Render nie ma trwałego dysku: pliki w `/app/uploads` znikają przy każdym wdrożeniu i restarcie.
- Supabase na planie darmowym pauzuje projekt po ok. 7 dniach bezczynności i nie ma kopii zapasowych punktowych (PITR).

**Plan domknięcia (kolejność):**
1. Kopia bazy przed migracją (właściciel: Supabase, Database, Backups lub `pg_dump`).
2. `npm run db:deploy` z `DATABASE_URL` produkcyjnym, uruchomione przez właściciela lokalnie (sześć addytywnych migracji; wartości enuma nie da się cofnąć).
3. Opcjonalnie wyłączenie autoDeploy na czas migracji, albo push dopiero po kroku 2.
4. SMTP: konto Mailtrap (test) lub Brevo/Resend (produkcja), zmienne `SMTP_*` i `MAIL_FROM` w panelu Render (właściciel; sekrety nie trafiają do repo ani rozmowy).
5. Cron: workflow GitHub Actions wywołujący `/api/cron/*` co godzinę z `CRON_SECRET` w GitHub Secrets (MP-003, kod przygotuje agent, sekret ustawia właściciel).
6. Uploady: do czasu płatnego planu z dyskiem lub zewnętrznego magazynu zdjęcia z panelu giną przy deployu.
7. Przejście na płatny plan Render (bez usypiania, z dyskiem) przed startem produkcyjnym; Supabase Pro dla kopii.
