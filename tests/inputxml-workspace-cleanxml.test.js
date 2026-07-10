import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { buildCleanXml } from '../tabs/inputxml-workspace/inputxml-workspace-cleanxml.js';
import { parseDtxrTable } from '../tabs/inputxml-workspace/inputxml-workspace-dtxr.js';

const launcherTopoPath = 'F:\\CODE-5\\3D_Converters\\Benchmarks\\LAUNCHERTOPO.XML';
assert.ok(fs.existsSync(launcherTopoPath), `Missing real CleanXML benchmark: ${launcherTopoPath}`);

const sourceXml = fs.readFileSync(launcherTopoPath, 'utf8');
const dtxrRows = parseDtxrTable([
  'PS No.(Item Name)\tBranch(Pipe)\tBore\tPOS\tDTXR\tCMPSUPGAP',
  'PS-TEST-1\t/pipe/B1\t100\t0 0 0\tGUIDE TEST\t3.0',
].join('\n'));
const { tables, cleanXmlText } = buildCleanXml(sourceXml, { sourceName: path.basename(launcherTopoPath), dtxrRows });

assert.ok(tables.branches.length > 0, 'CleanXML parser should find branch rows.');
assert.ok(tables.nodes.length > 0, 'CleanXML parser should find node rows.');
assert.ok(cleanXmlText.includes('<CleanXML'), 'CleanXML output should have the CleanXML root.');
assert.ok(cleanXmlText.includes('<Branch>'), 'CleanXML output should preserve branch blocks.');
assert.ok(cleanXmlText.includes('<Node>'), 'CleanXML output should preserve route node blocks.');
assert.ok(!/<NodeNumber>\s*-1(?:\.0+)?\s*<\/NodeNumber>/i.test(cleanXmlText), 'CleanXML must not emit bad -1 NodeNumber blocks.');
assert.ok(tables.nodes.some((row) => row.componentType && row.resolverBasis), 'Component role resolver should annotate nodes with role and basis.');

console.log(`CleanXML real benchmark passed: ${tables.branches.length} branch(es), ${tables.nodes.length} node row(s).`);
