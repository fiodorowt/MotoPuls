import { describe, expect, it } from "vitest";
import { latestOf } from "@/lib/lastmod";

const max = new Map([
  ["settings.company", new Date("2026-11-01T10:00:00Z")],
  ["service.update", new Date("2026-11-10T10:00:00Z")],
  ["content.update", new Date("2026-10-01T10:00:00Z")],
]);

describe("latestOf (sitemap lastModified)", () => {
  it("zwraca najnowszą datę spośród wskazanych działań", () => {
    expect(latestOf(max, ["settings.company", "service.update"])).toEqual(new Date("2026-11-10T10:00:00Z"));
  });
  it("pomija działania bez wpisów w dzienniku", () => {
    expect(latestOf(max, ["content.update", "category.update"])).toEqual(new Date("2026-10-01T10:00:00Z"));
  });
  it("bez żadnej daty zwraca undefined (nie wymyślamy daty)", () => {
    expect(latestOf(max, ["category.update"])).toBeUndefined();
    expect(latestOf(max, [])).toBeUndefined();
  });
});
