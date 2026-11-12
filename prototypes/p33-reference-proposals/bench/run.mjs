import { parseArgs, readBenchmark, writeResult, CARD_DIR } from '../kit/node.mjs';
import { timeMedian } from '../kit/core.mjs';
import { resolve } from 'node:path';
import { makeMap } from '../tests/fixture-tools.mjs';
import { proposeFromReference } from '../engine/propose.mjs';
const args = parseArgs();
args.roots.XCU = resolve(args['repo-root'] || resolve(CARD_DIR,'../..'));
const a = await readBenchmark('X-T', args), b = await readBenchmark('X-TEXP', args);
const map = await makeMap(a.bytes,b.bytes,{sourceName:'T.CII',targetName:'TEXPECTED-PARTIALLLYDONE.CII'});
const {ms,runs,last} = await timeMedian(()=>proposeFromReference(a.bytes,b.bytes,map));
const proposals = last.changeset?.changes.length ?? null;
const row = { bench:'B1', input:['X-T','X-TEXP'], sha256:[a.entry.sha256,b.entry.sha256], pairs:map.pairs.length,
  proposals, unchanged:last.unchanged?.length, notComparable:last.notComparable?.length, ms, runs,
  pass:last.ok && proposals===0 && last.unchanged.length===124 && ms<1000 };
console.log(JSON.stringify(writeResult([row]),null,2));
process.exitCode = row.pass ? 0 : 1;
