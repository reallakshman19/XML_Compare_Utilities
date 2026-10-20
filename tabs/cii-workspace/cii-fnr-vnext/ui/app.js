import { planNormal } from '../normal/plan.js';
import { sha256, validatePostimage } from './writer.js';

const tabs = ['NORMAL', 'LINE_NODE', 'GEOMETRY'];
const names = { NORMAL: 'Normal Find & Replace', LINE_NODE: 'Line Number + Node Name', GEOMETRY: 'Geometry' };
const blank = () => ({ id: `rule-${++serial}`, find: '', replace: '', mode: 'LITERAL', flags: 'g',
  field: 'NODENAME.BOTH', scope: 'DOCUMENT', from: '', to: '', block: 'NODENAME' });
let serial = 0, active = 'NORMAL', target = null, source = null;
const states = Object.fromEntries(tabs.map((id) => [id, { rules: [blank(), blank(), blank()], plan: null,
  decisions: new Map(), validated: null, applied: null, diagnostics: [] }]));
const root = document.querySelector('[data-vnext-app]');
const $ = (s) => root.querySelector(s);
const $$ = (s) => [...root.querySelectorAll(s)];
const state = () => states[active];
const message = (text) => { $('[data-status]').textContent = text; };

function invalidate(s, reason = 'Changes revoked previous approvals and exports.') {
  s.plan = null; s.decisions.clear(); s.validated = null; s.applied = null; s.diagnostics = [];
  if (s === state()) { renderResults(); message(reason); }
}
function cell(tag, text) { const node = document.createElement(tag); node.textContent = text; return node; }
function renderTabs() {
  for (const button of $$('[data-tab]')) {
    const selected = button.dataset.tab === active;
    button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1;
    button.classList.toggle('selected', selected);
  }
  $('[data-panel-title]').textContent = names[active];
  $('[data-unavailable]').hidden = active === 'NORMAL';
  $('[data-run]').disabled = active !== 'NORMAL' || !target;
  $('[data-rows-area]').hidden = active !== 'NORMAL';
  message(active === 'NORMAL' ? 'Load TARGET0 and edit rules, then Generate proposals.' :
    `${names[active]} awaits an independently delivered engine. No write authority exists.`);
}
function addSelect(td, field, entries, value) {
  const el = document.createElement('select'); el.dataset.field = field; el.setAttribute('aria-label', field);
  for (const [id, label] of entries) { const option = document.createElement('option'); option.value = id; option.textContent = label; el.append(option); }
  el.value = value; td.append(el);
}
const selects = {
  mode: [['LITERAL','Literal'],['REGEX','Regex']],
  field: [['NODENAME.BOTH','Name: both'],['NODENAME.FROM','Name: from'],['NODENAME.TO','Name: to']],
  scope: [['DOCUMENT','Document'],['ELEMENT','Element'],['BLOCK','Block']]
};
function renderRules() {
  const tbody = $('[data-rules]'); tbody.replaceChildren();
  for (const [i, rule] of state().rules.entries()) {
    const tr = document.createElement('tr'); tr.dataset.rowIndex = String(i); tr.append(cell('th', String(i + 1)));
    for (const key of ['find', 'replace', 'mode', 'flags', 'field', 'scope', 'from', 'to']) {
      const td = document.createElement('td');
      if (selects[key]) addSelect(td, key, selects[key], rule[key]);
      else { const input = document.createElement('input'); input.dataset.field = key; input.value = rule[key];
        input.setAttribute('aria-label', `${key} row ${i + 1}`); input.spellcheck = false; td.append(input); }
      tr.append(td);
    }
    const td = document.createElement('td'), del = document.createElement('button');
    del.type = 'button'; del.dataset.delete = String(i); del.textContent = '×'; del.setAttribute('aria-label', `Remove row ${i + 1}`);
    td.append(del); tr.append(td); tbody.append(tr);
  }
}
function renderResults() {
  const s = state(), tbody = $('[data-proposals]'); tbody.replaceChildren();
  for (const claim of s.plan?.claims || []) {
    const tr = document.createElement('tr'); tr.append(cell('td', claim.ruleId), cell('td', claim.fieldIdentity),
      cell('td', `${claim.byteStart}–${claim.byteEnd}`), cell('td', claim.before.trim()), cell('td', claim.after.trim()));
    const td = document.createElement('td');
    if (claim.status !== 'PROPOSED') td.textContent = claim.status;
    else {
      const sel = document.createElement('select'); sel.dataset.decision = claim.id;
      for (const [key, label] of [['', 'Pending'], ['APPROVED', 'Approve'], ['REJECTED', 'Reject']]) {
        const option = document.createElement('option'); option.value = key; option.textContent = label; sel.append(option);
      }
      sel.value = s.decisions.get(claim.id) || ''; td.append(sel);
    }
    tr.append(td); tbody.append(tr);
  }
  const log = $('[data-diagnostics]'); log.replaceChildren();
  for (const d of [...(s.plan?.diagnostics || []), ...s.diagnostics]) {
    const li = cell('li', `${d.severity || 'ERROR'} · ${d.code || 'VALIDATION'} · ${d.ruleId || ''} ${d.detail || ''}`); log.append(li);
  }
  $('[data-claim-count]').textContent = `${s.plan?.claims.length || 0} claims`;
  $('[data-validate]').disabled = !s.plan || ![...s.decisions.values()].includes('APPROVED');
  $('[data-apply]').disabled = !s.validated;
  $('[data-export]').disabled = !s.applied;
  $('[data-audit]').disabled = !s.validated;
  $('[data-hash1]').textContent = s.validated?.target1Hash || '—';
}
function currentRules() { return state().rules.filter((r) => r.find || r.replace).map((r) => ({ ...r })); }
function safeError(err) {
  state().diagnostics = [{ severity: 'ERROR', code: err.message || String(err) }];
  state().validated = null; state().applied = null; renderResults(); message('Validation blocked; no new copy may be exported.');
}
function approved() { return [...state().decisions].filter(([, v]) => v === 'APPROVED').map(([k]) => k); }
async function generate() {
  const s = state(); invalidate(s, 'Computing scoped NODENAME proposals.');
  if (!target) { message('TARGET0 required'); return; }
  try {
    const hash = await sha256(target.bytes);
    s.plan = planNormal({ tab: 'NORMAL', targetBytes: target.bytes, originalTargetSha256: hash,
      sourceBytes: source?.bytes, rules: currentRules(), options: {} });
    s.diagnostics = []; renderResults();
    message(`${s.plan.claims.length} proposal(s). Review each claim before Validate.`);
  } catch (err) { safeError(err); }
}
async function validate() {
  const s = state(); s.validated = null; s.applied = null;
  try {
    if (s.plan?.diagnostics.some((d) => d.severity === 'ERROR')) throw new Error('RESOLVE_RULE_DIAGNOSTICS_FIRST');
    s.validated = await validatePostimage({ original: target.bytes, originalHash: await sha256(target.bytes),
      plan: s.plan, approvedIds: approved(), tab: active });
    s.diagnostics = []; renderResults(); message('TARGET1 validated in memory. Apply to New Copy is now available.');
  } catch (err) { safeError(err); }
}
async function apply() {
  const s = state();
  try {
    if (!s.validated) throw new Error('VALIDATE_BEFORE_APPLY');
    const result = await validatePostimage({ original: target.bytes, originalHash: await sha256(target.bytes),
      plan: s.plan, approvedIds: approved(), tab: active });
    if (result.target1Hash !== s.validated.target1Hash) throw new Error('VALIDATED_OUTPUT_STALE');
    s.applied = result; renderResults(); message('TARGET1 released as an immutable new-copy preview. Export enabled.');
  } catch (err) { safeError(err); }
}
function download(name, bytes, type) {
  const blob = new Blob([bytes], { type }); const href = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = href; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(href), 5000);
}
async function exportCii() {
  try {
    const s = state(); if (!s.applied) throw new Error('APPLY_REQUIRED');
    const result = await validatePostimage({ original: target.bytes, originalHash: await sha256(target.bytes),
      plan: s.plan, approvedIds: approved(), tab: active });
    if (result.target1Hash !== s.applied.target1Hash) throw new Error('EXPORT_STALE');
    download(`${target.name.replace(/\.cii$/i, '')}-TARGET1.CII`, result.bytes, 'application/octet-stream');
    message(`Exported verified new copy ${result.target1Hash}`);
  } catch (err) { safeError(err); }
}
function parseCsv(text) {
  const rows = []; let row = [], value = '', quote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { if (quote && text[i + 1] === '"') { value += '"'; i++; } else quote = !quote; }
    else if (c === ',' && !quote) { row.push(value); value = ''; }
    else if ((c === '\r' || c === '\n') && !quote) {
      row.push(value); if (row.some((s) => s.trim())) rows.push(row);
      row = []; value = ''; if (c === '\r' && text[i + 1] === '\n') i++;
    } else value += c;
  }
  if (quote) throw new Error('CSV_UNTERMINATED_QUOTE');
  row.push(value); if (row.some((s) => s.trim())) rows.push(row);
  const headers = (rows.shift() || []).map((x) => x.trim().toLowerCase());
  const find = headers.findIndex((x) => ['find', 'findtext'].includes(x));
  const replace = headers.findIndex((x) => ['replace', 'replacetext'].includes(x));
  if (find < 0 || replace < 0) throw new Error('CSV_FIND_REPLACE_HEADERS_REQUIRED');
  return rows.map((v) => ({ ...blank(), find: v[find] || '', replace: v[replace] || '' }));
}
root.addEventListener('input', (event) => {
  const field = event.target.dataset.field, row = event.target.closest('[data-row-index]');
  if (!field || !row) return;
  state().rules[Number(row.dataset.rowIndex)][field] = event.target.value;
  invalidate(state());
});
root.addEventListener('change', (event) => {
  if (!event.target.dataset.decision) return;
  const s = state(); s.decisions.set(event.target.dataset.decision, event.target.value);
  s.validated = null; s.applied = null; renderResults(); message('Review decision changed. Revalidate before applying.');
});
root.addEventListener('paste', (event) => {
  const row = event.target.closest('[data-row-index]');
  if (!row || event.target.dataset.field !== 'find') return;
  const raw = event.clipboardData?.getData('text/plain') || '';
  if (!raw.includes('\t')) return;
  event.preventDefault(); const start = Number(row.dataset.rowIndex);
  raw.replace(/\r/g, '').trimEnd().split('\n').forEach((line, offset) => {
    const parts = line.split('\t');
    if (parts.length < 2) return;
    while (state().rules.length <= start + offset) state().rules.push(blank());
    Object.assign(state().rules[start + offset], { find: parts[0], replace: parts[1] });
  });
  invalidate(state()); renderRules(); message('Excel-style Find/Replace range pasted.');
});
root.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' || !event.target.dataset.field) return;
  const row = event.target.closest('[data-row-index]'); if (!row) return;
  event.preventDefault(); const next = Number(row.dataset.rowIndex) + 1;
  if (next === state().rules.length) { state().rules.push(blank()); renderRules(); }
  $(`[data-row-index="${next}"] [data-field="${event.target.dataset.field}"]`)?.focus();
});
root.addEventListener('click', async (event) => {
  const el = event.target.closest('button'); if (!el) return;
  if (el.dataset.tab) {
    if (el.dataset.tab === active) return;
    invalidate(state()); active = el.dataset.tab; invalidate(state()); renderTabs(); renderRules(); renderResults();
    return;
  }
  if (el.dataset.delete !== undefined) { state().rules.splice(Number(el.dataset.delete), 1); invalidate(state()); renderRules(); }
  if (el.dataset.add !== undefined) { state().rules.push(blank()); invalidate(state()); renderRules(); }
  if (el.dataset.clear !== undefined) { state().rules = [blank(), blank(), blank()]; invalidate(state()); renderRules(); }
  if (el.dataset.copy !== undefined) {
    try { await navigator.clipboard.writeText(state().rules.map((r) => `${r.find}\t${r.replace}`).join('\n'));
      message('Find/Replace grid copied as TSV.'); } catch { message('Clipboard unavailable in this browser context.'); }
  }
  if (el.dataset.run !== undefined) await generate();
  if (el.dataset.validate !== undefined) await validate();
  if (el.dataset.apply !== undefined) await apply();
  if (el.dataset.export !== undefined) await exportCii();
  if (el.dataset.audit !== undefined && state().validated) {
    download('cii-vnext-audit.json', JSON.stringify({ schema: 'CiiFnrVnext.Audit.v1',
      target0: state().validated.originalHash, target1: state().validated.target1Hash,
      claims: state().validated.audit, decisions: [...state().decisions] }, null, 2), 'application/json');
  }
});
for (const field of ['target', 'source']) {
  $(`[data-file="${field}"]`).addEventListener('change', async (event) => {
    const file = event.target.files?.[0]; if (!file) return;
    const snapshot = { name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) };
    if (field === 'target') target = snapshot; else source = snapshot;
    for (const s of Object.values(states)) invalidate(s);
    $(`[data-meta="${field}"]`).textContent = `${file.name} | ${snapshot.bytes.length} bytes | SHA-256 ${await sha256(snapshot.bytes)}`;
    renderTabs(); renderResults();
  });
}
$('[data-file="csv"]').addEventListener('change', async (event) => {
  const file = event.target.files?.[0]; if (!file) return;
  try { state().rules = parseCsv(await file.text()); invalidate(state()); renderRules();
    message(`Imported ${state().rules.length} CSV rows.`); } catch (err) { safeError(err); }
});
renderTabs(); renderRules(); renderResults();
