import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  testMatch: 'support-steel-preview-staleness.spec.mjs',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['json', { outputFile: 'artifacts/support-steel-browser-results.json' }],
    ['html', { outputFolder: 'playwright-report/support-steel', open: 'never' }],
  ],
  outputDir: 'test-results/support-steel',
  use: {
    baseURL: 'http://127.0.0.1:4182',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
