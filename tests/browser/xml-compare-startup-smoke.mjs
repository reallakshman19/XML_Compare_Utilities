import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const baseUrl = process.env.STARTUP_BASE_URL || 'http://127.0.0.1:4173/';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const pageErrors = [];
const consoleErrors = [];
const failedRequests = [];

page.on('pageerror', (error) => {
  pageErrors.push(error.stack || error.message || String(error));
});
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('requestfailed', (request) => {
  failedRequests.push(`${request.url()} :: ${request.failure()?.errorText || 'request failed'}`);
});

await page.goto(baseUrl, { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);

const visibleStartupError = await page.locator('body').innerText();
const report = {
  baseUrl,
  pageErrors,
  consoleErrors,
  failedRequests,
  visibleStartupError: visibleStartupError.includes('XML Compare Utilities startup error')
    ? visibleStartupError
    : null,
};

console.log(JSON.stringify(report, null, 2));
assert.deepEqual(pageErrors, [], `Browser page errors detected:\n${pageErrors.join('\n\n')}`);
assert.equal(report.visibleStartupError, null, report.visibleStartupError || 'Unexpected startup error');
assert.deepEqual(failedRequests, [], `Failed startup requests detected:\n${failedRequests.join('\n')}`);

await browser.close();
