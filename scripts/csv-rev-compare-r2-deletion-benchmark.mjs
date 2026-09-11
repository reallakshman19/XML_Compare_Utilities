import fs from 'node:fs';

import { runSupportRevisionCompare } from '../tabs/csv-rev-compare/support-revision-engine.js';
import { SUPPORT_REV_DELETION_STATE_EVENT } from '../tabs/csv-rev-compare/support-revision-deletion-state.js';
import { runTotalSupportPointChangeBenchmark } from '../tabs/csv-rev-compare/support-revision-phase4-benchmark.js';

const [earlierPath, laterPath] = process.argv.slice(2);
if (!earlierPath || !laterPath) process.exit(2);

const earlier = fs.readFileSync(earlierPath, 'utf8');
const later = fs.readFileSync(laterPath, 'utf8');
const compare = runSupportRevisionCompare(earlier, later);
if (!compare.exportReady) {
  console.error(JSON.stringify({ stage: compare.stage, diagnostics: compare.diagnostics }, null, 2));
  process.exit(3);
}

const expected = new Set([
  'SL-111043(REF)||BWGA-1000-2"-P8310007-253461P1-01',
  'SL-111051(REF)||BWGA-1000-2"-P8310007-253461P1-01',
  'SL-111054(REF)||BWGA-1000-2"-P8310007-253461P1-01',
  'SL-111058(REF)||BWGA-1000-2"-P8310007-253461P1-01',
  'SL-111063(REF)||BWGA-1000-2"-P8310007-253461P1-01',
  'SL-111067(REF)||BWGA-1000-2"-P8310001-13421-01',
  'SL-111067(REF)||BWGA-1000-2"-P8310007-253461P1-01',
  'SL-111068(REF)||BWGA-1000-2"-P8310001-13421-01',
  'SL-111068(REF)||BWGA-1000-3/4"-D8310024-253461P1-01',
  'SL-111070(REF)||BWGA-1000-2"-P8310001-13421-01',
  'SL-111071(REF)||BWGA-1000-2"-D8310001-13411-01',
  'SL-111071(REF)||BWGA-1000-2"-D8310002-13411-01',
  'SL-111071(REF)||BWGA-1000-3/4"-D8310023-13411-01',
  'SL-111072(REF)||BWGA-1000-2"-D8310001-13411-01',
  'SL-111072(REF)||BWGA-1000-2"-D8310002-13411-01',
  'SL-111073(REF)||BWGA-1000-2"-P8310001-13421-01',
  'SL-111073(REF)||BWGA-1000-2"-P8310007-253461P1-01',
]);

const targetByNode = compare.targetModel.locationByNodeId;
const deletionEvents = compare.ledger.events.filter((event) => event.type === SUPPORT_REV_DELETION_STATE_EVENT);
const detected = new Set(deletionEvents.flatMap((event) => {
  const target = targetByNode.get(event.targetXmlNode);
  return target ? [target.supportLocationIdentity] : [];
}));
const truePositives = [...expected].filter((key) => detected.has(key)).sort();
const falsePositives = [...detected].filter((key) => !expected.has(key)).sort();
const falseNegatives = [...expected].filter((key) => !detected.has(key)).sort();

const remarksIndex = compare.output.headers.indexOf('REMARKS (IF ANY)');
const outputByRow = new Map(compare.output.rows.filter((row) => row.disposition === 'REV2').map((row) => [row.sourceRowId, row]));
const wrongRenderedRemarks = deletionEvents.flatMap((event) => {
  const target = targetByNode.get(event.targetXmlNode);
  const output = outputByRow.get(target?.sourceRowId);
  const remark = output?.values?.[remarksIndex] || '';
  return remark === 'Support deleted' ? [] : [{ key: target?.supportLocationIdentity || '', remark }];
});

const invalidSupportKey = 'SL-111069(REF)||BWGA-1000-3/4"-D8310024-253461P1-01';
const invalidSupportNotCoerced = !detected.has(invalidSupportKey);

const tombstoneWordingFailures = compare.ledger.events
  .filter((event) => event.type === 'SUPPORT_LOCATION_REMOVED')
  .flatMap((event) => {
    const remark = compare.remarks.sourceRemarks?.[event.sourceCsvRowId]?.remark || '';
    return remark === 'Invalid Support?, This pipe no longer reported in latest report'
      ? []
      : [{ rowId: event.sourceCsvRowId, remark }];
  });

const guards = runTotalSupportPointChangeBenchmark(earlier, later);
const result = {
  deletion: {
    expected: expected.size,
    detected: detected.size,
    truePositives: truePositives.length,
    falsePositives: falsePositives.length,
    falseNegatives: falseNegatives.length,
    truePositiveKeys: truePositives,
    falsePositiveKeys: falsePositives,
    falseNegativeKeys: falseNegatives,
    wrongRenderedRemarks,
    invalidSupportNotCoerced,
    tombstoneWordingFailures,
  },
  regressionGuards: {
    phase1: guards.phase1Guard.metrics,
    phase2KnownR1State: guards.phase2Guard.metrics,
    phase3: guards.phase3Guard.metrics,
    phase4: guards.metrics,
  },
};
console.log(JSON.stringify(result));

if (falsePositives.length || falseNegatives.length || wrongRenderedRemarks.length || !invalidSupportNotCoerced || tombstoneWordingFailures.length) process.exit(10);
if (guards.phase1Guard.metrics.falsePositives || guards.phase1Guard.metrics.falseNegatives) process.exit(11);
if (guards.phase3Guard.metrics.falsePositives || guards.phase3Guard.metrics.falseNegatives) process.exit(12);
if (guards.metrics.falsePositives || guards.metrics.falseNegatives) process.exit(13);
process.exit(0);
