import assert from 'node:assert/strict';
import fs from 'node:fs';

import { LINEWISE_XML_OWNERSHIP_RULE_TEXT, renderLinewiseInfoRuleButtonHtml, renderLinewiseInfoRuleModalHtml } from '../xml-compare/XmlCompareLinewiseInfoRule.js';
import { _test as converterTest } from '../tabs/xml-compare-categorized-converter-runtime.js';
import { installXmlCompareLinewiseInfoRuleRuntime } from '../tabs/xml-compare-linewise-info-rule-runtime.js';

assert.ok(LINEWISE_XML_OWNERSHIP_RULE_TEXT.includes('Root'));
assert.ok(LINEWISE_XML_OWNERSHIP_RULE_TEXT.includes('LineBlock'));
assert.ok(LINEWISE_XML_OWNERSHIP_RULE_TEXT.includes('Element'));
assert.ok(LINEWISE_XML_OWNERSHIP_RULE_TEXT.includes('NodesBlock'));
assert.ok(LINEWISE_XML_OWNERSHIP_RULE_TEXT.includes('Sentinel suppression'));

const buttonHtml = renderLinewiseInfoRuleButtonHtml(false);
assert.ok(buttonHtml.includes('data-xml-compare-linewise-info-action="open-info-rule"'));
assert.ok(buttonHtml.includes('aria-label="Show Line-wise XML ownership rule"'));
assert.ok(buttonHtml.includes('title="Show Line-wise XML ownership rule"'));
assert.ok(buttonHtml.includes('aria-expanded="false"'));

const modalHtml = renderLinewiseInfoRuleModalHtml(true);
assert.ok(modalHtml.includes('role="dialog"'));
assert.ok(modalHtml.includes('aria-modal="true"'));
assert.ok(modalHtml.includes('Line-wise XML ownership rule'));
assert.ok(modalHtml.includes('role=&quot;FROM&quot;'), 'rule text quotes are escaped inside modal');
assert.equal(renderLinewiseInfoRuleModalHtml(false), '');

converterTest.state.infoRuleOpen = false;
const closedPopup = converterTest.popupHtml();
assert.ok(closedPopup.includes('data-xml-compare-linewise-info-action="open-info-rule"'), 'popup renders native info/help button');
assert.equal(closedPopup.includes('data-xml-compare-linewise-info-rule-panel'), false, 'closed popup hides rule panel');

let latestHtml = '';
globalThis.document = { querySelector: () => ({ set outerHTML(value) { latestHtml = value; } }) };
assert.equal(converterTest.handleInfoRuleAction('open-info-rule'), true);
assert.equal(converterTest.state.infoRuleOpen, true);
assert.ok(latestHtml.includes('data-xml-compare-linewise-info-rule-panel'), 'opening renders modal through workflow render');
assert.ok(latestHtml.includes('data-xml-compare-linewise-info-action="close-info-rule"'));
assert.equal(converterTest.handleInfoRuleAction('close-info-rule'), true);
assert.equal(converterTest.state.infoRuleOpen, false);
assert.equal(latestHtml.includes('data-xml-compare-linewise-info-rule-panel'), false, 'closing hides modal through workflow render');
delete globalThis.document;

const runtimeSource = fs.readFileSync(new URL('../tabs/xml-compare-linewise-info-rule-runtime.js', import.meta.url), 'utf8');
const shellSource = fs.readFileSync(new URL('../xml-compare/XmlCompareWorkspaceShell.js', import.meta.url), 'utf8');
assert.equal(installXmlCompareLinewiseInfoRuleRuntime(), false, 'old runtime installer is inert');
assert.equal(runtimeSource.includes('addEventListener'), false, 'old runtime has no document listener');
assert.equal(runtimeSource.includes('MutationObserver'), false, 'old runtime has no mutation observer');
assert.equal(runtimeSource.includes('insertAdjacentHTML'), false, 'old runtime has no DOM injection');
assert.equal(runtimeSource.includes('document.body'), false, 'old runtime has no body modal injection');
assert.equal(/installXmlCompareLinewiseInfoRuleRuntime\(\);/.test(runtimeSource), false, 'old runtime has no auto-install call');
assert.equal(shellSource.includes('xml-compare-linewise-info-rule-runtime.js'), false, 'workspace shell no longer lazy-loads info-rule runtime');
assert.equal(shellSource.includes('loadLinewiseInfoRuleRuntime'), false, 'workspace shell no longer tracks info-rule loader');

console.log('XML Compare native line-wise ownership rule tests passed');
