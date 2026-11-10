/**
 * Dane startowe. Po pierwszym uruchomieniu wszystko jest edytowalne w panelu –
 * ten plik nie nadpisuje istniejących rekordów.
 *
 * PLACEHOLDERY do uzupełnienia przez właściciela: godziny otwarcia, ceny (null = „wycena indywidualna”),
 * czasy trwania usług, współrzędne geograficzne, liczba stanowisk.
 */

export const SETTINGS = {
  brandName: "Moto Puls",
  legalName: "Moto Puls Kamil Klimek i Karol Guzicki S.C.",
  nip: "5543014836",
  street: "ul. Modra 26",
  postalCode: "86-005",
  city: "Białe Błota",
  phones: ["881765880", "535352780"],
  email: "motopuls.serwis@gmail.com",
  facebookUrl: "https://www.facebook.com/SerwisMotoPuls/",
  // PLACEHOLDER: przybliżone współrzędne – zweryfikuj na mapie i popraw w panelu
  latitude: 53.0952,
  longitude: 17.9285,
  directions:
    "Znajdziesz nas w Białych Błotach pod Bydgoszczą, tuż przy drodze S10 (Bydgoszcz–Poznań), w rejonie ulic Szubińskiej, Czerskiej i Centralnej – niedaleko Hotelu Sylwana. Z S10 skręć w Centralną, a następnie w Modrą.",
  tagline: "Puls Twojego auta",
  about:
    "Moto Puls to miejsce, które powstało z myślą o Tobie. Wychodzimy naprzeciw najbardziej wymagającym klientom. Wszystkie naprawy wykonujemy ze szczególną starannością, zachowując przy tym indywidualne podejście do każdego powierzonego nam pojazdu.",
  bays: 2,
  autoConfirm: false,
  cancelHoursBefore: 24,
  minLeadHours: 12,
  maxDaysAhead: 60,
  retentionMonths: 36,
  pricingNote:
    "Cennik jest w przygotowaniu. Ostateczny koszt zależy od modelu auta i zakresu prac – wycenę podajemy przed rozpoczęciem naprawy.",
};

// PLACEHOLDER: godziny otwarcia do potwierdzenia przez właściciela
export const OPENING_HOURS = [
  { weekday: 1, closed: false, open: "08:00", close: "17:00" },
  { weekday: 2, closed: false, open: "08:00", close: "17:00" },
  { weekday: 3, closed: false, open: "08:00", close: "17:00" },
  { weekday: 4, closed: false, open: "08:00", close: "17:00" },
  { weekday: 5, closed: false, open: "08:00", close: "17:00" },
  { weekday: 6, closed: true, open: "08:00", close: "13:00" },
  { weekday: 7, closed: true, open: "08:00", close: "13:00" },
];

interface SeedService {
  name: string;
  description: string;
  durationMin: number;
  requiresRefrigerant?: boolean;
}

interface SeedCategory {
  slug: string;
  name: string;
  icon: string;
  summary: string;
  description: string;
  services: SeedService[];
}

export const CATEGORIES: SeedCategory[] = [
  {
    slug: "naprawy",
    name: "Naprawa samochodów osobowych i dostawczych",
    icon: "wrench",
    summary: "Auta osobowe i dostawcze do 3,5 t – wszystkie marki.",
    description:
      "Naprawiamy samochody osobowe i dostawcze do 3,5 t wszystkich marek – od bieżącej obsługi po poważniejsze naprawy. Przed rozpoczęciem pracy mówimy, co jest do zrobienia i ile to będzie kosztować, a wymienione części możesz obejrzeć przy odbiorze auta.",
    services: [
      { name: "Oględziny i wycena naprawy", description: "Sprawdzamy zgłoszoną usterkę i przedstawiamy zakres oraz koszt naprawy.", durationMin: 30 },
      { name: "Wymiana oleju i filtrów", description: "Olej silnikowy z filtrem oleju; na życzenie także filtr powietrza i paliwa.", durationMin: 60 },
      { name: "Przegląd okresowy", description: "Kontrola płynów, hamulców, zawieszenia, oświetlenia i ogumienia zgodnie z planem serwisowym.", durationMin: 90 },
      { name: "Wymiana klocków hamulcowych (jedna oś)", description: "Wymiana klocków z kontrolą tarcz i przewodów hamulcowych.", durationMin: 60 },
      { name: "Wymiana tarcz i klocków hamulcowych (jedna oś)", description: "Komplet tarcz i klocków na jednej osi.", durationMin: 90 },
      { name: "Naprawa zawieszenia", description: "Wymiana wahaczy, łączników, amortyzatorów i innych elementów zawieszenia.", durationMin: 120 },
      { name: "Wymiana rozrządu", description: "Pasek lub łańcuch rozrządu z osprzętem; zwykle także pompa wody.", durationMin: 240 },
      { name: "Wymiana sprzęgła", description: "Komplet sprzęgła, w razie potrzeby koło dwumasowe.", durationMin: 300 },
    ],
  },
  {
    slug: "mechanika-i-elektromechanika",
    name: "Mechanika i elektromechanika pojazdowa",
    icon: "bolt",
    summary: "Silnik, osprzęt, instalacja elektryczna i ładowanie.",
    description:
      "Zajmujemy się zarówno mechaniką, jak i elektryką pojazdu: rozruchem i ładowaniem, oświetleniem, czujnikami i wiązkami. Szukamy przyczyny usterki, zamiast wymieniać części „na próbę”.",
    services: [
      { name: "Diagnoza usterki elektrycznej", description: "Pomiary instalacji, szukanie zwarć i przerw, sprawdzenie czujników.", durationMin: 60 },
      { name: "Wymiana akumulatora z adaptacją", description: "Dobór i wymiana akumulatora, w nowszych autach z kodowaniem.", durationMin: 30 },
      { name: "Naprawa układu ładowania (alternator)", description: "Kontrola ładowania, wymiana lub regeneracja alternatora.", durationMin: 120 },
      { name: "Wymiana rozrusznika", description: "Diagnostyka układu rozruchu i wymiana rozrusznika.", durationMin: 120 },
      { name: "Wymiana świec zapłonowych lub żarowych", description: "Wymiana kompletu świec z kontrolą cewek lub sterownika świec.", durationMin: 60 },
    ],
  },
  {
    slug: "klimatyzacja",
    name: "Obsługa i serwis układów klimatyzacji",
    icon: "snow",
    summary: "Oba czynniki: R134a i R1234yf. Stacja TEXA Konfort 715R.",
    description:
      "Serwisujemy klimatyzację na stacji TEXA Konfort 715R „2 Gas Ready”, dzięki czemu obsługujemy oba czynniki chłodnicze: R134a oraz R1234yf stosowany w nowszych autach. Odzyskujemy i uzupełniamy czynnik, sprawdzamy szczelność, odgrzybiamy układ i wymieniamy filtry kabinowe.",
    services: [
      { name: "Serwis klimatyzacji z napełnieniem", description: "Odzysk czynnika, próba próżniowa, uzupełnienie oleju i czynnika, kontrola ciśnień.", durationMin: 60, requiresRefrigerant: true },
      { name: "Wykrywanie nieszczelności", description: "Próba szczelności azotem i kontrast UV – gdy klimatyzacja szybko traci czynnik.", durationMin: 60, requiresRefrigerant: true },
      { name: "Odgrzybianie i ozonowanie", description: "Usuwanie przykrych zapachów, grzybów i bakterii z układu wentylacji i wnętrza.", durationMin: 45 },
      { name: "Wymiana filtra kabinowego", description: "Wymiana filtra przeciwpyłkowego lub węglowego.", durationMin: 30 },
    ],
  },
  {
    slug: "diagnostyka-komputerowa",
    name: "Diagnostyka komputerowa",
    icon: "scan",
    summary: "Odczyt błędów, parametry na żywo, kasowanie kontrolek.",
    description:
      "Podłączamy tester diagnostyczny, odczytujemy błędy ze sterowników i sprawdzamy parametry pracy na żywo. Wynik tłumaczymy zrozumiałym językiem i mówimy, co wymaga naprawy od razu, a co może poczekać.",
    services: [
      { name: "Diagnostyka komputerowa", description: "Odczyt i kasowanie błędów, podgląd parametrów, wydruk lub omówienie wyniku.", durationMin: 30 },
      { name: "Diagnostyka rozszerzona z jazdą próbną", description: "Diagnostyka z rejestracją parametrów podczas jazdy – przy usterkach pojawiających się okresowo.", durationMin: 60 },
      { name: "Sprawdzenie auta przed zakupem", description: "Diagnostyka komputerowa i oględziny podwozia przed kupnem używanego auta.", durationMin: 90 },
    ],
  },
  {
    slug: "czesci-zamienne",
    name: "Sprzedaż części zamiennych",
    icon: "box",
    summary: "Dobór i zamówienie części po numerze VIN.",
    description:
      "Dobieramy części po numerze VIN, żeby pasowały za pierwszym razem. Zamówisz u nas same części albo części z montażem. Wyślij zapytanie przez formularz – odezwiemy się z ceną i terminem.",
    services: [],
  },
  {
    slug: "floty",
    name: "Obsługa flot samochodowych",
    icon: "fleet",
    summary: "Stała opieka serwisowa nad autami firmowymi.",
    description:
      "Prowadzimy obsługę serwisową samochodów firmowych: przeglądy, naprawy bieżące, klimatyzację i diagnostykę. Ustalamy stałe warunki współpracy, pilnujemy terminów i prowadzimy historię każdego pojazdu.",
    services: [],
  },
];

export const CONTENT_BLOCKS = [
  { key: "why_1", label: "Dlaczego my – 1", title: "Indywidualne podejście", body: "Każde auto i każdą usterkę traktujemy osobno. Nie ma u nas napraw „z taśmy”." },
  { key: "why_2", label: "Dlaczego my – 2", title: "Staranność", body: "Naprawy wykonujemy ze szczególną starannością – tak, jak chcielibyśmy, żeby naprawiono nasze auta." },
  { key: "why_3", label: "Dlaczego my – 3", title: "Wycena przed naprawą", body: "Zanim zaczniemy, mówimy, co jest do zrobienia i ile to będzie kosztować." },
  { key: "why_4", label: "Dlaczego my – 4", title: "Wszystkie marki", body: "Obsługujemy samochody osobowe i dostawcze do 3,5 t niezależnie od marki." },
  { key: "ac_highlight", label: "Wyróżnik klimatyzacji", title: "Klimatyzacja: R134a i R1234yf", body: "Masz nowsze auto? Najpewniej jeździ na czynniku R1234yf, którego nie obsłuży każdy warsztat. Nasza stacja TEXA Konfort 715R „2 Gas Ready” pracuje z oboma czynnikami." },
  { key: "fleet_intro", label: "Floty – wstęp", title: "Serwis aut firmowych", body: "Auto firmowe ma jeździć, a nie stać. Ustalimy stałe warunki, priorytetowe terminy i jedną osobę do kontaktu." },
  { key: "parts_intro", label: "Części – wstęp", title: "Części zamienne", body: "Podaj dane auta i nazwę części. Sprawdzimy dostępność i odezwiemy się z ceną." },
];
