import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { parseCii } from '../tabs/cii-workspace/cii-fnr-vnext/ui/physical.js';
import { planNormal } from '../tabs/cii-workspace/cii-fnr-vnext/normal/plan.js';
import { makeDemoCii, DEMO_CSV } from '../tabs/cii-workspace/cii-fnr-vnext/ui/demo-loader.js';
import { createTestDom, MockElement } from './helpers/vnext-dom-env.mjs';

test('synthetic demo parses as v14 CII with two independently owned names', () => {
  const text = makeDemoCii();
  assert(text.endsWith('\r\n'));
  assert.equal(/[^\x20-\x7e\r\n]/.test(text), false);
  const parsed = parseCii(new Uint8Array(Buffer.from(text, 'ascii')));
  assert.equal(parsed.version, 14);
  assert.equal(parsed.nonam, 1);
  assert.deepEqual(parsed.fields.map((x) => x.before.trim()), ['OLD-A', 'OLD-B']);
  assert(parsed.fields.every((x) => !x.shared && !x.orphan && x.owners.length === 1));
});

test('demo CSV produces exactly two reviewable Normal claims', () => {
  const csv = DEMO_CSV.trim().split(/\r?\n/);
  assert.deepEqual(csv.shift().split(','), ['Find', 'Replace']);
  const rules = csv.map((record, i) => {
    const [find, replace] = record.split(',');
    return { id: 'demo-' + i, find, replace, mode: 'LITERAL', flags: 'g',
      field: 'NODENAME.BOTH', scope: 'DOCUMENT', block: 'NODENAME' };
  });
  const plan = planNormal({ tab: 'NORMAL', targetBytes: new Uint8Array(Buffer.from(makeDemoCii(), 'ascii')),
    originalTargetSha256: 'a'.repeat(64), rules, options: {} });
  assert.equal(plan.incompleteSearch, false);
  assert.equal(plan.claims.length, 2);
  assert(plan.claims.every((x) => x.status === 'PROPOSED'));
  assert.deepEqual(plan.claims.map((x) => x.after.trim()), ['NEW-A', 'NEW-B']);
  assert.deepEqual(plan.diagnostics, []);
});

test('source and served demo loader are byte-identical', async () => {
  const [source, served] = await Promise.all([
    readFile(new URL('../tabs/cii-workspace/cii-fnr-vnext/ui/demo-loader.js', import.meta.url)),
    readFile(new URL('../docs/tabs/cii-workspace/cii-fnr-vnext/ui/demo-loader.js', import.meta.url))
  ]);
  assert.deepEqual(source, served);
});

test('demo button goes through existing TARGET then CSV file intake', async () => {
  const dom = createTestDom();
  const demoButton = new MockElement('button', { 'data-load-demo': '' });
  const demoStatus = new MockElement('span', { 'data-demo-status': '' });
  dom.root.append(demoButton, demoStatus);

  const originals = {
    File: globalThis.File, DataTransfer: globalThis.DataTransfer,
    Event: globalThis.Event, MutationObserver: globalThis.MutationObserver
  };
  const watchers = new Map();
  for (const node of [dom.root.querySelector('[data-meta="target"]'), dom.status]) {
    Object.defineProperty(node, 'textContent', {
      get() { return this._textContent; },
      set(value) {
        this._textContent = String(value);
        for (const observer of watchers.get(this) || []) queueMicrotask(() => observer.callback());
      }
    });
  }
  globalThis.File = class {
    constructor(parts, name) { this.name = name; this.body = parts.join(''); }
    async arrayBuffer() {
      const data = Buffer.from(this.body, 'ascii');
      return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    }
    async text() { return this.body; }
  };
  globalThis.DataTransfer = class {
    constructor() {
      const files = [];
      this.items = { add: (file) => files.push(file) };
      this.files = files;
    }
  };
  globalThis.Event = class {
    constructor(type) { this.type = type; this.target = null; }
  };
  globalThis.MutationObserver = class {
    constructor(callback) { this.callback = callback; }
    observe(element) {
      this.element = element;
      watchers.set(element, [...(watchers.get(element) || []), this]);
    }
    disconnect() {
      watchers.set(this.element, (watchers.get(this.element) || []).filter((x) => x !== this));
    }
  };
  try {
    await import('../tabs/cii-workspace/cii-fnr-vnext/ui/app.js?demo=' + Date.now());
    // install again after test DOM creation (module's initial install saw no button).
    const { installDemoLoader } = await import('../tabs/cii-workspace/cii-fnr-vnext/ui/demo-loader.js');
    installDemoLoader(dom.root);
    await demoButton.click();
    assert.match(demoStatus.textContent, /two CSV rules loaded/);
    assert.match(dom.root.querySelector('[data-meta="target"]').textContent, /CIIFR-DEMO-V14\.CII.*SHA-256/);
    assert.equal(dom.root.querySelector('[data-rules]').children.length, 2);
    await dom.btnRun.click();
    assert.equal(dom.tbodyProposals.children.length, 2);
    assert.equal(dom.btnExport.disabled, true, 'demo may not authorize export without review');
  } finally {
    for (const [key, value] of Object.entries(originals)) globalThis[key] = value;
  }
});
