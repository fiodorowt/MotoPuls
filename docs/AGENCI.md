# Agenci Claude Code w projekcie Moto Puls

## Co jest w repozytorium
- `CLAUDE.md`: zasady projektu, czytane automatycznie przez Claude Code (importuje `AGENTS.md`).
- `.claude/agents/`: 11 agentów: audytorzy (`mp-audytor-frontend`, `mp-audytor-kodu`, `mp-audytor-seo`), planista (`mp-architekt`), programiści etapów (`mp-rezerwacje`, `mp-sms`, `mp-premium`, `mp-seo-tresci`, `mp-panel-klienta`), kontrola (`mp-tester`, `mp-bezpieczenstwo`).
- `.claude/commands/`: komendy `/mp-audyt`, `/mp-backlog`, `/mp-etap N`.
- `docs/decyzje.md`: decyzje właściciela (godziny, cena Premium, SMS…). `docs/audyt/`, `docs/prompty/`: tu agenci zapisują wyniki.

## Jak zacząć
1. Zaktualizuj repo i przełącz się na gałąź z agentami: `git fetch` i `git checkout chore/claude-agents` (albo po zmergowaniu po prostu `main`).
2. `npm install`, skopiuj `.env.example` do `.env` (patrz README), uruchom Claude Code w folderze projektu: `claude`.
3. `/agents`: powinno być widać agentów `mp-...`. Jeśli nie, zamknij i uruchom Claude Code ponownie. `/` pokaże komendy.

## Kolejność pracy
1. `/mp-audyt`: trzej audytorzy równolegle, bez zmian w kodzie. Przeczytaj podsumowanie i uzupełnij `docs/decyzje.md`.
2. `/mp-backlog`: architekt tworzy backlog, roadmapę, plan testów i prompty. Zaakceptuj lub poproś o zmiany.
3. `/mp-etap 1` (rezerwacje: luki), `/mp-etap 2` (SMS), `/mp-etap 3` (Premium), `/mp-etap 4` (SEO i treści), `/mp-etap 5` (panel klienta, na końcu). Po każdym etapie działają lint, testy, tester i recenzent bezpieczeństwa.
4. Etapy 3 i 4 możesz robić równolegle w osobnych katalogach roboczych Git, żeby agenci nie edytowali tych samych plików: `git worktree add ../motopuls-premium -b mp/etap-3`, a w nowym katalogu osobna sesja `claude`.
Agenta możesz też wywołać wprost, np. „Użyj agenta mp-tester do sprawdzenia rezerwacji".

## Zasady wbudowane w agentów
Najpierw analiza, kod po akceptacji. Agenci nie zgadują danych („DO UZUPEŁNIENIA"). Nic nie trafia do `main` ani na produkcję bez Twojej zgody. Testy na danych testowych, SMS domyślnie wyłączone. System już ma rezerwacje, panel i blokadę podwójnych rezerwacji w bazie: agenci mają uzupełniać luki, nie budować od zera.

## Koszty i tokeny
Audytorzy, programiści i tester używają modelu `sonnet`, a architekt i recenzent bezpieczeństwa `opus` (zmienisz w linii `model:` pliku agenta). Agenci zapisują długie raporty do `docs/` i zwracają krótkie podsumowania. Między etapami użyj `/clear`, w długiej sesji `/compact`.

## Jak ulepszać agentów
Gdy agent popełni błąd, dopisz jedną regułę w jego pliku albo w `CLAUDE.md`. Po kilku poprawkach będą dopasowani do projektu.

## Ograniczenia
Agenci zostali napisani na podstawie kodu repozytorium i publicznej strony, ale nie byli uruchomieni w Twoim środowisku. Pierwsze `/mp-audyt` pokaże, co wymaga korekty.
