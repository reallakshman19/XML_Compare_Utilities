import {readFileSync,writeFileSync,openSync,closeSync,unlinkSync,lstatSync} from 'node:fs';
import {resolve,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {planTransfer} from './engine/plan.mjs';
import {applyTransfer} from './engine/apply.mjs';
import {sha256Hex} from './kit/core.mjs';
const refusal=(code,detail)=>({ok:false,refusals:[{code,where:'cli',detail}]});
const usage='node cli.mjs plan <source.xml> <target.xml> <pairs.json> [--items name,weight,element] [--bore] [--choices c.json] [--out plan.json]\nnode cli.mjs apply <source.xml> <target.xml> <pairs.json|map.json> --out revised.xml --changes changes.json [--items name,weight,element] [--bore] [--choices c.json]';
function absent(path){try{lstatSync(path);return false;}catch(e){if(e.code==='ENOENT')return true;throw e;}}
// Exclusive creation of both outputs, and rollback of files created by this call on I/O failure.
function writeBoth(out,changes,bytes,ledger){
 const created=[];
 try{for(const path of [out,changes]){const fd=openSync(path,'wx');created.push({path,fd});}
  writeFileSync(created[0].fd,bytes);writeFileSync(created[1].fd,JSON.stringify(ledger,null,2)+'\n');
  for(const f of created){closeSync(f.fd);f.fd=null;}
 }catch(e){for(const f of created.reverse()){if(f.fd!==null)try{closeSync(f.fd);}catch{}try{unlinkSync(f.path);}catch(cleanup){throw new Error('Output rollback failed: '+cleanup.message+'; original: '+e.message);}}throw e;}
}
export async function runCli(argv,deps={}){
 const [cmd,source,target,pairFile,...args]=argv;
 if(!['plan','apply'].includes(cmd)||!source||!target||!pairFile)return {usage};
 const opts={};let out,changes,choiceFile;const flags=new Set();
 for(let i=0;i<args.length;i++){const a=args[i];if(flags.has(a))return {usage};flags.add(a);if(a==='--bore')opts.bore=true;else if(['--items','--choices','--out','--changes'].includes(a)&&args[i+1]&&!args[i+1].startsWith('--')){const v=args[++i];if(a==='--items')opts.items=v.split(',');else if(a==='--choices')choiceFile=v;else if(a==='--changes')changes=v;else out=v;}else return {usage};}
 if(cmd==='apply'&&(!out||!changes)||cmd==='plan'&&changes)return {usage};
 try{
  if(cmd==='apply'&&(resolve(out)===resolve(changes)||!absent(out)||!absent(changes)))return refusal('U2_OUTPUT_EXISTS','Both output paths must be distinct and new.');
  const pairBytes=readFileSync(pairFile),pairs=JSON.parse(pairBytes.toString('utf8'));if(choiceFile)opts.choices=JSON.parse(readFileSync(choiceFile,'utf8'));
  const sourceBytes=readFileSync(source),targetBytes=readFileSync(target);
  if(cmd==='plan'){const result=await planTransfer(sourceBytes,targetBytes,pairs,opts);if(out&&result.ok)writeFileSync(out,JSON.stringify(result,null,2)+'\n',{flag:'wx'});return result;}
  const result=await applyTransfer(sourceBytes,targetBytes,pairs,opts,{...deps,sourceFile:basename(source),targetFile:basename(target),pairFileSha256:await sha256Hex(pairBytes)});
  if(!result.ok)return result;
  writeBoth(out,changes,result.bytes,result.ledger);
  return {ok:true,...result.ledger,output:out,changesFile:changes};
 }catch(e){return refusal(e instanceof SyntaxError?'U2_JSON_INVALID':e.code==='EEXIST'&&cmd==='apply'?'U2_OUTPUT_EXISTS':'U2_IO_FAILED',e.message);}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=await runCli(process.argv.slice(2));if(result.usage){console.error(result.usage);process.exitCode=2;}else{console.log(JSON.stringify(result,null,2));process.exitCode=result.ok?0:1;}
}
