// Test-only fixture generator. Writes only into a newly created directory.
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { readBenchmark } from '../kit/node.mjs';
import { readCii14 } from '../kit/cii14.mjs';
import { makeS1M, makeMap } from './fixture-tools.mjs';
const dest = process.argv[2];
if (!dest) { console.error('usage: node tests/demo.mjs <new-directory>'); process.exit(2); }
const target = await readBenchmark('X-S1');
const reference = makeS1M(target.bytes);
const i = readCii14(target.bytes).rigids[0].element;
const map = await makeMap(reference,target.bytes,{sourceName:'X-S1M.cii',targetName:'S1.CII',selections:[[i,i,'approved']]});
mkdirSync(dest);
const a=resolve(dest,'X-S1M.cii'), m=resolve(dest,'map.json'), out=resolve(dest,'proposals.json');
writeFileSync(a,reference,{flag:'wx'}); writeFileSync(m,JSON.stringify(map,null,2)+'\n',{flag:'wx'});
console.log('node cli.mjs propose '+[a,target.path,m,out].map(x=>JSON.stringify(x)).join(' '));
