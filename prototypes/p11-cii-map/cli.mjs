#!/usr/bin/env node
// p11-cii-map command line. Thin wrapper: parse args, read files, call the engine, print JSON.
//   node cli.mjs compare <a.cii> <b.cii> [--anchors 10:10,20:20,30:30] [--tol 1] [--summary]
import { writeFileSync, mkdtempSync, linkSync, rmSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { readPsi116Graph, matchPsi116Cii, psi116MatchToMapFile } from './engine/psi116-match.mjs';
import { pairPsi116, psi116PairToMapFile } from './engine/psi116-pair.mjs';
import { readInputXmlGraph } from './engine/xml-input.mjs';
import { matchXmlCii } from './engine/xml-match.mjs';
import { xmlMatchToMapFile } from './engine/xml-to-map.mjs';
import { attempt, refuse } from './kit/core.mjs';
import { parseArgs, readBytes, finish, usage } from './kit/node.mjs';
import { readCiiGraph } from './engine/cii-graph.mjs';
import { compareCii } from './engine/compare.mjs';

const USAGE = 'node cli.mjs compare <a.cii> <b.cii> [--anchors 10:10,20:20,30:30] [--tol 1] [--summary]';
// Explicitly bind signed tolerance tokens before the generic option parser.
const argv = process.argv.slice(2).flatMap((a,i,all)=>a==='--tol' && /^-[^-]/.test(all[i+1]||'') ? [`--tol=${all[i+1]}`] : i>0 && all[i-1]==='--tol' && /^-[^-]/.test(a) ? [] : [a]);
const args = parseArgs(argv);
const [command, fa, fb] = args._;
if (command === 'pair-psi116') {
  const help='node cli.mjs pair-psi116 <source.xml> <target.xml> [--tol mm] [--bore] [--map out.json]';
  if (!fa || !fb || args._.length !== 3 || args.map === true || args.tol === true || (args.bore !== undefined && args.bore !== true) || args.mode !== undefined) usage(help);
  const start=performance.now();
  const result=await attempt(async()=>{
    const bore=args.bore===true;
    const source=await readPsi116Graph(readBytes(fa),{includeBore:bore}),target=await readPsi116Graph(readBytes(fb),{includeBore:bore});
    const r=pairPsi116(source,target,{bore,toleranceMm:args.tol===undefined?undefined:Number(args.tol)});
    if(args.map && r.ambiguities.length)return {...r,ok:false,refusals:r.ambiguities.map(({code,where,detail})=>({code,where,detail}))};
    if(args.map) {
      const written=await attempt(()=>{
        const map=psi116PairToMapFile(r,{sourceFile:{fileName:basename(fa),sha256:source.sha256},targetFile:{fileName:basename(fb),sha256:target.sha256}});
        let temporary;
        try {
          const output=resolve(args.map);temporary=mkdtempSync(join(dirname(output),'.p12c-map-'));
          const staged=join(temporary,'map.json');writeFileSync(staged,JSON.stringify(map,null,2)+'\n',{flag:'wx'});linkSync(staged,output);
        }catch(e){refuse('MATCH_MAP_WRITE_FAILED',args.map,e.message);}
        finally{if(temporary)rmSync(temporary,{recursive:true,force:true});}
      });
      if(!written.ok)return {...r,...written};
    }
    return r;
  });
  result.summary={...(result.summary||{paired:null,unmatchedSource:null,unmatchedTarget:null,ambiguous:null,boreRefused:null,boreBlockedTargetBranches:null,boreBlockedPairs:null}),ms:performance.now()-start};
  finish(result);
}
if (command === 'match-psi116') {
  if (!fa || !fb || args._.length !== 3 || args.map === true || args.tol === true || args.frame === true || args.mode !== undefined) usage('node cli.mjs match-psi116 <file.xml> <file.cii> [--tol <mm>] [--frame psi116|cii2019] [--map out.json]');
  const start = performance.now();
  const result = await attempt(async () => {
    const xml = await readPsi116Graph(readBytes(fa), {frame: args.frame ?? 'psi116'});
    const cii = await readCiiGraph(readBytes(fb), {member: basename(fb)});
    const m = matchPsi116Cii(xml, cii, {toleranceMm: args.tol === undefined ? undefined : Number(args.tol)});
    const r = m.summary ? {...m, summary:{...m.summary, frame:xml.frame}} : m;
    if (args.map && r.ambiguities.length) return {...r,ok:false,refusals:r.ambiguities.map(({code,where,detail})=>({code,where,detail}))};
    if (args.map) {
      const map = psi116MatchToMapFile(r, {xmlFile:{fileName:basename(fa),sha256:xml.sha256},ciiFile:{fileName:basename(fb),sha256:cii.sha256}});
      let temporary;
      try {
        const output = resolve(args.map);
        temporary = mkdtempSync(join(dirname(output), '.p12b-map-'));
        const staged = join(temporary, 'map.json');
        writeFileSync(staged, JSON.stringify(map, null, 2) + '\n', {flag:'wx'});
        linkSync(staged, output);
      } catch (e) { refuse('MATCH_MAP_WRITE_FAILED', args.map, e.message); }
      finally { if (temporary) rmSync(temporary, {recursive:true,force:true}); }
    }
    return r;
  });
  result.summary = {...(result.summary || {paired:null,unmatchedXml:null,unmatchedCii:null,ambiguous:result.refusals.filter(r=>r.code==='MATCH_NODE_AMBIGUOUS').length}),ms:performance.now()-start};
  finish(result);
}
if (command === 'match-xml') {
  if (!fa || !fb || args._.length !== 3 || args.map === true || args.mode === true || args.tol === true) usage('node cli.mjs match-xml <file.xml> <file.cii> [--mode same-run|geometry] [--tol <mm>] [--map out.json]');
  const result = await attempt(async () => {
    const xml = await readInputXmlGraph(readBytes(fa), basename(fa));
    const cii = await readCiiGraph(readBytes(fb), {member: basename(fb)});
    const r = matchXmlCii(xml, cii, {mode: args.mode, toleranceMm: args.tol === undefined ? undefined : Number(args.tol)});
    if (args.map) {
      const map = xmlMatchToMapFile(r, {xmlFile: {fileName: basename(fa), sha256: xml.sha256}, ciiFile: {fileName: basename(fb), sha256: cii.sha256}});
      let temporary;
      try {
        const output = resolve(args.map);
        temporary = mkdtempSync(join(dirname(output), '.p12-map-'));
        const staged = join(temporary, 'map.json');
        writeFileSync(staged, JSON.stringify(map, null, 2) + '\n', {flag: 'wx'});
        // Publish a complete file atomically, without replacing an existing destination.
        linkSync(staged, output);
      } catch (e) { refuse('MATCH_MAP_WRITE_FAILED', args.map, e.message); }
      finally { if (temporary) rmSync(temporary, {recursive: true, force: true}); }
    }
    return r;
  });
  finish(result);
}
if (command !== 'compare' || !fa || !fb) usage(USAGE);
if (args.tol !== undefined && (args.tol === true || !Number.isFinite(Number(args.tol)))) usage(USAGE);
if (args.anchors === true) usage(USAGE);
const result = await attempt(async () => {
  const a = await readCiiGraph(readBytes(fa), { member: 'A' });
  const b = await readCiiGraph(readBytes(fb), { member: 'B' });
  const r = compareCii(a, b, { anchors: args.anchors, toleranceMm: args.tol === undefined ? 1 : Number(args.tol) });
  const files = { a: { file: fa, sha256: a.sha256, bytes: a.byteLength }, b: { file: fb, sha256: b.sha256, bytes: b.byteLength } };
  return args.summary ? { files, summary: r.summary, unmatchedA: r.unmatchedA, unmatchedB: r.unmatchedB, fieldDiffs: r.fieldDiffs, loopClosures: r.loopClosures } : { files, ...r };
});
finish(result);
