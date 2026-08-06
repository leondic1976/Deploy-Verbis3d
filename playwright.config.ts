import { defineConfig, devices } from "@playwright/test";

const deployedSiteUrl = process.env["PLAYWRIGHT_BASE_URL"];

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  workers: process.env["CI"] ? 2 : 6,
  reporter: "list",
  use: {
    baseURL: deployedSiteUrl ?? "http://127.0.0.1:4173/Deploy-Verbis3d/",
    trace: "retain-on-failure",
  },
  ...(deployedSiteUrl
    ? {}
    : {
        webServer: {
          command:
            "npm run site:build && npx vite preview --config vite.config.ts --host 127.0.0.1",
          port: 4173,
          reuseExistingServer: !process.env["CI"],
        },
      }),
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
