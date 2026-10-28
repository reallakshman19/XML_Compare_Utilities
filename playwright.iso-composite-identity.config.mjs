import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  testMatch: 'iso-composite-identity-audit.spec.mjs',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['json', { outputFile: 'artifacts/iso-composite-identity-browser-results.json' }],
    ['html', { outputFolder: 'playwright-report/iso-composite-identity', open: 'never' }],
  ],
  outputDir: 'test-results/iso-composite-identity',
  use: {
    baseURL: 'http://127.0.0.1:4178',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'python3 -m http.server 4178 --bind 127.0.0.1',
    port: 4178,
    reuseExistingServer: !process.env.CI,
  },
});
