/** Issue #126 / PR127: A-only scope checks; PR118 WP7/WP9 oracles remain frozen. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repo = fileURLToPath(new URL('../', import.meta.url));
const root = 'tabs/cii-workspace/';
const modules = Object.freeze([
  'cii-workspace-method-c-a-sidecar.js',
  'cii-workspace-method-c-a-review-markup.js',
  'cii-workspace-method-c-writer2-bridge.js',
  'cii-workspace-method-c-writer2-native-shell.js',
]);
const content = name => readFileSync(path.join(repo, name), 'utf8');
const git = (...args) => execFileSync('git', args, {
  cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
}).trim();

const I126_BASE = '9a5916f972af170f272c525907728237391b7ca8';
const allowed = name => {
  if (/^(?:docs\/)?tabs\/cii-workspace\/cii-workspace-method-c-(?:a-sidecar|a-review-markup|writer2-bridge|writer2-native-shell)\.js$/.test(name)) return true;
  if (/^(?:docs\/)?tabs\/cii-workspace\/cii-workspace-tab\.js$/.test(name)) return true;
  if (/^tests\/cii-workspace-(?:method-c-(?:a-sidecar|a-review-markup|native-custody|native-lifecycle|i126-firebreak|i126-original-auto)|writer2-method-c-(?:native-app-browser|original-journey))\.test\.mjs$/.test(name)) return true;
  if (name === '.github/workflows/cii-method-c-i126-writer2.yml') return true;
  if (name === '.github/workflows/cii-method-c-i126-preedit-backup.yml') return true;
  if (name === '.github/workflows/cii-method-c-wp2.yml') return true;
  return ['agents/WIP-I126-A_workreport.md', 'agents/PR127_workreport.md',
    'plans/I126-ENTRYPOINT-AONLY-PENDING-BACKUP.patch'].includes(name);
};

test('I126 A-only bridge has identical served and source modules', () => {
  for (const file of modules) {
    assert.equal(content('docs/' + root + file), content(root + file),
      'source/deployed original-file custody divergence: ' + file);
  }
});

test('I126 sidecar has no route to independent physical qualification or Writer2 Apply', () => {
  for (const file of modules) {
    const source = content(root + file);
    assert.doesNotMatch(source, /\b(?:applyCiiWorkspaceTargetWriter2WithVersionBridge|ciiCanonicalWriter2MutationSelection|bindCiiTransferScopeToPreview)\b/,
      file + ': forbidden write/selection authority');
    assert.doesNotMatch(source, /\bdata-ciiw-(?:ms-apply|ms-bind-expected|apply-target)\b/,
      file + ': cannot invoke or forge host Apply controls');
    assert.doesNotMatch(source, /\b(?:identityBound|physicalIdentityQualified)\s*:\s*true\b/,
      file + ': cannot mint a BOUND physical identity');
  }
  assert.match(content(root + modules[0]), /qualifiedPhysicalIdentityCount:\s*0/);
  assert.match(content(root + modules[0]), /applyAuthorized:\s*false/);
  assert.match(content(root + modules[0]), /mutationOperations:\s*\[\]/);
});

test('I126 exact PR diff excludes PR107 ownership, benchmarks and previous gate oracles', t => {
  if (!existsSync(path.join(repo, '.git'))) return t.skip('No actual Git checkout: changed-file review NOT_RUN');
  assert.equal(git('rev-parse', '--verify', 'HEAD').length, 40);
  const names = git('diff', '--name-only', I126_BASE, 'HEAD').split(/\r?\n/).filter(Boolean);
  assert.ok(names.length, 'Expected inspectable I126 candidate diff');
  const forbidden = names.filter(name => !allowed(name));
  assert.deepEqual(forbidden, [], 'I126_SCOPE_GRANT_REQUIRED_FOR_NEW_OR_PROTECTED_FILE');
});


test('I126 Writer2 source/deployed entrypoints contain the exact read-only mount and no unrelated edits', t => {
  const rel = 'tabs/cii-workspace/cii-workspace-tab.js';
  const original = existsSync(path.join(repo,'.git')) ? git('show', I126_BASE + ':' + rel) : null;
  if (original === null) return t.skip('Full git baseline unavailable: exact hunk check NOT_RUN');
  const beforeImport = "import { mountCiiWriter2MultiSourceNextStepShell } from './cii-workspace-multisource-next-step-shell.js?v=20260909-ms-custody-auto-1';\n";
  const beforeMount = '      ? (root, shellOptions) => mountCiiWriter2MultiSourceNextStepShell(root, shellOptions, mountCiiWriter2MultiSourceReviewRouter)\n';
  assert.equal(original.split(beforeImport).length, 2);
  assert.equal(original.split(beforeMount).length, 2);
  const expected = original.replace(beforeImport, beforeImport +
    "import { mountMethodCWriter2NativeShell } from './cii-workspace-method-c-writer2-native-shell.js';\n")
    .replace(beforeMount, '      ? (root, shellOptions) => mountMethodCWriter2NativeShell(root, shellOptions,\n' +
      '        (writer2Root, writer2Options) => mountCiiWriter2MultiSourceNextStepShell(\n' +
      '          writer2Root, writer2Options, mountCiiWriter2MultiSourceReviewRouter))\n');
  assert.equal(content(rel), expected);
  assert.equal(content('docs/' + rel), expected);
});


test('I126 predecessor WP7/WP9 jobs remain intact but may run only on original PR118 branch', () => {
  const workflow = content('.github/workflows/cii-method-c-wp2.yml');
  const jobIds = ['physical-geometry','interactive-svg-chromium',
    'protected-mainline-methodab-writer2','protected-pr107-reference-policy',
    'approved-main-inherited-failure-control','independent-original-wp8-benchmark',
    'wp9-exact-sha-g2-review-preflight','wp6-real-native-docs-application-chromium'];
  const guard = "    if: ${{ (github.event_name == 'pull_request' && github.event.pull_request.number == 118 && github.event.pull_request.head.ref == 'methodc/108-geometry-20261016') || (github.event_name == 'push' && github.ref == 'refs/heads/methodc/108-geometry-20261016') }}";
  assert.equal(workflow.split(guard).length - 1, jobIds.length);
  for(const job of jobIds) assert.ok(workflow.includes('  ' + job + ':\n' + guard + '\n    name:'),
    'unbounded predecessor job: ' + job);
});
