import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: 'ps-mapping-csv-upload-browser.spec.mjs',
  timeout: 45000,
  expect: { timeout: 10000 },
  retries: 0,
  workers: 1,
  reporter: [['line']],
  use: {
    baseURL: 'http://127.0.0.1:8770',
    browserName: 'chromium',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'python3 -m http.server 8770 --bind 127.0.0.1',
    url: 'http://127.0.0.1:8770/tests/fixtures/psmap-csv-upload.html',
    reuseExistingServer: false,
    timeout: 30000,
  },
});
