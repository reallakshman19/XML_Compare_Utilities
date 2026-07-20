import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const files = [
  'tabs/revision-compare/revision-compare-engineering-svg-scene.js',
  'tabs/revision-compare/revision-compare-engineering-svg-viewer.js',
  'tabs/revision-compare/revision-compare-svg-surfaces.js',
  'tabs/revision-compare/revision-compare-svg-viewport.js',
  'tabs/revision-compare/revision-compare-svg-styles.js',
  'tabs/revision-compare/revision-compare-viewer-backend.js',
  'tabs/revision-compare/revision-compare-viewer-contract.js',
  'tabs/revision-compare/revision-compare-viewer-policy.js',
  'tabs/revision-compare/revision-compare-property-evidence.js',
  'tabs/revision-compare/revision-compare-property-inspector.js',
];
const forbidden = [
  'command-gateway', 'edit-runtime', 'overlay-runtime', 'edit-coordinator', 'draft-store',
  'property-mutation', 'interaction-session', 'snap-acquisition', 'precision-geometry-mutation',
  'engineering-svg-workspace-shell', 'workbench3d/', 'localStorage', 'sessionStorage',
  'window.addEventListener', 'document.addEventListener', 'revision-compare-worker',
  'revision-compare-service', 'revision-load-service', 'MutationObserver', 'setInterval(', 'setTimeout(',
];
for (const path of files) {
  const source = await readFile(path, 'utf8');
  assert(source.split('\n').length < 300, `${path} must remain below 300 lines`);
  assert.equal(/export\s+default/.test(source), false, `${path} must use named exports`);
  for (const token of forbidden) assert.equal(source.includes(token), false, `${path} reaches forbidden ${token}`);
}

const policyPaths = [
  'tabs/revision-compare/revision-compare-viewer-policy.js',
  'tabs/revision-compare/revision-compare-lifecycle.js',
  'tabs/revision-compare/revision-compare-viewer-adapter.js',
  'tabs/revision-compare/revision-compare-review-view.js',
  'tabs/revision-compare/revision-compare-workspace.js',
];
for (const path of policyPaths) {
  const source = await readFile(path, 'utf8');
  for (const token of ['localStorage', 'sessionStorage', 'indexedDB', 'document.cookie', 'URLSearchParams']) {
    assert.equal(source.includes(token), false, `${path} must not persist viewer preference through ${token}`);
  }
}

const policy = await readFile('tabs/revision-compare/revision-compare-viewer-policy.js', 'utf8');
assert.match(policy, /RevisionCompareViewerPolicy\.v1/);
assert.match(policy, /defaultBackend.*SVG/s);
assert.match(policy, /defaultSvgPresentation.*overlay/s);
assert.match(policy, /EXPLICIT_USER_ACTION/);
assert.match(policy, /WORKSPACE_ONLY/);
assert.match(policy, /recoveryBackendForSvgFailure.*WEBGL/s);
assert.match(policy, /recoveryBackendForWebglFailure.*SVG/s);

const backendSource = await readFile('tabs/revision-compare/revision-compare-viewer-backend.js', 'utf8');
const reviewSource = await readFile('tabs/revision-compare/revision-compare-review-view.js', 'utf8');
const workspaceSource = await readFile('tabs/revision-compare/revision-compare-workspace.js', 'utf8');
const activeUi = [backendSource, reviewSource, workspaceSource].join('\n');
assert.doesNotMatch(activeUi, /SVG preview/, 'active Revision Compare terminology must use Engineering SVG');
assert.match(backendSource, /Engineering SVG/);
assert.match(backendSource, /3D \(WebGL\)/);
assert.match(reviewSource, /Return to \$\{revisionCompareViewerBackendLabel\(backend\)\}/);
assert.match(workspaceSource, /Return to \$\{revisionCompareViewerBackendLabel\(backend\)\}/);
assert.match(reviewSource, /recoveryBackendForSvgFailure/);
assert.match(reviewSource, /recoveryBackendForWebglFailure/);

const viewport = await readFile('tabs/revision-compare/revision-compare-svg-viewport.js', 'utf8');
assert.match(viewport, /REVISION_COMPARE_SVG_FINE_PAN = 0\.05/);
assert.match(viewport, /REVISION_COMPARE_SVG_COARSE_PAN = 0\.20/);
assert.match(viewport, /REVISION_COMPARE_SVG_KEYBOARD_ZOOM_FACTOR = 1\.20/);
assert.match(viewport, /Object\.freeze\(\{ x: 0\.5, y: 0\.5 \}\)/);
assert.match(viewport, /normalizeRevisionCompareSvgViewportKey/);
assert.match(viewport, /addEventListener\('keydown'/);
assert.match(viewport, /removeEventListener\('keydown'/);
assert.match(viewport, /listeners\.size \* 7/);
assert.doesNotMatch(viewport, /case ['"]Enter|case ['"] |Home|End|PageUp|PageDown|Escape/);

const surfaces = await readFile('tabs/revision-compare/revision-compare-svg-surfaces.js', 'utf8');
assert.match(surfaces, /setAttribute\('role', 'group'\)/);
assert.match(surfaces, /setAttribute\('tabindex', '0'\)/);
assert.match(surfaces, /data-revc-svg-keyboard-surface/);
assert.match(surfaces, /aria-describedby/);
assert.match(surfaces, /aria-keyshortcuts/);
assert.match(surfaces, /Revision comparison Engineering SVG overlay/);
assert.match(surfaces, /Revision comparison Rev A source Engineering SVG pane/);
assert.match(surfaces, /Revision comparison Rev B target Engineering SVG pane/);
assert.match(surfaces, /data-revc-svg-keyboard-instructions/);
assert.doesNotMatch(surfaces, /SVG preview/);

const styles = await readFile('tabs/revision-compare/revision-compare-svg-styles.js', 'utf8');
assert.match(styles, /data-revc-svg-keyboard-surface.*:focus-visible/s);
assert.match(styles, /outline:\s*3px/);

const evidence = await readFile('tabs/revision-compare/revision-compare-property-evidence.js', 'utf8');
assert.match(evidence, /RevisionDifferenceRow\.v1\.changedProperties/);
assert.match(evidence, /previousValue:\s*property\.revAValue/);
assert.match(evidence, /value:\s*property\.revBValue/);
assert.match(evidence, /editable:\s*false/);
assert.doesNotMatch(evidence, /unit:\s*['"`]/, 'Revision Compare must not infer property units');
assert.doesNotMatch(evidence, /source:\s*.*revAEvidencePath|source:\s*.*revBEvidencePath/, 'dual evidence paths must not collapse');

const inspector = await readFile('tabs/revision-compare/revision-compare-property-inspector.js', 'utf8');
assert.doesNotMatch(inspector, /setBackend|setPresentationMode|setSelection|fitAll|fitSelection|previewPair/);
assert.doesNotMatch(inspector, /EngineeringSvgWorkspaceShell|commandGateway|createEngineeringSvgDraftStore/);

console.log('revision-compare-svg-dependency-guard.test.mjs passed');
