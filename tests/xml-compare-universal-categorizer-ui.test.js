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
assert.ok(shell.includes('Shadow mode'));
assert.ok(shell.includes('Export locked'));
assert.ok(shell.includes('Source Registry'));
assert.ok(shell.includes('Attachment Rules'));
assert.ok(shell.includes('Graph Preview'));
assert.ok(shell.includes('Export Gate'));
assert.ok(shell.includes('Structure Recipe Builder bridge'));
assert.ok(shell.includes('Recipe validation'));
assert.ok(shell.includes('Designer draft check'));
assert.ok(shell.includes('UXC_RECIPE_VALID'));
assert.ok(shell.includes('No blocking recipe validation errors.'));
assert.ok(shell.includes('Command planner'));
assert.ok(shell.includes('Locked dry-run receipts'));
assert.ok(shell.includes('Commands'));
assert.ok(shell.includes('Mutations allowed'));
assert.ok(shell.includes('Pivot preview is blocked'));
assert.ok(shell.includes('XML export is blocked'));
assert.ok(shell.includes('Universal source registry'));
assert.ok(shell.includes('Attachment preview'));
assert.ok(shell.includes('coordinateLookup'));
assert.ok(shell.includes('DerivedCoordinateBlock'));
assert.ok(shell.includes('CategorizedGraph.v1 preview'));
assert.ok(shell.includes('XML export gate'));
assert.ok(shell.includes('blocked-shadow-graph-only'));
assert.ok(shell.includes('Export is locked'));
assert.ok(shell.includes('disabled-until-graph-preview-is-deterministic'));
assert.ok(shell.includes('Future recipe actions'));
assert.ok(shell.includes('Add level'));
assert.ok(shell.includes('Add block'));
assert.ok(shell.includes('Map source field'));
assert.ok(shell.includes('Preview pivot'));
assert.ok(shell.includes('Export XML'));
assert.ok(shell.includes('data-uxc-designer-action="add-level"'));
assert.ok(shell.includes('disabled data-uxc-designer-action'));
assert.ok(shell.includes('Shadow-mode boundary'));
assert.ok(shell.includes('No existing converter, sideload, enrichment, XML export, pivot, or canvas module is changed.'));
assert.ok(shell.includes('uxc-step-rail'));
assert.ok(shell.includes('uxc-readiness-strip'));
assert.ok(shell.includes('uxc-workspace'));
assert.ok(shell.includes('uxc-action-grid'));
assert.ok(shell.includes('uxc-validation-grid'));
assert.ok(shell.includes('uxc-diagnostic-list'));
assert.ok(shell.includes('uxc-command-grid'));
assert.ok(shell.includes('uxc-command-receipt'));

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

function minimalState() {
  return { fileA: null, fileB: null, textA: '', textB: '', filters: { severity: 'ALL', search: '' }, report: null };
}

console.log('xml-compare-universal-categorizer-ui tests passed');
