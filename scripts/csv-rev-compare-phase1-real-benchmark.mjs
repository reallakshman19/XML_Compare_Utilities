import fs from 'node:fs';
import { runPsNoChangeBenchmark } from '../tabs/csv-rev-compare/support-revision-phase1-benchmark.js';

const [earlierPath, laterPath, outputPath] = process.argv.slice(2);
if (!earlierPath || !laterPath) {
  console.error('usage: node scripts/csv-rev-compare-phase1-real-benchmark.mjs R2.csv R3.csv [output.json]');
  process.exit(2);
}

const earlier = fs.readFileSync(earlierPath, 'utf8');
const later = fs.readFileSync(laterPath, 'utf8');
const result = runPsNoChangeBenchmark(earlier, later);
const summary = {
  schema: result.schema,
  bucket: result.bucket,
  compareStage: result.compareStage,
  compareOk: result.compareOk,
  metrics: result.metrics,
  expectedItems: result.expected,
  detectedItems: result.detected,
};

const json = JSON.stringify(summary, null, 2);
console.log(json);
if (outputPath) fs.writeFileSync(outputPath, `${json}\n`, 'utf8');
if (result.compareStage === 'CONVERSION_BLOCKED') process.exit(3);
