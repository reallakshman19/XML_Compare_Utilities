import { webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { inspectCiiWorkspaceSourceSetWithVersionBridge } from '../../tabs/cii-workspace/cii-workspace-source-set.js';
import { ciiAutomaticBaseSelection } from '../../tabs/cii-workspace/cii-workspace-base-loop-selection.js';
import { createCiiWriter2SourceSetPreviewWithVersionBridge } from '../../tabs/cii-workspace/cii-workspace-multisource-preview.js';

const cryptoRef = globalThis.crypto || webcrypto;
const sourceNames = ['S1.CII', 'S2.CII', 'S3.CII'];
const sources = sourceNames.map((fileName, index) => ({
  sourceId: `S${index + 1}`,
  fileName,
  bytes: readFileSync(new URL(`../../Benchmark/${fileName}`, import.meta.url)),
}));
const targetBytes = readFileSync(new URL('../../Benchmark/T.CII', import.meta.url));

const inspection = await inspectCiiWorkspaceSourceSetWithVersionBridge(
  { sources, targetBytes, targetFileName: 'T.CII' },
  { cryptoRef },
);
const baseLoopsBySource = {};
for (const member of inspection.memberInspections || []) {
  const choice = ciiAutomaticBaseSelection(member.inspection?.baseAnchorSuggestions || []);
  if (choice.status === 'READY') baseLoopsBySource[member.sourceId] = choice.baseLoops;
}
delete baseLoopsBySource.S1;

const anchors = [
  { sourceNodeId: '3910', targetNodeId: '875' },
  { sourceNodeId: '3940', targetNodeId: '880' },
  { sourceNodeId: '3870', targetNodeId: '870' },
];

const preview = await createCiiWriter2SourceSetPreviewWithVersionBridge({
  sources,
  targetBytes,
  targetFileName: 'T.CII',
  baseLoopsBySource,
  anchorPairsBySource: { S1: anchors },
}, { cryptoRef });

const s1 = preview.memberPreviews.find((item) => item.sourceId === 'S1')?.preview;
if (!s1) throw new Error('S1_PREVIEW_MISSING');
const correspondence = s1.multiBaseCorrespondence;
if (!correspondence) throw new Error('S1_MULTI_BASE_CORRESPONDENCE_MISSING');

function unresolvedRow(row) {
  const candidates = row?.evidence?.candidates;
  const propagation = row?.evidence?.propagation;
  return {
    kind: row.kind,
    correspondenceId: row.correspondenceId,
    sourceElementId: row.sourceElementId ?? null,
    targetElementIds: row.targetElementIds || [],
    sourceNodeId: row.sourceNodeId ?? null,
    targetNodeId: row.targetNodeId ?? null,
    authority: row.authority ?? null,
    status: row.status ?? null,
    propagation: propagation ? {
      sourceNode: propagation.sourceNode ?? null,
      targetNode: propagation.targetNode ?? null,
      depth: propagation.depth ?? null,
      assignmentStatus: propagation.assignmentStatus ?? null,
      assignmentGap: propagation.assignmentGap ?? null,
      requiredGap: propagation.requiredGap ?? null,
      blocker: propagation.blocker ?? null,
      assignmentScore: propagation.assignmentScore ?? null,
    } : null,
    candidates: candidates ? {
      status: candidates.status ?? null,
      blocker: candidates.blocker ?? null,
      winnerIdentityConfidence: candidates.winnerIdentityConfidence ?? null,
      winnerElementId: candidates.winner?.elementId ?? candidates.winner?.target?.elementId ?? null,
      winnerScore: candidates.winner?.rankingScore ?? candidates.winner?.score ?? null,
      runnerElementId: candidates.runner?.elementId ?? candidates.runner?.target?.elementId ?? null,
      runnerScore: candidates.runner?.rankingScore ?? candidates.runner?.score ?? null,
    } : null,
  };
}

const loopResults = (correspondence.loopResults || []).map((item) => ({
  loopId: item.loop?.loopId ?? null,
  method: item.loop?.method ?? null,
  anchors: item.loop?.anchorPairs || [],
  status: item.correspondence?.status ?? null,
  blockers: item.correspondence?.blockers || [],
  propagation: item.correspondence?.propagation || null,
  unresolvedRows: [
    ...(item.correspondence?.elementRows || []),
    ...(item.correspondence?.nodeRows || []),
  ].filter((row) => row?.status === 'UNRESOLVED').map(unresolvedRow),
}));

const combinedUnresolved = [
  ...(correspondence.elementRows || []),
  ...(correspondence.nodeRows || []),
].filter((row) => row?.status === 'UNRESOLVED').map(unresolvedRow);

const result = {
  anchors,
  memberStatus: s1.correspondence?.status ?? null,
  memberBlockers: s1.correspondence?.blockers || [],
  combination: correspondence.combination ?? null,
  seedCoverage: correspondence.seedCoverage ?? null,
  seedDiagnostics: correspondence.seedDiagnostics || [],
  conflicts: correspondence.conflicts || [],
  combinedUnresolvedCount: combinedUnresolved.length,
  combinedUnresolved,
  loopResults,
};
console.log('THREE_SEED_DIAGNOSTIC=' + JSON.stringify(result, null, 2));
