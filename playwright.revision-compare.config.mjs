import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  testMatch: ['revision-compare-rc001.spec.mjs'],
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  outputDir: 'test-results/revision-compare',
  reporter: [
    ['list'],
    ['json', { outputFile: 'artifacts/revision-compare-results.json' }],
  ],
  use: {
    baseURL: 'http://127.0.0.1:4178',
    browserName: 'chromium',
    viewport: { width: 1440, height: 1000 },
    colorScheme: 'dark',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'python3 -m http.server 4178 --bind 127.0.0.1',
    url: 'http://127.0.0.1:4178/tests/browser/revision-compare-rc001.html',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
