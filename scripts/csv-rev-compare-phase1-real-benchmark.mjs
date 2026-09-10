import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { runPsNoChangeBenchmark } from '../tabs/csv-rev-compare/support-revision-phase1-benchmark.js';
import { runSupportLocationChangeBenchmark } from '../tabs/csv-rev-compare/support-revision-phase2-benchmark.js';

const DELIVERY_HEAD = '1e5aad7611cb7c5a36f2e62908a9e972f1289a1a';
const [earlierPath, laterPath, outputPath] = process.argv.slice(2);
if (!earlierPath || !laterPath) {
  console.error('usage: node scripts/csv-rev-compare-phase1-real-benchmark.mjs R2.csv R3.csv [output.json]');
  process.exit(2);
}

for (const testFile of [
  'tests/csv-rev-compare-remediation.test.js',
  'tests/csv-rev-compare-phase2-support-location-change.test.js',
]) {
  const run = spawnSync(process.execPath, [testFile], { stdio: 'inherit' });
  if (run.status !== 0) process.exit(run.status || 20);
}

const earlier = fs.readFileSync(earlierPath, 'utf8');
const later = fs.readFileSync(laterPath, 'utf8');
const phase1 = runPsNoChangeBenchmark(earlier, later);
const phase2 = runSupportLocationChangeBenchmark(earlier, later);

const summary = {
  schema: 'support-revision-phase1-phase2-qualification/v1',
  deliveryHead: DELIVERY_HEAD,
  phase1: {
    bucket: phase1.bucket,
    compareStage: phase1.compareStage,
    compareOk: phase1.compareOk,
    metrics: phase1.metrics,
    expectedItems: phase1.expected,
    detectedItems: phase1.detected,
  },
  phase2: {
    bucket: phase2.bucket,
    compareStage: phase2.compareStage,
    compareOk: phase2.compareOk,
    metrics: phase2.metrics,
    expectedItems: phase2.expected,
    detectedItems: phase2.detected,
    phase1Guard: phase2.phase1Guard,
    coordinateFrame: phase2.compareResult?.lineage?.coordinateFrame || null,
  },
};

const json = JSON.stringify(summary, null, 2);
console.log(json);
if (outputPath) fs.writeFileSync(outputPath, `${json}\n`, 'utf8');

if (!phase1.compareOk || phase1.compareStage === 'CONVERSION_BLOCKED') process.exit(3);
if (phase1.metrics.falsePositives || phase1.metrics.falseNegatives) process.exit(4);
if (!phase2.compareOk || phase2.compareStage === 'CONVERSION_BLOCKED') process.exit(5);
if (phase2.phase1Guard.metrics.falsePositives || phase2.phase1Guard.metrics.falseNegatives) process.exit(6);
if (phase2.metrics.falsePositives || phase2.metrics.falseNegatives) process.exit(7);
