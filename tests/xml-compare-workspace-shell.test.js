import assert from 'node:assert/strict';

import { renderXmlCompareWorkspaceShellHtml } from '../xml-compare/XmlCompareWorkspaceShell.js';

// Verifies the shell exposes compact text-rule controls. Inputs are selected
// compare fields and current rule state; output is static HTML for the workspace.

const html = renderXmlCompareWorkspaceShellHtml({
  source: { records: [], levelView: { fields: ['MATERIAL_NAME'] } },
  target: { records: [], levelView: { fields: ['MATERIAL_NAME'] } },
  compareFields: ['MATERIAL_NAME'],
  matchMap: {
    request: {
      sourceUid: 'source-node-1',
      targetUid: 'target-node-1',
      compareFields: ['MATERIAL_NAME'],
      textRules: { MATERIAL_NAME: { field: 'MATERIAL_NAME', mode: 'contains', direction: 'either-contains' } },
    },
  },
});

assert.match(html, /Text compare field/);
assert.match(html, /Text mode/);
assert.match(html, /data-xml-compare-validation-text-field/);
assert.match(html, /data-xml-compare-validation-text-mode/);
assert.match(html, /data-xml-compare-validation-text-pattern/);
assert.match(html, /data-xml-compare-validation-text-group-spec/);
assert.match(html, /data-xml-compare-validation-text-direction/);
assert.match(html, /data-xml-compare-validation-text-case-sensitive/);
assert.match(html, /contains/);
assert.match(html, /token-set/);

console.log('XML Compare workspace shell tests passed');
