import type { Metadata } from "next";
import { CookieSettingsButton } from "@/components/site/CookieBanner";
import { PageHeader } from "@/components/site/Sections";
import { formatPhone } from "@/lib/labels";
import { fullAddress, getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Polityka prywatności",
  description: "Zasady przetwarzania danych osobowych i wykorzystania plików cookies w serwisie Moto Puls.",
  alternates: { canonical: "/polityka-prywatnosci" },
};

export default async function PrivacyPage() {
  const s = await getSettings();
  return (
    <>
      <PageHeader eyebrow="RODO" title="Polityka prywatności" />
      <div className="container-page prose-mp pb-16">
        <p className="card text-sm">
          <strong>Uwaga dla właściciela serwisu:</strong> to szablon przygotowany na podstawie funkcji tej strony.
          Przed publikacją powinien go zweryfikować prawnik lub inspektor ochrony danych, a pola oznaczone [DO
          UZUPEŁNIENIA] należy uzupełnić.
        </p>

        <h2>1. Administrator danych</h2>
        <p>
          Administratorem danych osobowych jest {s.legalName}, {fullAddress(s)}, NIP {s.nip} (dalej: „Administrator”).
          Kontakt w sprawach danych osobowych: <a href={`mailto:${s.email}`}>{s.email}</a>
          {s.phones[0] ? `, tel. ${formatPhone(s.phones[0])}` : ""}.
        </p>

        <h2>2. Jakie dane przetwarzamy i po co</h2>
        <h3>Rezerwacja wizyty</h3>
        <ul>
          <li>Zakres: imię i nazwisko, telefon, e-mail, dane pojazdu (marka, model, rocznik, numer rejestracyjny, opcjonalnie VIN i przebieg), opis usterki, wybrane usługi i termin.</li>
          <li>Cel: umówienie i realizacja wizyty, kontakt w jej sprawie, przypomnienie o terminie.</li>
          <li>Podstawa: art. 6 ust. 1 lit. b RODO (działania przed zawarciem umowy i jej wykonanie).</li>
        </ul>
        <h3>Formularze: kontaktowy, zapytanie o części, zapytanie flotowe</h3>
        <ul>
          <li>Zakres: imię i nazwisko, telefon, e-mail, treść zapytania oraz dane podane w formularzu (np. dane pojazdu, nazwa firmy, NIP).</li>
          <li>Cel: odpowiedź na zapytanie i przygotowanie oferty.</li>
          <li>Podstawa: art. 6 ust. 1 lit. f RODO (prawnie uzasadniony interes – obsługa korespondencji) lub lit. b, gdy zapytanie zmierza do zawarcia umowy.</li>
        </ul>
        <h3>Historia napraw i rozliczenia</h3>
        <ul>
          <li>Cel: prowadzenie historii serwisowej pojazdu, obsługa reklamacji, dochodzenie i obrona roszczeń, obowiązki księgowe.</li>
          <li>Podstawa: art. 6 ust. 1 lit. b, c i f RODO.</li>
        </ul>
        <h3>Informacje marketingowe</h3>
        <ul>
          <li>Tylko jeśli wyrazisz odrębną, dobrowolną zgodę (art. 6 ust. 1 lit. a RODO). Zgodę możesz wycofać w każdej chwili – bez wpływu na wizytę.</li>
        </ul>
        <h3>Bezpieczeństwo serwisu</h3>
        <ul>
          <li>W celu ochrony przed nadużyciami (np. spamem, próbami włamania) przez krótki czas przechowujemy skrót (hash) adresu IP powiązany z liczbą wysłanych formularzy. Podstawa: art. 6 ust. 1 lit. f RODO.</li>
        </ul>

        <h2>3. Jak długo przechowujemy dane</h2>
        <ul>
          <li>Dane klientów i rezerwacji: do {s.retentionMonths} miesięcy od ostatniej wizyty lub kontaktu – po tym czasie są automatycznie anonimizowane, o ile przepisy (np. podatkowe) nie wymagają dłuższego przechowywania dokumentów.</li>
          <li>Zapytania z formularzy: do czasu załatwienia sprawy, nie dłużej niż {s.retentionMonths} miesięcy.</li>
          <li>Dane przetwarzane na podstawie zgody: do jej wycofania.</li>
        </ul>

        <h2>4. Odbiorcy danych</h2>
        <p>Dane mogą być powierzane podmiotom, które wspierają nas w prowadzeniu serwisu, wyłącznie w niezbędnym zakresie:</p>
        <ul>
          <li>dostawca hostingu i bazy danych – [DO UZUPEŁNIENIA],</li>
          <li>dostawca poczty elektronicznej – [DO UZUPEŁNIENIA],</li>
          <li>biuro rachunkowe – [DO UZUPEŁNIENIA], jeśli dotyczy.</li>
        </ul>
        <p>Nie sprzedajemy danych i nie przekazujemy ich poza Europejski Obszar Gospodarczy, chyba że wynika to z wyboru dostawcy wskazanego powyżej – wtedy stosujemy standardowe klauzule umowne.</p>

        <h2>5. Twoje prawa</h2>
        <ul>
          <li>dostęp do danych i otrzymanie ich kopii,</li>
          <li>sprostowanie, usunięcie lub ograniczenie przetwarzania,</li>
          <li>przenoszenie danych,</li>
          <li>sprzeciw wobec przetwarzania opartego na prawnie uzasadnionym interesie,</li>
          <li>wycofanie zgody w dowolnym momencie,</li>
          <li>skarga do Prezesa Urzędu Ochrony Danych Osobowych (ul. Stawki 2, 00-193 Warszawa).</li>
        </ul>
        <p>Aby skorzystać z praw, napisz na adres <a href={`mailto:${s.email}`}>{s.email}</a>. Odpowiadamy bez zbędnej zwłoki, najpóźniej w ciągu miesiąca.</p>

        <h2>6. Dobrowolność podania danych</h2>
        <p>Podanie danych jest dobrowolne, ale niezbędne do umówienia wizyty lub uzyskania odpowiedzi na zapytanie. Nie podejmujemy decyzji w sposób zautomatyzowany ani nie profilujemy.</p>

        <h2>7. Pliki cookies i pamięć przeglądarki</h2>
        <p>Serwis nie używa narzędzi analitycznych ani reklamowych. Korzystamy wyłącznie z:</p>
        <ul>
          <li><strong>niezbędnych</strong> plików cookies – zapamiętanie Twojego wyboru dotyczącego cookies (<code>mp_consent</code>, 180 dni) oraz sesja logowania w panelu pracowników; w pamięci przeglądarki zapisujemy także wybrany motyw (jasny/ciemny),</li>
          <li><strong>treści zewnętrznych</strong> – mapy OpenStreetMap, która ładuje się dopiero po Twojej zgodzie. Po jej wyświetleniu dostawca mapy otrzymuje Twój adres IP i może zapisać własne pliki cookies.</li>
        </ul>
        <p>Swój wybór możesz zmienić w każdej chwili:</p>
        <p><CookieSettingsButton /></p>

        <h2>8. Zmiany polityki</h2>
        <p>Politykę możemy aktualizować, gdy zmienią się funkcje serwisu lub przepisy. Aktualna wersja jest zawsze dostępna na tej stronie.</p>
      </div>
    </>
  );
}
