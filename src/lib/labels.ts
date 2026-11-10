/** Etykiety i dozwolone przejścia – bez zależności serwerowych, do użycia także w komponentach klienckich. */

export type BookingStatus = "PENDING" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
export type InquiryStatus = "NEW" | "IN_PROGRESS" | "CLOSED";
export type InquiryType = "PARTS" | "FLEET" | "CONTACT";
export type Refrigerant = "R134A" | "R1234YF" | "UNKNOWN";
export type VehicleType = "CAR" | "VAN";

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  PENDING: "Oczekująca",
  CONFIRMED: "Potwierdzona",
  IN_PROGRESS: "W realizacji",
  COMPLETED: "Zakończona",
  CANCELLED: "Anulowana",
  NO_SHOW: "Nieobecność",
};

/** oczekująca → potwierdzona → w realizacji → zakończona; anulowanie i nieobecność kończą ścieżkę. */
export const BOOKING_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["IN_PROGRESS", "NO_SHOW", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return BOOKING_TRANSITIONS[from].includes(to);
}

export const ACTIVE_BOOKING_STATUSES: readonly BookingStatus[] = ["PENDING", "CONFIRMED", "IN_PROGRESS"];

export const INQUIRY_STATUS_LABEL: Record<InquiryStatus, string> = {
  NEW: "Nowe",
  IN_PROGRESS: "W toku",
  CLOSED: "Zamknięte",
};

export const INQUIRY_TYPE_LABEL: Record<InquiryType, string> = {
  PARTS: "Części zamienne",
  FLEET: "Floty",
  CONTACT: "Kontakt",
};

export const REFRIGERANT_LABEL: Record<Refrigerant, string> = {
  R134A: "R134a",
  R1234YF: "R1234yf",
  UNKNOWN: "Nie wiem – sprawdzimy na miejscu",
};

export const VEHICLE_TYPE_LABEL: Record<VehicleType, string> = {
  CAR: "Osobowy",
  VAN: "Dostawczy do 3,5 t",
};

export const ROLE_LABEL = { OWNER: "Właściciel", EMPLOYEE: "Pracownik" } as const;

export function formatPrice(from: number | null, to: number | null): string {
  if (from === null && to === null) return "wycena indywidualna";
  if (from !== null && to !== null && from !== to) return `${from}–${to} zł`;
  if (from !== null && to === null) return `od ${from} zł`;
  return `${from ?? to} zł`;
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 9 ? digits.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3") : phone;
}

export function telHref(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `tel:${digits.length === 9 ? `+48${digits}` : `+${digits}`}`;
}
