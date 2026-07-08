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
assert.ok(shell.includes('Structure Recipe Builder bridge'));
assert.ok(shell.includes('Universal sideload attachment rules'));
assert.ok(shell.includes('coordinateLookup'));
assert.ok(shell.includes('DerivedCoordinateBlock'));
assert.ok(shell.includes('CategorizedGraph.v1 preview'));
assert.ok(shell.includes('disabled-until-graph-preview-is-deterministic'));
assert.ok(shell.includes('Shadow-mode boundary'));
assert.ok(shell.includes('No existing converter, sideload, enrichment, XML export, pivot, or canvas module is changed.'));

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
