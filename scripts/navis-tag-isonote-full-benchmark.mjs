import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { normalizeConfig } from '../tabs/navis-tag-isonote/navis-tag-isonote-contracts.js';
import { parseSupportTableText, buildSupportTableRecords, rowsToCsv } from '../tabs/navis-tag-isonote/navis-tag-table-source.js';
import { buildStagedJsonHierarchy, buildStagedSupportIndex } from '../tabs/navis-tag-isonote/navis-tag-staged-tree.js';
import { parseNavisTagXml } from '../tabs/navis-tag-isonote/navis-tag-xml-parser.js';
import { attachNavisResolutionToIdentityTrace, buildIdentityNodeTrace } from '../tabs/navis-tag-isonote/navis-tag-identity-trace.js';
import { buildNavisTagIsonoteReadiness } from '../tabs/navis-tag-isonote/navis-tag-readiness.js';
import { resolveNavisTagIsonotes } from '../tabs/navis-tag-isonote/navis-tag-proximity-engine.js';

function args(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith('--')) continue;
    out[key.slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
  }
  return out;
}
function required(value, name) { if (!value) throw new Error(`Missing --${name}`); return value; }
async function walkJson(root) {
  const files = [];
  async function visit(current) {
    const info = await stat(current);
    if (info.isDirectory()) {
      const entries = await readdir(current);
      for (const entry of entries.sort()) await visit(path.join(current, entry));
    } else if (/\.json$/i.test(current)) files.push(current);
  }
  await visit(root);
  return files;
}
async function sha256(file) { return createHash('sha256').update(await readFile(file)).digest('hex'); }
function topPaths(recommendations, limit) { return (recommendations || []).slice(0, limit).map((item) => item.path); }
function calibratedConfig(initialTree) {
  const rec = initialTree.pathRecommendations || {};
  return normalizeConfig({
    tableIdentityColumns: ['Name of the element'],
    tableIdentityMode: 'first-non-empty',
    tablePipeColumns: ['PIPE'],
    tablePositionMode: 'single',
    tablePositionColumn: 'POS',
    tableUnits: 'mm',
    jsonIdentityPaths: topPaths(rec.identity, 12),
    jsonPositionPaths: topPaths(rec.position, 20),
    jsonBranchPaths: topPaths(rec.branch, 12),
    jsonPipePaths: topPaths(rec.pipe, 12),
    jsonZonePaths: topPaths(rec.zone, 8),
    jsonOdPaths: topPaths(rec.od, 12),
    jsonBorePaths: topPaths(rec.bore, 12),
    jsonUnits: 'auto',
    jsonOdUnits: 'mm',
    jsonBoreUnits: 'mm',
    navisUnits: 'auto',
    supportCoordinateSource: 'json-only',
    eastingToleranceMm: 100,
    northingToleranceMm: 100,
    elevationToleranceMm: 100,
    coordinateDisagreementToleranceMm: 100,
    useOdHalfAlternatives: true,
    boreToOdLookupEnabled: false,
  });
}
function simplifyTree(tree) {
  return { schema: tree.schema, summary: tree.summary, pathCatalogue: tree.pathCatalogue, pathRecommendations: tree.pathRecommendations };
}
function simplifyAudit(value) {
  return JSON.parse(JSON.stringify(value, (key, item) => {
    if (['raw', 'node', 'selectedEntry', 'tableRecord', 'byId', 'byIdentity', 'byRoot'].includes(key)) return undefined;
    if (item instanceof Map) return [...item.entries()];
    return item;
  }));
}
function decisionReasonCounts(decisions) {
  const counts = {};
  for (const row of decisions || []) {
    const key = row.ambiguity || row.status || 'UNKNOWN';
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

const options = args(process.argv);
const tablePath = required(options.table, 'table');
const navisPath = required(options.navis, 'navis');
const stagedDir = required(options['staged-dir'], 'staged-dir');
const stagedZip = options['staged-zip'] || '';
const outDir = options.out || 'artifacts/navis-tag-isonote/asim1836';
await mkdir(outDir, { recursive: true });

const tableText = await readFile(tablePath, 'utf8');
const navisText = await readFile(navisPath, 'utf8');
const jsonFiles = await walkJson(stagedDir);
const documents = [];
const parseFailures = [];
for (const file of jsonFiles) {
  try { documents.push({ sourceFile: path.relative(stagedDir, file).replaceAll(path.sep, '/'), data: JSON.parse(await readFile(file, 'utf8')) }); }
  catch (error) { parseFailures.push({ file, message: error.message }); }
}
if (!jsonFiles.length) throw new Error('No JSON files found in staged benchmark directory.');
if (parseFailures.length) throw new Error(`Failed to parse ${parseFailures.length}/${jsonFiles.length} staged JSON files.`);

const parsedTable = parseSupportTableText(tableText);
const initialTree = buildStagedJsonHierarchy(documents, {});
const config = calibratedConfig(initialTree);
const tableBuild = buildSupportTableRecords(parsedTable, config);
const tree = buildStagedJsonHierarchy(documents, config);
const stagedIndex = buildStagedSupportIndex(tree, config);
const initialTrace = buildIdentityNodeTrace(tableBuild.records, stagedIndex, config);
const navisParse = parseNavisTagXml(navisText, config);
const readiness = buildNavisTagIsonoteReadiness({ config, tableBuild, tree, stagedIndex, identityTrace: initialTrace, navisParse, hasSourceText: true });
const audit = resolveNavisTagIsonotes(tableBuild, initialTrace, navisParse, config);
const finalTrace = attachNavisResolutionToIdentityTrace(initialTrace, audit);

if (parsedTable.rows.length !== 163) throw new Error(`Expected 163 support rows, received ${parsedTable.rows.length}.`);
if (documents.length !== jsonFiles.length) throw new Error('Some JSON files were silently lost.');
if (!tree.summary.nodeCount) throw new Error('Canonical staged hierarchy is empty.');
if (!navisParse.summary.tagCount) throw new Error('Navis benchmark contains no parsed tags.');
if (finalTrace.rows.length !== 163) throw new Error(`Expected 163 end-to-end trace rows, received ${finalTrace.rows.length}.`);
if (config.boreToOdLookupEnabled) throw new Error('Benchmark must not enable implicit or explicit bore-to-OD lookup.');
for (let i = 0; i < tableBuild.records.length; i += 1) {
  const source = tableBuild.records[i].rawRow['ISOMETRIC NOTES'] || '';
  const output = audit.augmentedRows[i]?.['ISOMETRIC NOTES'] || '';
  if (source !== output) throw new Error(`ISOMETRIC NOTES changed at table row ${tableBuild.records[i].rowIndex}.`);
}

const sourceHashes = {
  supportTableSha256: await sha256(tablePath),
  navisXmlSha256: await sha256(navisPath),
  stagedZipSha256: stagedZip ? await sha256(stagedZip) : '',
};
const coverage = {
  schema: 'navis-tag-isonote-full-benchmark/v1',
  generatedAt: new Date().toISOString(),
  sources: { tablePath, navisPath, stagedDir, stagedZip, ...sourceHashes },
  sourceCounts: { tableRows: parsedTable.rows.length, stagedJsonFiles: jsonFiles.length, parsedStagedDocuments: documents.length, stagedParseFailures: parseFailures.length },
  config,
  hierarchy: tree.summary,
  stagedIndex: stagedIndex.summary,
  identityTrace: finalTrace.summary,
  navis: navisParse.summary,
  readiness: { status: readiness.status, blockers: readiness.blockers, warnings: readiness.warnings, summary: readiness.summary },
  resolution: { ...audit.summary, reasonCounts: decisionReasonCounts(audit.decisions) },
  calibratedPaths: {
    identity: config.jsonIdentityPaths,
    position: config.jsonPositionPaths,
    branch: config.jsonBranchPaths,
    pipe: config.jsonPipePaths,
    zone: config.jsonZonePaths,
    od: config.jsonOdPaths,
    bore: config.jsonBorePaths,
  },
};

await writeFile(path.join(outDir, '01-coverage-and-calibration.json'), JSON.stringify(coverage, null, 2));
await writeFile(path.join(outDir, '02-path-catalogue.json'), JSON.stringify(simplifyTree(tree), null, 2));
await writeFile(path.join(outDir, '03-navis-tag-index.csv'), rowsToCsv(navisParse.tags));
await writeFile(path.join(outDir, '04-end-to-end-identity-trace.csv'), rowsToCsv(finalTrace.rows));
await writeFile(path.join(outDir, '05-candidate-evidence-ledger.csv'), rowsToCsv(audit.candidateLedger));
await writeFile(path.join(outDir, '06-matched-decisions.csv'), rowsToCsv(audit.matchedRows));
await writeFile(path.join(outDir, '07-ambiguous-decisions.csv'), rowsToCsv(audit.ambiguousRows));
await writeFile(path.join(outDir, '08-rejected-decisions.csv'), rowsToCsv(audit.rejectedRows));
await writeFile(path.join(outDir, '09-augmented-support-table.csv'), rowsToCsv(audit.augmentedRows));
await writeFile(path.join(outDir, '10-full-audit.json'), JSON.stringify(simplifyAudit({ coverage, readiness, tree: simplifyTree(tree), identityTrace: finalTrace, navisParse, audit }), null, 2));
console.log(JSON.stringify(coverage, null, 2));
