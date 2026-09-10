import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { runPsNoChangeBenchmark } from '../tabs/csv-rev-compare/support-revision-phase1-benchmark.js';
import { runSupportLocationChangeBenchmark } from '../tabs/csv-rev-compare/support-revision-phase2-benchmark.js';

const [earlierPath, laterPath, outputPath] = process.argv.slice(2);
if (!earlierPath || !laterPath) {
  console.error('usage: node scripts/csv-rev-compare-phase1-real-benchmark.mjs R2.csv R3.csv [output.json]');
  process.exit(2);
}

const phase2Fixture = spawnSync(process.execPath, ['tests/csv-rev-compare-phase2-support-location-change.test.js'], {
  stdio: 'inherit',
  encoding: 'utf8',
});
if (phase2Fixture.status !== 0) process.exit(20);

const earlier = fs.readFileSync(earlierPath, 'utf8');
const later = fs.readFileSync(laterPath, 'utf8');
const phase1 = runPsNoChangeBenchmark(earlier, later);
const phase2 = runSupportLocationChangeBenchmark(earlier, later);

const summary = {
  qualificationCarrier: 'issue-1181-csv-rev-compare-xml',
  productionTree: 'd96529f54a18ad9be4f3ae234e9d83be9a2bf919',
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
    phase1Guard: phase2.phase1Guard,
    coordinateFrame: phase2.compareResult?.lineage?.coordinateFrame || null,
    expectedItems: phase2.expected,
    detectedItems: phase2.detected,
  },
};

const json = JSON.stringify(summary, null, 2);
console.log(json);
if (outputPath) fs.writeFileSync(outputPath, `${json}\n`, 'utf8');

if (phase1.compareStage === 'CONVERSION_BLOCKED' || phase2.compareStage === 'CONVERSION_BLOCKED') process.exit(3);
if (!phase1.compareOk || !phase2.compareOk) process.exit(4);
if (phase1.metrics.falsePositives || phase1.metrics.falseNegatives) process.exit(5);
if (phase2.phase1Guard.metrics.falsePositives || phase2.phase1Guard.metrics.falseNegatives) process.exit(6);
if (phase2.metrics.falsePositives || phase2.metrics.falseNegatives) process.exit(7);
