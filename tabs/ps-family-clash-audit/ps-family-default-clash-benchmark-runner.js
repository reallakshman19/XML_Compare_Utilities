import { mkdirSync, writeFileSync } from 'node:fs';
import { buildDefaultPsFamilyClashBenchmark } from './ps-family-default-clash-benchmark.js';

const output = 'artifacts/ps-family-default-clash-benchmark';
const result = buildDefaultPsFamilyClashBenchmark();
const required = [
  result.source.structuralClashCount === 2,
  result.source.supportChainClashCount === 3,
  result.strict.standard.structural.precision === 1,
  result.strict.standard.structural.recall === 1,
  result.strict.explicitReferenceChainMetrics.recall === 1,
  result.strict.analyticalChainMetrics.recall === 0,
  result.clashImprintedControl.analyticalChainMetrics.recall === 1,
  result.summary.status === 'MATERIAL_GAPS_FOUND',
];
if (required.some((value) => !value)) throw new Error('Default PS audit benchmark contract failed.');
mkdirSync(output, { recursive: true });
writeFileSync(`${output}/benchmark.json`, `${JSON.stringify(result, null, 2)}\n`);
writeFileSync(`${output}/converted-strict.json`, `${JSON.stringify(result.convertedModels.strict, null, 2)}\n`);
writeFileSync(`${output}/converted-control.json`, `${JSON.stringify(result.convertedModels.clashImprintedControl, null, 2)}\n`);
writeFileSync(`${output}/gap-report.csv`, gapCsv(result.gaps));
console.log(JSON.stringify(result.summary, null, 2));

function gapCsv(rows) {
  const headers = ['Code', 'Severity', 'ReferenceObservation', 'GapObservation', 'Recommendation'];
  const lines = rows.map((row) => [row.code, row.severity, row.referenceObservation, row.gapObservation, row.recommendation].map(cell).join(','));
  return `${headers.join(',')}\n${lines.join('\n')}\n`;
}
function cell(value) { return `"${String(value ?? '').replace(/"/g, '""')}"`; }
