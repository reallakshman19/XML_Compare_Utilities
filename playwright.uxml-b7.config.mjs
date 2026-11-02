import {defineConfig} from '@playwright/test';

export default defineConfig({
  testDir:'./tests/browser',
  testMatch:'uxml-b7-categorized-edit.spec.mjs',
  timeout:45000,
  expect:{timeout:10000},
  fullyParallel:false,workers:1,retries:0,
  reporter:[['list'],['json',{outputFile:'artifacts/uxml-b7/browser-results.json'}]],
  outputDir:'test-results/uxml-b7',
  use:{baseURL:'http://127.0.0.1:4179',headless:true,trace:'retain-on-failure',
    screenshot:'only-on-failure',viewport:{width:1440,height:900}},
  webServer:{command:'python3 -m http.server 4179 --bind 127.0.0.1',
    port:4179,reuseExistingServer:!process.env.CI},
});
