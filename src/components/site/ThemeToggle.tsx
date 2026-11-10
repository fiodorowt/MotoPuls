"use client";

import { Icon } from "@/components/Icon";
import { setTheme, useTheme } from "@/lib/client-store";

export function ThemeToggle() {
  const theme = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      className="text-fg hover:bg-surface-2 inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-md"
      aria-label={next === "light" ? "Włącz jasny motyw" : "Włącz ciemny motyw"}
    >
      <Icon name={next === "light" ? "sun" : "moon"} />
    </button>
  );
}
