import {readFileSync,writeFileSync} from 'node:fs';
import {planTransfer} from './engine/plan.mjs';
const [cmd,source,target,pairFile,...args]=process.argv.slice(2);
const usage=()=>{console.error('node cli.mjs plan <source.xml> <target.xml> <pairs.json> [--items name,weight,element] [--bore] [--choices c.json] [--out plan.json]');process.exit(2);};
if(cmd!=='plan'||!source||!target||!pairFile)usage();
const opts={};let out,choiceFile;
for(let i=0;i<args.length;i++){const a=args[i];if(a==='--bore')opts.bore=true;else if(['--items','--choices','--out'].includes(a)&&args[i+1]&&!args[i+1].startsWith('--')){const v=args[++i];if(a==='--items')opts.items=v.split(',');else if(a==='--choices')choiceFile=v;else out=v;}else usage();}
let result;
try{const pairs=JSON.parse(readFileSync(pairFile,'utf8'));if(choiceFile)opts.choices=JSON.parse(readFileSync(choiceFile,'utf8'));result=await planTransfer(readFileSync(source),readFileSync(target),pairs,opts);if(out&&result.ok)writeFileSync(out,JSON.stringify(result,null,2)+'\n',{flag:'wx'});}
catch(e){result={ok:false,refusals:[{code:e instanceof SyntaxError?'U2_JSON_INVALID':'U2_IO_FAILED',where:'cli',detail:e.message}]};}
console.log(JSON.stringify(result,null,2));process.exitCode=result.ok?0:1;
