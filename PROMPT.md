# Zadanie: strona internetowa + system rezerwacji + panel administracyjny dla warsztatu „Moto Puls”

Jesteś doświadczonym full-stack developerem i projektantem UI. Zbuduj kompletną, produkcyjną aplikację webową dla niezależnego warsztatu samochodowego. Pracuj etapami, po każdym etapie uruchom testy i linter, a na końcu daj mi instrukcję wdrożenia.

## 1. Dane firmy (używaj dokładnie tych)
- Nazwa marki: MOTO PULS (zapis w logo: MOTOPULS)
- Firma: Moto Puls Kamil Klimek i Karol Guzicki S.C., NIP 5543014836
- Adres: ul. Modra 26, 86-005 Białe Błota (okolice Bydgoszczy)
- Telefony: 881 765 880, 535 352 780 (oba jako klikalne linki `tel:`)
- E-mail: motopuls.serwis@gmail.com
- Facebook: https://www.facebook.com/SerwisMotoPuls/
- Dojazd: przy drodze S10 (Bydgoszcz–Poznań), w rejonie ulic Szubińskiej, Czerskiej i Centralnej, niedaleko Hotelu Sylwana. Wykorzystaj to w sekcji „Jak dojechać” obok osadzonej mapy (Google Maps lub OpenStreetMap, ładowanej dopiero po zgodzie na cookies, z linkiem „Nawiguj” jako alternatywą). Mapka poglądowa jest na ulotce: `./assets/ulotka.jpg`.
- Godziny otwarcia i cennik orientacyjny: [DO UZUPEŁNIENIA]
Wszystkie te dane trzymaj w jednym miejscu (konfiguracja/baza, edytowalne z panelu), nigdy nie hardkoduj ich w komponentach.

### Opis firmy (tekst właściciela – zachowaj sens i ton, możesz lekko zredagować)
„Moto Puls to miejsce, które powstało z myślą o Tobie. Wychodzimy naprzeciw najbardziej wymagającym klientom. Wszystkie naprawy wykonujemy ze szczególną starannością, zachowując przy tym indywidualne podejście do każdego powierzonego nam pojazdu.”

### Oferta (to są kategorie usług – rozbuduj każdą o opis i przykładowe usługi do rezerwacji)
1. Naprawa samochodów osobowych i dostawczych (do 3,5 t) wszystkich marek
2. Mechanika i elektromechanika pojazdowa
3. Obsługa i serwis układów klimatyzacji – warsztat posiada stację TEXA Konfort 715R „2 Gas Ready”, czyli obsługuje oba czynniki: R134a i R1234yf (wyeksponuj to – klient z nowszym autem szuka właśnie tej informacji); ozonowanie/odgrzybianie, wymiana filtrów kabinowych, wykrywanie nieszczelności
4. Diagnostyka komputerowa
5. Sprzedaż części zamiennych
6. Obsługa flot samochodowych – osobna sekcja dla firm z formularzem zapytania (nie rezerwacja slotu)

## 2. Identyfikacja wizualna (na podstawie logo)
Pliki: logo w `./assets/logo.png` (przygotuj też wersję SVG – zwektoryzuj, jeśli to możliwe), zdjęcia w `./assets/photos/`, ulotka firmowa w `./assets/ulotka.jpg` (wzorzec stylu: czarne tło, białe i pomarańczowe teksty, pomarańczowe punktory).

Logo: pogrubiony, biały napis MOTOPULS na czarnym tle; ostatnia litera „O” w „MOTO” zastąpiona ikoną turbosprężarki/koła; przez napis przebiega pomarańczowa linia EKG (puls serca) zakończona kropką. Hasło przewodnie wynikające z logo: „puls Twojego auta”.

Paleta (sprawdź dokładne wartości pipetą na pliku logo i zaktualizuj tokeny):
- Tło główne: prawie czarny, np. #1C1A1B
- Powierzchnie/karty: grafit, np. #262426 / #2E2B2D
- Akcent (marka): pomarańcz, np. #F7931E – przyciski CTA, linki, wyróżnienia
- Tekst: biały #FFFFFF i jasnoszary do tekstu drugorzędnego
- Stany: sukces/błąd/ostrzeżenie dobrane tak, by nie zlewały się z pomarańczem
Sprawdź kontrast WCAG AA każdej pary (uwaga: biały tekst na pomarańczowym przycisku może nie spełniać AA – wtedy użyj ciemnego tekstu na pomarańczu).

Kierunek projektowy:
- Domyślnie ciemny motyw (spójny z logo i materiałami firmy), z dopracowanym jasnym trybem jako opcją.
- Motyw linii EKG jako element systemu graficznego: cienkie pomarańczowe linie pulsu jako separatory sekcji, subtelna animacja „bicia” linii w hero (respektuj `prefers-reduced-motion`), linia pulsu jako wskaźnik postępu w kreatorze rezerwacji.
- Ikona turbo/koła jako element dekoracyjny, loader i favicon.
- Typografia: nagłówki w mocnym, szerokim kroju bezszeryfowym o technicznym charakterze (pasującym do logo), tekst w czytelnym kroju z pełnym wsparciem polskich znaków. Fonty hostowane lokalnie.
- Charakter: konkretny, rzetelny, warsztatowy, ale nowoczesny i czysty – nie przeładowany. Unikaj wyglądu generycznego szablonu.
- Zdjęcia: wykorzystaj zdjęcie stanowiska serwisu klimatyzacji (`./assets/photos/klimatyzacja.jpg`) w sekcji klimatyzacji; przytnij je tak, by eksponować sprzęt TEXA. Zachowaj miejsca na kolejne zdjęcia warsztatu (placeholdery w stylu marki, bez stockowych zdjęć ludzi).
- W pełni responsywnie, mobile-first. Na telefonie stały przycisk „Zadzwoń” i „Umów wizytę”.

## 3. Stack technologiczny
- Next.js (App Router) + TypeScript (strict)
- PostgreSQL + Prisma (migracje w repo)
- Tailwind CSS (paleta jako design tokeny) + dostępne komponenty (Radix/shadcn)
- Walidacja: Zod – wspólne schematy dla klienta i serwera
- E-mail transakcyjny przez SMTP/Resend (konfigurowalne w `.env`)
- Testy: Vitest (jednostkowe), Playwright (E2E)
- Docker + docker-compose (app + db), plik `.env.example`

## 4. Strona publiczna (język polski)
- Strona główna: hero z logo, hasłem i CTA „Umów wizytę” + „Zadzwoń”, kategorie usług, wyróżnik klimatyzacji (R134a i R1234yf), dlaczego my, obsługa flot, opinie (zarządzane z panelu), dojazd z mapą, kontakt.
- Podstrony: Usługi (każda kategoria z opisem i cennikiem orientacyjnym), Klimatyzacja, Dla firm / floty, Części zamienne (formularz zapytania o część: marka, model, rok, VIN, nazwa części), O nas, Kontakt, Rezerwacja, Polityka prywatności, Regulamin rezerwacji.
- Link do profilu na Facebooku w stopce i w sekcji kontakt.
- SEO: metadane, Open Graph (grafika OG w stylu marki), sitemap.xml, robots.txt, JSON-LD `AutoRepair` z adresem, telefonami, godzinami i geolokalizacją; lokalne frazy (mechanik Białe Błota, warsztat Bydgoszcz, klimatyzacja samochodowa R1234yf Bydgoszcz, diagnostyka komputerowa).
- Wydajność: Lighthouse ≥ 95 we wszystkich kategoriach, obrazy w AVIF/WebP z responsywnymi rozmiarami.
- Dostępność: WCAG 2.2 AA, pełna obsługa klawiatury, poprawne etykiety formularzy.

## 5. Rezerwacja online (kluczowa funkcja)
Kreator krok po kroku (postęp pokazany linią pulsu):
1. Wybór usługi (jedna lub kilka – sumowany czas trwania). Przy klimatyzacji pytanie o rodzaj czynnika z opcją „nie wiem” i podpowiedzią (zwykle auta od ok. 2017 r. mają R1234yf).
2. Dane pojazdu: marka, model, rok, nr rejestracyjny (opcjonalnie VIN), przebieg, typ (osobowy / dostawczy do 3,5 t), opis usterki.
3. Wybór terminu z kalendarza – pokazuj tylko realnie dostępne sloty, liczone z: godzin otwarcia, dni wolnych/świąt (polskie święta automatycznie), blokad admina, liczby stanowisk i czasu trwania usług.
4. Dane klienta: imię, telefon, e-mail, zgody (regulamin – wymagana; marketing – opcjonalna, osobno).
5. Podsumowanie i potwierdzenie.
Wymagania:
- Zero podwójnych rezerwacji: blokada slotu w transakcji bazy (constraint/lock), obsługa wyścigów.
- Statusy: oczekująca → potwierdzona → w realizacji → zakończona / anulowana / nieobecność.
- E-mail do klienta po złożeniu i po zmianie statusu (w szacie graficznej marki, z plikiem .ics) + powiadomienie do warsztatu.
- Przypomnienie dzień przed wizytą (zadanie cykliczne).
- Unikalny, nieodgadywalny link dla klienta do podglądu i anulowania rezerwacji (do X godzin przed wizytą – konfigurowalne).
- Tryb potwierdzania konfigurowalny: automatyczny lub ręczny przez admina.

## 6. Panel administracyjny (`/admin`)
- Logowanie: e-mail + hasło (argon2id), obowiązkowe 2FA (TOTP), blokada po nieudanych próbach, reset hasła e-mailem, sesje w ciasteczkach httpOnly/Secure/SameSite, wylogowanie ze wszystkich urządzeń.
- Role: Właściciel (pełny dostęp, zarządzanie kontami – w systemie dwóch właścicieli) i Pracownik (rezerwacje, kalendarz). Autoryzacja sprawdzana po stronie serwera przy każdym żądaniu.
- Dashboard: dzisiejsze i nadchodzące wizyty, rezerwacje do potwierdzenia, zapytania o części i od flot, proste statystyki (liczba wizyt, najczęstsze usługi, odsetek nieobecności).
- Kalendarz (dzień/tydzień/miesiąc) z przeciąganiem wizyt, ręczne dodawanie wizyty (np. umówionej telefonicznie), blokowanie terminów/urlopów.
- Zarządzanie: usługi (nazwa, kategoria, opis, cena od–do, czas trwania, aktywna/nieaktywna), godziny otwarcia, dni wolne, liczba stanowisk, dane firmy, treści strony (opinie, teksty sekcji, zdjęcia), szablony e-maili.
- Baza klientów i pojazdów z historią wizyt i notatkami wewnętrznymi; wyszukiwanie po nazwisku, telefonie, nr rejestracyjnym. Klienci flotowi z przypisanymi pojazdami.
- Skrzynka zapytań: części zamienne, floty, formularz kontaktowy – ze statusami (nowe / w toku / zamknięte).
- Eksport CSV, dziennik zdarzeń (audit log: kto, co, kiedy).
- Panel w tej samej identyfikacji (ciemny, pomarańczowe akcenty), czytelny i wygodny także na tablecie w warsztacie.

## 7. Bezpieczeństwo (traktuj priorytetowo)
- Zgodność z OWASP Top 10 i OWASP ASVS poziom 2 tam, gdzie to sensowne.
- Walidacja i sanityzacja wszystkich danych na serwerze; zapytania wyłącznie przez ORM/parametryzowane.
- Ochrona CSRF, nagłówki bezpieczeństwa (CSP bez `unsafe-inline` tam, gdzie się da, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy).
- Rate limiting na logowanie, rezerwacje i formularze + ochrona antyspamowa (honeypot + limit czasowy; opcjonalnie Cloudflare Turnstile).
- Bezpieczny upload zdjęć w panelu (weryfikacja typu, limit rozmiaru, usuwanie metadanych EXIF).
- Sekrety tylko w zmiennych środowiskowych; brak danych wrażliwych w logach i URL-ach.
- Zależności bez znanych podatności (`npm audit`), aktualne wersje.
- Kopie zapasowe bazy – skrypt + instrukcja.
- Na koniec przeprowadź własny przegląd bezpieczeństwa kodu i wypisz znalezione ryzyka.

## 8. RODO
- Polityka prywatności z danymi administratora (Moto Puls Kamil Klimek i Karol Guzicki S.C.) – szablon do weryfikacji przez prawnika; klauzula informacyjna przy formularzach.
- Baner cookies z realnym wyborem – domyślnie tylko niezbędne; mapa i analityka ładowane dopiero po zgodzie.
- Minimalizacja danych, automatyczna anonimizacja danych klientów po konfigurowalnym okresie, eksport i usunięcie danych klienta z panelu.

## 9. Jakość i dostarczenie
- Czysta architektura, komentarze tam, gdzie logika nie jest oczywista, brak martwego kodu.
- Testy: logika slotów i kolizji (jednostkowe, w tym strefa czasowa Europe/Warsaw i zmiana czasu), pełny przepływ rezerwacji i logowania do panelu (E2E).
- Seed z usługami z sekcji „Oferta” i kontem admina (hasło generowane i wypisane w konsoli przy pierwszym uruchomieniu, wymuszona zmiana przy pierwszym logowaniu).
- README: uruchomienie lokalne, zmienne środowiskowe, wdrożenie (VPS z Dockerem lub Vercel + zarządzany Postgres), konfiguracja domeny i SSL, backup.
- Na końcu podsumuj: co zrobione, lista placeholderów do uzupełnienia, znane ograniczenia.

Zanim zaczniesz kodować, przedstaw mi krótki plan (struktura katalogów, model danych, paleta kolorów odczytana z logo, koncepcja hero z linią pulsu) i poczekaj na akceptację.
