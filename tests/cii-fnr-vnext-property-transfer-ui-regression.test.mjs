import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createTestDom } from './helpers/vnext-dom-env.mjs';

// These tests protect the existing NODAL tab while exercising only the new
// R0 tab's visibility contract. Both use the committed app.js entry point.
test('Property Transfer mount does not alter Nodal tab state or handlers', async () => {
  const dom=createTestDom();
  await import('../tabs/cii-workspace/cii-fnr-vnext/ui/app.js?property-ui='+Date.now());
  await dom.tabNodal.click();
  assert.equal(dom.root.querySelector('[data-nodal-area]').hidden,false);
  assert.equal(dom.root.querySelector('[data-normal-section]').hidden,true);
  assert.equal(dom.propertyPanel.hidden,true);
  const previewDisabled=dom.nodalElements.nodalPreview.disabled;

  await dom.tabProperty.click();
  assert.equal(dom.propertyPanel.hidden,false);
  assert.equal(dom.root.querySelector('[data-nodal-area]').hidden,true);
  assert.equal(dom.ptModeElement.getAttribute('aria-selected'),'true');
  await dom.ptModeNode.click();
  assert.equal(dom.ptModeNode.getAttribute('aria-selected'),'true');
  assert.equal(dom.ptModuleNode.hidden,false);
  assert.equal(dom.ptModuleElement.hidden,true);

  await dom.tabNodal.click();
  assert.equal(dom.propertyPanel.hidden,true);
  assert.equal(dom.root.querySelector('[data-nodal-area]').hidden,false);
  assert.equal(dom.nodalElements.nodalPreview.disabled,previewDisabled);
});
test('older focused Nodal DOM without Property panel still starts safely', async()=>{
  const dom=createTestDom();
  dom.root.children=dom.root.children.filter(x=>x!==dom.propertyPanel);
  await import('../tabs/cii-workspace/cii-fnr-vnext/ui/app.js?legacy-ui='+Date.now());
  await dom.tabNodal.click();
  assert.equal(dom.root.querySelector('[data-nodal-area]').hidden,false);
});
