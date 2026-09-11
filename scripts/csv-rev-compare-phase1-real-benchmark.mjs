import fs from 'node:fs';
import { runLoadChangeBenchmark } from '../tabs/csv-rev-compare/support-revision-phase3-benchmark.js';

const [earlierPath, laterPath] = process.argv.slice(2);
if (!earlierPath || !laterPath) process.exit(2);
const earlier = fs.readFileSync(earlierPath, 'utf8');
const later = fs.readFileSync(laterPath, 'utf8');
const result = runLoadChangeBenchmark(earlier, later);
console.log(JSON.stringify({
  compareOk: result.compareOk,
  compareStage: result.compareStage,
  phase1Metrics: result.phase1Guard?.metrics,
  phase2Metrics: result.phase2Guard?.metrics,
  phase3Metrics: result.metrics,
  expected: result.expected,
  detected: result.detected,
}, null, 2));
if (!result.compareOk || result.compareStage === 'CONVERSION_BLOCKED') process.exit(3);
if (result.phase1Guard.metrics.falsePositives || result.phase1Guard.metrics.falseNegatives) process.exit(4);
if (result.phase2Guard.metrics.falsePositives || result.phase2Guard.metrics.falseNegatives) process.exit(5);
process.exit(0);
