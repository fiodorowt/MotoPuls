import { describe, expect, it } from "vitest";
import { serializeJsonLd } from "@/lib/seo";

describe("serializeJsonLd", () => {
  it("nie pozwala wartości z panelu zamknąć znacznika script", () => {
    const out = serializeJsonLd({ name: 'Usługa </script><img src=x onerror=alert(1)>' });
    expect(out).not.toContain("<");
    expect(out).not.toContain("</script>");
  });

  it("koduje U+2028 i U+2029", () => {
    const out = serializeJsonLd({ areaServed: "a\u2028b\u2029c" });
    expect(out).not.toMatch(/[\u2028\u2029]/);
  });

  it("po zdekodowaniu daje te same dane", () => {
    const value = { name: "a </script> b", list: ["x\u2028y", "ł"] };
    expect(JSON.parse(serializeJsonLd(value))).toEqual(value);
  });
});
