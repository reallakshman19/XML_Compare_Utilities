import { planNormal } from '../normal/plan.js';
import { sha256, validatePostimage } from './writer.js';
import { parseCii } from './physical.js';
import { DEFAULT_POLICY, resolvePolicy } from './config-policy.js';
import { enforceNormalNodeClosure } from './normal-node-closure.js';
import { sourceBranchLabels, sourceEvidenceForClaim } from './source-provenance.js';
import { resolveImportedCsv } from './csv-resolver.js';
import { safeNonConflictIds } from './nonconflict-review.js';
import { renderGeometryTab } from './geo-tab.js';
import { mountNodalPanel } from './nodal-panel.js';
import { mountPropertyTransfer } from './property-transfer/panel.js';

const workTabs = ['NORMAL', 'LINE_NODE', 'GEOMETRY'];
const tabs = ['NORMAL', 'NODAL', 'PROPERTY_TRANSFER', 'LINE_NODE', 'GEOMETRY', 'CIIFR_GEO', 'CONFIG'];
const names = { PROPERTY_TRANSFER: 'Property Transfer', NODAL: 'Node-Based Name Transfer', NORMAL: 'NodeName Find & Replace', LINE_NODE: 'Line Number + Node Name', GEOMETRY: 'Geometry', CIIFR_GEO: 'CIIFR_GEO', CONFIG: 'Config' };
const blank = () => ({ id: `rule-${++serial}`, find: '', replace: '', mode: 'LITERAL', flags: 'g',
  field: 'NODENAME.BOTH', scope: 'DOCUMENT', from: '', to: '', branch: '', block: 'NODENAME' });
let serial = 0, active = 'NORMAL', target = null, source = null, revision = 0, opSeq = 0;
let config = { ...DEFAULT_POLICY }, csvSeq = 0;
let importedCsv = false, pendingCleanup = null, cleanupReport = null;
const fileSeqs = { target: 0, source: 0 };
const states = Object.fromEntries(workTabs.map((id) => [id, { rules: [blank(), blank(), blank()], plan: null,
  decisions: new Map(), validated: null, applied: null, diagnostics: [] }]));
const root = document.querySelector('[data-vnext-app]');
const nodal = mountNodalPanel(root, () => target);
mountPropertyTransfer(root);
const $ = (s) => root.querySelector(s);
const $$ = (s) => [...root.querySelectorAll(s)];
const state = () => states[active] || states.NORMAL;
const message = (text) => { $('[data-status]').textContent = text; };

function invalidate(s, reason = 'Changes revoked previous approvals and exports.') {
  revision++; opSeq++;
  pendingCleanup = null; cleanupReport = null;
  s.plan = null; s.decisions.clear(); s.validated = null; s.applied = null; s.diagnostics = [];
  if (s === state()) {
    renderCleanupReport();
    for (const td of $$('[data-recommendation-cell]')) td.replaceChildren('—');
    renderResults(); message(reason);
  }
}
function cell(tag, text) { const node = document.createElement(tag); node.textContent = text; return node; }
function renderTabs() {
  for (const button of $$('[data-tab]')) {
    const selected = button.dataset.tab === active;
    button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1;
    button.classList.toggle('selected', selected);
  }
  $('[data-workspace]').hidden = active === 'CONFIG' || active === 'CIIFR_GEO' || active === 'PROPERTY_TRANSFER';
  const propertyPanel=$('[data-property-transfer-area]');
  if(propertyPanel) propertyPanel.hidden = active !== 'PROPERTY_TRANSFER';
  const nodalActive = active === 'NODAL';
  $('[data-nodal-area]').hidden = !nodalActive;
  for (const selector of ['[data-normal-section]', '[data-normal-review]',
    '[data-normal-footer]', '[data-demo-section]', '[data-standard-csv]',
    '[data-source-card]']) $(selector).hidden = nodalActive;
  $('[data-config-area]').hidden = active !== 'CONFIG';
  renderGeometryTab($('[data-ciifr-geo-panel]'), active === 'CIIFR_GEO');
  for (const el of $$('[data-config]')) el.value = config[el.dataset.config];
  $('[data-panel-title]').textContent = names[active];
  $('[data-unavailable]').hidden = active === 'NORMAL' || active === 'NODAL';
  $('[data-run]').disabled = active !== 'NORMAL' || !target;
  $('[data-rows-area]').hidden = active !== 'NORMAL';
  message(active === 'CONFIG' ? 'Changing settings revokes every existing approval and export.' :
    active === 'NORMAL' ? 'Load TARGET0 and edit rules, then Generate proposals.' :
    active === 'NODAL' ? 'Import Node,Replace CSV (optional Find) and generate numeric-node preview.' :
    active === 'PROPERTY_TRANSFER' ? 'Property inspection is isolated and read-only.' :
    `${names[active]} awaits an independently delivered engine. No write authority exists.`);
}
function addSelect(td, field, entries, value) {
  const el = document.createElement('select'); el.dataset.field = field; el.setAttribute('aria-label', field);
  for (const [id, label] of entries) { const option = document.createElement('option'); option.value = id; option.textContent = label; el.append(option); }
  el.value = value; td.append(el);
}
const selects = { mode: [['LITERAL','Literal'],['REGEX','Regex']], field: [['NODENAME.BOTH','Name: both'],['NODENAME.FROM','Name: from'],['NODENAME.TO','Name: to']], scope: [['DOCUMENT','Document'],['ELEMENT','Element'],['BLOCK','Block(Draft)'],['BRANCH','Branch']] };

function branchChoices(current) {
  const names = sourceBranchLabels(source?.parsed);
  const choices = [['', source ? 'Select SOURCE branch' : 'Load SOURCE CII']];
  for (const name of names) choices.push([name, name]);
  if (current && !names.includes(current)) {
    choices.push([current, source ? current + ' (not in SOURCE)' : current + ' (CSV / retained)']);
  }
  return choices;
}

function recommendationCell(rule, plan) {
  const td = document.createElement('td');
  td.className = 'recommendation-cell';
  td.dataset.recommendationCell = '';
  const errors = (plan?.diagnostics || []).filter(d => d.ruleId === rule.id &&
    d.severity === 'ERROR' && d.code === 'BRANCH_NODE_CROSSES_SCOPE');
  if (!errors.length) { td.textContent = '—'; return td; }
  // Show source-derived context only; never mutate a rule, a proposal or TARGET0.
  const byNode = new Map();
  let unknown = false;
  for (const d of errors) {
    if (!Number.isSafeInteger(d.node) || !Array.isArray(d.branches)) { unknown = true; continue; }
    const prior = byNode.get(d.node);
    if (prior && (prior.original !== d.original || prior.proposed !== d.proposed)) {
      unknown = true;
    } else if (!prior) byNode.set(d.node, d);
  }
  const entries = [...byNode.values()];
  const qualified = !unknown && entries.length > 0 &&
    entries.every(d => d.aliasNamesConsistent === true && d.replacementFits === true);
  const details = document.createElement('details');
  details.className = 'rule-advice';
  details.append(cell('summary', qualified ? 'A · Rename complete node' : 'Review shared-node conflict'));
  for (const d of entries) {
    details.append(cell('p', `Node ${d.node}: ${d.original} → ${d.proposed}. Physical branches: ${d.branches.join(' | ')}. Named occurrences: ${d.namedAliasCount}.`));
  }
  if (qualified) details.append(cell('p',
    'Recommended A, if the name is intended to change everywhere: replace or narrow this branch rule, then use precise node/element rules to rename every named occurrence across the listed branches. Generate and approve a new complete-node plan.'));
  else details.append(cell('p',
    'No automatic expansion recommended: node identities, existing alias values or field widths require review.'));
  details.append(cell('p',
    'Alternative B: keep the other branches unchanged by excluding these shared nodes from the branch rule. Do not simply change a broad rule to Document scope.'));
  details.append(cell('p',
    'Advice only — no rule, approval, TARGET0 or output has changed.'));
  td.append(details);
  return td;
}

function renderRules() {
  const tbody = $('[data-rules]'); tbody.replaceChildren();
  $('[data-resolve]').disabled = !target || active !== 'NORMAL' || !importedCsv;
  for (const [i, rule] of state().rules.entries()) {
    const tr = document.createElement('tr'); tr.dataset.rowIndex = String(i); tr.append(cell('th', String(i + 1)));
    for (const key of ['find', 'replace', 'mode', 'flags', 'field', 'scope', 'from', 'to', 'branch']) {
      const td = document.createElement('td');
      if (selects[key]) addSelect(td, key, selects[key], rule[key]);
      else if (key === 'branch') addSelect(td, key, branchChoices(rule.branch), rule.branch);
      else { const input = document.createElement('input'); input.dataset.field = key; input.value = rule[key];
        input.setAttribute('aria-label', `${key} row ${i + 1}`); input.spellcheck = false; td.append(input); }
      tr.append(td);
    }
    tr.append(recommendationCell(rule, state().plan));
    const td = document.createElement('td'), del = document.createElement('button');
    del.type = 'button'; del.dataset.delete = String(i); del.textContent = '×'; del.setAttribute('aria-label', `Remove row ${i + 1}`);
    td.append(del); tr.append(td); tbody.append(tr);
  }
}
function renderResults() {
  const s = state(), tbody = $('[data-proposals]'); tbody.replaceChildren();
  for (const claim of s.plan?.claims || []) {
    const tr = document.createElement('tr');
    const details = sourceEvidenceForClaim(target?.parsed, source?.parsed, claim);
    const fallback = source ? 'Unresolved' : '—';
    tr.append(cell('td', claim.ruleId), cell('td', claim.fieldIdentity),
      cell('td', `${claim.byteStart}–${claim.byteEnd}`), cell('td', claim.before.trim()), cell('td', claim.after.trim()),
      cell('td', details?.branch ?? fallback), cell('td', details?.from ?? fallback),
      cell('td', details?.to ?? fallback));
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
  $('[data-approve-all]').disabled = !canApproveAll(s);
  $('[data-approve-nonconflict]').disabled = active !== 'NORMAL' ||
    !safeNonConflictIds(target?.parsed, s.plan, config).length;
  $('[data-validate]').disabled = !s.plan || ![...s.decisions.values()].includes('APPROVED');
  $('[data-apply]').disabled = !s.validated;
  $('[data-export]').disabled = !s.applied;
  $('[data-audit]').disabled = !s.validated;
  $('[data-hash1]').textContent = s.validated?.target1Hash || '—';
}
function canApproveAll(s) {
  if (!target?.parsed || !s.plan || s.plan.incompleteSearch !== false ||
      s.plan.diagnostics.some(d => d.severity === 'ERROR') ||
      !s.plan.claims.length || s.plan.claims.some(c => c.status !== 'PROPOSED')) return false;
  const claims = s.plan.claims;
  if (new Set(claims.map(c => c.byteStart + ':' + c.byteEnd)).size !== claims.length ||
      claims.some((c, i) => claims.slice(i + 1).some(d => c.byteStart < d.byteEnd && d.byteStart < c.byteEnd))) return false;
  try { enforceNormalNodeClosure(target.parsed, claims); return true; } catch { return false; }
}
function approveAll() {
  const s = state();
  if (active !== 'NORMAL' || !canApproveAll(s)) {
    message('Approve All unavailable: resolve diagnostics or incomplete logical-node aliases first.');
    return;
  }
  for (const c of s.plan.claims) s.decisions.set(c.id, 'APPROVED');
  revision++; opSeq++;
  s.validated = null; s.applied = null;
  renderResults();
  message(`Approved all ${s.plan.claims.length} complete, conflict-free proposals for review. Validate TARGET1 separately.`);
}
function approveNonConflict() {
  const s=state(), ids=safeNonConflictIds(target?.parsed,s.plan,config);
  if(active!=='NORMAL'||!ids.length){message('No isolated, complete non-conflict proposal groups can be approved.');return;}
  for(const id of ids)s.decisions.set(id,'APPROVED');
  revision++; opSeq++; pendingCleanup=null; s.validated=null; s.applied=null;
  renderResults();
  message(`Approved ${ids.length} non-conflict proposal(s). Conflicting/incomplete proposals remain held; Validate TARGET1 separately.`);
}
function cleanupOptions() {
  const check=k=>Boolean($(`[data-cleanup="${k}"]`).checked);
  const value=k=>$(`[data-cleanup="${k}"]`).value;
  return { trim:check('trim'), collapseSpace:check('collapseSpace'), suffixOne:check('suffixOne'),
    refSuffix:check('refSuffix'), truncateTo:Number(value('truncateTo')),
    customPattern:value('customPattern'), customReplace:value('customReplace') };
}
function renderCleanupReport() {
  const section=$('[data-cleanup-report]');
  section.hidden=!cleanupReport;
  if(!cleanupReport)return;
  const {report,summary}=cleanupReport;
  $('[data-cleanup-count]').textContent=
    `${summary.accepted} accepted · ${summary.held} held · ${summary.dropped} duplicate rows dropped`;
  $('[data-cleanup-log]').textContent=
    `Original CSV rows: ${summary.total}\nAccepted rules: ${summary.accepted}\nCleaned: ${summary.cleaned}\nProposals: ${summary.proposedNameFields}\nNew name collisions: ${summary.newlyIntroducedNameDuplicates}\n\n`+
    report.map(r=>`Row ${r.row} [${r.status}] ${r.find} → ${r.replace} | ${r.reason}`+
      (r.actions.length?` | ${r.actions.join(', ')}`:'')+
      (r.cleanedFind?` | resolved ${r.cleanedFind} → ${r.cleanedReplace}`:'')).join('\n');
  $('[data-use-resolved]').disabled=!pendingCleanup||pendingCleanup.revision!==revision||!summary.accepted;
  $('[data-export-resolved]').disabled=!summary.accepted;
  $('[data-export-cleanup-report]').disabled=false;
}
async function previewCsvResolution() {
  if(active!=='NORMAL'||!target||!importedCsv){message('Load TARGET0 and import CSV first.');return;}
  const guard=revision, currentTarget=target, currentSource=source;
  try {
    const hash=await sha256(target.bytes);
    if(guard!==revision||target!==currentTarget||source!==currentSource)return;
    const options={...cleanupOptions(),targetBytes:target.bytes};
    const result=resolveImportedCsv(currentRules(),target.parsed,source?.parsed,options,hash);
    if(guard!==revision||target!==currentTarget||source!==currentSource)return;
    pendingCleanup={revision:guard,result}; cleanupReport=result;
    renderCleanupReport();
    $('[data-cleanup-report]').open=true;
    message(`CSV audit: ${result.summary.accepted} safe rules, ${result.summary.held} held, ${result.summary.dropped} duplicate rows dropped. No rules or CII bytes changed.`);
  }catch(err){pendingCleanup=null;message('CSV cleanup blocked: '+(err.message||String(err)));}
}
function useResolvedCsv() {
  if(!pendingCleanup||pendingCleanup.revision!==revision||!pendingCleanup.result.summary.accepted)
    {message('Cleanup preview is stale or contains no accepted rules.');return;}
  const preview=pendingCleanup.result;
  state().rules=preview.acceptedRules.map(r=>({...r}));
  invalidate(state()); cleanupReport=preview; renderRules(); renderResults(); renderCleanupReport();
  message(`Used ${preview.summary.accepted} accepted rules. ${preview.summary.held} held and ${preview.summary.dropped} duplicate rows omitted. Generate proposals again; CII unchanged.`);
}
function csvOut(rules) {
  const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
  const headers=['Find','Replace','Branch','Scope','From','To','Field','Mode','Flags'];
  return headers.join(',')+'\r\n'+rules.map(r=>[
    r.find,r.replace,r.scope==='BRANCH'?r.branch:'',
    r.scope||'DOCUMENT',r.from||'',r.to||'',
    r.field||'NODENAME.BOTH',r.mode||'LITERAL',r.flags||'g'
  ].map(q).join(',')).join('\r\n')+'\r\n';
}
function currentRules() { return state().rules.filter((r) => r.find || r.replace).map((r) => ({ ...r })); }
function safeError(err) {
  state().diagnostics = [{ severity: 'ERROR', code: err.message || String(err) }];
  state().validated = null; state().applied = null; renderResults(); message('Validation blocked; no new copy may be exported.');
}
function approved() { return [...state().decisions].filter(([, v]) => v === 'APPROVED').map(([k]) => k); }
function logicalNode(parsed, claim) {
  if (claim?.section !== 'NODENAME') return null;
  const field = parsed.fields.find(f => f.byteStart === claim.byteStart && f.byteEnd === claim.byteEnd &&
    (f.fieldIdentity === claim.fieldIdentity || f.fieldIdentity.replace('.', '_') === claim.fieldIdentity));
  if (!field || field.owners.length !== 1) return null;
  const e = parsed.elements.find(e => e.witness === field.owners[0]);
  return e ? String(field.fieldIdentity.endsWith('FROM') ? e.from : e.to) : null;
}
function decisionGroup(s, id) {
  const c = s.plan?.claims.find(x => x.id === id);
  if (config.approvalMode !== 'LOGICAL_NODE' || !target || !c || c.section !== 'NODENAME') return [id];
  const parsed = parseCii(target.bytes), node = logicalNode(parsed, c);
  if (node === null) return [id];
  const siblings = s.plan.claims.filter(x => x.status === 'PROPOSED' && logicalNode(parsed, x) === node);
  if (siblings.some(x => x.after.trim() !== c.after.trim())) throw new Error('LOGICAL_NODE_VALUES_CONFLICT');
  return siblings.map(x => x.id);
}
async function generate() {
  const s = state(); invalidate(s, 'Computing scoped NODENAME proposals.');
  if (!target) { message('TARGET0 required'); return; }
  const guard = revision, curTab = active, curCfg = config, op = ++opSeq;
  const targetBytes = target.bytes, sourceBytes = source?.bytes, rules = currentRules();
  try {
    const hash = await sha256(targetBytes);
    if (guard !== revision || curTab !== active || config !== curCfg || op !== opSeq) return;
    const plan = planNormal({ tab: 'NORMAL', targetBytes, originalTargetSha256: hash, sourceBytes, rules, options: {} });
    if (guard !== revision || curTab !== active || config !== curCfg || op !== opSeq) return;
    s.plan = plan; s.diagnostics = []; renderRules(); renderResults();
    message(`${s.plan.claims.length} proposal(s). Review each claim before Validate.`);
  } catch (err) { if (guard === revision && curTab === active && config === curCfg && op === opSeq) safeError(err); }
}
async function validate() {
  const s = state(), guard = revision, curTab = active, curCfg = config, op = ++opSeq;
  s.validated = null; s.applied = null; renderResults();
  if (!target || !s.plan) return;
  const targetBytes = target.bytes, curApp = approved(), curPlan = s.plan;
  try {
    const hash = await sha256(targetBytes);
    if (guard !== revision || curTab !== active || config !== curCfg || op !== opSeq) return;
    const result = await validatePostimage({ original: targetBytes, originalHash: hash, plan: curPlan, approvedIds: curApp, tab: curTab, policy: curCfg });
    if (guard !== revision || curTab !== active || config !== curCfg || op !== opSeq) return;
    s.validated = result; s.diagnostics = []; renderResults(); message('TARGET1 validated in memory. Apply to New Copy is now available.');
  } catch (err) { if (guard === revision && curTab === active && config === curCfg && op === opSeq) safeError(err); }
}
async function apply() {
  const s = state(), guard = revision, curTab = active, curCfg = config, op = ++opSeq;
  if (!target || !s.validated || !s.plan) return;
  const targetBytes = target.bytes, curApp = approved(), curPlan = s.plan, valSnap = s.validated;
  s.applied = null; renderResults();
  try {
    const hash = await sha256(targetBytes);
    if (guard !== revision || curTab !== active || config !== curCfg || op !== opSeq) return;
    const result = await validatePostimage({ original: targetBytes, originalHash: hash, plan: curPlan, approvedIds: curApp, tab: curTab, policy: curCfg });
    if (guard !== revision || curTab !== active || config !== curCfg || op !== opSeq) return;
    if (result.target1Hash !== valSnap.target1Hash) throw new Error('VALIDATED_OUTPUT_STALE');
    s.applied = result; renderResults(); message('TARGET1 released as an immutable new-copy preview. Export enabled.');
  } catch (err) { if (guard === revision && curTab === active && config === curCfg && op === opSeq) safeError(err); }
}
function download(name, bytes, type) {
  const blob = new Blob([bytes], { type }); const href = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = href; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(href), 5000);
}
async function exportCii() {
  const s = state(), guard = revision, curTab = active, curCfg = config, op = ++opSeq;
  if (!target || !s.applied || !s.plan) return;
  const targetBytes = target.bytes, targetName = target.name, curApp = approved(), curPlan = s.plan, appSnap = s.applied;
  try {
    const hash = await sha256(targetBytes);
    if (guard !== revision || curTab !== active || config !== curCfg || op !== opSeq) return;
    const result = await validatePostimage({ original: targetBytes, originalHash: hash, plan: curPlan, approvedIds: curApp, tab: curTab, policy: curCfg });
    if (guard !== revision || curTab !== active || config !== curCfg || op !== opSeq) return;
    if (result.target1Hash !== appSnap.target1Hash) throw new Error('EXPORT_STALE');
    download(`${targetName.replace(/\.cii$/i, '')}-TARGET1.CII`, result.bytes, 'application/octet-stream');
    message(`Exported verified new copy ${result.target1Hash}`);
  } catch (err) { if (guard === revision && curTab === active && config === curCfg && op === opSeq) safeError(err); }
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
  const replace = headers.findIndex((x) => ['replace', 'replacetext'].includes(x)); const branch = headers.findIndex((x) => x === 'branch');
  if (find < 0 || replace < 0) throw new Error('CSV_FIND_REPLACE_HEADERS_REQUIRED');
  const index = key => headers.indexOf(key);
  const optional = (v,key,fallback) => index(key)>=0 ? (v[index(key)]||fallback) : fallback;
  return rows.map((v) => {
    const b=branch >= 0 ? (v[branch] || '').trim() : '';
    const scope=optional(v,'scope',b?'BRANCH':'DOCUMENT').trim().toUpperCase();
    return { ...blank(), find: v[find] || '', replace: v[replace] || '',
      branch:b,scope,from:optional(v,'from',''),to:optional(v,'to',''),
      field:optional(v,'field','NODENAME.BOTH'),
      mode:optional(v,'mode','LITERAL').trim().toUpperCase(),
      flags:optional(v,'flags','g') };
  });
}
root.addEventListener('input', (event) => {
  if(event.target.dataset.cleanup !== undefined) {
    pendingCleanup=null; cleanupReport=null; renderCleanupReport();
    return;
  }
  const field = event.target.dataset.field, row = event.target.closest('[data-row-index]');
  if (!field || !row) return;
  state().rules[Number(row.dataset.rowIndex)][field] = event.target.value;
  invalidate(state());
});
root.addEventListener('change', (event) => {
  if(event.target.dataset.cleanup !== undefined) {
    pendingCleanup=null; cleanupReport=null; renderCleanupReport(); return;
  }
  const key = event.target.dataset.config;
  if (key) {
    try {
      config = resolvePolicy({ ...config, [key]: event.target.value });
      for (const s of Object.values(states)) invalidate(s);
      renderTabs(); message('Policy changed. Regenerate and approve claims before Validate.');
    } catch (err) { message(err.message); }
    return;
  }
  if (!event.target.dataset.decision) return;
  const s = state();
  try {
    for (const id of decisionGroup(s, event.target.dataset.decision)) {
      s.decisions.set(id, event.target.value);
    }
    revision++; opSeq++; s.validated = null; s.applied = null;
    renderResults(); message('Review decision changed. Revalidate before applying.');
  } catch (err) { safeError(err); }
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
  if (el.dataset.tab && tabs.includes(el.dataset.tab)) {
    if (el.dataset.tab === active) return;
    if (active === 'PROPERTY_TRANSFER' || el.dataset.tab === 'PROPERTY_TRANSFER') {
      // Independent read-only navigation preserves completed plans. Cancel
      // pending Normal operations; real input/rule changes still invalidate.
      opSeq++; active = el.dataset.tab;
    } else {
      invalidate(state()); active = el.dataset.tab; invalidate(state());
    }
    renderTabs(); renderRules(); renderResults(); renderCleanupReport();
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
  if (el.dataset.resolve !== undefined) await previewCsvResolution();
  if (el.dataset.useResolved !== undefined) useResolvedCsv();
  if (el.dataset.exportResolved !== undefined && cleanupReport)
    download('NodeName_resolved.csv', csvOut(cleanupReport.acceptedRules), 'text/csv');
  if (el.dataset.exportCleanupReport !== undefined && cleanupReport)
    download('NodeName_cleanup_report.json', JSON.stringify(cleanupReport,null,2), 'application/json');
  if (el.dataset.approveAll !== undefined) approveAll();
  if (el.dataset.approveNonconflict !== undefined) approveNonConflict();
  if (el.dataset.validate !== undefined) await validate();
  if (el.dataset.apply !== undefined) await apply();
  if (el.dataset.export !== undefined) await exportCii();
  if (el.dataset.audit !== undefined && state().validated) {
    download('cii-vnext-audit.json', JSON.stringify({ schema: 'CiiFnrVnext.Audit.v1',
      target0: state().validated.originalHash, target1: state().validated.target1Hash,
      claims: state().validated.audit, policy: state().validated.policy,
      decisions: [...state().decisions] }, null, 2), 'application/json');
  }
});
for (const field of ['target', 'source']) {
  $(`[data-file="${field}"]`).addEventListener('change', async (event) => {
    const file = event.target.files?.[0], req = ++fileSeqs[field];
    if (field === 'target') target = null; else source = null;
    nodal.invalidate();
    for (const s of Object.values(states)) invalidate(s, `${field.toUpperCase()} selection in progress.`);
    $(`[data-meta="${field}"]`).textContent = file ? `Loading ${file.name}...` : '';
    renderTabs(); renderRules(); renderResults();
    if (!file) return;
    try {
      const buf = await file.arrayBuffer(); if (req !== fileSeqs[field]) return;
      const snapshot = { name: file.name, bytes: new Uint8Array(buf) };
      snapshot.parsed = parseCii(snapshot.bytes);
      const hash = await sha256(snapshot.bytes); if (req !== fileSeqs[field]) return;
      if (field === 'target') target = snapshot; else source = snapshot;
      nodal.invalidate();
      for (const s of Object.values(states)) invalidate(s);
      $(`[data-meta="${field}"]`).textContent = `${file.name} | ${snapshot.bytes.length} bytes | SHA-256 ${hash}`;
      renderTabs(); renderRules(); renderResults();
    } catch (err) { if (req === fileSeqs[field]) safeError(err); }
  });
}
$('[data-file="csv"]').addEventListener('change', async (event) => {
  const file = event.target.files?.[0]; if (!file) return;
  const req = ++csvSeq, targetTab = active, s = state(), guard = revision, curCfg = config;
  try {
    const text = await file.text();
    if (req !== csvSeq || active !== targetTab || guard !== revision || config !== curCfg) return;
    s.rules = parseCsv(text); importedCsv = true; invalidate(s); renderRules();
    message(`Imported ${s.rules.length} CSV rows.`);
  } catch (err) { if (req === csvSeq && active === targetTab && guard === revision && config === curCfg) safeError(err); }
});
renderTabs(); renderRules(); renderResults();
