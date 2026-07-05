import assert from 'node:assert/strict';
import fs from 'node:fs';

import { _test } from '../tabs/xml-compare-linewise-toolbar-gate.js';
import { _test as samplePickerTest } from '../tabs/xml-compare-enriched-sample-pickers.js';

const source = fs.readFileSync(new URL('../tabs/xml-compare-linewise-toolbar-gate.js', import.meta.url), 'utf8');
const css = _test.toolbarStyleCss();

assert.equal(_test.converterTabKeys()[0], 'load-canvas', 'converter shortcut prioritizes Load Canvas');
assert.equal(_test.converterTabKeys().includes('preview'), true, 'converter shortcut can fall back to Preview');
assert.equal(_test.converterTabLabels().includes('Load Canvas'), true, 'converter shortcut can match Load Canvas label');

assert.equal(css.includes('xml-compare-file-btn'), false, 'gate CSS must not target native file labels');
assert.equal(css.includes('clip:'), false, 'gate CSS must not visually clip native controls');
assert.equal(css.includes('pointer-events:none'), false, 'gate CSS must not disable native controls');
assert.equal(css.includes('opacity:0'), false, 'gate CSS must not hide native controls');

assert.equal(source.includes('gateRawXmlLoad'), false, 'line-wise gate must not define raw XML load capture');
assert.equal(source.includes('input[data-xml-compare-load]'), false, 'line-wise gate must not watch native Source/Target inputs');
assert.equal(source.includes('stopImmediatePropagation'), false, 'line-wise gate must not stop native file input propagation');
assert.equal(source.includes('new DataTransfer'), false, 'line-wise gate must not fake native file input handoff');

const listeners = [];
const fakeDoc = {
  body: {},
  head: { append() {} },
  getElementById() { return null; },
  createElement() { return { id: '', textContent: '' }; },
  addEventListener(type, listener, options) { listeners.push({ type, listener, options }); },
  querySelector() { return null; },
};

assert.equal(_test.installXmlCompareLinewiseToolbarGate(fakeDoc), true);
assert.equal(listeners.some((item) => item.type === 'change'), false, 'gate must not register native load change listener');
assert.equal(listeners.some((item) => item.options?.capture === true), false, 'gate listener must not run in capture phase');

for (const side of ['a', 'b']) {
  assert.equal(listeners.some((item) => item.type === 'change'), false, `native ${side} load is not observed by the gate`);
}

const fakeTab = { dataset: { xmlCompareLinewiseTab: 'load-canvas' }, textContent: '6 Load Canvas', click() { this.clicked = true; } };
const popup = { querySelectorAll: () => [fakeTab] };
let workflowOpened = false;
const shortcutDoc = {
  querySelector(selector) {
    if (selector === '[data-xml-compare-categorized-open]') return { click() { workflowOpened = true; } };
    if (selector === '[data-xml-compare-categorized-popup]') return popup;
    return null;
  },
};

const shortcutEvent = {
  target: { closest: (selector) => (selector === '[data-xml-compare-categorized-converter-shortcut]' ? {} : null) },
  preventDefault() { this.defaultPrevented = true; },
  stopPropagation() { this.propagationStopped = true; },
};

assert.equal(_test.clickShortcut(shortcutEvent, shortcutDoc), true);
assert.equal(workflowOpened, true, 'explicit shortcut click still opens line-wise workflow');
assert.equal(fakeTab.clicked, true, 'explicit shortcut selects load-canvas tab');

assert.equal(samplePickerTest.pickerHtml(), '', 'sample picker has no hidden direct-load UI');
assert.equal(samplePickerTest.installXmlCompareEnrichedSamplePickers(), false, 'empty sample picker installs no listeners');
const sampleSource = fs.readFileSync(new URL('../tabs/xml-compare-enriched-sample-pickers.js', import.meta.url), 'utf8');
assert.equal(sampleSource.includes('input[data-xml-compare-load]'), false, 'sample picker must not watch native Source/Target inputs');
assert.equal(sampleSource.includes('stopImmediatePropagation'), false, 'sample picker must not stop native file input propagation');
assert.equal(sampleSource.includes('DataTransfer'), false, 'sample picker must not fake native file input handoff');

console.log('XML Compare native workflow gate regression tests passed');
