import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'./tests', testMatch:'ps-mapping-candidate-review-page.spec.mjs',
  timeout:60000,expect:{timeout:12000},retries:0,workers:1,reporter:[['line']],
  use:{baseURL:'http://127.0.0.1:8775',browserName:'chromium',headless:true,
    screenshot:'only-on-failure',trace:'retain-on-failure'},
  webServer:{command:'python3 -m http.server 8775 --bind 127.0.0.1',
    url:'http://127.0.0.1:8775/docs/ps-mapping-candidate-matrix-validation.html',
    reuseExistingServer:false,timeout:30000}
});
