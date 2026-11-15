import { headers } from "next/headers";
import { getCategories } from "@/lib/catalog";
import { env } from "@/lib/env";
import { buildAutoRepairJsonLd, serializeJsonLd } from "@/lib/seo";
import { getOpeningHours, getSettings } from "@/lib/settings";

/** Pełny AutoRepair tylko na `/` i `/kontakt` (MP-040); dane z Settings, OpeningHours i Service. */
export async function AutoRepairJsonLd() {
  const [settings, hours, categories, nonce] = await Promise.all([
    getSettings(),
    getOpeningHours(),
    getCategories(),
    headers().then((h) => h.get("x-nonce") ?? undefined),
  ]);
  const jsonLd = buildAutoRepairJsonLd({ url: env().APP_URL, settings, hours, categories });
  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      // serializeJsonLd koduje „<” i separatory linii, żeby treść z panelu nie mogła zamknąć znacznika script
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
    />
  );
}
