import { audit } from "@/lib/audit";
import { requireOwner } from "@/lib/auth/session";
import { db } from "@/lib/db";

/** RODO: eksport wszystkich danych klienta (prawo dostępu i przenoszenia). Tylko właściciel. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireOwner();
  const { id } = await params;
  const customer = await db.customer.findUnique({
    where: { id },
    include: {
      vehicles: true,
      bookings: { include: { services: { select: { name: true, durationMin: true, priceFrom: true, priceTo: true } } }, orderBy: { startsAt: "asc" } },
    },
  });
  if (!customer) return new Response(null, { status: 404 });

  await audit({ actor: user.email, userId: user.id, action: "customer.export", entity: "Customer", entityId: id });

  const payload = {
    wygenerowano: new Date().toISOString(),
    klient: {
      imieNazwisko: customer.name,
      telefon: customer.phone,
      email: customer.email,
      zgodaMarketingowa: customer.marketingConsent,
      zgodaMarketingowaOd: customer.marketingConsentAt,
      utworzono: customer.createdAt,
    },
    pojazdy: customer.vehicles.map((v) => ({ marka: v.make, model: v.model, rok: v.year, rejestracja: v.plate, vin: v.vin, przebieg: v.mileage })),
    // Bez tokenu rezerwacji i notatek wewnętrznych – to nie są dane przekazane przez klienta.
    wizyty: customer.bookings.map((b) => ({
      poczatek: b.startsAt,
      koniec: b.endsAt,
      status: b.status,
      opis: b.description,
      czynnik: b.refrigerant,
      regulaminZaakceptowano: b.termsAcceptedAt,
      uslugi: b.services,
    })),
  };
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="klient-${id}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
