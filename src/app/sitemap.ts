import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { lastEditsByAction, latestOf } from "@/lib/lastmod";

export const dynamic = "force-dynamic";

const SERVICES = ["service.create", "service.update", "service.deactivate", "service.delete", "category.update"];
const CONTENT = ["content.update", "category.update"];

/**
 * `edits`: działania w dzienniku zmian, których ostatnia data jest datą modyfikacji strony.
 * Strony bez edytowalnej treści (regulamin, polityka) nie mają `lastModified` – daty nie zgadujemy.
 */
const PAGES: { path: string; priority: number; edits: string[] }[] = [
  { path: "", priority: 1, edits: [...SERVICES, ...CONTENT, "settings.company", "settings.hours"] },
  { path: "/uslugi", priority: 0.9, edits: SERVICES },
  { path: "/klimatyzacja", priority: 0.9, edits: SERVICES },
  { path: "/rezerwacja", priority: 0.9, edits: SERVICES },
  { path: "/dla-firm", priority: 0.7, edits: CONTENT },
  { path: "/czesci-zamienne", priority: 0.7, edits: CONTENT },
  { path: "/o-nas", priority: 0.6, edits: ["settings.company", "content.update"] },
  { path: "/kontakt", priority: 0.8, edits: ["settings.company", "settings.hours"] },
  { path: "/polityka-prywatnosci", priority: 0.2, edits: [] },
  { path: "/regulamin-rezerwacji", priority: 0.2, edits: [] },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env().APP_URL;
  // /premium trafia do mapy tylko po włączeniu w ustawieniach (przy wyłączonym zwraca 404).
  const settings = await db.settings.findUnique({ where: { id: 1 }, select: { premiumEnabled: true } });
  const pages = settings?.premiumEnabled ? [...PAGES, { path: "/premium", priority: 0.6, edits: ["settings.premium"] }] : PAGES;
  const edits = await lastEditsByAction([...new Set(pages.flatMap((p) => p.edits))]);
  return pages.map((p) => {
    const lastModified = latestOf(edits, p.edits);
    return { url: `${base}${p.path}`, ...(lastModified && { lastModified }), changeFrequency: "monthly", priority: p.priority };
  });
}
