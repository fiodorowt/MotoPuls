# Audyt SEO, lokalnego SEO, szybkości i analityki: Moto Puls

Data: 2026-11-13. Tryb: tylko odczyt (kod + żywa strona https://motopuls.onrender.com/).
Etykiety: [FAKT] (źródło), [ZAŁOŻENIE], [REKOMENDACJA]. Brak danych = DO UZUPEŁNIENIA.
Ograniczenie: PageSpeed API zwróciło 429 (limit zapytań), Lighthouse nie został uruchomiony. Core Web Vitals = DO UZUPEŁNIENIA.

## 1. Podsumowanie
- Fundament SEO jest poprawny: Metadata API, unikalne title/description, jeden H1 na stronę, canonical, sitemap, robots, 404 z noindex, favicony, obrazy AVIF/WebP.
- Największe ryzyko: zimny start na Render (pierwsze żądanie ok. 18 s) i domena onrender.com.
- Braki: za długie title/description, brak podstron usług pod frazy lokalne, brak hasOfferCatalog, placeholder współrzędnych w JSON-LD, brak lastModified w sitemap, CSP blokuje każdą analitykę, baner nie ma kategorii analityka/reklamy.

## 2. Techniczne

### 2.1 Title i meta description (zmierzone na produkcji, znaki z sufiksem " | Moto Puls")
| Ścieżka | title | description | Ocena |
|---|---|---|---|
| / | 87 | 207 | oba za długie (cel: title ok. 60, desc ok. 155) |
| /uslugi | 82 | 182 | za długie |
| /klimatyzacja | 77 | 205 | za długie |
| /kontakt | 71 | 123 | title lekko długi |
| /dla-firm | 84 | 191 | za długie |
| /czesci-zamienne | 84 | 164 | za długie |
| /o-nas | 67 | 130 | title lekko długi |
| /rezerwacja | 74 | 134 | title lekko długi |
| /polityka-prywatnosci | 33 | 91 | OK |
| /regulamin-rezerwacji | 39 | 56 | description krótki |

- [FAKT] Wszystkie unikalne, przez `export const metadata` (np. `src/app/(public)/klimatyzacja/page.tsx:10-14`), szablon `%s | Moto Puls` w `src/app/layout.tsx:9`; strona główna używa `title.absolute` (`(public)/page.tsx:11`).
- [REKOMENDACJA] Skrócić title do ok. 55-60 znaków z frazą lokalną na początku, description do 150-160.
- [FAKT] `/rezerwacja/[token]` ma własne metadata (`rezerwacja/[token]/page.tsx:14`) oraz `X-Robots-Tag: noindex, nofollow` (`next.config.ts`, nagłówki). Panel admina: noindex i no-store (`next.config.ts`), robots.txt blokuje `/admin`, `/api`.

### 2.2 Nagłówki
- [FAKT] Każda strona publiczna ma dokładnie jeden H1: strona główna `(public)/page.tsx:35`, pozostałe przez `PageHeader` (`components/site/Sections.tsx:16`). Potwierdzone na produkcji dla 7 podstron.
- [FAKT] Strona główna: 1 H1, 6 H2 (z id), H3 pod nimi; hierarchia poprawna.
- [FAKT] H1 z frazą lokalną mają tylko /uslugi i /klimatyzacja. Ogólne: "Kontakt i dojazd" (`kontakt/page.tsx:18`), "Obsługa flot samochodowych" (`dla-firm/page.tsx:31`), "Sprzedaż części zamiennych" (`czesci-zamienne/page.tsx:21`).
- [REKOMENDACJA] Dodać lokalizację do H1 lub leadu tych stron.

### 2.3 Canonical
- [FAKT] Ustawiony na każdej stronie publicznej (`alternates.canonical`), rozwiązywany względem `metadataBase` z `APP_URL` (`layout.tsx:8`). Strona główna: `https://motopuls.onrender.com`.
- [ZAŁOŻENIE] `metadataBase` ma fallback `http://localhost:3000` (`layout.tsx:8`); przy źle ustawionym `APP_URL` canonical wskaże localhost. Na produkcji działa poprawnie. Po zmianie domeny `APP_URL` musi zostać zaktualizowany (canonical, sitemap, JSON-LD, OG).

### 2.4 Sitemap i robots
- [FAKT] `src/app/sitemap.ts`: 10 adresów, bez `/rezerwacja/[token]` i `/admin`; poprawny XML (live). Brak `lastModified` (`sitemap.ts:21`); `changeFrequency` i `priority` Google ignoruje.
- [FAKT] `dynamic = "force-dynamic"` w `sitemap.ts:4` i `robots.ts:4` (generowane na każde żądanie, wymaga działającej instancji).
- [FAKT] robots.txt (live): Allow /, Disallow /admin, /api, /rezerwacja/, wskazuje sitemap. Reguła z ukośnikiem nie blokuje samej `/rezerwacja`. Poprawnie.
- [REKOMENDACJA] Dodać `lastModified`; po dodaniu podstron usług dopisać je do sitemap (dynamicznie z bazy).

### 2.5 Kody odpowiedzi, HTTPS, 404, favicon
- [FAKT] (curl) `/`, `/uslugi`, `/robots.txt`, `/sitemap.xml` = 200; nieistniejąca ścieżka = 404 z meta robots noindex i własną stroną (`src/app/not-found.tsx:8`). `http://` -> 301. HSTS 2 lata z preload (`next.config.ts`).
- [FAKT] `/favicon.ico` = 404; `/icon.svg` i `/apple-icon.png` = 200 i wskazane w `<link rel="icon">`.
- [REKOMENDACJA] Dodać `src/app/favicon.ico` dla botów i przeglądarek pytających o stały adres.
- [FAKT] Strony publiczne mają `Cache-Control: private, no-cache, no-store` (live): skutek nonce CSP (`src/proxy.ts`) i `headers()` w layoutach.

### 2.6 Linkowanie wewnętrzne
- [FAKT] Nawigacja i stopka w `components/site/Chrome.tsx` (linki do /rezerwacja, regulaminu, polityki, tel, e-mail, Facebook), skip-link (`Chrome.tsx:23`). Kategorie usług to kotwice na /uslugi (`id="{slug}-h"`), nie osobne URL-e.
- [REKOMENDACJA] Linki kontekstowe /klimatyzacja <-> /uslugi <-> /rezerwacja, okruszki (BreadcrumbList) po dodaniu podstron.

## 3. Dane strukturalne (`src/app/(public)/layout.tsx:18-50`)
Typ AutoRepair, `@id` i ReserveAction są poprawne; wyjście zweryfikowane na produkcji.

| Właściwość | JSON-LD (live) | Źródło | Status |
|---|---|---|---|
| name | Moto Puls | `prisma/seed-data.ts:10` | zgodne |
| legalName | Moto Puls Kamil Klimek i Karol Guzicki S.C. | `seed-data.ts:11` | zgodne z seedem; prawdziwość do potwierdzenia |
| telephone | +48881765880, +48535352780 | `seed-data.ts:16` | zgodne |
| email | motopuls.serwis@gmail.com | `seed-data.ts:17` | zgodne |
| adres | ul. Modra 26, 86-005 Białe Błota | `seed-data.ts:13-15` | zgodne |
| openingHoursSpecification | pn-pt 08:00-17:00 | `seed-data.ts:39-45` | zgodne z bazą; otwarta decyzja (zlecenie: pn-pt 8-18, sob. 8-16); JSON-LD czyta bazę, więc zmieni się z panelu |
| geo | 53.0952 / 17.9285 | `seed-data.ts:19-21` | ROZBIEŻNOŚĆ: komentarz w seedzie "PLACEHOLDER: przybliżone współrzędne"; DO UZUPEŁNIENIA |
| sameAs | Facebook | `seed-data.ts:18` | zgodne |
| logo | /icon.svg | `app/icon.svg` | [REKOMENDACJA] Google woli PNG/JPG/WebP |
| areaServed | Białe Błota, Bydgoszcz | zakodowane w `layout.tsx:39` | nie z Settings; zakres DO UZUPEŁNIENIA |

- [FAKT] Brak: `hasOfferCatalog`, `hasMap`, `priceRange`, ocen i opinii (słusznie; nie dodawać bez prawdziwych danych, status `Testimonial` DO UZUPEŁNIENIA).
- [REKOMENDACJA] Dodać `hasOfferCatalog` z kategoriami i usługami z tabeli Service (nazwy z `seed-data.ts:64-143`: naprawy, mechanika i elektromechanika, klimatyzacja, diagnostyka, części, floty), bez cen (cennik "w przygotowaniu", `seed-data.ts:33`). Dodać `hasMap` (URL wizytówki Google: DO UZUPEŁNIENIA). Na podstronach `Service` i `BreadcrumbList`.
- [REKOMENDACJA] Pełny AutoRepair ograniczyć do strony głównej i /kontakt (teraz jest w layoucie wszystkich stron publicznych, także regulaminu).
- Walidacja w Rich Results Test: DO UZUPEŁNIENIA (nie uruchomiono).

## 4. Lokalne SEO

### 4.1 Podstrony usług
- [FAKT] Istnieją /uslugi (zbiorcza) i /klimatyzacja. Brak osobnych URL-i dla mechaniki i elektromechaniki, diagnostyki komputerowej, napraw, przeglądów.
- [FAKT] Usługi w danych startowych (do potwierdzenia przez właściciela): naprawy aut osobowych i dostawczych do 3,5 t, mechanika/elektromechanika, klimatyzacja R134a/R1234yf (TEXA Konfort 715R), diagnostyka komputerowa, części po VIN, floty (`seed-data.ts:64-143`).
- [REKOMENDACJA] Podstrony tylko dla powyższych, dynamicznie po `slug` z bazy (slugi istnieją), np. `/uslugi/diagnostyka-komputerowa`: unikalne title/H1/opis, CTA do rezerwacji, JSON-LD Service. Nie tworzyć stron dla usług niepotwierdzonych (np. wulkanizacja, geometria: brak w seedzie, DO UZUPEŁNIENIA).
- [REKOMENDACJA] Bez stron dla każdej miejscowości (doorway pages); frazy lokalne (Białe Błota, Bydgoszcz, S10) naturalnie w treści.

### 4.2 Spójność NAP
- [FAKT] Nazwa, adres, telefony, e-mail z Settings: wspólne dla JSON-LD, stopki i /kontakt.
- [FAKT] RYZYKO: title /kontakt ma zakodowane "ul. Modra 26" (`kontakt/page.tsx:8`); po zmianie adresu w panelu nie zmieni się. [REKOMENDACJA] `generateMetadata` z Settings.
- [FAKT] Opis dojazdu (`seed-data.ts:22-23`: ulice, S10, Hotel Sylwana) pochodzi z seeda; weryfikacja DO UZUPEŁNIENIA.
- NAP w wizytówce Google, Facebooku i katalogach: DO UZUPEŁNIENIA (niezweryfikowane).

### 4.3 Lista kontrolna Google Business Profile (dla właściciela, bez zakładania stanu)
1. Sprawdzić, czy wizytówka istnieje i jest zweryfikowana; jeśli nie, założyć lub odzyskać.
2. Nazwa dokładnie "Moto Puls" (bez dopisków fraz); kategoria główna "Warsztat samochodowy", dodatkowe wg faktycznych usług.
3. Adres i pinezka zgodne z Settings (potwierdzić współrzędne).
4. Telefon główny taki jak pierwszy w Settings.
5. Godziny identyczne z OpeningHours po decyzji o godzinach; dni wolne (ClosedDay).
6. Link do strony (docelowo własna domena), link rezerwacji /rezerwacja, UTM na linkach.
7. Usługi (bez cen, jeśli cennik niegotowy), opis, własne zdjęcia, logo.
8. Odpowiadać na opinie; nie kupować ani nie pisać opinii.
9. Spójność z Facebookiem (`facebookUrl`) i katalogami.
10. Po uzyskaniu URL: dodać do sameAs i hasMap w JSON-LD (wymaga nowego pola w Settings, D-17; do czasu URL kod tych pól nie emituje).
11. Spójność NAP (nazwa, adres, telefon) między wizytówką, stroną (Ustawienia w panelu), Facebookiem i katalogami: porównać znak po znaku (np. "ul. Modra 26", format telefonu).
12. Opinie: poprosić prawdziwych klientów o opinię w Google (link z wizytówki), odpowiadać na każdą; nie wpisywać opinii na stronie, dopóki nie są potwierdzone (`Testimonial`).
13. W panelu (Ustawienia, Dane firmy) uzupełnić "Obszar obsługi" (areaServed w danych dla wyszukiwarek, D-21) i potwierdzić współrzędne (D-12); obecne to PLACEHOLDER z seeda i trafiają do JSON-LD (`geo`).
14. Stan wizytówki (istnieje/zweryfikowana/kategorie/zdjęcia): DO UZUPEŁNIENIA przez właściciela, kod niczego nie zakłada.

### 4.4 Stan wdrożenia etapu 4 (2026-11-15, gałąź `mp/etap-4-seo`)
- [FAKT] MP-037: title <= 60 i description 140-160 znaków na 10 stronach publicznych (test E2E T8.5, `tests/e2e/05-seo.spec.ts`); `/kontakt` przez `generateMetadata` z Settings; miejscowość (`Settings.city`) w H1 `/kontakt`, `/dla-firm`, `/czesci-zamienne`. Pozostałe strony mają nazwę miejscowości wpisaną w tytuł (odmiana "w Białych Błotach" w opisach), więc po zmianie miejscowości w panelu wymagają ręcznej korekty metadanych.
- [FAKT] MP-040 (część): `hasOfferCatalog` z aktywnych `Service` (bez cen), `areaServed` z `Settings.areaServed` (migracja addytywna; puste = pominięte; NA PRODUKCJI po wdrożeniu migracji pole jest puste, dopóki właściciel go nie uzupełni w panelu), logo PNG (`/apple-icon.png`), pełny AutoRepair tylko na `/` i `/kontakt`. Brak `hasMap` i nowego `sameAs` (D-17).
- [FAKT] MP-042: `lastModified` w sitemapie z ostatniego wpisu w `AuditLog` (edycje usług, treści, danych firmy, godzin), bo `Service`/`ContentBlock` nie mają `updatedAt`, a `Settings.updatedAt` zmienia cron (przypomnienie PENDING); regulamin i polityka bez daty. `/favicon.ico` z `icon.svg` (`scripts/build-favicon.ts`).
- NIE wdrożone (czekają na decyzje): MP-041 (D-16), MP-044 (D-15), MP-045 (D-13/D-6), MP-046, MP-047 (D-14), MP-048.

## 5. Szybkość i mobile

### 5.1 Hipoteza: onrender.com i zimny start
- [FAKT] Pierwsze żądanie GET / w audycie: TTFB 17,9 s (całość 18,05 s). Kolejne: /robots.txt 1,17 s, /sitemap.xml 0,38 s, /uslugi 0,56 s; pięć prób /uslugi: 0,88 / 0,23 / 0,40 / 0,29 / 0,20 s (curl, jedna lokalizacja).
- [FAKT] Nagłówki: `x-render-origin-server: Render`, `rndr-id`, Cloudflare, `cf-cache-status: DYNAMIC` (brak cache HTML).
- Wniosek: zimny start potwierdzony pomiarem dla pierwszego żądania. [ZAŁOŻENIE] Plan Render (darmowy z usypianiem?) DO UZUPEŁNIENIA; `docs/decyzje.md:13` to otwarta decyzja. Wpływ na pozycje [ZAŁOŻENIE]: pośredni (roboty trafiające na 18 s, timeouty, gorsze LCP dla pierwszego użytkownika). Sama subdomena onrender.com [ZAŁOŻENIE] nie obniża rankingu bezpośrednio, ale: brak marki w URL, mniejsze zaufanie, trudna migracja bez 301, niewygodna dla wizytówki Google i reklam.
- [REKOMENDACJA] (a) plan bez usypiania lub keep-alive na `/api/health` (trasa istnieje: `src/app/api/health/route.ts`; czy jest pingowana: DO UZUPEŁNIENIA); (b) własna domena z 301, aktualizacja `APP_URL`.

### 5.2 Core Web Vitals
- [FAKT] Pomiar Lighthouse (mobile, przebiegi po rozgrzaniu) z 2026-11-15: patrz `docs/testy.md`, sekcja "Pomiary MP-043". W audycie początkowym: DO UZUPEŁNIENIA (PageSpeed API 429).
- [FAKT] Rozmiar HTML: strona główna ok. 81 KB, /uslugi ok. 84 KB.

### 5.3 Obrazy
- [FAKT] Komponent `Picture` (`components/site/Sections.tsx:50-65`): AVIF i WebP, srcset/sizes, width/height, lazy domyślnie, priority daje eager i fetchPriority high (użyte na `klimatyzacja/page.tsx:67`). `public/img` ma warianty 430-1060 px AVIF+WebP.
- [FAKT] `/img/*`: `Cache-Control: public, max-age=31536000, immutable` (`next.config.ts`). Nagłówki `/media` (galeria z panelu): DO UZUPEŁNIENIA.
- [FAKT] Hero strony głównej (`page.tsx:35`) jest tekstowy, więc LCP prawdopodobnie tekst (korzystne).

### 5.4 Czcionki, skrypty, renderowanie
- [FAKT] Czcionki lokalne `@fontsource-variable/inter` i `archivo/wdth.css` (`layout.tsx:3-4`), bez Google Fonts. [REKOMENDACJA] Sprawdzić, które podzbiory trafiają do CSS (potrzebne latin i latin-ext), `font-display` i preload głównej czcionki.
- [FAKT] Skrypt motywu inline w head (`layout.tsx:28-35`) jest krótki. Turnstile (Cloudflare) używany w formularzach (`antispam.ts`, `BookingWizard.tsx`, `form.tsx`); czy ładuje się leniwie: [ZAŁOŻENIE] nie sprawdzono.
- [FAKT] Renderowanie dynamiczne na każde żądanie: `headers()` dla nonce (`layout.tsx:31`, `(public)/layout.tsx:14`) i Settings z bazy; brak cache HTML. TTFB po rozgrzaniu 0,2-0,9 s.
- [REKOMENDACJA] Kompromis CSP/cache (hashe zamiast nonce dla stałych skryptów, statyczne strony treści z rewalidacją, krótki cache na CDN). Najpierw przeczytać `node_modules/next/dist/docs/`; zmiana tylko po akceptacji (wpływ na bezpieczeństwo).
- [FAKT] Mobilny pasek akcji z `tel:` i rezerwacją (`Chrome.tsx:134-139`), viewport poprawny (`layout.tsx:21-25`).

## 6. Analityka i Google Ads (nic nie zainstalowano)

### 6.1 Zgoda
- [FAKT] Baner `components/site/CookieBanner.tsx` ma dwa przyciski: "Tylko niezbędne" i "Zgoda także na mapę"; magazyn zgody zna tylko wartości all, necessary, unset (`lib/client-store.ts:14-26`), cookie `mp_consent`, 180 dni. Treść: "Nie stosujemy analityki ani reklam" (`CookieBanner.tsx:22-23`). Zmiana decyzji w stopce (`CookieSettingsButton`).
- Wniosek [FAKT]: baner nie obsługuje kategorii (analityka, reklamy); "all" oznacza tylko mapę OSM.
- [REKOMENDACJA] Rozszerzyć model do necessary, analytics, marketing; równorzędne "odrzuć wszystko", Consent Mode v2 (domyślnie denied), aktualizacja treści baneru i polityki (`polityka-prywatnosci/page.tsx:89-97`). Treści prawne to decyzja właściciela.

### 6.2 CSP jako blokada
- [FAKT] `src/proxy.ts:12-28`: script-src z nonce i strict-dynamic, connect-src tylko self, img-src self/data/blob, frame-src tylko OSM i Cloudflare. GA4/Ads/GTM nie zadziałają bez dopisania domen Google i ładowania skryptu z nonce.
- [REKOMENDACJA] Poluzowanie CSP tylko warunkowo (flaga env + zgoda, zasada 8 CLAUDE.md, z trybem testowym); alternatywa: analityka serwerowa lub samodzielnie hostowana. Koszt miesięczny: DO UZUPEŁNIENIA po wyborze dostawcy.

### 6.3 Zdarzenia konwersji
- [FAKT] Brak kodu analityki w repo (gtag/dataLayer nie występują).
- [REKOMENDACJA] Zdarzenia (tylko po zgodzie):
  - `phone_click`: linki `telHref` w `Chrome.tsx:43,77,134`, `(public)/page.tsx:48`, `rezerwacja/page.tsx:50`, `dla-firm/page.tsx:59`, `rezerwacja/[token]/page.tsx:116`; parametr: miejsce (nagłówek/pasek mobilny/stopka).
  - `booking_submit`: po sukcesie w `components/booking/BookingWizard.tsx` / `rezerwacja/actions.ts`; kroki kreatora jako zdarzenia lejka.
  - `generate_lead`: formularze PARTS/FLEET/CONTACT (`(public)/actions.ts`).
- [REKOMENDACJA] Rozważyć konwersje telefoniczne Ads (koszt: DO UZUPEŁNIENIA).

### 6.4 Strona docelowa pod kampanię
- [FAKT] Brak osobnej landing page; najbliższe: /klimatyzacja (CTA przez CtaBand) i /rezerwacja (5 kroków, telefon).
- [REKOMENDACJA] Lekka strona pod kampanię (np. `/serwis-klimatyzacji-bydgoszcz`, jedna akcja: telefon lub rezerwacja, UTM), noindex jeśli duplikuje treść. [ZAŁOŻENIE] Konto Ads, budżet i słowa kluczowe: DO UZUPEŁNIENIA. Przed kampanią naprawić zimny start, bo płatne kliknięcia trafiłyby na 18 s.

## 7. Backlog zaleceń
1. [P1] Hosting bez usypiania lub keep-alive; własna domena (301, `APP_URL`).
2. [P1] Skrócić title/description (2.1); title kontaktu z Settings.
3. [P1] Potwierdzić współrzędne i godziny; uzupełnić wizytówkę Google wg 4.3.
4. [P2] Podstrony usług po slug + Service, hasOfferCatalog, BreadcrumbList, hasMap.
5. [P2] Sitemap z lastModified i nowymi podstronami; favicon.ico; logo PNG w JSON-LD.
6. [P2] Pomiar CWV i optymalizacja czcionek (podzbiory).
7. [P3] Zgoda z kategoriami + Consent Mode v2, warunkowe CSP, zdarzenia konwersji, landing pod kampanię.

## 8. DANE DO UZUPEŁNIENIA przez właściciela
- Potwierdzone współrzędne GPS (obecne to placeholder, `seed-data.ts:18-21`).
- Ostateczne godziny otwarcia (baza pn-pt 8-17; zlecenie pn-pt 8-18, sob. 8-16; niedziela).
- URL i stan wizytówki Google Business Profile.
- Nazwa prawna, NIP, zakres obszaru obsługi (poza Białymi Błotami i Bydgoszczą?).
- Lista usług faktycznie świadczonych poza seedem; czy publikować cennik.
- Czy opinie (`Testimonial`) są prawdziwe i można ich użyć.
- Plan Render (usypianie), docelowa domena (`docs/decyzje.md` pkt 7).
- Konto GA/Ads, budżet, wybór narzędzia analitycznego, akceptacja kosztu.
- Treść prawna baneru cookies i polityki po dodaniu analityki.
- Wyniki Lighthouse/PageSpeed (429 podczas audytu).
