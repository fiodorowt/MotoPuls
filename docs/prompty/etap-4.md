# Etap 4: SEO, treści i zgody

**Agent:** `mp-seo-tresci`, potem `mp-tester` i `mp-bezpieczenstwo`. Uruchamiane przez `/mp-etap 4`.
**Warunek startu:** backlog zaakceptowany; etap 1 zmergowany w zakresie MP-004 (zimny start) przed pomiarami MP-043. Może iść równolegle z etapem 3 w osobnym worktree (`git worktree add ../motopuls-seo -b mp/etap-4-seo`); przed MP-042 rebase na scalony etap 3. Decyzje: D-11, D-12, D-13, D-14, D-15, D-16, D-17, D-21.

## Kontekst
Fundament SEO istnieje [FAKT] `docs/audyt/seo.md`: Metadata API z unikalnymi title/description i canonical, jeden H1, `sitemap.ts`, `robots.ts`, JSON-LD `AutoRepair` w `src/app/(public)/layout.tsx` z danymi z `Settings`/`OpeningHours`, obrazy AVIF/WebP, baner cookies z mapą po zgodzie, CSP z nonce w `src/proxy.ts`. Rozszerzasz to, nie przepisujesz. Przed kodem przeczytaj przewodnik Next.js 16 o Metadata API, `generateMetadata`, sitemap, ikonach i proxy.

## Zakres
- P1: MP-037 (title ≤ 60, description 140-160, `/kontakt` z `generateMetadata` i `Settings`, lokalizacja w H1/leadzie), MP-038 (treść `/dla-firm` wg D-11), MP-039 (baner cookies na telefonie, fokus).
- P2: MP-040 (JSON-LD: `hasOfferCatalog` z `Service` bez cen, logo PNG, `Settings.areaServed`, URL wizytówki dla `hasMap`/`sameAs`, pełny AutoRepair tylko `/` i `/kontakt`), MP-041 (`/uslugi/[slug]` tylko dla usług z D-16, treść w `ContentBlock`, `Service` + `BreadcrumbList`), MP-042 (sitemap `lastModified`, nowe strony, `favicon.ico`), MP-043 (Lighthouse przed/po, czcionki; CSP/cache tylko analiza), MP-044 (domena + 301 wg D-15), MP-045 (polityka wg D-13).
- P3: MP-046 (treści do `ContentBlock`), MP-047 (kategorie zgód, Consent Mode v2, CSP za flagą, zdarzenia; tylko przy D-14 = tak), MP-048 (landing), MP-049 (podwójny puls, pary kontrastu).
- Dla właściciela: lista kontrolna wizytówki Google istnieje w `docs/audyt/seo.md` 4.3; aktualizuj ją, nie duplikuj.

## Pliki (główne)
`src/app/(public)/*/page.tsx` (metadata), `src/app/(public)/layout.tsx` (JSON-LD), `src/app/(public)/uslugi/[slug]/page.tsx` (nowy), `src/app/sitemap.ts`, `src/app/favicon.ico`, `src/components/site/{CookieBanner,Sections,Chrome}.tsx`, `src/lib/client-store.ts` (MP-047), `src/proxy.ts` (MP-044/MP-047, za flagą), `prisma/schema.prisma` (tylko addytywne pola `Settings` dla MP-040), `prisma/seed-data.ts` (wartości startowe `ContentBlock`), `src/lib/env.ts`, `.env.example`, `tests/*`, `docs/testy.md` (pomiary), `docs/audyt/seo.md` (lista kontrolna).

## Kryteria akceptacji
Kryteria MP-037…MP-049 (w zakresie podjętych decyzji) oraz T8.1, T8.4-T8.8 PASS. Dodatkowo:
- Pomiary Lighthouse/TTFB podane jako zmierzone liczby z datą i warunkami, nie wartości docelowe.
- Wszystkie dane firmy, godziny, usługi i obszar z bazy (`Settings`, `OpeningHours`, `Service`, `ContentBlock`), zero literałów NAP w komponentach.
- Przy MP-047: przed zgodą zero żądań do domen analityki; flaga wyłączona = CSP identyczny jak dziś.

## Zakazy
- NIE wymyślaj usług, cen, opinii, certyfikatów, liczb, gwarancji, obszaru ani współrzędnych; brak danych = „DO UZUPEŁNIENIA".
- NIE twórz stron per miejscowość (doorway pages).
- NIE wpisuj fikcyjnych identyfikatorów GA/Ads; tylko zmienne środowiskowe.
- NIE luzuj CSP bez flagi i przeglądu `mp-bezpieczenstwo`; nie zmieniaj strategii nonce/cache bez akceptacji.
- NIE dotykaj kodu rezerwacji (`booking.ts`, `slots.ts`, `BookingWizard.tsx`) ani Premium (poza wpisem w sitemap po scaleniu etapu 3).
- NIE zmieniaj godzin, adresu ani współrzędnych w kodzie (edycja w panelu przez właściciela).
- Bez `db:deploy`, bez merge do `main`, bez zmian w panelu Render/DNS (robi właściciel).

## Raport (do 10 linii)
Co zmieniono, pomiary przed/po, treści czekające na zatwierdzenie, decyzje blokujące.
