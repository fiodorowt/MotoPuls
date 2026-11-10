import type { MetadataRoute } from "next";
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

export default function sitemap(): MetadataRoute.Sitemap {
  const base = env().APP_URL;
  return PAGES.map((p) => ({ url: `${base}${p.path}`, changeFrequency: "monthly", priority: p.priority }));
}
