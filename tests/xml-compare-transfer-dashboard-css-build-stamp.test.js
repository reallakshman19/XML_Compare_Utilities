import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const transferCss = readFileSync('tabs/xml-compare-transfer-output-ui.css', 'utf8');
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

assert.ok(buildCss.includes('.app-build-stamp'), 'build stamp CSS must exist');
assert.ok(buildCss.includes('text-overflow: ellipsis'), 'build stamp must not overflow header');

assert.ok(indexHtml.includes('styles/app-build-stamp.css?v=20260707-m18-build-stamp'), 'index must load build stamp CSS with M18 cache bust');
assert.ok(indexHtml.includes('xml-compare-transfer-output-ui.css?v=20260707-m18-dashboard-css'), 'index must cache-bust dashboard CSS');
assert.ok(indexHtml.includes('main-rhbg-fitguard.js?v=20260707-m18-build-stamp'), 'index must cache-bust app entry');
assert.ok(mainEntry.includes("./core/app.js?v=20260707-m18-build-stamp"), 'main entry must cache-bust core app delegate');
assert.ok(appDelegate.includes("./app-standalone-runtime.js?v=20260707-m18-build-stamp"), 'core app must cache-bust standalone runtime');
assert.ok(runtime.includes("build: 'M18 transfer-dashboard-css · 2026-07-07'"), 'runtime must expose visible M18 build stamp');
assert.ok(runtime.includes("../tabs/xml-compare-tab.js?v=20260707-m18-build-stamp"), 'runtime must cache-bust XML tab module');
assert.ok(runtime.includes('className = \'app-build-stamp\''), 'runtime must render build stamp element');

console.log('XML Compare transfer dashboard CSS and build stamp tests passed');
