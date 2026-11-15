import { describe, expect, it } from "vitest";
import { DEFAULT_TEMPLATES, fillTemplate, renderHtml, sanitizeVars } from "@/lib/email/templates";
import { contactSchema, customerSchema, premiumSchema } from "@/lib/validation";

const evil = "Jan\n\nhttps://zly.example/login";

describe("W3 wstrzyknięcie przez imię", () => {
  it("imię z URL po nowej linii nie daje przycisku Otwórz", () => {
    const vars = sanitizeVars({ imie: evil, status: "Kontakt", link: "https://app.test/admin/zapytania" });
    const html = renderHtml(fillTemplate(DEFAULT_TEMPLATES.workshop_inquiry!.body, vars), "stopka");
    expect(html).not.toContain("zly.example</a>");
    expect(html).not.toContain('href="https://zly.example');
    expect(html).not.toContain("Otwórz");
  });

  it("sanitizeVars zamienia CR/LF/sterujące na spację, a pola wymienione jako wieloliniowe zostawia", () => {
    const out = sanitizeVars({ imie: "a\r\nb\u0007c", powod: "x\ny" });
    expect(out.imie).toBe("a  b c");
    expect(out.powod).toBe("x\ny");
  });

  it("walidacja odrzuca imię z nową linią", () => {
    const base = { phone: "600700800", email: "a@b.pl", privacy: true, message: "Wiadomość testowa" };
    expect(contactSchema.safeParse({ ...base, name: evil }).success).toBe(false);
    expect(contactSchema.safeParse({ ...base, name: "Jan Kowalski" }).success).toBe(true);
    expect(customerSchema.safeParse({ name: "Jan\r\nX", phone: "600700800", email: "a@b.pl", terms: true }).success).toBe(false);
  });

  it("pola opisowe nadal przyjmują wiele linii", () => {
    const r = contactSchema.safeParse({ name: "Jan", phone: "600700800", email: "a@b.pl", privacy: true, message: "Linia 1\nLinia 2 tekstu" });
    expect(r.success).toBe(true);
    const p = premiumSchema(false).safeParse({
      name: "Jan", phone: "600700800", email: "a@b.pl", privacy: true, vehicle: "Audi A4\n", message: "Opis\nwieloliniowy ok",
    });
    expect(p.success).toBe(true);
    expect(premiumSchema(false).safeParse({
      name: "Jan", phone: "600700800", email: "a@b.pl", privacy: true, vehicle: "Audi\nA4", message: "Opis wieloliniowy ok",
    }).success).toBe(false);
  });
});
