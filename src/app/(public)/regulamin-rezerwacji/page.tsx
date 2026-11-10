import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/site/Sections";
import { formatPhone } from "@/lib/labels";
import { fullAddress, getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Regulamin rezerwacji online",
  description: "Zasady rezerwowania wizyt online w warsztacie Moto Puls.",
  alternates: { canonical: "/regulamin-rezerwacji" },
};

export default async function TermsPage() {
  const s = await getSettings();
  return (
    <>
      <PageHeader eyebrow="Rezerwacje" title="Regulamin rezerwacji online" />
      <div className="container-page prose-mp pb-16">
        <p className="card text-sm">
          <strong>Uwaga dla właściciela serwisu:</strong> to szablon – przed publikacją warto skonsultować go z
          prawnikiem.
        </p>

        <h2>1. Postanowienia ogólne</h2>
        <ol>
          <li>Regulamin określa zasady rezerwowania wizyt przez stronę internetową warsztatu {s.brandName}.</li>
          <li>Usługodawcą jest {s.legalName}, {fullAddress(s)}, NIP {s.nip}, e-mail: {s.email}{s.phones[0] ? `, tel. ${formatPhone(s.phones[0])}` : ""}.</li>
          <li>Rezerwacja online jest bezpłatna i nie wymaga zakładania konta.</li>
        </ol>

        <h2>2. Rezerwacja wizyty</h2>
        <ol>
          <li>Aby zarezerwować wizytę, wybierz usługi, podaj dane pojazdu, wskaż wolny termin oraz podaj dane kontaktowe.</li>
          <li>Czas wizyty podany w kreatorze jest orientacyjny. Rzeczywisty czas naprawy zależy od stanu pojazdu i dostępności części.</li>
          <li>
            {s.autoConfirm
              ? "Rezerwacja jest potwierdzana automatycznie – potwierdzenie wysyłamy e-mailem."
              : "Rezerwacja wymaga potwierdzenia przez warsztat. Do czasu potwierdzenia ma status „oczekuje”; potwierdzenie wysyłamy e-mailem."}
          </li>
          <li>Rezerwacja terminu nie jest zawarciem umowy o naprawę. Zakres i koszt prac ustalamy po oględzinach pojazdu, przed rozpoczęciem naprawy.</li>
          <li>Ceny podane w serwisie mają charakter orientacyjny i nie stanowią oferty w rozumieniu Kodeksu cywilnego.</li>
        </ol>

        <h2>3. Zmiana i odwołanie wizyty</h2>
        <ol>
          <li>Wizytę możesz odwołać samodzielnie przez link z wiadomości e-mail, najpóźniej {s.cancelHoursBefore} godz. przed terminem.</li>
          <li>Po tym czasie prosimy o kontakt telefoniczny.</li>
          <li>Warsztat może zmienić lub odwołać termin z ważnych przyczyn (np. awaria sprzętu, choroba pracownika) – niezwłocznie Cię o tym poinformujemy i zaproponujemy nowy termin.</li>
          <li>Jeśli nie możesz przyjechać, daj nam znać – zwolniony termin przyda się innemu klientowi.</li>
        </ol>

        <h2>4. Wymagania techniczne</h2>
        <p>Do rezerwacji potrzebujesz urządzenia z aktualną przeglądarką internetową i czynnego adresu e-mail.</p>

        <h2>5. Reklamacje</h2>
        <p>Uwagi dotyczące działania rezerwacji online możesz zgłosić na adres {s.email}. Odpowiemy w ciągu 14 dni.</p>

        <h2>6. Dane osobowe</h2>
        <p>
          Zasady przetwarzania danych opisuje <Link href="/polityka-prywatnosci">polityka prywatności</Link>.
        </p>

        <h2>7. Postanowienia końcowe</h2>
        <p>W sprawach nieuregulowanych stosuje się przepisy prawa polskiego. Regulamin nie ogranicza praw konsumenta wynikających z przepisów bezwzględnie obowiązujących.</p>
      </div>
    </>
  );
}
