# Przegląd bezpieczeństwa i prywatności: etap 4 (SEO)

Zakres: `git diff main...HEAD` na gałęzi `mp/etap-4-seo` (bez `docs/`), stan z 2026-11-15. Przegląd tylko do odczytu.

**Werdykt: BLOKADA** (1 ustalenie blokujące, poprawka w jednej linii).

## BLOKUJĄCE

### B-1. Kodowanie `<` w JSON-LD nic nie robi (regresja względem `main`)
- [FAKT] `src/components/site/AutoRepairJsonLd.tsx:21`: `JSON.stringify(jsonLd).replace(/</g, "<")`. W literale JS `"<"` to już znak `<`, więc zamiana jest pusta.
- [FAKT] Na `main` było `"\\u003c"` (`git show main:src/app/(public)/layout.tsx`, linia 63), czyli zabezpieczenie działało. Zgubiło się przy przenoszeniu kodu do komponentu.
- [FAKT] Sprawdzone w Node: `JSON.stringify({a:"</script><img>"}).replace(/</g,"<")` zwraca `</script><img>` bez zmian.
- Skutek: [FAKT] dane do JSON-LD pochodzą z pól edytowanych w panelu: `Settings.brandName/legalName/street/city/email/facebookUrl/areaServed`, nazwy kategorii i usług (`src/lib/seo.ts:23-29, 35-55`). Wartość z `</script>` zamyka znacznik i wstrzykuje HTML na `/` i `/kontakt`. [FAKT] Zapis tych pól ma tylko OWNER (`ustawienia/actions.ts:40`, `uslugi/actions.ts:19,42`), a CSP z nonce i `strict-dynamic` (`src/proxy.ts:14`) blokuje wstrzyknięty skrypt inline. [ZAŁOŻENIE] Wstrzyknięcie HTML nadal jest możliwe (np. fałszywy formularz lub link, `<meta http-equiv=refresh>`, zepsuty układ strony), np. przy przejętym koncie właściciela albo po przypadkowym wklejeniu. Usuwa to warstwę ochrony, która już działała.
- Poprawka:
  ```ts
  __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c").replace(/ /g, "\\u2028").replace(/ /g, "\\u2029")
  ```
  [REKOMENDACJA] Przenieść serializację do `src/lib/seo.ts` (np. `serializeJsonLd()`) i dodać test w `tests/unit/jsonld.test.ts`: dla `areaServed: ["</script><b>x"]` wynik nie zawiera `</`, a `JSON.parse` zwraca pierwotny tekst. Obecne testy (`tests/unit/jsonld.test.ts`) sprawdzają tylko obiekt, a nie serializację, i dlatego regresja przeszła.

## WAŻNE

Brak.

## DROBNE

### D-1. U+2028/U+2029 w JSON-LD
- [FAKT] `JSON.stringify` nie koduje U+2028/U+2029. W `application/ld+json` nie psują one parsowania (JSON je dopuszcza). [REKOMENDACJA] Kodować je razem z `<` (poprawka B-1) dla odporności na parsery traktujące treść jak JS.

### D-2. `lastmod` w sitemap ujawnia czas edycji w panelu
- [FAKT] `src/app/sitemap.ts:31-36`, `src/lib/lastmod.ts:10-12`: publicznie widać tylko datę i godzinę ostatniego wpisu z dziennika dla wybranych akcji. Nazwy akcji, aktorzy, `entityId` i dane osobowe nie trafiają do XML. Zapytanie ma stałą listę akcji (Prisma `in`), więc nie ma tu wstrzyknięcia.
- [ZAŁOŻENIE] Ujawnienie godzin pracy właściciela w panelu to niewielkie ryzyko. [REKOMENDACJA] Opcjonalnie zaokrąglić do dnia (`setUTCHours(0,0,0,0)`).
- [FAKT] `lastmod` dla `/uslugi`, `/klimatyzacja` i `/rezerwacja` zmienia się także po `service.deactivate` i `service.delete`. To jest poprawne.

### D-3. `areaServed`: walidacja i AuditLog
- [FAKT] Zod: podział po `\n , ;`, przycięcie spacji, deduplikacja, maks. 80 znaków na pozycję i maks. 20 pozycji (`ustawienia/actions.ts:30-33`). Zapis tylko dla OWNER (`owner: true`, linia 40). AuditLog zapisuje `settings.company` bez treści ani PII (linia 42).
- [REKOMENDACJA] Odrzucać znaki `<>` w nazwach miejscowości (`.regex(/^[^<>]*$/)`) jako drugą warstwę obok B-1. Pole `TextAreaField` w `ustawienia/page.tsx:44-50` nie ma `maxLength`, ale serwer i tak ogranicza długość, więc to tylko kwestia wygody.

### D-4. Formatowanie schematu
- [FAKT] `prisma/schema.prisma`: `tagline             String` ma rozjechane wcięcie. To kosmetyka (`prisma format`).

## Sprawdzone bez uwag

- Migracja `20261115120000_settings_area_served`: [FAKT] addytywna (`ADD COLUMN ... NOT NULL DEFAULT ARRAY[]::TEXT[]`) i odwracalna (instrukcja `DROP COLUMN` w komentarzu). Wartość startowa jest tylko w seedzie (`prisma/seed-data.ts`), więc produkcja dostanie pustą listę, a `areaServed` zostanie pominięte do czasu uzupełnienia w panelu. [REKOMENDACJA] Po wdrożeniu właściciel powinien wpisać obszar w panelu, inaczej JSON-LD na produkcji nie będzie go zawierał (na `main` był zapisany na sztywno).
- Migracja `20261115120100_fleet_copy_soften`: [FAKT] `UPDATE` tylko przy dokładnej zgodności z dawną treścią seeda (`WHERE "body" = ...`, `WHERE "description" = ...`), więc tekst zmieniony przez właściciela nie zostanie nadpisany. SQL jest statyczny, bez parametrów z zewnątrz, więc wstrzyknięcie jest niemożliwe. Cofnięcie opisane w komentarzu (odwrotne UPDATE-y).
- CookieBanner (`src/components/site/CookieBanner.tsx`): [FAKT] oba przyciski mają tę samą klasę `btn btn-secondary` i ten sam rozmiar. Domyślnie nic poza niezbędnymi nie jest włączone, a sposób zapisu zgody (`setConsent`) się nie zmienił. Fokus trafia na baner bez pułapki fokusu i po decyzji wraca do elementu, z którego baner otwarto, albo do `#tresc`. Treść nadal informuje o przekazaniu IP do OpenStreetMap i linkuje do polityki. Diff nie dodaje żądań do mapy ani do stron trzecich przed zgodą.
- CSP: [FAKT] diff nie zmienia `src/proxy.ts` ani `next.config.ts`. Skrypt JSON-LD ma `nonce`.
- Favicon: [FAKT] `src/app/favicon.ico` (3225 B) wygenerowany z istniejącego `icon.svg` skryptem `scripts/build-favicon.ts`. Skrypt używa tylko `node:fs`, `node:path` i `sharp`, zapisuje plik wyłącznie w repo i nie łączy się z siecią.
- Zależności: [FAKT] `package.json` i `package-lock.json` bez zmian w diffie (`sharp` i `tsx` były już na `main`). `npm audit --omit=dev`: 0 podatności.
- Sekrety: [FAKT] przeszukanie dodanych linii diffu (`password|secret|api_key|token|BEGIN KEY`) nic nie znalazło. Brak nowych zmiennych środowiskowych.
- JSON-LD tylko na `/` i `/kontakt` [FAKT] (`(public)/page.tsx:33`, `kontakt/page.tsx:21`). Ceny nie trafiają do danych (`seo.ts:23-29`).
- `/dla-firm` (`src/app/(public)/dla-firm/page.tsx:17-24`): [FAKT] usunięto obietnice „Priorytetowe terminy” i „Historia napraw i przypominamy o przeglądach”, zgodnie z CLAUDE.md (brak historii napraw i panelu klienta). [ZAŁOŻENIE] „Ewidencja wizyt: wizyty pojazdów z floty zapisujemy w warsztacie” odpowiada istniejącym modelom `Vehicle`/`Booking`/`FleetAccount`. Tekst nie obiecuje klientowi dostępu do tych danych. Treść czeka na zatwierdzenie właściciela (komentarz w pliku, linia 17).
- `revalidatePath("/", "layout")` po zapisie ustawień (`ustawienia/actions.ts:43`) odświeża tylko cache i nie ma wpływu na bezpieczeństwo.
