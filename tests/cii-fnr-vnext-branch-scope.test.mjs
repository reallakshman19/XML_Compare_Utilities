import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { createTestDom } from './helpers/vnext-dom-env.mjs';
import { parseCii } from '../tabs/cii-workspace/cii-fnr-vnext/ui/physical.js';
import { planNormal } from '../tabs/cii-workspace/cii-fnr-vnext/normal/plan.js';
import { sha256, validatePostimage } from '../tabs/cii-workspace/cii-fnr-vnext/ui/writer.js';

const B2 = '/GLRD-1000-2"-B4110001-93833-01/B2';
const B1 = '/GLRD-1000-2"-B4110001-93833-01/B1';
const row = (values) => values.map((x, i) => String(x).padStart(i ? 13 : 15)).join('');
const element = (from, to, pointer, branch) => Array.from({ length: 15 }, (_, index) => {
  if (index === 0) return row([from, to, 120, 0, 0, 0]);
  if (index === 10) return String(branch.length).padStart(12) + ' ' + branch;
  if (index === 13) return row([0, 0, 0, 0, 0, pointer]);
  return row([0, 0, 0, 0, 0, 0]);
});
const name = (from, to) => '  ' + from.padEnd(26) + to.padEnd(25);

function syntheticTarget({ version = 14, crlf = true, crossBranch = false, renamed = false } = {}) {
  const n = renamed ? 'PS-4108' : 'PS00608.1';
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
    name('', n), name(n, ''), name('PS00608.1', '')
  ].join(crlf ? '\r\n' : '\n') + (crlf ? '\r\n' : '\n'), 'ascii'));
}

const branchRule = () => ({
  id: 'branch-rule', find: 'PS00608.1', replace: 'PS-4108', mode: 'LITERAL', flags: 'g',
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
  for (const branch of [B2.slice(0, -1), B2 + '-WRONG', B1]) {
    const { plan } = await planFor(target, [{ ...branchRule(), branch }]);
    assert.equal(plan.claims.length, 0);
    assert(plan.diagnostics.some((d) => d.code === 'ZERO_MATCHES'));
  }
});

test('branch crossing with an unlabeled physical alias is fail-closed', async () => {
  const target = syntheticTarget({ crossBranch: true });
  const { plan } = await planFor(target);
  assert.equal(plan.claims.length, 0);
  assert(plan.diagnostics.some((d) => d.code === 'BRANCH_NODE_CROSSES_SCOPE' && d.severity === 'ERROR'));
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
  for (const branch of ['', 'GLRD-1000-2', B2 + '\nEXTRA']) {
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
    text: async () => 'Find,Replace,Branch\r\nPS00608.1,PS-4108,' + quoted + '\r\n'
  }];
  await dom.csvFile.dispatchEvent({ type: 'change', target: dom.csvFile });
  assert.equal(dom.root.querySelector('[data-field="scope"]').value, 'BRANCH');
  assert.equal(dom.root.querySelector('[data-field="branch"]').value, B2);
  assert.match(dom.status.textContent, /Imported 1 CSV rows/);
});
