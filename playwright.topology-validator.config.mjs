import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  testMatch: 'topology-trace-validator.spec.mjs',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  outputDir: 'test-results/topology-trace-validator',
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4174',
    browserName: 'chromium',
    viewport: { width: 1600, height: 1000 },
    colorScheme: 'dark',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'python -m http.server 4174 --bind 127.0.0.1',
    url: 'http://127.0.0.1:4174/tests/browser/topology-trace-validator-fixture.html',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
