import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "@fontsource-variable/inter/index.css";
import "@fontsource-variable/archivo/wdth.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || "http://localhost:3000"),
  title: { default: "Moto Puls – serwis samochodowy, Białe Błota k. Bydgoszczy", template: "%s | Moto Puls" },
  description:
    "Warsztat samochodowy Moto Puls w Białych Błotach koło Bydgoszczy: mechanika, elektromechanika, serwis klimatyzacji R134a i R1234yf, diagnostyka komputerowa. Umów wizytę online.",
  openGraph: {
    type: "website",
    locale: "pl_PL",
    siteName: "Moto Puls",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Moto Puls – serwis samochodowy" }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [{ color: "#241E20" }],
  width: "device-width",
  initialScale: 1,
};

// Ustawia zapamiętany motyw przed pierwszym malowaniem (bez mignięcia). Domyślny jest ciemny.
const THEME_SCRIPT = `try{var t=localStorage.getItem("mp-theme");document.documentElement.dataset.theme=t==="light"?"light":"dark"}catch(e){}`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="pl" data-theme="dark" suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
