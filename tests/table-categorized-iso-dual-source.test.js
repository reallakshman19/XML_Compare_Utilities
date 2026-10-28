import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ISO_NOTE_DUAL_SOURCE_PROFILE, ISO_NOTE_FULL_ID_PATTERN } from '../xml-compare/table-categorizer/table-categorized-xml-iso-note-dual-source.js';
import { parseTableSource } from '../xml-compare/table-categorizer/table-categorized-xml-source-parser.js';
import { validateEditableProfile } from '../xml-compare/table-categorizer/table-categorized-xml-profile-validation.js';
import { buildCategorizedGraph } from '../xml-compare/table-categorizer/table-categorized-xml-graph-builder.js';
import { runCategorizerValidation } from '../xml-compare/table-categorizer/table-categorized-xml-validation.js';
import { exportCategorizedGraphArtifacts } from '../xml-compare/table-categorizer/table-categorized-xml-exporter.js';
import { renderTableCategorizedXmlShellHtml } from '../xml-compare/table-categorizer/table-categorized-xml-shell.js';

const tab = (...cells) => cells.join('\t');
const pipeA = '/ASIM-1885-PL-10"-CS-M8810126-02/B4';
const pipeB = '/ASIM-1885-PL-12"-CS-S8810100-02/B6';
const pipePlaceholder = '/ASIM-1885-PL-6"-CS-S8810106';
const s1 = parseTableSource([
  tab('PS NO', 'Bore', 'pipe', 'DTXR', 'Support Gap', 'Mandatory'),
  tab('PS-124.1', '50.00', 'ASIM-1885-PL-3"-S8810008-91261M7-01', 'GUIDE PDO-TYPE-604A/B', '', 'No'),
  tab('PS-124.3', '50.00', 'ASIM-1885-PL-3"-S8810008-91261M7-01', 'Pipe Rest XRT01', '25mm GAP BETWEEN BOP AND TOS', 'No'),
].join('\n'), { sourceId: 'S1', sourceName: 'PS mapping', delimiterMode: 'tab' });

// S2 contains distinct suffixes, duplicate bare tags on different pipes,
// repeated placeholders on the same pipe, and a descriptive/nonstandard tag.
const s2 = parseTableSource([
  tab('JOBNAME', 'LinenoinCII', 'PIPEAXIS', 'NODE_NUM', 'NODE_NAME', 'NPS', 'TYPE', 'SupportISONOTE', 'Remarks'),
  tab('PL', pipeA, 'E-W', '40030', 'PS-006.1', '10', 'Rigid +Y', "/PS-006.1 :ISONOTE 'REST(4kN)'", ''),
  tab('PL', pipeA, 'E-W', '40040', 'PS-006.2', '10', 'Rigid +Y', "/PS-006.2 :ISONOTE 'REST(5kN)'", ''),
  tab('PL', pipeB, 'E-W', '21930', 'PS-006.5', '12', 'Rigid +Y', "/PS-006.5 :ISONOTE 'REST(13kN)'", ''),
  tab('PL', pipeB, 'E-W', '21950', 'PS-006.7', '12', 'Rigid +Y', "/PS-006.7 :ISONOTE 'REST(8kN)'", ''),
  tab('PL', pipeA, 'E-W', '20430', 'PS-001', '10', 'Rigid +Y', "/PS-001 :ISONOTE 'REST(20kN)'", ''),
  tab('PL', pipeB, 'E-W', '1585', 'PS-001', '12', 'Rigid +Y', "/PS-001 :ISONOTE 'REST(30kN)'", ''),
  tab('PL', pipePlaceholder, 'E-W', '2217', '', '6', 'Rigid +Y', "/PS-XXXX :ISONOTE 'REST(5kN)'", ''),
  tab('PL', pipePlaceholder, 'E-W', '2312', '', '6', 'Rigid +Y', "/PS-XXXX :ISONOTE 'REST(3kN)'", ''),
  tab('PL', pipePlaceholder, 'E-W', '2337', '', '6', 'Rigid +Y', "/PS-XXXX :ISONOTE 'REST(4kN)'", ''),
  tab('PL', pipeB, 'E-W', '1830', '1.3mfromTee(nearSL-211.2)', '12', 'Rigid +Y', "/1.3mfromTee(nearSL-211.2) :ISONOTE 'REST(17kN)'", ''),
  tab('PL', pipeB, 'E-W', '', '', '12', 'Rigid +Y', "/PS-XXXX :ISONOTE 'REST(5kN)'", ''),
  tab('PL', pipeA, 'E-W', '5790', '/PS-123.1', '2', 'Rigid GUI', "://PS-123.1 :ISONOTE 'DO NOT REST [25mm GAP](1kN), GUIDE(1kN), [GUIDE GAP=10mm]'", ''),
].join('\n'), { sourceId: 'S2', sourceName: 'ISO notes', delimiterMode: 'tab' });

assert.equal(new RegExp(ISO_NOTE_FULL_ID_PATTERN, 'i').exec('://PS-123.1 :ISONOTE x')[1], 'PS-123.1');
assert.equal(new RegExp(ISO_NOTE_FULL_ID_PATTERN, 'i').exec('/PS-006.5 :ISONOTE x')[1], 'PS-006.5');
assert.equal(new RegExp(ISO_NOTE_FULL_ID_PATTERN, 'i').exec('/PS-006.7 :ISONOTE x')[1], 'PS-006.7');

const profileDiagnostics = validateEditableProfile(ISO_NOTE_DUAL_SOURCE_PROFILE, { sources: [s1, s2] });
assert.equal(profileDiagnostics.filter((d) => d.severity === 'BLOCKER').length, 0, JSON.stringify(profileDiagnostics, null, 2));

const graph = buildCategorizedGraph(ISO_NOTE_DUAL_SOURCE_PROFILE, [s1, s2]);
const items = graph.nodes.filter((node) => node.levelId === 'isoItem');
const parts = graph.nodes.filter((node) => node.levelId === 'rootPartition');
assert.equal(graph.nodes.length, 1 + 2 + s1.rows.length + s2.rows.length);
assert.equal(items.length, s1.rows.length + s2.rows.length, 'all S1 and S2 rows must be preserved');
assert.equal(parts.length, 2);
assert.ok(items.every((node) => node.key.trim()), 'no item may have a blank key');
assert.equal(new Set(items.map((node) => node.key)).size, items.length, 'test rows must not merge');

for (const suffix of ['.1', '.2', '.5', '.7']) {
  assert.ok(items.some((node) => node.fields.supportId === 'PS-006' + suffix), 'full suffix survives: ' + suffix);
}
assert.equal(items.filter((node) => node.fields.supportId === 'PS-001').length, 2, 'different pipelines must not merge PS-001');
assert.ok(items.some((node) => node.fields.supportId === 'PS-123.1'), 'double-slash-colon prefix is supported');

const placeholders = graph.diagnostics.filter((d) => d.code === 'iso_note_placeholder_identity');
assert.equal(placeholders.length, 4, 'all PS-XXXX entries are warnings');
assert.equal(graph.diagnostics.filter((d) => d.code === 'NONCANONICAL_ID').length, 1, 'noncanonical NODE_NAME is preserved as raw identity');
assert.ok(items.every((node) => node.fields.revision === ''), 'support suffix is not a revision');
assert.ok(items.some((node) => node.fields.rawSupportId === '1.3mfromTee(nearSL-211.2)'), 'raw noncanonical NODE_NAME preserved');
const placeholderItems = items.filter((node) => node.fields.rawNote?.includes('PS-XXXX'));
assert.equal(placeholderItems.length, 4, 'placeholder notes must never merge');
assert.ok(placeholderItems.some((node) => node.key.endsWith('|S2:11')), 'missing NODE_NUM falls back to row reference');
assert.ok(!graph.diagnostics.some((d) => d.severity === 'BLOCKER'));

const gates = runCategorizerValidation({ profile: ISO_NOTE_DUAL_SOURCE_PROFILE, sources: [s1, s2], graph });
assert.ok(!gates.some((d) => d.severity === 'BLOCKER' && d.status === 'FAIL'), JSON.stringify(gates, null, 2));
const xml = exportCategorizedGraphArtifacts({ graph, profile: ISO_NOTE_DUAL_SOURCE_PROFILE, validationResults: gates, sources: [s1, s2] });
assert.equal(xml.ok, true, JSON.stringify(xml.diagnostics, null, 2));
assert.match(xml.xmlText, /<IsoNoteXml/);
assert.match(xml.xmlText, /PS-006\.7/);
assert.match(xml.xmlText, /PS-XXXX/);

// Original ISO identifiers are authoritative; NODE_NUM is only a locator.
const unusualS2 = parseTableSource([
  tab('LinenoinCII', 'NODE_NUM', 'NODE_NAME', 'SupportISONOTE'),
  tab('/PIPE-1/B4', '100', 'PS02364.1', "/PS02364.1 :ISONOTE 'REST(2kN)'"),
  tab('/PIPE-1/B4', '110', 'SL-263..4', "/SL-263..4 :ISONOTE 'GUIDE(2kN)'"),
  tab('/PIPE-1/B4', '120', '/PS-XXXX', "/PS-XXXX :ISONOTE 'REST(2kN)'"),
  tab('/PIPE-1/B4', '130', '/PS-XXXX', "/PS-XXXX :ISONOTE 'REST(3kN)'"),
].join('\n'), { sourceId: 'S2', delimiterMode: 'tab' });
const rawGraph = buildCategorizedGraph(ISO_NOTE_DUAL_SOURCE_PROFILE, [s1, unusualS2]);
const rawItems = rawGraph.nodes.filter(node => node.levelId === 'isoItem' && node.sourceRefs.some(ref => ref.startsWith('S2:')));
assert.equal(rawItems.length, 4, 'repeated placeholder support IDs must not merge');
assert.ok(rawItems.some(item => item.fields.supportId === 'PS02364.1' && item.fields.rawSupportId === 'PS02364.1'));
assert.ok(rawItems.some(item => item.fields.supportId === 'SL-263..4' && item.fields.rawSupportId === 'SL-263..4'));
assert.equal(rawItems.filter(item => item.fields.supportId === 'PS-XXXX').length, 2);
assert.ok(rawItems.every(item => item.fields.revision === ''));
assert.ok(!rawItems.some(item => item.fields.supportId === '100' || item.fields.supportId === '110'));
assert.ok(rawGraph.diagnostics.some(d => d.code === 'NONCANONICAL_ID' && d.sourceRef === 'S2:1'));
assert.equal(new Set(rawItems.map(item => item.key)).size, 4);
const conflictingS2 = parseTableSource([
  tab('LinenoinCII', 'NODE_NUM', 'NODE_NAME', 'SupportISONOTE'),
  tab('/PIPE-1/B4', '5790', '/PS-100.1', "/PS-101.1 :ISONOTE 'REST(2kN)'"),
].join('\n'), { sourceId: 'S2', delimiterMode: 'tab' });
const conflictGraph = buildCategorizedGraph(ISO_NOTE_DUAL_SOURCE_PROFILE, [s1, conflictingS2]);
const conflictItem = conflictGraph.nodes.find(node => node.sourceRefs?.includes('S2:1') && node.levelId === 'isoItem');
assert.equal(conflictItem.fields.supportId, 'PS-100.1', 'NODE_NAME takes precedence over conflicting note token');
assert.equal(conflictItem.fields.rawSupportId, '/PS-100.1');
assert.ok(conflictGraph.diagnostics.some(d => d.code === 'iso_note_identity_conflict' && d.sourceRef === 'S2:1'));


const shell = renderTableCategorizedXmlShellHtml({
  activeStep: 'table', activeTab: 'source', activeSourceId: 'S1', sources: [s1, s2],
  profile: ISO_NOTE_DUAL_SOURCE_PROFILE, settingsPanel: { collapsed: false }
});
assert.equal((shell.match(/data-table-categorized-action="load-iso-note-template"/g) || []).length, 1, 'ISO template button is only in Load Template');
assert.ok(shell.indexOf('data-table-categorized-action="load-iso-note-template"') > shell.indexOf('<h4>Load Template</h4>'));
const runtimeText = fs.readFileSync(new URL('../tabs/xml-compare-table-categorized-runtime.js', import.meta.url), 'utf8');
assert.match(runtimeText, /if \(action === 'load-iso-note-template'\) return loadIsoNoteTemplate\(\)/);
assert.match(runtimeText, /state\.profile = ISO_NOTE_DUAL_SOURCE_PROFILE/);
assert.match(runtimeText, /transformRules: isoRules/);
assert.match(runtimeText, /transformRules: \[\]/);

console.log('table-categorized-iso-dual-source.test.js passed');
