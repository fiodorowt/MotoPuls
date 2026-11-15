import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

const PAGES = [
  { path: "", priority: 1 },
  { path: "/uslugi", priority: 0.9 },
  { path: "/klimatyzacja", priority: 0.9 },
  { path: "/rezerwacja", priority: 0.9 },
  { path: "/dla-firm", priority: 0.7 },
  { path: "/czesci-zamienne", priority: 0.7 },
  { path: "/o-nas", priority: 0.6 },
  { path: "/kontakt", priority: 0.8 },
  { path: "/polityka-prywatnosci", priority: 0.2 },
  { path: "/regulamin-rezerwacji", priority: 0.2 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env().APP_URL;
  // /premium trafia do mapy tylko po włączeniu w ustawieniach (przy wyłączonym zwraca 404).
  const settings = await db.settings.findUnique({ where: { id: 1 }, select: { premiumEnabled: true } });
  const pages = settings?.premiumEnabled ? [...PAGES, { path: "/premium", priority: 0.6 }] : PAGES;
  return pages.map((p) => ({ url: `${base}${p.path}`, changeFrequency: "monthly", priority: p.priority }));
}
