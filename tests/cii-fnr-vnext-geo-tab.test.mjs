import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { geometryWorkbenchUrl } from '../tabs/cii-workspace/cii-fnr-vnext/ui/geo-tab.js';
import { createTestDom, MockElement } from './helpers/vnext-dom-env.mjs';
import { makeDemoCii } from '../tabs/cii-workspace/cii-fnr-vnext/ui/demo-loader.js';

const ui = 'tabs/cii-workspace/cii-fnr-vnext/ui/';
const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('both module mirrors resolve the existing workbench under any repository prefix', () => {
  for (const prefix of ['/', '/XML_Compare_Utilities/', '/custom-preview/']) {
    for (const mirror of ['', 'docs/']) {
      const module = `https://example.test${prefix}${mirror}${ui}geo-tab.js`;
      assert.equal(geometryWorkbenchUrl(module),
        `https://example.test${prefix}prototypes/ciifr-map/index.html`);
      assert.notEqual(geometryWorkbenchUrl(module),
        `https://example.test${prefix}docs/prototypes/ciifr-map/index.html`);
    }
  }
});

test('shipped host has a distinct lazy CIIFR_GEO pane and identical module mirrors', async () => {
  const html = await read('docs/cii-fnr-vnext.html');
  assert.match(html, /data-tab="GEOMETRY">Geometry/);
  assert.match(html, /data-tab="CIIFR_GEO" aria-controls="ciifr-geo-panel"/);
  assert.match(html, /data-ciifr-geo-panel hidden/);
  const frame = html.match(/<iframe data-ciifr-geo-frame[^>]+>/)?.[0];
  assert.ok(frame);
  assert.doesNotMatch(frame, /\bsrc=/);
  assert.match(frame, /allow="fullscreen" allowfullscreen/);
  for (const mirror of ['', 'docs/']) {
    const outer = await read(mirror + 'tabs/cii-workspace/cii-workspace-find-replace.js');
    assert.match(outer, /<iframe data-ciifr-vnext-frame[^>]+allow="fullscreen" allowfullscreen/);
  }
  assert.match(html, /data-ciifr-geo-open[^>]+target="_blank" rel="noopener"/);
  for (const path of ['app.js', 'geo-tab.js', 'geo-tab.css']) {
    assert.equal(await read(ui + path), await read('docs/' + ui + path));
  }
  assert.doesNotMatch(await read(ui + 'geo-tab.js'), /contentWindow|postMessage|localStorage|writer\.js/);
});

test('actual host app switches isolated panels, loads once and preserves the frame document', async () => {
  // Controlled DOM, not rendered/GPU evidence. Execute the production host handler.
  const dom = createTestDom();
  const button = new MockElement('button', { 'data-tab': 'CIIFR_GEO' });
  const panel = new MockElement('section', { 'data-ciifr-geo-panel': '' });
  const frame = new MockElement('iframe', { 'data-ciifr-geo-frame': '' });
  const link = new MockElement('a', { 'data-ciifr-geo-open': '' });
  panel.append(link, frame); dom.root.append(button, panel);
  let navigations = 0;
  const setAttribute = frame.setAttribute.bind(frame);
  frame.setAttribute = (key, value) => { if (key === 'src') navigations++; setAttribute(key, value); };
  await import('../tabs/cii-workspace/cii-fnr-vnext/ui/app.js?geo-test=' + Date.now());
  assert.equal(panel.hidden, true);
  assert.equal(frame.getAttribute('src'), null);
  const bytes = new TextEncoder().encode(makeDemoCii());
  dom.targetFile.files = [{ name: 'DEMO.CII', arrayBuffer: async () => bytes.buffer }];
  await dom.targetFile.dispatchEvent({ type: 'change' });
  const rule = dom.root.querySelector('[data-row-index="0"]');
  for (const [key, value] of [['find', 'OLD-A'], ['replace', 'NEW-A']]) {
    const input = rule.querySelector(`[data-field="${key}"]`);
    input.value = value; await input.dispatchEvent({ type: 'input' });
  }
  await dom.btnRun.click();
  assert.equal(dom.tbodyProposals.children.length, 1);
  await button.click();
  assert.equal(panel.hidden, false);
  assert.equal(dom.root.querySelector('[data-workspace]').hidden, true);
  assert.equal(dom.root.querySelector('[data-config-area]').hidden, true);
  assert.equal(button.getAttribute('aria-selected'), 'true');
  const url = frame.getAttribute('src');
  assert.ok(url.endsWith('/prototypes/ciifr-map/index.html'));
  assert.equal(link.href, url);
  assert.equal(navigations, 1);
  await dom.tabConfig.click();
  assert.equal(panel.hidden, true);
  assert.equal(dom.root.querySelector('[data-config-area]').hidden, false);
  await button.click();
  assert.equal(navigations, 1, 'return must not navigate away from in-memory A/B/C work');
  assert.equal(panel.children[1], frame);
  assert.equal(frame.getAttribute('src'), url);
  await dom.tabNormal.click();
  assert.equal(panel.hidden, true);
  assert.equal(dom.root.querySelector('[data-workspace]').hidden, false);
  assert.match(dom.root.querySelector('[data-meta="target"]').textContent, /DEMO.CII/);
  assert.equal(dom.root.querySelector('[data-field="find"]').value, 'OLD-A');
  assert.equal(dom.tbodyProposals.children.length, 0, 'existing switch policy revokes proposals');
  assert.equal(dom.btnExport.disabled, true);
});
