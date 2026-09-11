import fs from 'node:fs';
import { parseTableSource } from '../xml-compare/table-categorizer/table-categorized-xml-source-parser.js';
import { canonicalizeSupportRevisionSource } from '../tabs/csv-rev-compare/support-revision-pipeline.js';
import { compositeSupportLocationIdentity } from '../tabs/csv-rev-compare/support-revision-model.js';
import { runLoadChangeBenchmark } from '../tabs/csv-rev-compare/support-revision-phase3-benchmark.js';

const [earlierPath, laterPath] = process.argv.slice(2);
if (!earlierPath || !laterPath) process.exit(2);
const earlier = fs.readFileSync(earlierPath, 'utf8');
const later = fs.readFileSync(laterPath, 'utf8');
const result = runLoadChangeBenchmark(earlier, later);
const oracle = canonicalizeSupportRevisionSource(parseTableSource(later, {
  sourceId: 'BENCHMARK_R3', sourceName: 'Benchmark later revision / R3 oracle', sourceType: 'benchmarkText', delimiterMode: 'auto', firstRowIsHeader: true,
}));
const phase4Oracle = oracle.rows.flatMap((row) => {
  const remark = String(row.rawByHeader?.['REMARKS (IF ANY)'] ?? '').trim();
  if (!/\btotal\s+no\.?\s+of\s+support\s+changes?\b/i.test(remark)) return [];
  const civil = String(row.rawByHeader?.CIVILSECONDARYSUPPORT ?? '').trim();
  const pipe = String(row.rawByHeader?.PIPE ?? '').trim();
  return [{ key: compositeSupportLocationIdentity(civil, pipe), rowId: row.rowId, civil, pipe, totalSupportPoints: String(row.rawByHeader?.['TOTAL SUPPORT POINTS ON SECONDARY'] ?? '').trim(), remark }];
});
const phase4Evidence = phase4Oracle.map((oracleItem) => {
  const target = result.compareResult.targetModel.locations.find((item) => item.supportLocationIdentity === oracleItem.key) || null;
  const edge = result.compareResult.lineage.edges.find((item) => item.targetNodeIds?.includes(target?.nodeId)) || null;
  const sources = (edge?.sourceNodeIds || []).map((id) => result.compareResult.sourceModel.locationByNodeId.get(id)).filter(Boolean);
  const events = result.compareResult.ledger.events.filter((event) => event.targetXmlNode === target?.nodeId || sources.some((source) => event.sourceXmlNode === source.nodeId));
  return {
    ...oracleItem,
    target: target ? { nodeId: target.nodeId, totalSupportPoints: target.sourceFields?.totalSupportPoints, componentCount: target.components.length, references: target.persistentReferences } : null,
    edge: edge ? { edgeId: edge.edgeId, cardinality: edge.cardinality, outcome: edge.outcome, sourceNodeIds: edge.sourceNodeIds, targetNodeIds: edge.targetNodeIds } : null,
    sources: sources.map((source) => ({ nodeId: source.nodeId, supportLocationIdentity: source.supportLocationIdentity, totalSupportPoints: source.sourceFields?.totalSupportPoints, componentCount: source.components.length, references: source.persistentReferences })),
    events: events.map((event) => ({ eventId: event.eventId, type: event.type, sourceXmlNode: event.sourceXmlNode, targetXmlNode: event.targetXmlNode, normalizedState: event.normalizedState, reasonCodes: event.reasonCodes })),
  };
});
console.log(JSON.stringify({
  compareOk: result.compareOk,
  compareStage: result.compareStage,
  phase1Metrics: result.phase1Guard?.metrics,
  phase2Metrics: result.phase2Guard?.metrics,
  phase3Metrics: result.metrics,
  phase4Oracle,
  phase4Evidence,
}, null, 2));
if (!result.compareOk || result.compareStage === 'CONVERSION_BLOCKED') process.exit(3);
if (result.phase1Guard.metrics.falsePositives || result.phase1Guard.metrics.falseNegatives) process.exit(4);
if (result.phase2Guard.metrics.falsePositives || result.phase2Guard.metrics.falseNegatives) process.exit(5);
if (result.metrics.falsePositives || result.metrics.falseNegatives) process.exit(6);
process.exit(0);
