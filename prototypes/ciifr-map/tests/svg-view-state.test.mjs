import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import {createRequire} from 'node:module';
import {readXmlGraph} from '../xml-intake.js';
import {createPreviewSession} from '../compare.js';
import {mountScene, readableSelection} from '../view.js';

const {DOMParser} = createRequire(process.env.CIIFR_TEST_RUNTIME + '/package.json')('@xmldom/xmldom');
const read = (bytes, options) => readXmlGraph(bytes, {...options, cryptoRef: webcrypto,
  parser: new DOMParser({onError: (level, message) => {throw Error(level + ':' + message);}})});
async function resultFromPublicXml() {
  const session = createPreviewSession({read});
  await session.load('SOURCE', new Uint8Array(readFileSync(new URL('./fixtures/S1-F05.xml', import.meta.url))), 'S1-F05.xml');
  await session.load('TARGET', new Uint8Array(readFileSync(new URL('./fixtures/S1-R4.xml', import.meta.url))), 'S1-R4.xml');
  for (const node of ['3790', '3830', '3840']) session.addAnchor(node, node);
  return session.run();
}
function surface() {
  const attrs = {}, events = {};
  const svg = {setAttribute: (key, value) => {attrs[key] = value;}, addEventListener: (key, fn) => {events[key] = fn;},
    getBoundingClientRect: () => ({width: 1000, height: 500}), setPointerCapture() {}};
  return {attrs, events, canvas: {set innerHTML(value) {this.markup = value;}, querySelector: () => svg}};
}

test('real XML SVG zoom/pan survives row remount; copied state validates independently of geometry', async () => {
  const result = await resultFromPublicXml(), before = JSON.stringify([result.source.nodes, result.target.nodes, result.transform]);
  const a = surface(), viewport = mountScene(result, a.canvas, () => {}, ['3790']);
  const base = viewport.getState(); viewport.zoom(.5);
  a.events.pointerdown({button: 0, target: {closest: () => null}, clientX: 50, clientY: 60, pointerId: 1});
  a.events.pointermove({clientX: 170, clientY: 115}); a.events.pointerup();
  const saved = viewport.getState();
  assert.notDeepEqual(saved, base); assert.equal(saved.width, base.width / 2);
  const b = surface(), second = mountScene(result, b.canvas, () => {}, ['3830'], null, null, saved);
  assert.deepEqual(second.getState(), saved);
  assert.deepEqual(b.attrs.viewBox.split(' ').map(Number), [saved.x, saved.y, saved.width, saved.height]);
  saved.width = 1; assert.notEqual(second.getState().width, 1, 'caller cannot mutate internal view');
  second.restore(base); assert.deepEqual(second.getState(), base);
  assert.throws(() => second.restore({...base, width: 0}), /FINITE_POSITIVE/);
  assert.throws(() => mountScene(result, surface().canvas, () => {}, [], null, null, {...base, x: NaN}), /FINITE_POSITIVE/);
  assert.throws(() => second.zoom(Infinity), /POSITIVE_FINITE/);
  assert.equal(JSON.stringify([result.source.nodes, result.target.nodes, result.transform]), before,
    'view state and row inspection cannot modify the registered graph or pose');
});

test('inspected alternate shows its own residual and identifies the different active TARGET', async () => {
  const result = await resultFromPublicXml();
  const row = result.candidates.rows.find(item => item.source === '5210');
  const context = {...result, candidates: {...result.candidates, rows: [{...row, target: '5210', status: 'Consolidated chosenpair'}]}};
  const text = readableSelection(context, ['5210'], {pairTarget: '5229'});
  assert.match(text, /SOURCE NODE 5210 → TARGET NODE 5229/);
  assert.match(text, /Inspected alternative; active TARGET NODE 5210/);
  assert.match(text, /ΔX -669/);
  assert.doesNotMatch(text, /Consolidated chosenpair/);
  assert.match(readableSelection(context, ['5210'], {pairTarget: '5210'}), /Consolidated chosenpair/);
});
