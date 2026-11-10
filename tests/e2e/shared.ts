/** Dane testowe wspólne dla scenariuszy E2E (istnieją tylko w jednorazowej bazie testowej). */
const run = Date.now().toString(36);

export const CUSTOMER = {
  name: "Jan Testowy",
  phone: "601 202 303",
  email: `klient-${run}@motopuls.test`,
  plate: "CB 12345",
};

export const OWNER_EMAIL = "e2e-owner@motopuls.test";
