import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Świadomie bez next/image: komponent wstawia style inline, których nie dopuszcza nasze CSP.
    rules: { "@next/next/no-img-element": "off" },
  },
  globalIgnores([
    ".next/**",
    ".next-e2e/**",
    "node_modules/**",
    "src/generated/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
    ".pgdata/**",
    ".pgdata-e2e/**",
  ]),
]);
