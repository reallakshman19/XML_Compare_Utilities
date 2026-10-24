import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const base = 'tabs/cii-workspace/cii-workspace-find-replace';
const deployed = 'docs/tabs/cii-workspace/cii-workspace-find-replace';

test('V14 offers an explicit opt-in VNext pane; existing V14 scopes remain intact', () => {
  const markup = read(`${base}.js`);
  assert.match(markup, /data-ciifr-switch-vnext aria-pressed="false"/);
  assert.match(markup, /VNext · Branch \+ Demo/);
  assert.match(markup, /data-ciifr-legacy-panel/);
  assert.match(markup, /data-ciifr-vnext-panel hidden/);
  assert.match(markup, /data-ciifr-vnext-frame/);
  assert.match(markup, /load your CII again inside VNext/i);
  for (const scope of ['DOCUMENT', 'ELEMENT', 'BLOCK']) {
    assert.match(markup, new RegExp(`value="${scope}"`));
  }
});

test('mode switch lazily loads VNext and preserves separate editing sessions', () => {
  const ui = read(`${base}-ui.js`);
  assert.match(ui, /vnextPanel\.hidden = !showingVnext/);
  assert.match(ui, /legacyPanel\.hidden = showingVnext/);
  assert.match(ui, /vnextButton\.setAttribute\('aria-pressed', String\(showingVnext\)\)/);
  assert.match(ui, /showingVnext && !vnextFrame\.hasAttribute\('src'\)/);
  assert.match(ui, /vnextFrame\.src = vnextUrl/);
  assert.match(ui, /\[vnextButton, 'click', onSwitchVnext\]/);
  assert.doesNotMatch(ui, /vnextFrame\.contentWindow|postMessage\s*\(/);
});

test('module-relative route targets the same shipped VNext page from both mirrors', () => {
  const ui = read(`${base}-ui.js`);
  const route = ui.match(/import\.meta\.url\.includes\('([^']+)'\) \? '([^']+)' : '([^']+)'/);
  assert.ok(route, 'production source must declare module-specific route');
  assert.match(ui, /new URL\(vnextPath, import\.meta\.url\)/);
  const root = new URL('https://example.test/XML_Compare_Utilities/');
  const sourceModule = new URL('tabs/cii-workspace/cii-workspace-find-replace-ui.js', root);
  const servedModule = new URL('docs/tabs/cii-workspace/cii-workspace-find-replace-ui.js', root);
  const resolve = (moduleUrl) => new URL(moduleUrl.href.includes(route[1]) ? route[2] : route[3], moduleUrl);
  const expected = new URL('docs/cii-fnr-vnext.html', root);
  assert.equal(resolve(sourceModule).href, expected.href);
  assert.equal(resolve(servedModule).href, expected.href);
  assert.notEqual(new URL('../../broken.html', servedModule).href, expected.href, 'wrong route must be detected');
  assert.match(read('docs/cii-fnr-vnext.html'), /data-load-demo/);
  assert.match(read('docs/cii-fnr-vnext.html'), /Branch label \(exact\)/);
});

test('VNext iframe uses scoped layout and hidden panes do not consume viewport', () => {
  const css = read(`${base}.css`);
  assert.match(css, /\.ciifr-workspace \.ciifr-main\[hidden\]/);
  assert.match(css, /\.ciifr-workspace \.ciifr-vnext-panel\[hidden\]/);
  assert.match(css, /\.ciifr-vnext-panel iframe/);
  assert.match(css, /min-height: 0/);
});

test('source and GitHub Pages mirrored assets match byte-for-byte', () => {
  for (const suffix of ['.js', '-ui.js', '.css']) {
    assert.equal(read(base + suffix), read(deployed + suffix));
  }
});
