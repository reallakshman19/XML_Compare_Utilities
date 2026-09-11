import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { runTotalSupportPointChangeBenchmark } from '../tabs/csv-rev-compare/support-revision-phase4-benchmark.js';

const [earlierPath, laterPath] = process.argv.slice(2);
if (!earlierPath || !laterPath) process.exit(2);

for (const test of [
  'tests/csv-rev-compare-events.test.js',
  'tests/csv-rev-compare-operational.test.js',
  'tests/csv-rev-compare-phase2-support-location-change.test.js',
  'tests/csv-rev-compare-phase3-load-change.test.js',
  'tests/csv-rev-compare-phase4-total-support-points.test.js',
]) {
  execFileSync(process.execPath, [test], { stdio: 'inherit' });
}

const earlier = fs.readFileSync(earlierPath, 'utf8');
const later = fs.readFileSync(laterPath, 'utf8');
const result = runTotalSupportPointChangeBenchmark(earlier, later);

console.log(JSON.stringify({
  phase1Metrics: result.phase1Guard.metrics,
  phase2Metrics: result.phase2Guard.metrics,
  phase3Metrics: result.phase3Guard.metrics,
  phase4Metrics: result.metrics,
  phase4Unsupported: result.unsupported,
}, null, 2));

if (!result.compareOk || result.compareStage === 'CONVERSION_BLOCKED') process.exit(3);
if (result.phase1Guard.metrics.falsePositives || result.phase1Guard.metrics.falseNegatives) process.exit(4);
if (!result.phase2Guard.metrics.expected) process.exit(8);
if (result.phase2Guard.metrics.falsePositives || result.phase2Guard.metrics.falseNegatives) process.exit(5);
if (result.phase3Guard.metrics.falsePositives || result.phase3Guard.metrics.falseNegatives) process.exit(6);
if (result.metrics.falsePositives || result.metrics.falseNegatives) process.exit(7);
process.exit(0);
