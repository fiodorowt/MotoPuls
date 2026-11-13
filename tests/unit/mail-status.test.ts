import { describe, expect, it } from "vitest";
import { mailStatus } from "@/lib/email/status";

describe("mailStatus", () => {
  it("SMTP skonfigurowany: ok niezależnie od środowiska", () => {
    expect(mailStatus({ NODE_ENV: "production", SMTP_HOST: "smtp.example.test" })).toBe("ok");
    expect(mailStatus({ NODE_ENV: "development", SMTP_HOST: "smtp.example.test" })).toBe("ok");
  });
  it("produkcja bez SMTP_HOST: disabled (wiadomości nie wychodzą)", () => {
    expect(mailStatus({ NODE_ENV: "production", SMTP_HOST: undefined })).toBe("disabled");
    expect(mailStatus({ NODE_ENV: "production", SMTP_HOST: "" })).toBe("disabled");
  });
  it("dev i testy bez SMTP_HOST: outbox (zapis do .mail-outbox), bez ostrzeżenia", () => {
    expect(mailStatus({ NODE_ENV: "development", SMTP_HOST: "" })).toBe("outbox");
    expect(mailStatus({ NODE_ENV: "test", SMTP_HOST: undefined })).toBe("outbox");
  });
});
