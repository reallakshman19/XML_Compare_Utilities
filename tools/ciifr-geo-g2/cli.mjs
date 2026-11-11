#!/usr/bin/env node
// CLI consumer of a PR181 `previewEvidence` JSON or an equivalent graph pair.
import {readFile} from 'node:fs/promises';
import {reviewLedger} from './ledger.mjs';
async function main() {
  const [sourcePath, hypothesesPath, mode = 'OR'] = process.argv.slice(2);
  if (!sourcePath) throw Error('USAGE: node cli.mjs preview.json [hypotheses.json] [Manual|Topology|OR|AND]');
  const payload = JSON.parse(await readFile(sourcePath, 'utf8'));
  if (!payload?.graphs?.source || !payload.graphs.target) throw Error('G2_PREVIEW_GRAPHS_REQUIRED');
  const inputs = hypothesesPath ? JSON.parse(await readFile(hypothesesPath, 'utf8')) : {};
  const result = reviewLedger(payload.graphs.source, payload.graphs.target, inputs, mode);
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}
main().catch(error => {console.error(error.message); process.exitCode = 1;});
