# Audyt frontendu Moto Puls

Data: 2026-11-13. Tryb: tylko odczyt kodu i produkcji (https://motopuls.onrender.com/), bez zapisów, bez wysyłania formularzy.
Metoda: lektura `src/app/(public)/*`, `src/components/{site,booking,brand}`, `form.tsx`, `globals.css`, `tests/unit/contrast.test.ts` oraz zrzuty i pomiary Playwrightem (Chromium) produkcji w 390, 768 i 1280 px.
Etykiety: [FAKT] sprawdzone w kodzie lub na produkcji, [ZAŁOŻENIE] wniosek bez bezpośredniego sprawdzenia, [REKOMENDACJA] propozycja.

## Podsumowanie
- Frontend jest dojrzały i spójny; większość problemów to drobne poprawki, nie przebudowa.
- Wszystkie 10 podstron zwraca 200, ma dokładnie jeden `h1`, zero obrazków bez `alt` i zero poziomego przewijania w 390/768/1280 px. [FAKT] pomiar Playwright, 30 kombinacji strona x szerokość.
- Żadna podstrona nie jest szczątkowa (270-740 słów tekstu). Braki dotyczą treści "DO UZUPEŁNIENIA" w polityce prywatności i zaślepek zdjęć.

## 1. Działa

### Podstrony i treść
- [FAKT] Pełna treść (słowa na 1280 px): `/uslugi` 740, `/klimatyzacja` 430, `/dla-firm` 313, `/czesci-zamienne` 282, `/o-nas` 306, `/kontakt` 297, `/regulamin-rezerwacji` 390, `/polityka-prywatnosci` 687 (pomiar Playwright). Strona główna 517 słów, 10 sekcji (`src/app/(public)/page.tsx:32-167`).
- [FAKT] Usługi, ceny orientacyjne i czasy pochodzą z bazy (`getCategories`), nie z komponentów (`uslugi/page.tsx:20-62`). Adres, telefony, godziny z `Settings` i `OpeningHours` (`Chrome.tsx`, `Sections.tsx:96-135`).
- [FAKT] Każda podstrona ma `metadata` z `title`, `description` i `canonical`; strona statusu rezerwacji ma `robots: noindex` i `referrer: no-referrer` (`rezerwacja/[token]/page.tsx:15-19`).

### Rezerwacja 5-krokowa (`src/components/booking/BookingWizard.tsx`)
- [FAKT] Kroki: 1 usługi (checkboxy, limit 8, wybór czynnika R134a/R1234yf/nie wiem tylko dla klimatyzacji), 2 pojazd (marka, model, rok, rejestracja wymagane; VIN, przebieg, typ, opis opcjonalne), 3 termin (dni i godziny z serwera), 4 dane (imię, telefon, e-mail, zgoda na regulamin wymagana, marketing opcjonalny), 5 podsumowanie z honeypotem, podpisanym tokenem czasu i opcjonalnym Turnstile (`BookingWizard.tsx:100-300`, `form.tsx:150-173`).
- [FAKT] Walidacja po stronie klienta tymi samymi schematami Zod co serwer (`vehicleSchema`, `customerSchema`, `BookingWizard.tsx:11,126-143`); błędy serwera wracają do właściwego kroku (`:174-184`); zajęty termin cofa do kroku 3 i odświeża listę (`:167-172`).
- [FAKT] Etykiety powiązane z polami (`useId`, `htmlFor`), `aria-invalid`, `aria-describedby` dla podpowiedzi i błędów, oznaczenie "(opcjonalnie)" (`form.tsx:14-34`). Pola mają `autoComplete`, `inputMode`, `type=tel/email`, co dobrze działa na telefonie.
- [FAKT] Dostępność z klawiatury: po zmianie kroku fokus trafia na `h2` (`tabIndex=-1`, `:62-66`); dni i godziny to natywne `button` z `aria-pressed`; `PulseProgress` ma `role=progressbar` z `aria-valuetext` (`Pulse.tsx:46-50`); lista kroków ma `aria-current="step"`; linki w nowej karcie mają tekst `sr-only`.
- [FAKT] Stany: ładowanie terminów (`TurboLoader`, `:268`), brak wolnych terminów w okresie (`:343`), dni zamknięte z powodem, przyciski "Wcześniej/Później" wyłączone przy braku zakresu, przycisk wysyłki z `aria-busy` i "Wysyłanie…".
- [FAKT] Cele dotykowe: `.btn` min 48 px, `.input` min 48 px, przyciski godzin 48 px, dni 64 px (`globals.css`, `BookingWizard.tsx:300-340`). Kroki są pierwszym elementem na 390 px bez przewijania poziomego (zrzut `/rezerwacja`).

### Link klienta (`rezerwacja/[token]/page.tsx`)
- [FAKT] Walidacja formatu tokenu, rate limit, `notFound()` dla anonimizowanych klientów, opis statusu po polsku, termin, usługi, pojazd, adres. Anulowanie przez natywny `<dialog>` z `aria-labelledby` i potwierdzeniem (`CancelForm.tsx`); po upływie okna anulowania pokazany jest komunikat z odsyłaczem do telefonu (`:106-111`).

### Spójność i dostępność
- [FAKT] Tokeny kolorów w `:root` i `[data-theme=light]`, mapowane przez `@theme inline` na klasy Tailwind (`globals.css:7-64`); fonty `Inter Variable` i `Archivo Variable`; wspólne klasy `.btn`, `.card`, `.input`, `.label`, `.field-error`, `.prose-mp`, `.badge`, `.table-mp`, `dialog.modal`. Brak kolorów hex i `style=` w `src/components/site`, `booking` i `(public)` (grep).
- [FAKT] Test `tests/unit/contrast.test.ts` czyta kolory wprost z CSS i pilnuje WCAG AA (4,5:1 dla tekstów i przycisku, 3:1 dla obramowań pól) w obu motywach.
- [FAKT] Globalny `:focus-visible` (3 px, kolor akcentu), link "Przejdź do treści" (`Chrome.tsx:25`), `prefers-reduced-motion` wyłącza animacje (`globals.css:100-112`), przełącznik motywu jasny/ciemny, menu mobilne z `aria-expanded`.
- [FAKT] Baner cookies: obie opcje mają tę samą wagę wizualną, domyślnie nic poza niezbędnymi; decyzję można zmienić w stopce ("Ustawienia cookies"); mapa OpenStreetMap to `iframe` tworzony dopiero przy zgodzie (`consent === "all"`), z `sandbox` i `referrerPolicy=no-referrer`; bez zgody jest zaślepka z przyciskiem "Pokaż mapę" i alternatywą "Nawiguj" do Map Google (`ConsentMap.tsx`, `CookieBanner.tsx`, `Sections.tsx:137-158`).
- [FAKT] Responsywność: sticky pasek "Zadzwoń / Umów wizytę" na telefonach (`Chrome.tsx:118-133`), siatki `sm:/md:/lg:`, nawigacja główna od `lg`. Pomiary: `scrollWidth == clientWidth` na wszystkich stronach w 390, 768 i 1280.

## 2. Wymaga poprawy

1. [FAKT] Baner cookies zasłania ok. 40% ekranu 390x900 przy pierwszej wizycie, w tym treść hero i górę kroku 1 rezerwacji; wraz z paskiem mobilnym zostaje wąska szczelina (zrzut `390_.png`, `390_rezerwacja.png`; `CookieBanner.tsx:19`). Baner nie przejmuje fokusu i nie jest dialogiem, więc użytkownik klawiatury musi do niego dotabować po całej stronie. [REKOMENDACJA] Skrócić tekst i dodać link "Szczegóły", albo przesunąć fokus do banera przy pierwszym wyświetleniu (bez blokowania strony).
2. [FAKT] Pasek mobilny: przycisk "Umów wizytę" łamie się do dwóch linii na 390 px (zrzut), przez co dwa przyciski mają różny wygląd (`Chrome.tsx:124-131`). [REKOMENDACJA] Skrócić do "Umów" albo zmniejszyć odstęp ikony i `px` w tym miejscu.
3. [FAKT] Po błędzie walidacji w kreatorze fokus nie przechodzi do pierwszego błędnego pola ani do podsumowania błędów; komunikaty są tylko przy polach (`BookingWizard.tsx:126-143`, `go()` zeruje błędy). Na telefonie błąd w niższym polu może być poza ekranem. [REKOMENDACJA] Po `setErrors` wywołać `focus()` na pierwszym `[aria-invalid=true]` (mała poprawka w jednej funkcji).
4. [FAKT] Błąd pobrania terminów (krok 3): `fetchAvailability` ustawia tylko `message` i zostawia pusty ekran bez przycisku "Spróbuj ponownie" i bez loadera (`BookingWizard.tsx:97-100`, `:268`). [REKOMENDACJA] Dodać przycisk ponowienia w stanie `!availability && !pending`.
5. [FAKT] Stan kreatora żyje tylko w `useState`; odświeżenie lub wejście wstecz traci wpisane dane (`BookingWizard.tsx:53-62`). [ZAŁOŻENIE] Dla 5 kroków na telefonie to realne tarcie; [REKOMENDACJA] opcjonalnie `sessionStorage` (bez danych wrażliwych, z `try/catch`), niski priorytet.
6. [FAKT] Obietnica na `/dla-firm`: "Prowadzimy historię napraw każdego auta z floty i przypominamy o przeglądach" oraz "Priorytetowe terminy" (`dla-firm/page.tsx:17-20`), podczas gdy historii napraw nie ma w systemie (CLAUDE.md, sekcja "Czego NIE MA"). [REKOMENDACJA] Do decyzji właściciela: doprecyzować treść albo uzależnić od etapu panelu klienta. Priorytet flot warto uzgodnić z ofertą Premium.
7. [FAKT] Treści zaszyte w kodzie, choć zasada projektu mówi o edycji w panelu: `BENEFITS` (`dla-firm/page.tsx:17-20`), kroki `STEPS` (`klimatyzacja/page.tsx:17`), akapity "Kim jesteśmy" z "tuż przy drodze S10" i "do 3,5 t" (`o-nas/page.tsx:26-35`), nazwa "Moto Puls na Facebooku" (`Sections.tsx:114`) zamiast `settings.brandName`. [REKOMENDACJA] Przenieść do `ContentBlock` stopniowo, przy okazji prac nad SEO; nie jest to pilne.
8. [FAKT] Polityka prywatności zawiera pola `[DO UZUPEŁNIENIA]` (hosting, poczta, biuro rachunkowe) i ostrzeżenie o weryfikacji prawnej (`polityka-prywatnosci/page.tsx:21,69-71`). To otwarta decyzja właściciela (docs/decyzje.md), widoczna publicznie. [REKOMENDACJA] Uzupełnić przed kampaniami.
9. [FAKT] Zaślepki zdjęć "Zdjęcie warsztatu – wkrótce" na `/o-nas`, gdy galeria jest pusta (`o-nas/page.tsx:13,60-65`). DO UZUPEŁNIENIA przez właściciela (zdjęcia w panelu).
10. [FAKT] Dwie linie pulsu jedna pod drugą na `/rezerwacja`: `PulseDivider` w `PageHeader` i `PulseProgress` kreatora (zrzut `390_rezerwacja.png`). Wizualnie powtarza motyw. [REKOMENDACJA] Na tej stronie pominąć divider (prop w `PageHeader`), drobiazg.
11. [FAKT] Powtórzone style przycisków wyboru dnia/godziny w kreatorze (`BookingWizard.tsx:312-318, 341-345`) zamiast klasy współdzielonej; powtórzony wzorzec `Field`/`TextAreaField` (identyczny blok hint/error, `form.tsx:14-80`). [REKOMENDACJA] Wyciągnąć `.choice` i wspólny `FieldShell` dopiero przy dodawaniu kolejnych formularzy (Premium), nie wcześniej.
12. [FAKT] Test kontrastu nie obejmuje par `muted` na `surface-2` (zaślepki zdjęć, `.badge`, hover) ani `disabled:text-muted` na `bg` (dni bez terminów w kreatorze); `text-ok` i `text-danger` na `surface` są objęte. [ZAŁOŻENIE] Wartości po ręcznym przeliczeniu mieszczą się w AA, ale nie są pilnowane. [REKOMENDACJA] Dopisać pary `muted/surface-2` do `TEXT_ON_BACKGROUND`.
13. [ZAŁOŻENIE] Po anulowaniu rezerwacji na `rezerwacja/[token]` odświeżenie statusu (badge "Anulowana") zależy od `revalidatePath` w `cancelBooking`; nie sprawdzałem akcji na produkcji, bo to zapis. [REKOMENDACJA] Zweryfikować w E2E.

## 3. Brakuje
- [FAKT] Brak `loading.tsx` w `src/app/(public)` (jest tylko `app/error.tsx` i `not-found.tsx`); przy zimnym starcie Render strona pokazuje pustkę do odpowiedzi serwera. [ZAŁOŻENIE] Dotyczy głównie planu darmowego Render. [REKOMENDACJA] Dodać prosty `loading.tsx` z `TurboLoader`.
- [FAKT] Brak podstrony i sekcji Premium, brak panelu klienta, brak SMS-a w UI (CLAUDE.md; w `src/app/(public)` brak odpowiednich tras).
- [FAKT] Brak zrzutów automatycznych w repo: `tests/e2e` ma tylko `01-booking.spec.ts`, `02-admin.spec.ts`; brak testów responsywności i a11y (np. axe).
- [ZAŁOŻENIE] Nie testowałem wypełniania formularzy na produkcji (zapisy w bazie prawdziwego warsztatu, zasada 5 z CLAUDE.md). Ocena kroków 2-5 opiera się na kodzie, nie na zrzutach.
- [ZAŁOŻENIE] Nie testowałem nawigacji klawiaturą na żywo; ocena z kodu (natywne elementy, `aria-*`, fokus na `h2`). Brak audytu czytnikiem ekranu.

## 4. Gdzie wpiąć Premium i panel klienta (bez łamania wyglądu)
- [REKOMENDACJA] Podstrona `/premium` w grupie `(public)`, zbudowana z istniejących `PageHeader` + `Section` + `card` + `CtaBand` i formularza przez `InquiryShell` w `InquiryForms.tsx` (wzorzec `FleetForm`); dodać nowy typ w `Inquiry` zgodnie z CLAUDE.md. Zero nowych klas CSS.
- [REKOMENDACJA] Link: pozycja w `NAV` (`Chrome.tsx:11-18`). Uwaga: 6 pozycji już wypełnia pasek od `lg`; 7. pozycję sprawdzić na 1024 px, a w razie ciasnoty umieścić Premium tylko w stopce, w sekcji strony głównej i w `CtaBand`.
- [REKOMENDACJA] Sekcja na stronie głównej: między `#floty` a `#opinie` (`page.tsx:125-137`), ten sam układ co sekcja "Dla firm" (`eyebrow` + tytuł + karty). Z kreatora: opcjonalny link "Potrzebujesz pilnej obsługi?" na kroku 3 do `/premium`, bez zmiany logiki slotów.
- [REKOMENDACJA] Panel klienta: nowa grupa tras (np. `src/app/(klient)/konto/*`) z własnym layoutem opartym na `Header` i `Footer` z `Chrome.tsx` oraz komponentami z `src/components/admin/ui.tsx` dla tabel i list; rozszerzyć istniejącą stronę `rezerwacja/[token]` (już zawiera pojazd i status) o historię zamiast duplikować. Link "Moje konto" dodać do `Header` obok przełącznika motywu dopiero po wdrożeniu logowania.
- [REKOMENDACJA] Przyszłe formularze Premium i panelu korzystają z `Field`/`CheckboxField` z `form.tsx`; do SMS-a i zgód dodać checkbox w kroku 4 na wzór `marketing`.

## 5. Zakres pomiarów
- Zrzuty wykonane: `/`, `/rezerwacja`, `/kontakt` w 390/768/1280 (katalog tymczasowy, nie w repo). Pomiary DOM: wszystkie 10 podstron w 3 szerokościach.
- Nie zrobiono: zrzutów kroków 2-5 (wymagają danych), testu na prawdziwym telefonie, Lighthouse, kontrastu wyliczonego z renderu (poza testem jednostkowym).
