import { describe, expect, it } from "vitest";
import { premiumSchema } from "@/lib/validation";

const base = {
  name: "Jan Testowy",
  phone: "601 202 303",
  email: "jan@motopuls.test",
  vehicle: "Audi A6 2016",
  message: "Auto wymaga pilnej diagnostyki.",
  privacy: true,
};

describe("MP-033 premiumSchema", () => {
  it("przyjmuje poprawne zgłoszenie bez odbioru", () => {
    expect(premiumSchema(false).safeParse(base).success).toBe(true);
    expect(premiumSchema(true).safeParse(base).success).toBe(true);
  });

  it("wymaga zgody RODO, pojazdu i opisu", () => {
    const result = premiumSchema(false).safeParse({ ...base, privacy: false, vehicle: "", message: "x" });
    expect(result.success).toBe(false);
    const paths = result.error?.issues.map((i) => i.path[0]);
    expect(paths).toEqual(expect.arrayContaining(["privacy", "vehicle", "message"]));
  });

  it("odbiór wyłączony: odrzuca zaznaczenie odbioru i adres", () => {
    expect(premiumSchema(false).safeParse({ ...base, pickup: "on" }).success).toBe(false);
    expect(premiumSchema(false).safeParse({ ...base, pickupAddress: "Bydgoszcz, Dworcowa 1" }).success).toBe(false);
  });

  it("odbiór włączony: zaznaczenie wymaga adresu", () => {
    const missing = premiumSchema(true).safeParse({ ...base, pickup: "on", pickupAddress: "" });
    expect(missing.success).toBe(false);
    expect(missing.error?.issues[0]?.path[0]).toBe("pickupAddress");
    const ok = premiumSchema(true).safeParse({ ...base, pickup: "on", pickupAddress: "Bydgoszcz, Dworcowa 1" });
    expect(ok.success).toBe(true);
  });

  it("odbiór włączony, ale niezaznaczony: adres jest ignorowany", () => {
    const ok = premiumSchema(true).safeParse({ ...base, pickupAddress: "Bydgoszcz, Dworcowa 1" });
    expect(ok.success).toBe(true);
    expect(ok.success && ok.data.pickupAddress).toBeFalsy();
  });
});
