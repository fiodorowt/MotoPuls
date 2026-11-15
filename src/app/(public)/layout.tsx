import { Footer, Header, MobileBar } from "@/components/site/Chrome";
import { CookieBanner } from "@/components/site/CookieBanner";
import { getSettings } from "@/lib/settings";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();

  // Dane strukturalne AutoRepair są dodawane tylko na `/` i `/kontakt` (AutoRepairJsonLd), nie we wspólnym układzie.
  return (
    <>
      <Header settings={settings} />
      <main id="tresc" tabIndex={-1} className="outline-none">{children}</main>
      <Footer settings={settings} />
      <MobileBar settings={settings} />
      <CookieBanner />
    </>
  );
}
