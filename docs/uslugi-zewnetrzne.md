# SMTP i bramka SMS: opcje do testów (2026-11-13)

Limity i ceny pochodzą z blogów porównawczych i wyszukiwania, nie ze sprawdzenia u dostawców. Oznaczenie [ZAŁOŻENIE]: przed założeniem konta sprawdź cennik na stronie dostawcy.

## 1. SMTP (maile)

Aplikacja czyta `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM` (`.env.example:22-27`). Wystarczy dowolny dostawca z dostępem SMTP, bez zmian w kodzie.

| Dostawca | Darmowy limit [ZAŁOŻENIE] | Uwagi |
|---|---|---|
| Mailtrap (Email Sandbox) | ok. 1000 do 4000 mies., źródła się różnią | Najlepszy do TESTÓW: maile NIE wychodzą do prawdziwych osób, lądują w podglądzie. Bez własnej domeny. |
| Brevo | 300 maili/dzień | Najwyższy dzienny limit. Na darmowym planie dodaje stopkę Brevo. Wysyła naprawdę. |
| Resend | ok. 3000 mies., 100/dzień | Nowoczesne API, wymaga zweryfikowanej domeny do wysyłki do dowolnych adresów. |
| SMTP2GO | ok. 1000 mies. | Prosty SMTP. |
| Mailgun | 100/dzień lub tylko próbny 30 dni, źródła sprzeczne | Do sprawdzenia. |
| Gmail (konto firmowe, hasło aplikacji) | ok. 500/dzień | Działa od razu, ale słabsza dostarczalność i adres nadawcy = konto Gmail. Tylko na próbę. |

[REKOMENDACJA] Etap testów: **Mailtrap Sandbox** (bezpiecznie, nic nie wyjdzie do klientów). Przed startem produkcyjnym: **Brevo** lub **Resend** z własną domeną (SPF/DKIM), co wymaga domeny (decyzja D-15).

## 2. Bramka SMS

Cen nie udało się potwierdzić ze stron dostawców (strony nie wystawiają cennika w wynikach). W backlogu MP-023 agent `mp-sms` ma zebrać ceny ze źródłem i datą.

| Dostawca | Cena za SMS do PL [ZAŁOŻENIE] | Konto testowe | Uwagi |
|---|---|---|---|
| Twilio | ok. 0,043 do 0,046 USD (ok. 0,17 do 0,19 zł) | Tak, próbne, zwykle tylko na zweryfikowane numery [do sprawdzenia] | Dobre API i tryb testowy. Nadawca alfanumeryczny w PL wymaga rejestracji. Droższe od polskich bramek. |
| SMSAPI (LINK Mobility) | DO UZUPEŁNIENIA | zwykle próbne punkty [do sprawdzenia] | Polska firma, polskie wsparcie, faktury w PLN. |
| SerwerSMS | DO UZUPEŁNIENIA | zwykle próbne punkty [do sprawdzenia] | Polska firma, API HTTP i SMPP. |
| OVHcloud SMS | ok. 0,131 do 0,135 zł netto przy pakiecie 200 do 2000 SMS | brak informacji | Jedyna konkretna stawka z wyników, data nieznana. |
| SMSPLANET, sms.pl | DO UZUPEŁNIENIA | DO UZUPEŁNIENIA | Brak danych w wyszukiwaniu. |

Wolumen kosztowy: `liczba SMS × segmenty × cena`. Przykład przy 0,13 zł i 300 potwierdzeń/mies.: ok. 39 zł netto, przy 600: ok. 78 zł. Transliteracja polskich znaków (D-24) trzyma SMS w 1 segmencie (160 znaków).

[REKOMENDACJA] Na testy: **konto próbne polskiej bramki (SMSAPI lub SerwerSMS)** albo **Twilio trial**; do czasu wyboru działa wbudowany tryb testowy (`.sms-outbox`, bez wysyłki). Wybór na produkcję po sprawdzeniu cenników i zapisaniu w D-5.

## 3. Co robi właściciel, a co agent

- Założenie kont, hasła, klucze API i kody weryfikacyjne: właściciel (agent nie tworzy kont ani nie wpisuje sekretów).
- Wpisanie wartości `SMTP_*` w panelu Render (Environment) lub w lokalnym `.env`: właściciel.
- Kod SMS (MP-024 do MP-028), tryb testowy i ostrzeżenie o braku SMTP (MP-002): agent w etapie 1 i 2.

## 4. Opcja do rozważenia z klientem: SMS z własnej karty SIM (2026-11-13)

Telefon z Androidem i kartą SIM jako bramka SMS (aplikacja udostępniająca API, np. textbee.dev lub android-sms-gateway [ZAŁOŻENIE, do weryfikacji]).
- Za: koszt to abonament z pakietem SMS, SMS z numeru znanego klientom, klient może odpisać, brak umowy z bramką.
- Przeciw: telefon musi działać i mieć internet 24/7, operator może blokować automatyczną wysyłkę (sprawdzić regulamin), brak raportów doręczeń, telefon wystawiony przez API (RODO, zabezpieczenie), aplikacje bez gwarancji wsparcia.
- Koszt porównawczy: bramka ok. 40 zł netto/mies. przy 300 SMS [ZAŁOŻENIE], więc oszczędność jest mała.
- [REKOMENDACJA] Test lub pilotaż: tak. Produkcja: bramka. Adapter SIM da się dodać obok bramki dzięki interfejsowi `SmsProvider` (MP-025).
- Do ustalenia z klientem: czy akceptuje zależność od jednego telefonu i czy operator dopuszcza taki użytek.
