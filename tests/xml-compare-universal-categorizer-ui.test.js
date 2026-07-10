import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { _test } from '../xml-compare/XmlCompareTabView.js';
import { createLinewiseUniversalPreset } from '../xml-compare/universal-categorizer/universal-xml-categorizer-contracts.js';
import { UNIVERSAL_XML_CATEGORIZER_BUTTON_ATTR, UNIVERSAL_XML_CATEGORIZER_POPUP_ATTR, renderUniversalXmlCategorizerButtonHtml, renderUniversalXmlCategorizerShellHtml } from '../xml-compare/universal-categorizer/universal-xml-categorizer-shell.js';
import { universalXmlCategorizerActionFromTarget } from '../tabs/xml-compare-universal-categorizer-runtime.js';

const button = renderUniversalXmlCategorizerButtonHtml();
assert.ok(button.includes('Universal XML Categorizer'));
assert.ok(button.includes(UNIVERSAL_XML_CATEGORIZER_BUTTON_ATTR));
assert.ok(!button.includes('Table to Categorized XML'));
assert.ok(!button.includes('Line-wise XML Enrichment'));

const shell = renderUniversalXmlCategorizerShellHtml(createLinewiseUniversalPreset());
assert.ok(shell.includes(UNIVERSAL_XML_CATEGORIZER_POPUP_ATTR));
assert.ok(shell.includes('Universal Categorizer Workspace'));
assert.ok(shell.includes('Build a governed XML / table hierarchy'));
assert.ok(shell.includes('Sample preview'));
assert.ok(shell.includes('Export locked'));
assert.ok(shell.includes('Source'));
assert.ok(shell.includes('Recipe Builder'));
assert.ok(shell.includes('Preview'));
assert.ok(shell.includes('Export'));
assert.ok(shell.includes('Source column review'));
assert.ok(shell.includes('Detected columns'));
assert.ok(shell.includes('Required key'));
assert.ok(shell.includes('Column role review'));
assert.ok(shell.includes('Role overrides'));
assert.ok(shell.includes('Pending role'));
assert.ok(shell.includes('Accept inferred role'));
assert.ok(shell.includes('Approve column roles'));
assert.ok(shell.includes('uxc-column-role-panel'));
assert.ok(shell.includes('uxc-role-actions'));
assert.ok(shell.includes('Structure Recipe Builder'));
assert.ok(shell.includes('Selected item properties'));
assert.ok(shell.includes('Key column'));
assert.ok(shell.includes('Attached blocks'));
assert.ok(shell.includes('Field mappings'));
assert.ok(shell.includes('Mapping Workbench'));
assert.ok(shell.includes('Source field'));
assert.ok(shell.includes('Target recipe location'));
assert.ok(shell.includes('Accept mapping'));
assert.ok(shell.includes('Create derived field'));
assert.ok(shell.includes('uxc-mapping-workbench-panel'));
assert.ok(shell.includes('uxc-mapping-actions'));
assert.ok(shell.includes('Mapping review queue'));
assert.ok(shell.includes('Selected mapping detail'));
assert.ok(shell.includes('Accept selected mapping'));
assert.ok(shell.includes('Approve mapping review'));
assert.ok(shell.includes('uxc-mapping-review-panel'));
assert.ok(shell.includes('uxc-review-actions'));
assert.ok(shell.includes('Sample trace'));
assert.ok(shell.includes('Sample value mapping trace'));
assert.ok(shell.includes('Source row'));
assert.ok(shell.includes('Sample value'));
assert.ok(shell.includes('Trace status'));
assert.ok(shell.includes('uxc-mapping-trace-panel'));
assert.ok(shell.includes('Preview source sample values beside'));
assert.ok(shell.includes('Quality scoring'));
assert.ok(shell.includes('Mapping confidence'));
assert.ok(shell.includes('Quality score'));
assert.ok(shell.includes('Readiness'));
assert.ok(shell.includes('Evidence / risks'));
assert.ok(shell.includes('uxc-mapping-confidence-panel'));
assert.ok(shell.includes('Tree Preview / Pivot Preview'));
assert.ok(shell.includes('Tree Preview'));
assert.ok(shell.includes('Pivot Preview'));
assert.ok(shell.includes('Diagnostics'));
assert.ok(shell.includes('XML export locked'));
assert.ok(shell.includes('deterministic XML serializer contract'));
assert.ok(!shell.includes('Graph signature:'));
assert.ok(shell.includes('Advanced / Developer diagnostics'));
assert.ok(shell.includes('No existing converter, sideload, enrichment, XML export, pivot, or canvas module is changed.'));
assert.ok(shell.includes('uxc-builder-workspace'));
assert.ok(shell.includes('uxc-source-panel'));
assert.ok(shell.includes('uxc-builder-panel'));
assert.ok(shell.includes('uxc-properties-panel'));
assert.ok(shell.includes('uxc-preview-panel'));
assert.ok(shell.includes('uxc-preview-mode-grid'));
assert.ok(shell.includes('uxc-export-guidance'));
assert.ok(shell.includes('uxc-tree-preview'));
assert.ok(shell.includes('uxc-preview-card'));

const toolbar = _test.toolbar(minimalState());
assert.ok(toolbar.includes('Line-wise XML Enrichment / Categorized XML'));
assert.ok(toolbar.includes('Universal XML Categorizer'));
assert.ok(toolbar.indexOf('Line-wise XML Enrichment / Categorized XML') < toolbar.indexOf('Universal XML Categorizer'));
assert.ok(toolbar.includes(UNIVERSAL_XML_CATEGORIZER_BUTTON_ATTR));

const runtimeSource = readFileSync('tabs/xml-compare-universal-categorizer-runtime.js', 'utf8');
assert.match(runtimeSource, /XML_COMPARE_UNIVERSAL_CATEGORIZER_RUNTIME_SCHEMA/);
assert.match(runtimeSource, /installUniversalXmlCategorizerRuntime\(\)/);
assert.doesNotMatch(runtimeSource, /MutationObserver/);

assert.equal(universalXmlCategorizerActionFromTarget(fakeTarget(true, false)), 'open');
assert.equal(universalXmlCategorizerActionFromTarget(fakeTarget(false, true)), 'close');
assert.equal(universalXmlCategorizerActionFromTarget(fakeTarget(false, false)), '');

function fakeTarget(isButton, isClose) {
  return { closest: (selector) => (isButton && selector.includes('universal-categorizer-open')) || (isClose && selector.includes('universal-categorizer-close')) ? {} : null, matches: () => false };
}
function minimalState() { return { fileA: null, fileB: null, textA: '', textB: '', filters: { severity: 'ALL', search: '' }, report: null }; }

console.log('xml-compare-universal-categorizer-ui tests passed');
