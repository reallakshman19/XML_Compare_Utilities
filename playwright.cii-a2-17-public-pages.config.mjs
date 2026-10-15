import {defineConfig} from '@playwright/test';

export default defineConfig({
 testDir:'./tests/browser',
 testMatch:'cii-writer2-a2-17-public-pages.spec.mjs',
 timeout:300_000,
 expect:{timeout:20_000},
 fullyParallel:false,
 workers:1,
 retries:0,
 outputDir:'test-results/cii-a2-17-public-pages-traces',
 reporter:[['list'],['json',{outputFile:'test-results/cii-a2-17-public-pages.json'}]],
 use:{
  browserName:'chromium',
  viewport:{width:1440,height:900},
  acceptDownloads:true,
  screenshot:'only-on-failure',
  trace:'retain-on-failure',
 },
});
