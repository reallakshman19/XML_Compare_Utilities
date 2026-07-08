import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const transferCss = readFileSync('tabs/xml-compare-transfer-output-ui.css', 'utf8');
const noiseCss = readFileSync('tabs/xml-compare-transfer-noise-reduction.css', 'utf8');
const buildCss = readFileSync('styles/app-build-stamp.css', 'utf8');
const indexHtml = readFileSync('index.html', 'utf8');
const mainEntry = readFileSync('main-rhbg-fitguard.js', 'utf8');
const appDelegate = readFileSync('core/app.js', 'utf8');
const runtime = readFileSync('core/app-standalone-runtime.js', 'utf8');

assert.ok(transferCss.includes('.xmlc-transfer-output-dashboard'), 'dashboard panel CSS must exist');
assert.ok(transferCss.includes('.xmlc-transfer-next-action'), 'next-action CSS must exist');
assert.ok(transferCss.includes('.xmlc-transfer-dashboard-grid'), 'dashboard grid CSS must exist');
assert.ok(transferCss.includes('.xmlc-transfer-dashboard-card.is-ready'), 'ready dashboard card CSS must exist');
assert.ok(transferCss.includes('.xmlc-transfer-dashboard-card.is-blocked'), 'blocked dashboard card CSS must exist');
assert.ok(transferCss.includes('.xmlc-transfer-dashboard-card.is-not-available'), 'not-available dashboard card CSS must exist');
assert.ok(transferCss.includes('.xmlc-transfer-detail-group > summary'), 'collapsible detail group CSS must exist');
assert.ok(transferCss.includes('@media (max-width: 900px)'), 'dashboard CSS must include responsive fallback');

assert.ok(noiseCss.includes('M19/M20: reduce Tab 2 visual noise'), 'M19/M20 noise reduction CSS must be loaded');
assert.ok(noiseCss.includes('.xmlc-transfer-dashboard-grid'), 'M19 must flatten dashboard grid');
assert.ok(noiseCss.includes('display: flex'), 'M19 dashboard should use compact flex flow');
assert.ok(noiseCss.includes('.xmlc-transfer-dashboard-card small,'), 'M19 must suppress verbose dashboard details');
assert.ok(noiseCss.includes('display: none'), 'M19 must hide verbose dashboard card text');
assert.ok(noiseCss.includes('.xmlc-transfer-action-icon'), 'M19 must suppress icon circles');
assert.ok(noiseCss.includes('border-radius: 999px'), 'M19 actions should be compact pills, not large boxes');
assert.ok(noiseCss.includes('position: static'), 'M19 output band should not create sticky visual stripes');
assert.ok(noiseCss.includes('.xmlc-transfer-start'), 'M20 must style the simplified start panel');
assert.ok(noiseCss.includes('data-transfer-evidence="none"'), 'M20 must target no-evidence mode defensively');
assert.ok(noiseCss.includes('[data-xml-compare-dashboard-card="apply"]'), 'M20 CSS may still defensively hide downstream apply status before evidence');
assert.ok(noiseCss.includes('[data-xml-compare-dashboard-card="exports"]'), 'M20 CSS may still defensively hide downstream export status before evidence');

assert.ok(buildCss.includes('.app-build-stamp'), 'build stamp CSS must exist');
assert.ok(buildCss.includes('text-overflow: ellipsis'), 'build stamp must not overflow header');
assert.ok(!buildCss.includes('display: none'), 'build stamp must remain visible for cache verification');

assert.ok(indexHtml.includes('styles/app-build-stamp.css?v=20260708-m21-transfer-state-truth'), 'index must load build stamp CSS with M21 cache bust');
assert.ok(indexHtml.includes('xml-compare-transfer-output-ui.css?v=20260707-m18-dashboard-css'), 'index must keep dashboard CSS loaded');
assert.ok(indexHtml.includes('xml-compare-transfer-noise-reduction.css?v=20260708-m21-transfer-state-truth'), 'index must load M21 transfer state-truth CSS cache bust');
assert.ok(indexHtml.indexOf('xml-compare-transfer-output-ui.css') < indexHtml.indexOf('xml-compare-transfer-noise-reduction.css'), 'M19/M21 noise reduction CSS must load after M18 dashboard CSS');
assert.ok(indexHtml.includes('main-rhbg-fitguard.js?v=20260708-m21-transfer-state-truth'), 'index must cache-bust app entry for M21');
assert.ok(mainEntry.includes("./core/app.js?v=20260708-m21-transfer-state-truth"), 'main entry must cache-bust core app delegate for M21');
assert.ok(appDelegate.includes("./app-standalone-runtime.js?v=20260708-m21-transfer-state-truth"), 'core app must cache-bust standalone runtime for M21');
assert.ok(runtime.includes("build: 'M21 transfer-state-truth · 2026-07-08'"), 'runtime must expose visible M21 build stamp');
assert.ok(runtime.includes("../tabs/xml-compare-tab.js?v=20260708-m21-transfer-state-truth"), 'runtime must cache-bust XML tab module for M21');
assert.ok(runtime.includes('className = \'app-build-stamp\''), 'runtime must render build stamp element');

console.log('XML Compare transfer dashboard CSS, build stamp, noise reduction, M20 progressive disclosure, and M21 state-truth cache-bust tests passed');
