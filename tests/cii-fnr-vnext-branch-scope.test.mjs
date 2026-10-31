import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { createTestDom } from './helpers/vnext-dom-env.mjs';
import { parseCii } from '../tabs/cii-workspace/cii-fnr-vnext/ui/physical.js';
import { sourceBranchLabels, sourceEvidenceForClaim } from '../tabs/cii-workspace/cii-fnr-vnext/ui/source-provenance.js';
import { planNormal } from '../tabs/cii-workspace/cii-fnr-vnext/normal/plan.js';
import { sha256, validatePostimage } from '../tabs/cii-workspace/cii-fnr-vnext/ui/writer.js';

const B2 = '/SYNTHETIC"-BRANCH-001/B2';
const B1 = '/SYNTHETIC"-BRANCH-001/B1';
const row = (values) => values.map((x, i) => String(x).padStart(i ? 13 : 15)).join('');
const element = (from, to, pointer, branch) => Array.from({ length: 15 }, (_, index) => {
  if (index === 0) return row([from, to, 120, 0, 0, 0]);
  if (index === 10) return String(branch.length).padStart(12) + ' ' + branch;
  if (index === 13) return row([0, 0, 0, 0, 0, pointer]);
  return row([0, 0, 0, 0, 0, 0]);
});
const name = (from, to) => '  ' + from.padEnd(26) + to.padEnd(25);

function syntheticTarget({ version = 14, crlf = true, crossBranch = false, renamed = false } = {}) {
  const n = renamed ? 'NEW-4' : 'ALIAS-OLD';
  return new Uint8Array(Buffer.from([
    '#$ VERSION', row([5, version, 1252]),
    '#$ CONTROL', row([2, 0, 0, 3, 0, 0]),
    '#$ ELEMENTS',
    ...element(3130, 3140, 1, B2),
    ...element(3140, 3150, 2, B2),
    ...element(3150, 3160, 0, B2),
    ...element(9000, 9001, 3, B1),
    ...element(crossBranch ? 3140 : 3130, 3180, 0, B1),
    '#$ NODENAME',
    name('', n), name(n, ''), name('ALIAS-OLD', '')
  ].join(crlf ? '\r\n' : '\n') + (crlf ? '\r\n' : '\n'), 'ascii'));
}

const branchRule = () => ({
  id: 'branch-rule', find: 'ALIAS-OLD', replace: 'NEW-4', mode: 'LITERAL', flags: 'g',
  field: 'NODENAME.BOTH', scope: 'BRANCH', branch: B2
});

async function planFor(target, rules = [branchRule()]) {
  const hash = await sha256(target);
  return { hash, plan: planNormal({
    tab: 'NORMAL', targetBytes: target, originalTargetSha256: hash, rules, options: {}
  }) };
}

for (const version of [11, 14]) for (const crlf of [false, true]) {
  test('exact B2 branch protects all unrelated bytes: v' + version + (crlf ? ' CRLF' : ' LF'), async () => {
    const original = syntheticTarget({ version, crlf });
    const { hash, plan } = await planFor(original);
    const parsed = parseCii(original);
    assert.equal(parsed.version, version);
    assert.equal(parsed.elements.filter((e) => e.branch === B2).length, 3);
    assert.equal(plan.claims.length, 2);
    assert.deepEqual(plan.diagnostics, []);
    assert.deepEqual(plan.claims.map((c) => c.fieldIdentity),
      ['NODENAME.TO', 'NODENAME.FROM']);
    assert(plan.claims.every((c) => c.evidence.branch === B2 && c.evidence.scope === 'BRANCH'));
    const result = await validatePostimage({
      original, originalHash: hash, plan, approvedIds: plan.claims.map((c) => c.id),
      tab: 'NORMAL'
    });
    assert.deepEqual(result.bytes, syntheticTarget({ version, crlf, renamed: true }));
    assert.equal(result.bytes.length, original.length);
    assert.notDeepEqual(result.bytes, original);
    assert.equal(parseCii(result.bytes).elements.length, parsed.elements.length);
    assert.equal(result.audit.length, 2);
  });
}

test('exact B2 selection does not include identical name in unrelated B1', async () => {
  const { plan } = await planFor(syntheticTarget());
  assert.equal(plan.claims.length, 2);
  assert(plan.claims.every((c) => c.targetElementWitness.startsWith('0:') ||
    c.targetElementWitness.startsWith('1:')));
  assert(!plan.claims.some((c) => c.targetElementWitness.startsWith('3:')));
});

test('branch identifier mismatch gives zero replacements, no prefix matching', async () => {
  const target = syntheticTarget();
  for (const branch of [B2.slice(0, -1), B2 + '-WRONG']) {
    const { plan } = await planFor(target, [{ ...branchRule(), branch }]);
    assert.equal(plan.claims.length, 0);
    assert(plan.diagnostics.some((d) => d.code === 'ZERO_MATCHES'));
  }
});

test('exact B1 selection changes only its owned FROM name', async () => {
  const original = syntheticTarget();
  const { hash, plan } = await planFor(original, [{ ...branchRule(), branch: B1 }]);
  assert.equal(plan.claims.length, 1);
  assert.equal(plan.claims[0].targetElementWitness, '3:9000:9001');
  assert.equal(plan.claims[0].fieldIdentity, 'NODENAME.FROM');
  assert.equal(plan.claims[0].evidence.branch, B1);
  assert.deepEqual(plan.diagnostics, []);
  const expected = Buffer.from(original);
  const lastCard = Buffer.from('\r\n' + name('ALIAS-OLD', '') + '\r\n', 'ascii');
  const cardStart = expected.lastIndexOf(lastCard);
  assert(cardStart >= 0, 'literal B1 name card must be present');
  expected.write('NEW-4'.padEnd(26), cardStart + 4, 26, 'ascii');
  const result = await validatePostimage({
    original, originalHash: hash, plan, approvedIds: [plan.claims[0].id], tab: 'NORMAL'
  });
  assert.deepEqual(result.bytes, new Uint8Array(expected));
});

test('branch crossing with an unlabeled physical alias is fail-closed', async () => {
  const target = syntheticTarget({ crossBranch: true });
  const { plan } = await planFor(target);
  assert.equal(plan.claims.length, 0);
  assert(plan.diagnostics.some((d) => d.code === 'BRANCH_NODE_CROSSES_SCOPE' && d.severity === 'ERROR'));
});


test('cross-branch warning identifies physical node, all branches and proposed name', async () => {
  const { plan } = await planFor(syntheticTarget({ crossBranch: true }));
  const crossed = plan.diagnostics.filter(d => d.code === 'BRANCH_NODE_CROSSES_SCOPE');
  assert(crossed.length >= 1);
  assert(crossed.every(d => d.node === 3140));
  assert(crossed.every(d => d.original === 'ALIAS-OLD' && d.proposed === 'NEW-4'));
  assert(crossed.every(d => d.branches.includes(B2) && d.branches.includes(B1)));
  assert(crossed.every(d => d.aliasNamesConsistent && d.replacementFits));
  assert(crossed.every(d => d.namedAliasCount === 2 && d.incidentElements.length === 3));
  assert.equal(plan.claims.length, 0, 'advice must not authorize a partial rename');
});

test('inconsistent cross-branch aliases do not qualify for an Option A recommendation', async () => {
  const original = Buffer.from(syntheticTarget({ crossBranch: true })).toString('ascii');
  const modified = new Uint8Array(Buffer.from(original.replace('ALIAS-OLD', 'OTHER-OLD'), 'ascii'));
  const { plan } = await planFor(modified);
  const crossed = plan.diagnostics.filter(d => d.code === 'BRANCH_NODE_CROSSES_SCOPE');
  assert(crossed.length >= 1);
  assert(crossed.some(d => d.aliasNamesConsistent === false));
  assert.equal(plan.claims.length, 0);
});

test('recommended choice is located directly before Remove and is advisory only', async () => {
  const dom = createTestDom();
  await import('../tabs/cii-workspace/cii-fnr-vnext/ui/app.js?recommendation=' + Date.now());
  const bytes = syntheticTarget({ crossBranch: true });
  dom.targetFile.files = [{ name: 'synthetic.cii', arrayBuffer: async () =>
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) }];
  await dom.targetFile.dispatchEvent({ type: 'change', target: dom.targetFile });
  const quoted = '"' + B2.replace(/"/g, '""') + '"';
  dom.csvFile.files = [{ name: 'synthetic.csv', text: async () =>
    'Find,Replace,Branch\r\nALIAS-OLD,NEW-4,' + quoted + '\r\n' }];
  await dom.csvFile.dispatchEvent({ type: 'change', target: dom.csvFile });
  await dom.btnRun.click();
  const cells = dom.root.querySelector('[data-rules]').children[0].children;
  const recommendation = cells.at(-2);
  assert.equal(recommendation.dataset.recommendationCell, '');
  assert.equal(cells.at(-1).querySelector('button').dataset.delete, '0');
  assert.match(recommendation.querySelector('summary').textContent, /A · Rename complete node/);
  assert(recommendation.querySelectorAll('p').some(p => p.textContent.includes('Node 3140: ALIAS-OLD → NEW-4')));
  assert.equal(dom.tbodyProposals.children.length, 0, 'recommendation never creates extra claims');
  const find = dom.root.querySelector('[data-rules]').children[0].querySelector('[data-field="find"]');
  find.value = 'other';
  await find.dispatchEvent({ type: 'input', target: find });
  assert.equal(recommendation.children[0].textContent, '—', 'rule edits revoke stale advice');
});


test('SOURCE labels and claim provenance require exact physical alignment', async () => {
  const original = syntheticTarget();
  const { plan } = await planFor(original);
  const tgt = parseCii(original);
  const src = parseCii(syntheticTarget({ renamed: true }));
  assert.deepEqual(sourceBranchLabels(src), [B1, B2]);
  const first = sourceEvidenceForClaim(tgt, src, plan.claims[0]);
  const second = sourceEvidenceForClaim(tgt, src, plan.claims[1]);
  assert.deepEqual(first, { branch: B2, from: '3130', to: '3140' });
  assert.deepEqual(second, { branch: B2, from: '3140', to: '3150' });
  assert.equal(sourceEvidenceForClaim(tgt, null, plan.claims[0]), null);
  const content = Buffer.from(syntheticTarget(), 'utf8').toString('ascii');
  const altered = content.replace(row([3130,3140,120,0,0,0]), row([3131,3140,120,0,0,0]));
  const misaligned = parseCii(new Uint8Array(Buffer.from(altered, 'ascii')));
  assert.equal(sourceEvidenceForClaim(tgt, misaligned, plan.claims[0]), null,
    'source From/To must not be guessed after element endpoint drift');
});

test('SOURCE-driven branch dropdown and Approve All preserve explicit validation', async () => {
  const dom = createTestDom();
  await import('../tabs/cii-workspace/cii-fnr-vnext/ui/app.js?source-review=' + Date.now());
  const target = syntheticTarget();
  const upload = (name, bytes) => ({
    name, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  });
  dom.targetFile.files = [upload('target.cii', target)];
  await dom.targetFile.dispatchEvent({ type: 'change', target: dom.targetFile });
  dom.sourceFile.files = [upload('source.cii', syntheticTarget({ renamed: true }))];
  await dom.sourceFile.dispatchEvent({ type: 'change', target: dom.sourceFile });
  const branch = dom.root.querySelector('[data-rules]').children[0].querySelector('[data-field="branch"]');
  assert(branch.children.some(option => option.value === B2));
  assert(branch.children.some(option => option.value === B1));
  const quoted = '"' + B2.replace(/"/g, '""') + '"';
  dom.csvFile.files = [{ name: 'selected.csv', text: async () =>
    'Find,Replace,Branch\r\nALIAS-OLD,NEW-4,' + quoted + '\r\n' }];
  await dom.csvFile.dispatchEvent({ type: 'change', target: dom.csvFile });
  await dom.btnRun.click();
  assert.equal(dom.tbodyProposals.children.length, 2);
  const first = dom.tbodyProposals.children[0];
  assert.equal(first.children[5].textContent, B2, 'SOURCE branch projected into review');
  assert.equal(first.children[6].textContent, '3130');
  assert.equal(first.children[7].textContent, '3140');
  assert.equal(dom.btnApproveAll.disabled, false);
  await dom.btnApproveAll.click();
  assert(dom.tbodyProposals.children.every(tr => tr.querySelector('[data-decision]').value === 'APPROVED'));
  assert.equal(dom.btnValidate.disabled, false);
  assert.equal(dom.btnExport.disabled, true, 'approval is not an export');
  assert.equal(dom.btnApply.disabled, true, 'approval is not validation');
});

test('Approve All cannot bypass cross-branch diagnostic', async () => {
  const dom = createTestDom();
  await import('../tabs/cii-workspace/cii-fnr-vnext/ui/app.js?source-conflict=' + Date.now());
  const bytes = syntheticTarget({ crossBranch: true });
  dom.targetFile.files = [{ name: 'target.cii', arrayBuffer: async () =>
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) }];
  await dom.targetFile.dispatchEvent({ type: 'change', target: dom.targetFile });
  const quoted = '"' + B2.replace(/"/g, '""') + '"';
  dom.csvFile.files = [{ name: 'scope.csv', text: async () =>
    'Find,Replace,Branch\r\nALIAS-OLD,NEW-4,' + quoted + '\r\n' }];
  await dom.csvFile.dispatchEvent({ type: 'change', target: dom.csvFile });
  await dom.btnRun.click();
  assert.equal(dom.btnApproveAll.disabled, true);
  await dom.btnApproveAll.click();
  assert.equal(dom.btnValidate.disabled, true);
  assert.equal(dom.btnExport.disabled, true);
});

test('visible VNext headings, recommendation and review columns have requested order', async () => {
  const html = await readFile(new URL('../docs/cii-fnr-vnext.html', import.meta.url), 'utf8');
  assert.match(html, /NodeName Find &amp; Replace/);
  assert.match(html, /SOURCE CII \(optional for NodeName Find &amp; Replace\)/);
  assert.match(html, /Source BranchName<\/th><th>Source From<\/th><th>Source To<\/th>/);
  assert(html.indexOf('<th>Recommended choice</th>') < html.indexOf('<th>Remove</th>'));
  assert.match(html, /data-approve-all disabled/);
});

test('writer independently rejects forged branch evidence on an otherwise valid claim', async () => {
  const original = syntheticTarget(), { hash, plan } = await planFor(original);
  const forged = JSON.parse(JSON.stringify(plan));
  forged.claims[0].evidence.branch = B1;
  await assert.rejects(
    validatePostimage({ original, originalHash: hash, plan: forged,
      approvedIds: forged.claims.map((c) => c.id), tab: 'NORMAL' }),
    /BRANCH_CLAIM_SCOPE_INVALID/
  );
});

test('invalid branch filter cannot silently fall back to Document', async () => {
  const target = syntheticTarget();
  for (const branch of ['', 'SYNTHETIC', B2 + '\nEXTRA']) {
    const { plan } = await planFor(target, [{ ...branchRule(), branch }]);
    assert.equal(plan.claims.length, 0);
    assert(plan.diagnostics.some((d) => d.code === 'BRANCH_FILTER_REQUIRED'));
  }
});

test('non-branch document mode remains selectable', async () => {
  const target = syntheticTarget(), { plan } = await planFor(target,
    [{ ...branchRule(), scope: 'DOCUMENT', branch: '' }]);
  assert.equal(plan.claims.length, 3, 'Document still selects the off-branch identical name');
});

test('served and source modules are byte-identical after branch integration', async () => {
  for (const path of ['ui/physical.js', 'ui/app.js', 'ui/writer.js',
    'normal/plan.js', 'normal/branch-scope.js']) {
    const source = await readFile(new URL('../tabs/cii-workspace/cii-fnr-vnext/' + path, import.meta.url));
    const served = await readFile(new URL('../docs/tabs/cii-workspace/cii-fnr-vnext/' + path, import.meta.url));
    assert.deepEqual(source, served, path);
  }
});

test('quoted CSV Branch column imports exact branch into Normal rule scope', async () => {
  const dom = createTestDom();
  await import('../tabs/cii-workspace/cii-fnr-vnext/ui/app.js?branch-csv=' + Date.now());
  const quoted = '"' + B2.replace(/"/g, '""') + '"';
  dom.csvFile.files = [{
    name: 'demo-branch.csv',
    text: async () => 'Find,Replace,Branch\r\nALIAS-OLD,NEW-4,' + quoted + '\r\n'
  }];
  await dom.csvFile.dispatchEvent({ type: 'change', target: dom.csvFile });
  assert.equal(dom.root.querySelector('[data-field="scope"]').value, 'BRANCH');
  assert.equal(dom.root.querySelector('[data-field="branch"]').value, B2);
  assert.match(dom.status.textContent, /Imported 1 CSV rows/);
});
