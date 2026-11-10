import { LOGO_VIEWBOX, TURBO_VIEWBOX } from "./viewbox";

/** Znak MOTOPULS. Litery dziedziczą kolor tekstu (currentColor), linia pulsu zostaje pomarańczowa. */
export function Logo({ className = "h-9 w-auto" }: { className?: string }) {
  return (
    <svg viewBox={LOGO_VIEWBOX} className={className} role="img" aria-label="Moto Puls">
      <use href="/img/brand.svg#logo" />
    </svg>
  );
}

/** Ikona turbosprężarki z logo – element dekoracyjny. */
export function TurboIcon({ className = "h-10 w-auto" }: { className?: string }) {
  return (
    <svg viewBox={TURBO_VIEWBOX} className={className} aria-hidden="true" focusable="false">
      <use href="/img/brand.svg#turbo" />
    </svg>
  );
}

/** Loader: wirujące koło turbiny. */
export function TurboLoader({ label = "Wczytywanie…" }: { label?: string }) {
  return (
    <span role="status" className="text-muted inline-flex items-center gap-2 text-sm">
      <svg viewBox="0 0 24 24" className="turbo-spin text-accent-text h-6 w-6" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="2" fill="currentColor" />
        <path
          d="M12 10c0-3 1-5 3-6M13.7 11c2.6-1.5 4.8-1.6 6.7-.4M13.7 13c2.6 1.5 3.8 3.4 3.7 5.6M12 14c0 3-1 5-3 6M10.3 13c-2.6 1.5-4.8 1.6-6.7.4M10.3 11C7.7 9.500 6.5 7.6 6.6 5.400"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      {label}
    </span>
  );
}
