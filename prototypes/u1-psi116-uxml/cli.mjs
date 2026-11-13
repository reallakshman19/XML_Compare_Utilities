import {readFile,writeFile,open} from 'node:fs/promises';
import {applyPsi116Edits,U1_FIELDS} from './engine/psi116-patchback.mjs';
const [cmd,...args]=process.argv.slice(2);
try {
  if (cmd==='fields' && !args.length) console.log(JSON.stringify(U1_FIELDS,null,2));
  else if (cmd==='apply' && args.length===3) {
    const [input,editsFile,out]=args;
    try {const h=await open(out,'r'); await h.close(); throw new Error('U1_OUTPUT_EXISTS: '+out);} catch(e) {if(e.code!=='ENOENT') throw e;}
    const bytes=await readFile(input), payload=JSON.parse(await readFile(editsFile,'utf8'));
    if (!payload || Array.isArray(payload) || typeof payload!=='object' || typeof payload.fileSha256!=='string' || !Array.isArray(payload.edits)) throw new Error('U1_VALUE_INVALID: expected {fileSha256, edits} envelope');
    const {edits,fileSha256}=payload;
    const result=await applyPsi116Edits(bytes,edits,{fileSha256});
    await writeFile(out,result.bytes,{flag:'wx'});
    console.log(JSON.stringify({sha256Before:result.sha256Before,sha256After:result.sha256After,changes:result.changes}));
  } else { console.error('Usage: node cli.mjs fields | apply <in.psi116.xml> <edits.json> <out.xml>'); process.exitCode=2; }
} catch(e) { console.error(e.message); process.exitCode=1; }
