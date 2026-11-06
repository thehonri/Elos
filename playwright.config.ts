import { defineConfig } from "@playwright/test";
import { config } from "dotenv";
config({ path: ".env.local" });

const PORT = 3100;
export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`,
    viewport: { width: 390, height: 844 },
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    launchOptions: { executablePath: process.env.PW_CHROMIUM ?? "/opt/pw-browsers/chromium" },
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npx next start -p ${PORT}`,
        port: PORT,
        reuseExistingServer: true,
        timeout: 120_000,
        env: { ELO_CREATOR_EMAILS: `${process.env.ELO_CREATOR_EMAILS},e2e-him@elo.test` },
      },
});
