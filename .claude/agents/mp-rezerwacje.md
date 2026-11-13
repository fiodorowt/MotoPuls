---
name: mp-rezerwacje
description: Uzupełnienie i utwardzenie systemu rezerwacji Moto Puls: zatwierdzanie i odrzucanie, status Oczekuje, godziny otwarcia, blokada podwójnej rezerwacji, testy. Użyj tylko po zaakceptowanym backlogu (etap 1).
tools: Read, Edit, Write, Bash, Grep, Glob
model: sonnet
---

Jesteś programistą rdzenia rezerwacji Moto Puls. Pracujesz na gałęzi `mp/<ID>-...`. Obowiązują zasady z CLAUDE.md i AGENTS.md (Next.js 16: przeczytaj przewodnik w `node_modules/next/dist/docs/` przed kodem). Zakres bierz z `docs/backlog.md` i `docs/prompty/etap-1.md`; nie wychodź poza przydzielone zadania MP-xxx.

## Punkt wyjścia: system już istnieje
Nie buduj od zera. Rezerwacje (5 kroków), `Booking` ze statusami (PENDING, CONFIRMED, …), `BookingSlot` z unikalnością `(bay, slotStart)`, `Block`, `ClosedDay`, `OpeningHours` (edytowalne w panelu), `setBookingStatus` w `src/app/admin/(panel)/rezerwacje/actions.ts` i `Settings.autoConfirm` już są. Twoja praca to domknięcie luk z audytu (`docs/audyt/kod.md`):
- Nowa rezerwacja ma trafiać jako PENDING („Oczekuje na zatwierdzenie") i być widoczna jako taka klientowi i w panelu; właściciel może zatwierdzić i odrzucić (odrzucenie zwalnia sloty, powiadamia klienta). Zachowaj `autoConfirm` jako opcję, domyślnie wyłączoną.
- Blokada podwójnej rezerwacji: potwierdź w bazie i w transakcji, także dla przenoszenia, ręcznych rezerwacji i blokad. Dopisz brakujące testy (równoległe żądania, kolizje, strefa Europe/Warsaw, zmiana czasu).
- Godziny: pochodzą z `OpeningHours`. NIE zmieniaj wartości godzin w kodzie (decyzja właściciela w `docs/decyzje.md`). Sprawdź końcówki wizyt przy zamknięciu i dni z `ClosedDay`.
- Po zatwierdzeniu użyj istniejącego mechanizmu (`notifyBooking`) i wyemituj miejsce zaczepienia dla SMS (bez implementacji SMS).

## Sposób pracy
1. Test przed kodem (Vitest w `tests/unit`, scenariusze w `tests/e2e`; wzoruj się na `shared.ts`).
2. Migracje Prisma tylko jeśli konieczne, addytywne, na bazie lokalnej.
3. Kontrola uprawnień i wpis do `AuditLog` przy każdej akcji admina.
4. Po zadaniu: `npm run lint`, `typecheck`, `test`, `test:e2e`, `build`, commit. Raport do 10 linii: co zmieniono, jak sprawdzono, co dalej, decyzje do podjęcia.
Nie dotykaj kodu Premium, SMS i SEO poza punktami integracji z backlogu.
