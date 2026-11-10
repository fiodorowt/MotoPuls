import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/** Kolory czytamy wprost z globals.css – test pilnuje WCAG AA przy każdej zmianie palety. */
const css = readFileSync(path.resolve(import.meta.dirname, "../../src/app/globals.css"), "utf8");

function palette(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`Brak bloku ${selector} w globals.css`);
  const block = css.slice(start, css.indexOf("}", start));
  return Object.fromEntries([...block.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]));
}

function luminance(hex: string): number {
  const channel = (offset: number) => {
    const c = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const TEXT_ON_BACKGROUND = ["fg", "muted", "accent-text", "ok", "danger", "warn"];

describe.each([
  ["ciemny", ":root"],
  ["jasny", ':root[data-theme="light"]'],
])("kontrast – motyw %s", (_name, selector) => {
  const colors = palette(selector);
  const color = (name: string) => {
    const value = colors[name];
    if (!value) throw new Error(`Brak koloru --${name}`);
    return value;
  };

  it.each(TEXT_ON_BACKGROUND.flatMap((text) => [[text, "bg"], [text, "surface"]]))("tekst --%s na --%s ma co najmniej 4,5:1", (text, background) => {
    expect(contrast(color(text), color(background))).toBeGreaterThanOrEqual(4.5);
  });

  it("ciemny tekst na pomarańczowym przycisku ma co najmniej 4,5:1 (także w stanie hover)", () => {
    expect(contrast(color("accent-ink"), color("accent"))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(color("accent-ink"), color("accent-hover"))).toBeGreaterThanOrEqual(4.5);
  });

  it("obramowania pól formularzy mają co najmniej 3:1", () => {
    expect(contrast(color("line-strong"), color("bg"))).toBeGreaterThanOrEqual(3);
    expect(contrast(color("line-strong"), color("surface"))).toBeGreaterThanOrEqual(3);
  });
});
