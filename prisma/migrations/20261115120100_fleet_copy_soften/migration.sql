-- MP-038 / D-11 (a): złagodzenie treści o flotach do tego, co system faktycznie robi (bez historii napraw i priorytetu).
-- Zmieniamy wyłącznie wiersze, które nadal mają dawną treść startową z seeda; tekst zmieniony przez właściciela zostaje.
-- Przywrócenie po etapie 5: MP-058.
UPDATE "ContentBlock"
SET "body" = 'Auto firmowe ma jeździć, a nie stać. Ustalimy stałe warunki współpracy, terminy uzgodnimy indywidualnie, a Ty dostaniesz jedną osobę do kontaktu.'
WHERE "key" = 'fleet_intro'
  AND "body" = 'Auto firmowe ma jeździć, a nie stać. Ustalimy stałe warunki, priorytetowe terminy i jedną osobę do kontaktu.';

UPDATE "ServiceCategory"
SET "description" = 'Prowadzimy obsługę serwisową samochodów firmowych: przeglądy, naprawy bieżące, klimatyzację i diagnostykę. Ustalamy stałe warunki współpracy, a wizyty pojazdów zapisujemy w ewidencji warsztatu.'
WHERE "slug" = 'floty'
  AND "description" = 'Prowadzimy obsługę serwisową samochodów firmowych: przeglądy, naprawy bieżące, klimatyzację i diagnostykę. Ustalamy stałe warunki współpracy, pilnujemy terminów i prowadzimy historię każdego pojazdu.';
-- Cofnięcie: odwrotne UPDATE-y z zamienionymi treściami (lub edycja w panelu).
