import fs from 'node:fs';

import { runSupportRevisionCompare } from '../tabs/csv-rev-compare/support-revision-engine.js';
import { SUPPORT_REV_LINE_IDENTITY_SHELL_EVENT } from '../tabs/csv-rev-compare/support-revision-line-identity-shell.js';
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

const expectedKey = 'SL-111001(REF)||8"-P-1110XXX-METALLIC';
const shellEvents = compare.ledger.events.filter((event) => event.type === SUPPORT_REV_LINE_IDENTITY_SHELL_EVENT);
const detectedKeys = new Set(shellEvents.flatMap((event) => {
  const target = compare.targetModel.locationByNodeId.get(event.targetXmlNode);
  return target ? [target.supportLocationIdentity] : [];
}));
const truePositive = detectedKeys.has(expectedKey);
const falsePositives = [...detectedKeys].filter((key) => key !== expectedKey).sort();
const falseNegatives = truePositive ? [] : [expectedKey];

const expectedShellEvent = shellEvents.find((event) => {
  const target = compare.targetModel.locationByNodeId.get(event.targetXmlNode);
  return target?.supportLocationIdentity === expectedKey;
}) || null;
const source = expectedShellEvent ? compare.sourceModel.locationByNodeId.get(expectedShellEvent.sourceXmlNode) || null : null;
const shell = expectedShellEvent ? compare.targetModel.locationByNodeId.get(expectedShellEvent.targetXmlNode) || null : null;
const activeTarget = expectedShellEvent
  ? compare.targetModel.locationByNodeId.get(expectedShellEvent.normalizedState?.activeSuccessorTargetXmlNode) || null
  : null;
const activePipeEvent = source && activeTarget
  ? compare.ledger.events.find((event) => event.type === 'PIPE_IDENTITY_CHANGED'
      && event.sourceXmlNode === source.nodeId
      && event.targetXmlNode === activeTarget.nodeId
      && event.normalizedState?.projection === 'LINE_NUMBER_CHANGE') || null
  : null;

const remarksIndex = compare.output.headers.indexOf('REMARKS (IF ANY)');
const outputByRow = new Map(compare.output.rows
  .filter((row) => row.disposition === 'REV2')
  .map((row) => [row.sourceRowId, row]));
const shellRemark = shell ? outputByRow.get(shell.sourceRowId)?.values?.[remarksIndex] || '' : '';
const activeRemark = activeTarget ? outputByRow.get(activeTarget.sourceRowId)?.values?.[remarksIndex] || '' : '';
const wrongRenderedRemarks = shellEvents.flatMap((event) => {
  const target = compare.targetModel.locationByNodeId.get(event.targetXmlNode);
  const remark = target ? outputByRow.get(target.sourceRowId)?.values?.[remarksIndex] || '' : '';
  return remark === 'Invalid (Line No. Changed)' ? [] : [{ key: target?.supportLocationIdentity || '', remark }];
});

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
  lineIdentityShell: {
    expected: 1,
    detected: detectedKeys.size,
    truePositives: truePositive ? 1 : 0,
    falsePositives: falsePositives.length,
    falseNegatives: falseNegatives.length,
    detectedKeys: [...detectedKeys].sort(),
    falsePositiveKeys: falsePositives,
    falseNegativeKeys: falseNegatives,
    shellRemark,
    activeRemark,
    activePipeEventPresent: Boolean(activePipeEvent),
    sharedReferences: expectedShellEvent?.persistentReferences || [],
    matchingMethod: expectedShellEvent?.matchingMethod || '',
    reasonCodes: expectedShellEvent?.reasonCodes || [],
    wrongRenderedRemarks,
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

if (!truePositive || falsePositives.length || falseNegatives.length) process.exit(10);
if (shellRemark !== 'Invalid (Line No. Changed)' || wrongRenderedRemarks.length) process.exit(11);
if (!activePipeEvent || !activeRemark.includes('Line No. Change(Old Line No. 8"-P-1110XXX-METALLIC)')) process.exit(12);
if (!expectedShellEvent?.persistentReferences?.length) process.exit(13);
if (tombstoneWordingFailures.length) process.exit(14);
if (guards.phase1Guard.metrics.falsePositives || guards.phase1Guard.metrics.falseNegatives) process.exit(15);
if (guards.phase3Guard.metrics.falsePositives || guards.phase3Guard.metrics.falseNegatives) process.exit(16);
if (guards.metrics.falsePositives || guards.metrics.falseNegatives) process.exit(17);
process.exit(0);