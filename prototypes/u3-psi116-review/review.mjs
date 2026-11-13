import { scanXml, psi116Index, xmlDiff, child, text, decodeEntities } from '../_kit/xmlspan.mjs';
import { sha256Hex, require } from '../_kit/core.mjs';

// File callers pass raw bytes; object callers bind to their JSON.stringify encoding.
function readChanges(input) {
  if (input === undefined) return {receipt: undefined, bytes: undefined};
  let bytes, receipt;
  try {
    bytes = input instanceof Uint8Array ? new Uint8Array(input) : new TextEncoder().encode(typeof input === 'string' ? input : JSON.stringify(input));
    receipt = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes));
  } catch { require(false, 'U3_CHANGES_INVALID', 'changes JSON'); }
  require(receipt && typeof receipt === 'object' && !Array.isArray(receipt), 'U3_CHANGES_INVALID');
  return {receipt, bytes};
}

function checkHashes(changes, original, revised) {
  if (changes === undefined) return;
  const check = (value, hash, key) => require(typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value) && value.toLowerCase() === hash,
    'U3_SHA256_MISMATCH', key);
  const isReceipt = changes.format === 'u2.transfer-receipt';
  if (isReceipt) {
    require(changes.version === 1 && Object.hasOwn(changes.revised ?? {}, 'sha256') && Object.hasOwn(changes.base ?? {}, 'sha256') && Array.isArray(changes.changes),
      'U3_CHANGES_INVALID', 'U2b receipt requires version 1, revised.sha256, base.sha256 and changes');
    check(changes.revised.sha256, revised, 'revised.sha256');
    check(changes.base.sha256, original, 'base.sha256');
  }
  const revisedKeys = ['revisedSha256', 'sha256After'].filter(k => Object.hasOwn(changes, k));
  require(isReceipt || revisedKeys.length, 'U3_CHANGES_INVALID', 'missing revised hash');
  for (const k of revisedKeys) check(changes[k], revised, k);
  for (const k of ['originalSha256', 'sha256Before']) if (Object.hasOwn(changes, k)) check(changes[k], original, k);
}

// Both callers use the exact same byte-based review. No DOM or file access here.
export async function comparePsi116(original, revised, changes) {
  require(original instanceof Uint8Array && revised instanceof Uint8Array, 'U3_BYTES_REQUIRED');
  original = new Uint8Array(original); revised = new Uint8Array(revised);
  const {receipt, bytes: changesBytes} = readChanges(changes);
  const [originalSha256, revisedSha256, changesSha256] = await Promise.all([
    sha256Hex(original), sha256Hex(revised), changesBytes === undefined ? null : sha256Hex(changesBytes)]);
  checkHashes(receipt, originalSha256, revisedSha256);
  const a = scanXml(original), b = scanXml(revised);
  const ai = psi116Index(a); psi116Index(b);
  const diffs = xmlDiff(a, b);
  if (receipt && Object.hasOwn(receipt, 'changes')) {
    require(Array.isArray(receipt.changes), 'U3_CHANGES_INVALID', 'changes must be an array');
    require(receipt.changes.length === diffs.length, 'U3_CHANGES_COUNT_MISMATCH', 'changes', `${receipt.changes.length} receipt rows vs ${diffs.length} XML changes`);
  }
  const branches = new Map(ai.branches.map((el, ordinal) => {
    const name = child(el, 'Branchname', true);
    return [el, {branchOrdinal: ordinal, branchName: name ? text(a, name).value : ''}];
  }));
  const nodes = new Map(ai.nodes.map(({element, branchOrdinal, branchName, nodeOrdinal, nodeNumber, componentRefNo}) =>
    [element, {branchOrdinal, branchName, nodeOrdinal, nodeNumber, componentRefNo}]));
  const rows = diffs.map(d => {
    // The kit treats an entire leaf interior as a value. Do not approve changed
    // comments/PIs inside leaves, or a changed namespace declaration as a value.
    require(!(d.kind === 'text' && (d.before.includes('<') || d.after.includes('<'))) &&
      !(d.kind === 'attr' && /^xmlns(?::|$)/.test(d.name)), 'XML_MARKUP_CHANGED', d.path);
    const el = a.elements[d.element];
    let owner = el, ref = null;
    const names = [];
    for (; owner; owner = owner.parent) {
      if (nodes.has(owner) || branches.has(owner)) {
        ref = nodes.get(owner) || branches.get(owner);
        names.unshift(owner.local); break;
      }
      if (owner.local !== '#document') names.unshift(owner.local);
    }
    if (d.kind === 'attr') names.push('@' + d.name);
    const field = names.join('/');
    return {ref, field, path: d.path, kind: d.kind, start: d.start, end: d.end,
      before: decodeEntities(d.before), after: decodeEntities(d.after), rawBefore: d.before, rawAfter: d.after};
  });
  const fields = Object.create(null);
  for (const r of rows) fields[r.field] = (fields[r.field] || 0) + 1;
  return {originalSha256, revisedSha256, changesSha256, boundToChanges: changesSha256 !== null, changeCount: rows.length, fields, rows};
}

// Recompute instead of trusting a mutable summary or a caller-supplied count.
export async function approvePsi116(original, revised, changes) {
  const {originalSha256, revisedSha256, changesSha256, boundToChanges, changeCount, fields} = await comparePsi116(original, revised, changes);
  return {originalSha256, revisedSha256, changesSha256, boundToChanges, changeCount, approvedAt: new Date().toISOString(), fields};
}

function mount() {
  const $ = id => document.getElementById(id);
  const inputs = ['original', 'revised', 'changes'].map($), button = $('approve');
  let generation = 0, loaded = null;
  const show = (message, error = false) => { $('status').textContent = message; $('status').className = error ? 'error' : ''; };
  const add = (parent, tag, value) => {
    const el = document.createElement(tag); el.textContent = value; parent.append(el); return el;
  };
  const render = result => {
    $('counts').replaceChildren(); $('rows').replaceChildren();
    add($('counts'), 'p', result.changeCount + ' changed value(s)');
    for (const [field, count] of Object.entries(result.fields)) add($('counts'), 'div', field + ': ' + count);
    const groups = new Map();
    for (const row of result.rows) {
      const ref = row.ref;
      const key = ref ? String(ref.branchOrdinal) : 'document';
      if (!groups.has(key)) groups.set(key, {ref, nodes: new Map()});
      const group = groups.get(key), nk = ref?.nodeOrdinal ?? 'branch';
      if (!group.nodes.has(nk)) group.nodes.set(nk, {ref, rows: []});
      group.nodes.get(nk).rows.push(row);
    }
    for (const {ref, nodes} of groups.values()) {
      const section = add($('rows'), 'section', '');
      add(section, 'h2', ref ? 'Branch ' + ref.branchOrdinal + ' — ' + ref.branchName : 'Document-level changes');
      for (const group of nodes.values()) {
        const n = group.ref;
        add(section, 'h3', n?.nodeOrdinal !== undefined ? 'Node ' + n.nodeOrdinal + ' / ' + n.nodeNumber + ' — ' + n.componentRefNo : 'Branch/document values');
        const table = add(section, 'table', ''), header = add(table, 'tr', '');
        for (const label of ['Field / XML path', 'Before', 'After']) add(header, 'th', label);
        for (const row of group.rows) {
          const tr = add(table, 'tr', ''); tr.className = 'changed';
          const field = add(tr, 'td', row.field); add(field, 'small', row.path);
          add(tr, 'td', JSON.stringify(row.before)); add(tr, 'td', JSON.stringify(row.after));
          if (row.rawBefore !== row.before || row.rawAfter !== row.after) {
            add(tr.children[1], 'small', 'Raw: ' + JSON.stringify(row.rawBefore));
            add(tr.children[2], 'small', 'Raw: ' + JSON.stringify(row.rawAfter));
          }
        }
      }
    }
  };
  async function refresh() {
    const ticket = ++generation; loaded = null; button.disabled = true;
    $('counts').replaceChildren(); $('rows').replaceChildren();
    const [a, b, c] = inputs.map(input => input.files[0]);
    if (!a || !b) { show('Choose both PSI116 files.'); return; }
    show('Checking exact bytes…');
    try {
      const [original, revised, changes] = await Promise.all([a.arrayBuffer(), b.arrayBuffer(), c ? c.arrayBuffer().then(buffer => new Uint8Array(buffer)) : undefined]);
      const data = [new Uint8Array(original), new Uint8Array(revised), changes];
      const result = await comparePsi116(...data);
      if (ticket !== generation) return;
      render(result); loaded = data; button.disabled = false;
      show('Value-only review passed. ' + (result.boundToChanges ? 'Changes file checked and hash-bound. ' : 'No changes file supplied. ') + 'Inspect all changes before approving.');
    } catch (e) { if (ticket === generation) show('Approval refused: ' + e.message, true); }
  }
  for (const input of inputs) input.addEventListener('change', refresh);
  button.addEventListener('click', async () => {
    if (!loaded) return;
    const ticket = generation, data = loaded; button.disabled = true;
    try {
      const approval = await approvePsi116(...data);
      if (ticket !== generation) return;
      const url = URL.createObjectURL(new Blob([JSON.stringify(approval, null, 2) + '\n'], {type: 'application/json'}));
      const link = document.createElement('a'); link.href = url; link.download = 'approval.json';
      document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      show('Approval generated for the reviewed file hashes.'); button.disabled = false;
    } catch (e) { if (ticket === generation) { loaded = null; show('Approval refused: ' + e.message, true); } }
  });
}
if (typeof document !== 'undefined') mount();
