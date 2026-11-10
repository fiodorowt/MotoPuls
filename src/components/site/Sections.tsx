import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/Icon";
import { TurboIcon } from "@/components/brand/Logo";
import { PulseDivider } from "@/components/brand/Pulse";
import { formatPhone, telHref } from "@/lib/labels";
import { fullAddress, type Settings } from "@/lib/settings";
import type { DayHours } from "@/lib/slots";
import { WEEKDAYS_PL } from "@/lib/time";
import { ConsentMap } from "./ConsentMap";

export function PageHeader({ eyebrow, title, lead }: { eyebrow: string; title: string; lead?: ReactNode }) {
  return (
    <div className="container-page pt-10 pb-8 sm:pt-16">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-3 max-w-4xl text-3xl sm:text-5xl">{title}</h1>
      {lead && <p className="text-muted mt-5 max-w-3xl text-lg">{lead}</p>}
      <PulseDivider className="mt-10" />
    </div>
  );
}

export function Section({ id, title, eyebrow, children, className = "" }: { id?: string; title?: string; eyebrow?: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={`container-page scroll-mt-24 py-10 sm:py-14 ${className}`} aria-labelledby={title && id ? `${id}-h` : undefined}>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      {title && (
        <h2 id={id ? `${id}-h` : undefined} className="mt-2 mb-8 text-2xl sm:text-4xl">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

interface PictureProps {
  /** Nazwa bazowa pliku w public/img (bez szerokości i rozszerzenia) */
  name: string;
  widths: number[];
  width: number;
  height: number;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}

/** Zdjęcie w AVIF z zapasowym WebP; pliki generuje scripts/build-images.ts. */
export function Picture({ name, widths, width, height, alt, sizes, priority, className = "" }: PictureProps) {
  const srcSet = (ext: string) => widths.map((w) => `/img/${name}-${w}.${ext} ${w}w`).join(", ");
  const largest = widths[widths.length - 1];
  return (
    <picture>
      <source type="image/avif" srcSet={srcSet("avif")} sizes={sizes} />
      <source type="image/webp" srcSet={srcSet("webp")} sizes={sizes} />
      <img
        src={`/img/${name}-${largest}.webp`}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding="async"
        className={className}
      />
    </picture>
  );
}

/** Zaślepka w stylu marki w miejscu zdjęcia, które właściciel doda w panelu. */
export function PhotoPlaceholder({ caption }: { caption: string }) {
  return (
    <figure className="border-line bg-surface-2 flex aspect-[4/3] flex-col items-center justify-center gap-3 rounded-xl border p-6 text-center">
      <TurboIcon className="text-fg h-16 w-auto opacity-70" />
      <figcaption className="text-muted text-sm">{caption}</figcaption>
    </figure>
  );
}

export function HoursList({ hours }: { hours: Map<number, DayHours> }) {
  return (
    <dl className="grid max-w-xs grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
      {WEEKDAYS_PL.map((day, index) => {
        const h = hours.get(index + 1);
        return (
          <div key={day} className="contents">
            <dt className="text-muted capitalize">{day}</dt>
            <dd className="font-semibold">{!h || h.closed ? "nieczynne" : `${h.open}–${h.close}`}</dd>
          </div>
        );
      })}
    </dl>
  );
}

export function ContactDetails({ settings, hours }: { settings: Settings; hours: Map<number, DayHours> }) {
  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <Icon name="pin" className="text-accent-text mt-1 h-6 w-6" />
        <address className="not-italic">
          <strong>{settings.legalName}</strong>
          <br />
          {fullAddress(settings)}
          <br />
          <span className="text-muted text-sm">NIP {settings.nip}</span>
        </address>
      </div>
      <div className="flex gap-3">
        <Icon name="phone" className="text-accent-text mt-1 h-6 w-6" />
        <ul className="space-y-1">
          {settings.phones.map((p) => (
            <li key={p}>
              <a href={telHref(p)} className="link text-lg font-bold">
                {formatPhone(p)}
              </a>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex gap-3">
        <Icon name="mail" className="text-accent-text mt-1 h-6 w-6" />
        <a href={`mailto:${settings.email}`} className="link break-all">
          {settings.email}
        </a>
      </div>
      <div className="flex gap-3">
        <Icon name="facebook" className="text-accent-text mt-1 h-6 w-6" />
        <a href={settings.facebookUrl} className="link" rel="noopener noreferrer" target="_blank">
          Moto Puls na Facebooku<span className="sr-only"> (otwiera się w nowej karcie)</span>
        </a>
      </div>
      <div className="flex gap-3">
        <Icon name="clock" className="text-accent-text mt-1 h-6 w-6" />
        <div>
          <h3 className="mb-2 text-base">Godziny otwarcia</h3>
          <HoursList hours={hours} />
        </div>
      </div>
    </div>
  );
}

export function Directions({ settings }: { settings: Settings }) {
  const destination = `${settings.latitude.toFixed(5)},${settings.longitude.toFixed(5)}`;
  return (
    <div className="grid items-start gap-8 lg:grid-cols-2">
      <div>
        <p className="text-muted text-lg">{settings.directions}</p>
        <p className="mt-4 font-semibold">{fullAddress(settings)}</p>
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`}
          className="btn btn-primary mt-6"
          rel="noopener noreferrer"
          target="_blank"
        >
          <Icon name="navigate" />
          Nawiguj<span className="sr-only"> (otwiera Mapy Google w nowej karcie)</span>
        </a>
      </div>
      <ConsentMap latitude={settings.latitude} longitude={settings.longitude} label={fullAddress(settings)} />
    </div>
  );
}

export function CtaBand({ settings, title = "Umów wizytę w dogodnym terminie" }: { settings: Settings; title?: string }) {
  const phone = settings.phones[0];
  return (
    <section className="container-page py-10">
      <div className="card flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div>
          <h2 className="text-2xl sm:text-3xl">{title}</h2>
          <p className="text-muted mt-2">Wybierz usługę i wolny termin online albo po prostu zadzwoń.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/rezerwacja" className="btn btn-primary">
            <Icon name="calendar" />
            Umów wizytę
          </Link>
          {phone && (
            <a href={telHref(phone)} className="btn btn-secondary">
              <Icon name="phone" />
              {formatPhone(phone)}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

/** Dokąd prowadzi kafel kategorii usług. */
export function categoryHref(slug: string): string {
  if (slug === "klimatyzacja") return "/klimatyzacja";
  if (slug === "floty") return "/dla-firm";
  if (slug === "czesci-zamienne") return "/czesci-zamienne";
  return `/uslugi#${slug}`;
}
