"use client";

import { Icon } from "@/components/Icon";
import { TurboIcon } from "@/components/brand/Logo";
import { setConsent, useConsent } from "@/lib/client-store";

/** Mapa OpenStreetMap – ramka jest tworzona dopiero po wyrażeniu zgody. */
export function ConsentMap({ latitude, longitude, label }: { latitude: number; longitude: number; label: string }) {
  const consent = useConsent();
  const dx = 0.012;
  const dy = 0.006;
  const bbox = [longitude - dx, latitude - dy, longitude + dx, latitude + dy].map((n) => n.toFixed(5)).join(",");
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${latitude.toFixed(5)},${longitude.toFixed(5)}`;

  return (
    <div className="border-line bg-surface-2 relative aspect-[4/3] w-full overflow-hidden rounded-xl border">
      {consent === "all" ? (
        <iframe
          src={src}
          title={`Mapa dojazdu: ${label}`}
          loading="lazy"
          referrerPolicy="no-referrer"
          sandbox="allow-scripts allow-same-origin"
          className="h-full w-full border-0"
        />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
          <TurboIcon className="text-fg h-14 w-auto opacity-80" />
          <p className="text-muted max-w-sm text-sm">
            Mapa pochodzi z serwisu OpenStreetMap. Jej wyświetlenie wymaga Twojej zgody na połączenie z zewnętrznym
            dostawcą.
          </p>
          <button type="button" className="btn btn-secondary" onClick={() => setConsent("all")}>
            <Icon name="pin" />
            Pokaż mapę
          </button>
        </div>
      )}
    </div>
  );
}
