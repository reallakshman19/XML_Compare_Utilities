import { readFileSync, writeFileSync, mkdtempSync, linkSync, rmSync } from 'node:fs';
import { basename, resolve, dirname, join } from 'node:path';
import { finish, usage } from './kit/node.mjs';
import { attempt, require } from './vendor/kit/core.mjs';
import { rigidInventory, baseFor } from './engine/inventory.mjs';
import { parseCsv, proposeFromTable } from './engine/propose.mjs';
import { approveAll } from './engine/approve.mjs';
import { applyWeights } from './engine/run.mjs';
const [cmd,...args]=process.argv.slice(2);
const help='node cli.mjs inventory <cii> | propose <cii> <rows.csv> <out.json> | approve <in.json> <out.json> --limit 20 --by <name> | apply <cii> <changeset.json> <out.cii>';
const len={inventory:1,propose:3,approve:6,apply:3}[cmd];
if(!len||args.length!==len) usage(help);
if(cmd==='approve'&&(args[2]!=='--limit'||args[4]!=='--by'||!args[3].trim()||!args[5].trim()))usage(help);
const load=p=>{try{return new Uint8Array(readFileSync(p));}catch(e){require(false,'INPUT_NOT_FOUND',p,e.message);}};
const json=p=>{const b=load(p);try{return JSON.parse(new TextDecoder().decode(b));}catch(e){require(false,'WEIGHTS_JSON_INVALID',p,e.message);}};
const output=(p,b,inputs)=>{require(!inputs.some(i=>resolve(i)===resolve(p)),'WEIGHTS_OUTPUT_IS_INPUT',p,'Choose a different output path.');let tmp;try{tmp=mkdtempSync(join(dirname(resolve(p)),'.p21-'));const staged=join(tmp,'out');writeFileSync(staged,b,{flag:'wx'});linkSync(staged,p);}catch(e){require(false,'WEIGHTS_OUTPUT_FAILED',p,e.message);}finally{if(tmp)rmSync(tmp,{recursive:true,force:true});}};
const out=await attempt(async()=>{
 const [a,b,c]=args; const at=new Date().toISOString();
 if(cmd==='inventory')return {rows:rigidInventory(load(a))};
 if(cmd==='propose'){const bytes=load(a),cs=proposeFromTable(rigidInventory(bytes),parseCsv(new TextDecoder().decode(load(b))),{base:await baseFor(bytes,basename(a)),createdAt:at});output(c,JSON.stringify(cs,null,2)+'\n',[a,b]);return {changeset:cs};}
 if(cmd==='approve'){const result=approveAll(json(a),{by:args[5],at,errorLimitPct:Number(args[3])});output(b,JSON.stringify(result.changeset,null,2)+'\n',[a]);return result;}
 const result=await applyWeights(load(a),json(b));if(!result.ok)throw Object.assign(new Error('REFUSED'),{refusals:result.refusals});output(c,result.bytes,[a,b]);const {bytes,...report}=result;return report;
});finish(out);
