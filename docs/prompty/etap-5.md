# Etap 5: Panel klienta (KOLEJNY etap rozwoju)

**Agent:** `mp-panel-klienta`, obowiązkowo `mp-bezpieczenstwo` (przed kodem: przegląd modelu zagrożeń; po kodzie: pełny przegląd) i `mp-tester`. Uruchamiane przez `/mp-etap 5`.
**Warunek startu:** wyraźne polecenie użytkownika; etapy 1-3 zmergowane; decyzje D-22 (logowanie) i D-23 (zakres danych naprawy) podjęte; MP-050 zaakceptowany przez użytkownika ZANIM powstanie jakikolwiek kod. To NIE jest część pierwszego wdrożenia.

## Kontekst
Istnieją `Customer`, `Vehicle`, `Booking`, link klienta po tokenie 256-bit (`src/app/(public)/rezerwacja/[token]`, `cancelByCustomer`), sesje i 2FA wyłącznie dla `User` (OWNER/EMPLOYEE, `src/lib/auth/*`, cookie `__Host-`), panel `klienci` z historią wizyt, anonimizacja po `retentionMonths` i eksport danych klienta. Brakuje: kont klientów, historii napraw i kosztów, statusu naprawy dla klienta (kod.md C1-C3). Ryzyko: `Customer` dopasowywany po (telefon, e-mail) bez weryfikacji własności (kod.md C2).

## Zakres
1. MP-050: `docs/audyt/panel-klienta-zagrozenia.md` (aktorzy, zasoby, IDOR, przejęcie historii przez cudzy e-mail/telefon, enumeracja, sesje, retencja). STOP: akceptacja użytkownika i przegląd `mp-bezpieczenstwo`.
2. MP-051: `CustomerLoginToken`, `CustomerSession`, `Customer.emailVerifiedAt` (addytywnie, bez relacji do `User`/`Session`).
3. MP-052: logowanie wg D-22 [REKOMENDACJA: jednorazowy link e-mail, 15 min, skrót w bazie], odpowiedź identyczna dla nieistniejących kont, `rate-limit.ts`, osobne ciasteczko `__Host-mp_customer`, `requireCustomer()`.
4. MP-053: `(klient)/konto` z layoutem z `Chrome.tsx`, wizyty i pojazdy filtrowane po `customerId` z sesji; reużycie komponentów strony tokenu.
5. MP-054: `RepairRecord` + edycja w `rezerwacje/[id]` z `AuditLog`, uprawnienia wg D-23.
6. MP-055: historia napraw (tylko `visibleToCustomer`).
7. MP-056: anonimizacja i eksport obejmują nowe dane; czyszczenie wygasłych tokenów/sesji w `maintenance`.
8. MP-057: testy IDOR i separacji sesji. MP-058: treść `/dla-firm` po wdrożeniu.

## Pliki (główne)
`prisma/schema.prisma` + migracje, `src/lib/auth/customer-*.ts` (nowe, obok, nie w miejsce istniejących), `src/lib/rate-limit.ts` (użycie), `src/lib/maintenance.ts`, `src/app/(klient)/konto/*` (nowe), `src/app/(public)/rezerwacja/[token]/*` (wydzielenie wspólnych komponentów), `src/app/admin/(panel)/{rezerwacje,klienci}/*`, `src/lib/email/templates.ts` (szablon linku logowania), `src/proxy.ts` (nagłówki `no-store` dla `/konto`, jeśli potrzebne), `tests/*`, `SECURITY.md`, polityka prywatności (treść „DO ZATWIERDZENIA").

## Kryteria akceptacji
Kryteria MP-050…MP-057 oraz T7.1-T7.6 PASS; przegląd `mp-bezpieczenstwo` bez ustaleń BLOKUJĄCYCH. Dodatkowo: każde zapytanie Prisma w trasach klienta filtrowane po `customerId` z sesji; klient nie ma dostępu do `/admin`, admin nie działa jako klient; responsywność 390/768/1280; spójność z marką; logi bez danych osobowych.

## Zakazy
- NIE zaczynaj kodu przed akceptacją MP-050.
- NIE łącz sesji klienta z `Session`/`requireUser` ani nie rozszerzaj enuma ról `User` o klienta.
- NIE pobieraj danych po samym ID z URL bez sprawdzenia właściciela.
- NIE pisz własnej kryptografii; używaj istniejących mechanizmów (`argon2`, generowanie tokenów, skróty jak w `session.ts`).
- NIE duplikuj mechanizmu anonimizacji/eksportu; rozszerzaj istniejący.
- NIE pokazuj klientowi danych naprawy spoza zakresu D-23.
- Migracje addytywne; bez `db:deploy`; bez merge i wdrożenia bez zgody użytkownika i przeglądu bezpieczeństwa.

## Raport (do 10 linii)
Co zmieniono, wyniki testów (T7), werdykt bezpieczeństwa, zmiany w polityce prywatności do zatwierdzenia.
