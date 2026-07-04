import assert from 'node:assert/strict';
import fs from 'node:fs';

import { _test } from '../tabs/xml-compare-linewise-toolbar-gate.js';

const source = fs.readFileSync(new URL('../tabs/xml-compare-linewise-toolbar-gate.js', import.meta.url), 'utf8');

assert.equal(_test.converterTabKeys()[0], 'load-canvas', 'converter shortcut prioritizes Load Canvas');
assert.equal(_test.converterTabKeys().includes('preview'), true, 'converter shortcut can fall back to Preview');
assert.equal(_test.converterTabLabels().includes('Load Canvas'), true, 'converter shortcut can match Load Canvas label');
assert.equal(source.includes('function openConverterWorkflow()'), true, 'converter shortcut has dedicated workflow opener');
assert.equal(source.includes('function clickShortcut(event){const button=event.target?.closest?.(`[${CONVERTER_SHORTCUT_BUTTON}]`);if(!button)return;event.preventDefault();event.stopPropagation();openConverterWorkflow();}'), true, 'shortcut click is wired to converter workflow opener');
assert.equal(source.includes('shortcut.title=\'Open categorized/enriched XML preview and canvas-load workflow\''), true, 'shortcut title describes preview/load-canvas target');

const fakeTab = { dataset: { xmlCompareLinewiseTab: 'load-canvas' }, textContent: '6 Load Canvas' };
assert.equal(_test.tabMatches(fakeTab, _test.converterTabKeys(), _test.converterTabLabels()), true);

console.log('XML Compare line-wise shortcut routing tests passed');
