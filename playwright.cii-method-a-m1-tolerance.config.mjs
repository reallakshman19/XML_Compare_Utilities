import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./tests/browser',
 testMatch:[
  'cii-writer2-m1-tolerance-advanced.spec.mjs',
  'cii-writer2-a2-17-geometry-review.spec.mjs',
  'cii-writer2-a2-16-anchor-modes.spec.mjs',
 ],
 timeout:300_000,expect:{timeout:20000},fullyParallel:false,workers:1,retries:0,
 outputDir:'test-results/cii-method-a-m1-tolerance',
 reporter:[['list'],['json',{outputFile:'test-results/cii-method-a-m1-tolerance.json'}]],
 use:{baseURL:'http://127.0.0.1:4174',browserName:'chromium',viewport:{width:1440,height:900},
  screenshot:'only-on-failure',trace:'retain-on-failure',acceptDownloads:true},
 webServer:{command:'node tests/browser/cii-writer2-static-server.mjs 4174',
  url:'http://127.0.0.1:4174/tests/browser/cii-writer2-bridge-fixture.html',
  reuseExistingServer:!process.env.CI,timeout:30000},
});
