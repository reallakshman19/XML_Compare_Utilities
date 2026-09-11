import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { parseTableSource } from '../xml-compare/table-categorizer/table-categorized-xml-source-parser.js';
import { canonicalizeSupportRevisionSource } from '../tabs/csv-rev-compare/support-revision-pipeline.js';
import { compositeSupportLocationIdentity } from '../tabs/csv-rev-compare/support-revision-model.js';
import { runTotalSupportPointChangeBenchmark } from '../tabs/csv-rev-compare/support-revision-phase4-benchmark.js';

const [earlierPath, laterPath] = process.argv.slice(2);
if (!earlierPath || !laterPath) process.exit(2);

for (const test of [
  'tests/csv-rev-compare-phase2-support-location-change.test.js',
  'tests/csv-rev-compare-phase3-load-change.test.js',
  'tests/csv-rev-compare-phase4-total-support-points.test.js',
]) {
  execFileSync(process.execPath, [test], { stdio: 'inherit' });
}

const earlier = fs.readFileSync(earlierPath, 'utf8');
const later = fs.readFileSync(laterPath, 'utf8');
const result = runTotalSupportPointChangeBenchmark(earlier, later);
const oracleSource = canonicalizeSupportRevisionSource(parseTableSource(later, {
  sourceId: 'ORACLE_R3', sourceName: 'R3 oracle diagnostics', sourceType: 'benchmarkText', delimiterMode: 'auto', firstRowIsHeader: true,
}));
const oracleRemarkByKey = new Map(oracleSource.rows.map((row) => [
  compositeSupportLocationIdentity(row.rawByHeader?.CIVILSECONDARYSUPPORT, row.rawByHeader?.PIPE),
  String(row.rawByHeader?.['REMARKS (IF ANY)'] ?? '').trim(),
]));
const phase4Trace = result.detected.map((detected) => {
  const event = result.compareResult.ledger.events.find((item) => item.eventId === detected.eventId);
  const source = result.compareResult.sourceModel.locationByNodeId.get(event?.sourceXmlNode);
  const target = result.compareResult.targetModel.locationByNodeId.get(event?.targetXmlNode);
  const pairEvents = result.compareResult.ledger.events.filter((item) => item.type !== 'TOTAL_SUPPORT_POINTS_CHANGED' && item.sourceXmlNode === source?.nodeId && item.targetXmlNode === target?.nodeId);
  const structurallyCorroborated = pairEvents.some((item) => item.type === 'SUPPORT_COMPONENT_SET_CHANGED');
  return {
    key: detected.key,
    oracleRemark: oracleRemarkByKey.get(detected.key) || '',
    before: detected.before,
    after: detected.after,
    delta: detected.delta,
    structurallyCorroborated,
    structuralEventTypes: pairEvents.map((item) => item.type),
    sourceComponentCount: source?.components?.length ?? null,
    targetComponentCount: target?.components?.length ?? null,
    sourceReferences: source?.persistentReferences || [],
    targetReferences: target?.persistentReferences || [],
  };
});
const structuralKeys = phase4Trace.filter((item) => item.structurallyCorroborated).map((item) => item.key).sort();
console.log(JSON.stringify({
  phase1Metrics: result.phase1Guard.metrics,
  phase2Metrics: result.phase2Guard.metrics,
  phase3Metrics: result.phase3Guard.metrics,
  phase4Metrics: result.metrics,
  phase4Unsupported: result.unsupported,
  structuralKeys,
  phase4Trace,
}, null, 2));

if (!result.compareOk || result.compareStage === 'CONVERSION_BLOCKED') process.exit(3);
if (result.phase1Guard.metrics.falsePositives || result.phase1Guard.metrics.falseNegatives) process.exit(4);
if (result.phase2Guard.metrics.falsePositives || result.phase2Guard.metrics.falseNegatives) process.exit(5);
if (result.phase3Guard.metrics.falsePositives || result.phase3Guard.metrics.falseNegatives) process.exit(6);
process.exit(0);
