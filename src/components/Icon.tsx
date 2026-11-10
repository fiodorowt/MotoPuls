const PATHS = {
  phone: "M5 4h4l2 5-2.500 1.500a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z",
  calendar: "M7 3v4M17 3v4M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z",
  pin: "M12 21s7-6.200 7-11a7 7 0 1 0-14 0c0 4.800 7 11 7 11zM12 12.500a2.500 2.500 0 1 0 0-5 2.500 2.500 0 0 0 0 5z",
  mail: "M4 6h16v12H4zM4 7l8 6 8-6",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  check: "M5 12.500l4.500 4.500L19 7.500",
  wrench: "M21 7a5 5 0 0 1-6.600 4.700L6 20a1.800 1.800 0 0 1-2.600-2.600l8.300-8.400A5 5 0 0 1 17 3l-3 3 1 3 3 1 3-3z",
  bolt: "M13 2L4 14h7l-1 8 9-12h-7l1-8z",
  snow: "M12 2v20M3.300 7l17.400 10M20.700 7L3.300 17M12 6L9.500 3.500M12 6l2.500-2.500M12 18l-2.500 2.500M12 18l2.500 2.500",
  scan: "M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 12h2l1.500-3 3 6 1.500-3h2",
  box: "M12 3l8 4.500v9L12 21l-8-4.500v-9L12 3zM4 7.500l8 4.500 8-4.500M12 12v9",
  fleet: "M3 6h11v10H3zM14 9h4l3 3v4h-7zM7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  sun: "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.900 4.900l1.400 1.400M17.700 17.700l1.400 1.400M2 12h2M20 12h2M4.900 19.100l1.400-1.400M17.700 6.300l1.400-1.400",
  moon: "M20 14.500A8.500 8.500 0 1 1 9.500 4a7 7 0 0 0 10.500 10.500z",
  menu: "M4 7h16M4 12h16M4 17h16",
  close: "M6 6l12 12M18 6L6 18",
  facebook: "M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z",
  arrow: "M5 12h14M13 6l6 6-6 6",
  navigate: "M3 11l18-8-8 18-2-8-8-2z",
} as const;

export type IconName = keyof typeof PATHS;

export function isIconName(value: string): value is IconName {
  return value in PATHS;
}

/** Ikony liniowe 24×24 – zawsze dekoracyjne, opis niesie tekst obok. */
export function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
