import assert from 'node:assert/strict';
import fs from 'node:fs';

import { ISO_NOTE_DUAL_SOURCE_PROFILE } from '../xml-compare/table-categorizer/table-categorized-xml-iso-note-dual-source.js';
import { buildCategorizedGraph } from '../xml-compare/table-categorizer/table-categorized-xml-graph-builder.js';
import { parseTableSource } from '../xml-compare/table-categorizer/table-categorized-xml-source-parser.js';
import { exportCategorizedGraphArtifacts } from '../xml-compare/table-categorizer/table-categorized-xml-exporter.js';
import { runCategorizerValidation } from '../xml-compare/table-categorizer/table-categorized-xml-validation.js';

const s1 = parseTableSource([
  'PS NO\tpipe\tBore\tMandatory',
  'PS-124.1\tASIM-1885-PL-3"-S8810008\t50\tNo',
  'PS-124.3\tASIM-1885-PL-3"-S8810008\t50\tNo',
].join('\n'), { sourceId: 'S1', delimiterMode: 'tab' });

const s2 = parseTableSource([
  'JOBNAME\tLinenoinCII\tNODE_NUM\tSupportISONOTE',
  "PL\t/ASIM-1885-PL-10\t101\t/PS-006.1 :ISONOTE 'REST(4kN)'",
  "PL\t/ASIM-1885-PL-10\t102\t/PS-006.2 :ISONOTE 'REST(5kN)'",
  "PL\t/ASIM-1885-PL-10\t201\t/PS-XXXX :ISONOTE 'REST(7kN)'",
].join('\n'), { sourceId: 'S2', delimiterMode: 'tab' });

const sources = [s1, s2];
const graph = buildCategorizedGraph(ISO_NOTE_DUAL_SOURCE_PROFILE, sources);
const gates = runCategorizerValidation({ profile: ISO_NOTE_DUAL_SOURCE_PROFILE, sources, graph });
assert.equal(graph.nodes.filter((node) => node.levelId === 'isoItem').length, 5);
assert.deepEqual(gates.filter((gate) => gate.status === 'FAIL'), [], 'nonspatial ISO notes must not fail coordinate gates');
for (const gateName of ['coordinate_units_declared', 'coordinate_tolerance_declared']) {
  const gate = gates.find((item) => item.gate === gateName);
  assert.equal(gate.status, 'NOT_RUN', gateName + ' must be skipped when grouping is not spatial');
}
const exported = exportCategorizedGraphArtifacts({ graph, profile: ISO_NOTE_DUAL_SOURCE_PROFILE, validationResults: gates, sources });
assert.equal(exported.ok, true, JSON.stringify(exported.diagnostics, null, 2));
assert.match(exported.xmlText, /PS-006\.1/);
assert.match(exported.xmlText, /PS-006\.2/);
assert.match(exported.xmlText, /PS-XXXX/);

function spatialProfile(contract) {
  return {
    ...ISO_NOTE_DUAL_SOURCE_PROFILE,
    levelDefinitions: [{
      levelId: 'root', xmlTag: 'IsoNoteXml', creationMode: 'static', levelType: 'container', documentRoot: true, key: 'root',
      children: [{
        levelId: 'spatial', xmlTag: 'Spatial', creationMode: 'one-per-key', levelType: 'group',
        keyResolver: { op: 'coordinateCluster', contract },
        children: [],
      }],
    }],
  };
}
const missing = runCategorizerValidation({ profile: spatialProfile({ unit: 'mm' }), sources, graph });
assert.equal(missing.find((gate) => gate.gate === 'coordinate_units_declared').status, 'PASS');
assert.equal(missing.find((gate) => gate.gate === 'coordinate_tolerance_declared').status, 'FAIL');
const complete = runCategorizerValidation({ profile: spatialProfile({ unit: 'mm', tolerance: 2 }), sources, graph });
assert.equal(complete.find((gate) => gate.gate === 'coordinate_units_declared').status, 'PASS');
assert.equal(complete.find((gate) => gate.gate === 'coordinate_tolerance_declared').status, 'PASS');

// A profile merely carrying an unused coordinateCluster setting must not be
// forced into coordinate validation; the grouping operator determines this.
const unused = { ...ISO_NOTE_DUAL_SOURCE_PROFILE, coordinateCluster: { unit: 'mm' } };
const unusedChecks = runCategorizerValidation({ profile: unused, sources, graph });
assert.equal(unusedChecks.find((gate) => gate.gate === 'coordinate_tolerance_declared').status, 'NOT_RUN');

const runtime = fs.readFileSync(new URL('../tabs/xml-compare-table-categorized-runtime.js', import.meta.url), 'utf8');
assert.match(runtime, /Graph built, but export is blocked:.*Review the failed validation gates in Check Details\./, 'runtime must report actionable failure details');
console.log('table-categorized-iso-export-coordinate-gates.test.js passed');
