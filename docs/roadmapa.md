# Roadmapa Moto Puls

Data: 2026-11-13. Podstawa: `docs/backlog.md` (MP-001…MP-058). Status: DO AKCEPTACJI.
Zasada: nic nie trafia do `main` ani na Render bez zgody użytkownika (CLAUDE.md, zasada 7). Każde zadanie na gałęzi `mp/<ID>-krotka-nazwa`; etap łączony w gałęzi `mp/etap-N-...` (komenda `/mp-etap N`).

## Kolejność etapów

```
Etap 0 (decyzje właściciela: D-9, D-10, D-18, D-19; równolegle zbieranie D-5, D-3/D-4, D-11...)
   │
Etap 1  Rezerwacje i godziny (luki) + produkcja Render        [sekwencyjnie, fundament]
   │      bramka B1
   ├───────────────┬──────────────────────┐
Etap 2  SMS        Etap 3  Premium         Etap 4  SEO i treści
(wymaga D-5,       (worktree A)            (worktree B)
 MP-003/006/016)
   │      bramki B2 / B3 / B4 (osobno dla każdego etapu)
   │
Etap 5  Panel klienta  [KOLEJNY etap, po 1-3 i decyzjach D-22, D-23; start tylko na polecenie]
          bramka B5 (+ obowiązkowy przegląd bezpieczeństwa)
```

[REKOMENDACJA] Kolejność wdrożeń na produkcję: 1 → 3 → 4 → 2 → 5. SMS jest drugi w planie funkcji, ale jego wdrożenie produkcyjne zależy od decyzji o dostawcy i koszcie (D-5); kod w trybie testowym może powstać wcześniej i czekać za flagą `SMS_ENABLED=false`.

## Etap 1: wewnętrzna kolejność

Sekwencyjnie (fundament dla pozostałych):
1. MP-006 infrastruktura testów integracyjnych → MP-007, MP-008 (testy rdzenia; jeśli wykażą błąd, poprawka w tej samej gałęzi zadania).
2. MP-001 dokumentacja Render (wymaga odpowiedzi właściciela, D-9) → MP-003 cron, MP-004 zimny start, MP-005 backup, MP-022 IP za proxy.
3. MP-016 punkt zaczepienia kanałów (przed etapem 2).

Równolegle w etapie 1 (różne pliki, osobne gałęzie):
- Gałąź A (backend/testy): MP-006 → MP-007 → MP-008 → MP-010 (CI).
- Gałąź B (operacje): MP-001 → MP-003 → MP-004 → MP-005 → MP-002 → MP-022.
- Gałąź C (frontend kreatora, `BookingWizard.tsx`): MP-018 → MP-017 → MP-021 (jedna gałąź, bo ten sam plik).
- Gałąź D (drobne frontend): MP-019, MP-020, MP-014.
- Po decyzjach: MP-011 (D-10), MP-012 (D-18, po MP-003), MP-013 (D-19), MP-015.
- MP-009 (E2E) na końcu etapu, po scaleniu A-D, bo E2E współdzielą jedną bazę i kolejność (`playwright.config.ts`: `workers: 1`).

Minimalny zakres etapu 1, by odblokować kolejne: MP-001, MP-002, MP-003, MP-006, MP-007, MP-008, MP-016, MP-018. Pozostałe P2/P3 mogą domknąć się równolegle z etapami 3-4.

## Równoległość etapów 2-4

| Para | Równolegle? | Uzasadnienie |
|---|---|---|
| 3 Premium ↔ 4 SEO | TAK, osobne worktree (`git worktree add ../motopuls-premium -b mp/etap-3-premium`, `../motopuls-seo -b mp/etap-4-seo`) | Różne obszary. Punkty styku: `sitemap.ts` (MP-034 i MP-042), `page.tsx` strony głównej (sekcja Premium vs title/description), `Chrome.tsx` (NAV/stopka vs baner). Reguła: etap 3 scala się pierwszy, etap 4 robi rebase przed MP-042. |
| 2 SMS ↔ 3 Premium | TAK | SMS dotyka `notify.ts`, `booking.ts`, kroku 4 kreatora i `szablony`; Premium dotyka `Inquiry`, `(public)/actions.ts`, nowej strony. Obie mają migracje: numeracja migracji tworzona dopiero tuż przed scaleniem (rebase + `prisma migrate dev` lokalnie), żeby nie było konfliktu kolejności. |
| 2 SMS ↔ 4 SEO | TAK, z jednym styk: polityka prywatności (MP-028 vs MP-045) | MP-045 wykonać po scaleniu MP-028, albo uzgodnić jedną zmianę treści. |
| 5 ↔ cokolwiek | NIE | Panel klienta dotyka auth, `Customer`, anonimizacji; wymaga stabilnej bazy po 1-3. |

## Bramki (warunki przejścia)

Każda bramka = definicja „zrobione" z CLAUDE.md + poniższe. Weryfikuje `mp-tester` (werdykt PRZEPUSZCZAM) i `mp-bezpieczenstwo` (WDRAŻAĆ MOŻNA). Decyzja o merge i wdrożeniu: użytkownik.

| Bramka | Warunki |
|---|---|
| B0 (start etapu 1) | Backlog zaakceptowany. Odpowiedź na D-9 (choćby częściowa: plan Render, baza, SMTP) przed MP-001/003/004/005; reszta etapu 1 może startować bez niej. |
| B1 (koniec etapu 1) | `npm run lint`, `typecheck`, `test`, `test:int`, `test:e2e`, `build` zielone; T1-T4 z `docs/testy.md` PASS; cron działa na produkcji (log wywołania, po zgodzie na wdrożenie); kopia bazy odtworzona lokalnie; ostrzeżenie SMTP widoczne lub SMTP potwierdzony; README i SECURITY.md zaktualizowane. |
| B2 (koniec etapu 2) | D-5, D-6, D-20, D-24 podjęte; T6 PASS z mockiem; `SMS_ENABLED=false` domyślnie; limit miesięczny ustawiony; treść zgody zatwierdzona; szacunek kosztu w raporcie. Pierwsze włączenie produkcyjne: osobna zgoda użytkownika, na jednym numerze testowym właściciela. |
| B3 (koniec etapu 3) | T5 PASS (Premium nie tworzy/zmienia rezerwacji); `premiumEnabled=false` do czasu zatwierdzenia treści i ceny (D-3, D-4); strona w sitemap. |
| B4 (koniec etapu 4) | T8 PASS; pomiary Lighthouse „przed/po" zapisane; brak `[DO UZUPEŁNIENIA]` na stronach publicznych, które etap dotykał (albo świadoma akceptacja właściciela); analityka tylko jeśli D-14 = tak, z testem braku żądań przed zgodą. |
| B5 (koniec etapu 5) | MP-050 zaakceptowany przed kodem; T7 (IDOR, separacja sesji) PASS; przegląd `mp-bezpieczenstwo` bez BLOKUJĄCYCH; aktualizacja polityki prywatności (D-6). |

## Ryzyka harmonogramu
- [ZAŁOŻENIE] Brak odpowiedzi na D-9 blokuje tylko gałąź operacyjną etapu 1; testy i frontend mogą iść.
- [ZAŁOŻENIE] Migracje równoległych etapów (SMS, Premium) mogą kolidować kolejnością; łagodzenie: rebase i odtworzenie migracji lokalnie przed scaleniem, nigdy `db:deploy` bez zgody.
- [FAKT] E2E współdzielą jedną bazę i działają sekwencyjnie (`playwright.config.ts`), więc nowe scenariusze muszą być niezależne od kolejności lub dopisane w przewidywalnym miejscu.
