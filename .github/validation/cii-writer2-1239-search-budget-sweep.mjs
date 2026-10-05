import { webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { inspectCiiWorkspaceSourceSetWithVersionBridge } from '../../tabs/cii-workspace/cii-workspace-source-set.js';
import { ciiAutomaticBaseSelection } from '../../tabs/cii-workspace/cii-workspace-base-loop-selection.js';

const cryptoRef = globalThis.crypto || webcrypto;
const benchmark = (name) => new URL(`../../Benchmark/${name}`, import.meta.url);
const sourceNames = ['S1.CII', 'S2.CII', 'S3.CII'];
const sources = sourceNames.map((fileName, index) => ({
  sourceId: `S${index + 1}`,
  fileName,
  bytes: readFileSync(benchmark(fileName)),
}));
const targetBytes = readFileSync(benchmark('T.CII'));
const limits = [10, 12, 14, 16, 18, 20, 22, 24];
const results = [];

function summarizeSuggestions(rows = []) {
  const counts = {};
  for (const row of rows) {
    const key = `${String(row?.confidence || 'NONE')}|${String(row?.basisMethod || 'NONE')}`;
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

for (const limit of limits) {
  const started = performance.now();
  const inspection = await inspectCiiWorkspaceSourceSetWithVersionBridge(
    { sources, targetBytes, targetFileName: 'T.CII' },
    { cryptoRef, methodAPhysicalCandidateLimit: limit },
  );
  const choices = (inspection.memberInspections || []).map((member) => {
    const suggestions = member.inspection?.baseAnchorSuggestions || [];
    const choice = ciiAutomaticBaseSelection(suggestions);
    return {
      sourceId: member.sourceId,
      suggestionCount: suggestions.length,
      suggestionBands: summarizeSuggestions(suggestions),
      status: choice.status,
      reason: choice.reason,
      sourceNodeId: choice.sourceNodeId ?? null,
      targetNodeId: choice.targetNodeId ?? null,
      confidence: choice.confidence ?? null,
      basisMethod: choice.basisMethod ?? null,
      selectionKeys: choice.selectionKeys || [],
      baseLoopCount: choice.baseLoops?.length || 0,
      outcomeSignature: choice.outcomeSignature ?? null,
    };
  });
  const elapsedMs = Math.round(performance.now() - started);
  const row = {
    limit,
    elapsedMs,
    allReady: choices.length === 3 && choices.every((choice) => choice.status === 'READY'),
    choices,
  };
  results.push(row);
  console.log(JSON.stringify(row));
}

const firstAllReady = results.find((row) => row.allReady) || null;
console.log('SWEEP_SUMMARY=' + JSON.stringify({
  firstAllReadyLimit: firstAllReady?.limit ?? null,
  firstAllReadyElapsedMs: firstAllReady?.elapsedMs ?? null,
  limits: results.map((row) => ({ limit: row.limit, elapsedMs: row.elapsedMs, allReady: row.allReady })),
}));

if (!firstAllReady) process.exitCode = 2;
