import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';

import {
  convertCiiNeutralVersionLossless,
  detectCiiNeutralVersion,
} from '../tabs/cii-workspace/cii-workspace-v11-v14-converter.js';
import { intakeCiiWorkspaceDocument } from '../tabs/cii-workspace/cii-workspace-intake.js';
import { adaptCiiDocumentToTopologyGraph } from '../tabs/cii-workspace/cii-workspace-topology-adapter.js';
import { prepareCiiWorkspaceTargetWithVersionBridge } from '../tabs/cii-workspace/cii-workspace-writer-version-bridge.js';
import {
  uniqueIncidentComponentLengthPairs,
  selectPhysicalCandidatePairs,
  suggestCiiPhysicalMethodAAnchors,
} from '../tabs/cii-workspace/cii-workspace-anchor-physical-candidates.js';
import { suggestCiiBaseAnchorPairs } from '../tabs/cii-workspace/cii-workspace-anchor-suggestions.js';
import {
  ciiAutomaticBaseSelection,
  ciiQualifiedLoopsForSuggestion,
} from '../tabs/cii-workspace/cii-workspace-base-loop-selection.js';

const S1_PATH = new URL('../Benchmark/S1.CII', import.meta.url);
const T_PATH = new URL('../Benchmark/T.CII', import.meta.url);
const budgets = [3, 5, 10, 11, 12, 15, 24];
const manualDiagnosticKeys = new Set(['3910=>875', '3940=>880', '3870=>870']);

function pairKey(row) {
  return `${String(row?.sourceNodeId || '')}=>${String(row?.targetNodeId || '')}`;
}
function suggestionSummary(row) {
  const loops = ciiQualifiedLoopsForSuggestion(row);
  return {
    pair: pairKey(row),
    confidence: String(row?.confidence || ''),
    basisMethod: String(row?.basisMethod || ''),
    score: Number(row?.score || 0),
    winnerGap: Number(row?.winnerGap || 0),
    methodA: {
      status: String(row?.methodA?.status || ''),
      baseId: String(row?.methodA?.bestBase?.baseId || ''),
      selectedBasisId: String(row?.methodA?.bestBase?.selectedBasisId || ''),
      confidence: String(row?.methodA?.bestBase?.confidence || row?.methodA?.confidence || ''),
      anchorCount: Number(row?.methodA?.bestBase?.anchorCount || 0),
      validationAnchorCount: Number(row?.methodA?.bestBase?.validationAnchorCount || 0),
      weight: Number(row?.methodA?.bestBase?.weight?.total || 0),
    },
    methodB: {
      status: String(row?.methodB?.status || ''),
      weight: Number(row?.methodBWeight?.total || 0),
    },
    qualifiedLoopCount: loops.length,
    qualifiedLoops: loops.map((loop) => ({
      method: loop.method,
      baseId: loop.baseId,
      anchors: (loop.anchorPairs || []).map(pairKey),
    })),
    reviewOnly: row?.candidateGeneration?.authorityRole === 'REVIEW_DISCOVERY_ONLY_NOT_IDENTITY_AUTHORITY'
      || row?.candidateGeneration?.reviewDiscovery?.reviewOnly === true,
    manualDiagnosticKey: manualDiagnosticKeys.has(pairKey(row)),
  };
}

async function normalizeSource(bytes, fileName) {
  const version = detectCiiNeutralVersion(bytes);
  if (version === 11) return { version, bytes };
  const down = await convertCiiNeutralVersionLossless(bytes, 11, { fileName });
  return { version, bytes: down.outputBytes };
}

function instrumentationLedger() {
  const rows = [];
  return {
    rows,
    instrumentation: {
      record(name, value = null) {
        rows.push([String(name), value == null ? null : Number(value)]);
      },
    },
  };
}

const sourceRaw = readFileSync(S1_PATH);
const targetRaw = readFileSync(T_PATH);
const sourceNormalized = await normalizeSource(sourceRaw, 'S1.CII');
const targetPrepared = await prepareCiiWorkspaceTargetWithVersionBridge(targetRaw, 'T.CII', { writerVersion: '2' });
const sourceDocument = await intakeCiiWorkspaceDocument(sourceNormalized.bytes, 'S1.CII', { side: 'SOURCE' });
const sourceGraph = adaptCiiDocumentToTopologyGraph(sourceDocument);
const targetGraph = targetPrepared.targetGraph;
const allPhysicalPairs = uniqueIncidentComponentLengthPairs(sourceGraph, targetGraph);

const matrix = [];
for (const budget of budgets) {
  const selectedPairs = selectPhysicalCandidatePairs(sourceGraph, targetGraph, allPhysicalPairs, budget);
  const physicalStarted = performance.now();
  const physicalRows = suggestCiiPhysicalMethodAAnchors(sourceGraph, targetGraph, {
    methodAPhysicalCandidateLimit: budget,
  });
  const physicalMs = performance.now() - physicalStarted;

  const productLedger = instrumentationLedger();
  const productStarted = performance.now();
  const productSuggestions = suggestCiiBaseAnchorPairs(sourceGraph, targetGraph, {
    methodAPhysicalCandidateLimit: budget,
    baseAnchorSuggestionLimit: 8,
    baseAnchorDisplayLimit: 5,
    instrumentation: productLedger.instrumentation,
  });
  const productMs = performance.now() - productStarted;

  const expandedStarted = performance.now();
  const expandedSuggestions = suggestCiiBaseAnchorPairs(sourceGraph, targetGraph, {
    methodAPhysicalCandidateLimit: budget,
    baseAnchorSuggestionLimit: 8,
    baseAnchorDisplayLimit: 24,
  });
  const expandedMs = performance.now() - expandedStarted;

  const productChoice = ciiAutomaticBaseSelection(productSuggestions);
  const expandedChoice = ciiAutomaticBaseSelection(expandedSuggestions);

  matrix.push({
    budget,
    rawPhysicalCandidateCount: allPhysicalPairs.length,
    selectedPhysicalCandidateCount: selectedPairs.length,
    selectedPhysicalPairs: selectedPairs.map(pairKey),
    selectedManualDiagnosticKeys: selectedPairs.map(pairKey).filter((key) => manualDiagnosticKeys.has(key)),
    physicalQualifiedSuggestionCount: physicalRows.length,
    physicalQualifiedSuggestions: physicalRows.map(suggestionSummary),
    productTop5: productSuggestions.map(suggestionSummary),
    expandedSuggestions: expandedSuggestions.map(suggestionSummary),
    hiddenAfterTop5: expandedSuggestions.slice(5).map(suggestionSummary),
    productAutomaticChoice: productChoice,
    expandedAutomaticChoice: expandedChoice,
    productVsExpandedChoiceSame:
      productChoice.status === expandedChoice.status
      && String(productChoice.sourceNodeId || '') === String(expandedChoice.sourceNodeId || '')
      && String(productChoice.targetNodeId || '') === String(expandedChoice.targetNodeId || ''),
    timingsMs: {
      physicalOnly: Number(physicalMs.toFixed(3)),
      productWrapper: Number(productMs.toFixed(3)),
      expandedWrapper: Number(expandedMs.toFixed(3)),
    },
    instrumentation: productLedger.rows,
  });
}

const output = {
  schema: 'CIIWriter2S1AutomaticAnchorC1Diagnostic.v1',
  sourceVersion: sourceNormalized.version,
  targetVersion: targetPrepared.target.originalVersion,
  sourceNodeCount: sourceGraph.nodes?.length || 0,
  targetNodeCount: targetGraph.nodes?.length || 0,
  allPhysicalPairCount: allPhysicalPairs.length,
  allPhysicalPairs: allPhysicalPairs.map(pairKey),
  manualSeedPresenceInRawPhysicalCandidates: [...manualDiagnosticKeys].map((key) => ({
    key,
    present: allPhysicalPairs.some((row) => pairKey(row) === key),
  })),
  matrix,
};

console.log('S1_C1_DIAGNOSTIC=' + JSON.stringify(output));
