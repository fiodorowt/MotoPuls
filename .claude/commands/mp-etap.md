---
description: Wdrożenie jednego etapu (1 rezerwacje, 2 SMS, 3 Premium, 4 SEO, 5 panel klienta) z testami i przeglądem
argument-hint: <numer etapu 1-5>
---

Wdróż etap $ARGUMENTS wg docs/prompty/etap-$ARGUMENTS.md i docs/backlog.md. Warunek: backlog zaakceptowany przez mnie. Zasady z CLAUDE.md (w tym przewodnik Next.js 16 z node_modules/next/dist/docs). Jeśli plik etapu nie istnieje, zatrzymaj się i powiedz, żebym uruchomił /mp-backlog.

Agent implementacji: etap 1 = mp-rezerwacje, 2 = mp-sms, 3 = mp-premium, 4 = mp-seo-tresci, 5 = mp-panel-klienta.

Kolejność:
1. Sprawdź zależności z roadmapy (np. SMS wymaga ukończonych rezerwacji). Jeśli niespełnione, zatrzymaj się.
2. Utwórz gałąź `mp/etap-$ARGUMENTS-...`. Uruchom agenta implementacji.
3. Uruchom `npm run lint`, `typecheck`, `test`, `test:e2e` i `build`. Następnie mp-tester (niezależnie, bez przekazywania mu rozumowania implementatora). Jeśli BLOKUJE, zwróć błędy implementatorowi, popraw i powtórz (maks. 2 rundy, potem zatrzymaj się i zapytaj mnie).
4. Uruchom mp-bezpieczenstwo. Jeśli BLOKADA, napraw blokujące i powtórz test.
5. Nie merguj do main i nie wdrażaj na Render. Przedstaw mi raport do 15 linii: co działa, wyniki testów (rzeczywiste), uwagi bezpieczeństwa, koszty, co wymaga mojej decyzji, i zapytaj o zgodę na merge.
