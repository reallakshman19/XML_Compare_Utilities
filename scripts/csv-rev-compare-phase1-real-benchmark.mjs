import fs from 'node:fs';
import { parseTableSource } from '../xml-compare/table-categorizer/table-categorized-xml-source-parser.js';
import { canonicalizeSupportRevisionSource } from '../tabs/csv-rev-compare/support-revision-pipeline.js';
import { runLoadChangeBenchmark } from '../tabs/csv-rev-compare/support-revision-phase3-benchmark.js';

const [earlierPath, laterPath] = process.argv.slice(2);
if (!earlierPath || !laterPath) process.exit(2);
const earlier = fs.readFileSync(earlierPath, 'utf8');
const later = fs.readFileSync(laterPath, 'utf8');
const result = runLoadChangeBenchmark(earlier, later);
const oracle = canonicalizeSupportRevisionSource(parseTableSource(later, {
  sourceId: 'BENCHMARK_R3',
  sourceName: 'Benchmark later revision / R3 oracle',
  sourceType: 'benchmarkText',
  delimiterMode: 'auto',
  firstRowIsHeader: true,
}));
const oracleRows = oracle.rows.flatMap((row) => {
  const remark = String(row.rawByHeader?.['REMARKS (IF ANY)'] ?? '').trim();
  if (!remark) return [];
  return [{
    rowId: row.rowId,
    civilSecondarySupport: String(row.rawByHeader?.CIVILSECONDARYSUPPORT ?? '').trim(),
    pipe: String(row.rawByHeader?.PIPE ?? '').trim(),
    totalSupportPoints: String(row.rawByHeader?.['TOTAL SUPPORT POINTS ON SECONDARY'] ?? '').trim(),
    primarySupport: String(row.rawByHeader?.['PIPING PRIMARY SUPPORT'] ?? '').trim(),
    primarySupportReference: String(row.rawByHeader?.['PIPING PRIMARY SUPPORT REFERENCE'] ?? '').trim(),
    supportType: String(row.rawByHeader?.['SUPPORT TYPE'] ?? '').trim(),
    remark,
  }];
});
console.log(JSON.stringify({
  compareOk: result.compareOk,
  compareStage: result.compareStage,
  phase1Metrics: result.phase1Guard?.metrics,
  phase2Metrics: result.phase2Guard?.metrics,
  phase3Metrics: result.metrics,
  oracleRows,
}, null, 2));
if (!result.compareOk || result.compareStage === 'CONVERSION_BLOCKED') process.exit(3);
if (result.phase1Guard.metrics.falsePositives || result.phase1Guard.metrics.falseNegatives) process.exit(4);
if (result.phase2Guard.metrics.falsePositives || result.phase2Guard.metrics.falseNegatives) process.exit(5);
if (result.metrics.falsePositives || result.metrics.falseNegatives) process.exit(6);
process.exit(0);
