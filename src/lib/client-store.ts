"use client";

import { useSyncExternalStore } from "react";

/** Małe magazyny stanu przeglądarki: zgoda na treści zewnętrzne i motyw. */

const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const emit = () => listeners.forEach((l) => l());

// ---------- Zgoda (cookies) ----------

const CONSENT_COOKIE = "mp_consent";
export type Consent = "all" | "necessary" | "unset";

function readConsent(): Consent {
  const match = /(?:^|;\s*)mp_consent=(all|necessary)/.exec(document.cookie);
  return (match?.[1] as Consent | undefined) ?? "unset";
}

let settingsOpen = false;

export function setConsent(value: "all" | "necessary"): void {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${value}; Max-Age=${180 * 86_400}; Path=/; SameSite=Lax${secure}`;
  settingsOpen = false;
  emit();
}

export function openConsentSettings(): void {
  settingsOpen = true;
  emit();
}

/** "pending" na serwerze i przed hydracją – wtedy nie pokazujemy ani banera, ani mapy. */
export function useConsent(): Consent | "pending" {
  return useSyncExternalStore(subscribe, readConsent, () => "pending" as const);
}

export function useConsentSettingsOpen(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => settingsOpen,
    () => false,
  );
}

// ---------- Motyw ----------

export type Theme = "dark" | "light";

export function useTheme(): Theme {
  return useSyncExternalStore(
    subscribe,
    () => (document.documentElement.dataset.theme === "light" ? "light" : "dark"),
    () => "dark" as const,
  );
}

export function setTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem("mp-theme", theme);
  } catch {
    // tryb prywatny – motyw zadziała do końca wizyty
  }
  emit();
}
