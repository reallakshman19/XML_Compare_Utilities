import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {webcrypto} from 'node:crypto';
import {createGeometryWorkbench} from '../workbench.js';
import {readXmlGraph} from '../xml-intake.js';
import {searchResolution} from '../resolution-search.js';
import {exportWorkbench} from '../workbench-export.js';

const {DOMParser}=createRequire(process.env.CIIFR_TEST_RUNTIME+'/package.json')('@xmldom/xmldom');
async function loaded() {
 const wb=createGeometryWorkbench({read:(bytes,options)=>readXmlGraph(bytes,{...options,cryptoRef:webcrypto,
  parser:new DOMParser({onError:(level,message)=>{throw Error(level+':'+message);}})})});
 for(const [side,name] of [['SOURCE','S1-F05.xml'],['TARGET','S1-R4.xml']])
  await wb.load(side,new Uint8Array(readFileSync(new URL('./fixtures/'+name,import.meta.url))),name);
 return wb;
}
async function comparisons() {
 const wb=await loaded();wb.addAnchor('5210','5210');wb.addAnchor('5229','5229');wb.run();
 for(const p of [...wb.entry.proposals.values()]) if(!['5210','5220','5229'].includes(p.source)) wb.editProposal(p.source,{checked:false});
 const a=wb.current();wb.entry.selection={sources:['5220'],element:null,pick:null};
 wb.switchTab('B');wb.addAnchor('5210','5229');wb.run();
 for(const p of [...wb.entry.proposals.values()]) if(p.source!=='5210') wb.editProposal(p.source,{checked:false});
 return {wb,a};
}
test('actual XML A/B state stays independent; C deduplicates, scores other pairs and preserves physical edges',async()=>{
 const {wb,a}=await comparisons();
 assert.equal(wb.entry.proposals.get('5210').label,'Manual B anchor');
 wb.switchTab('A');assert.equal(wb.current(),a);assert.deepEqual(wb.entry.selection.sources,['5220']);
 assert.equal(wb.state.anchors.length,2);assert.equal(wb.entry.proposals.get('5210').target,'5210');
 const source=wb.state.graphs.SOURCE,target=wb.state.graphs.TARGET;
 const original=JSON.stringify([source.nodes,source.edges,target.nodes,target.edges]);
 wb.switchTab('C');const c=await wb.consolidate('TRANSLATION',{execute:input=>searchResolution(input)});
 assert.equal(wb.c.union.unique.length,2);assert.equal(wb.c.union.groups.length,1);
 assert.equal(c.resolution.exact,true);assert.equal(c.resolution.totalAssignments,'2');
 const rec=c.resolution.recommendations[0], group=wb.c.union.groups[0];
 const same=group.options.find(o=>o.target==='5210'),wrong=group.options.find(o=>o.target==='5229');
 const score=id=>rec.options.find(o=>o.pairKey===id).score;
 assert.equal(score(same.key),0);assert(Math.abs(score(wrong.key)-446.09998606666665)<1e-6);
 assert.equal(rec.recommendedPairKey,same.key);assert.equal(rec.witnessCount,2);
 assert.equal(c.resolution.chosen.choices[0],same.key);
 const csv=exportWorkbench(wb,'csv').split('\r\n');
 const csvRow=csv.find(line=>line.startsWith('"SOURCE:S1-F05.xml","5210",'));
 assert(csvRow);assert.match(csvRow,/Manual A anchor/);assert.doesNotMatch(csvRow,/Manual B anchor/);
 const pairRow=c.candidates.rows.find(r=>r.source==='5210');
 assert.equal(pairRow.alternatives[0].od,c.target.nodeIndex.get('5210').od);
 assert.equal(JSON.stringify([source.nodes,source.edges,target.nodes,target.edges]),original);
 assert.equal(c.viewerScene.models.source.segments.length,56);assert.equal(c.viewerScene.models.target.segments.length,56);
 wb.pin(group.key,wrong.key);const manual=await wb.consolidate('TRANSLATION',{execute:input=>searchResolution(input)});
 assert.equal(manual.resolution.chosen.choices[0],wrong.key);assert.equal(manual.resolution.chosen.custody.length,1);
 assert.equal(manual.resolution.recommendations[0].recommendedPairKey,same.key);
 assert.equal(wb.c.pins[group.key],wrong.key);
 const json=JSON.parse(exportWorkbench(wb,'json'));
 assert.equal(json.workbench.resolution.recommendations[0].witnessCount,2);
 assert.equal(json.workbench.writerEligible,false);assert.equal(json.workbench.union.allPairs.length,4);
 assert.match(exportWorkbench(wb,'svg'),/CIIFR.MultibaseWorkbench/);
 assert.match(exportWorkbench(wb,'csv'),/searchCoverage/);
});
test('native rigid rejection stays explicit; display-only projection does not refit or invalidate numerical evidence',async()=>{
 const {wb}=await comparisons();wb.switchTab('C');
 await assert.rejects(wb.consolidate('RIGID',{execute:input=>searchResolution(input)}),/No comparable fit/);
 assert.equal(wb.c.resolution.chosen,null);
 assert(wb.c.resolution.rejected.some(r=>r.reason==='DUPLICATE_ANCHOR_CUSTODY'));
 const c=await wb.consolidate('TRANSLATION',{execute:input=>searchResolution(input)}), resolution=c.resolution;
 wb.setProjection('YZ');assert.equal(wb.current().resolution,resolution);assert.equal(wb.current().projection,'YZ');
 wb.switchTab('A');const pose=wb.current().transform;wb.setProjection('XY');assert.equal(wb.current().transform,pose);
 wb.editProposal('5210',{target:'NO-SUCH-NODE'});assert.equal(wb.current().candidates.rows.find(r=>r.source==='5210').residual,null);
 wb.switchTab('C');assert.throws(()=>wb.current(),/Consolidate/);
});
test('duplicate origins count once; stale asynchronous completion cannot replace changed proposals',async()=>{
 const {wb}=await comparisons();wb.editProposal('5210',{target:'5210'});wb.switchTab('C');
 let finish;const pending=wb.consolidate('TRANSLATION',{execute:input=>new Promise(resolve=>{finish=()=>searchResolution(input).then(resolve);})});
 wb.switchTab('A');wb.editProposal('5220',{checked:false});finish();
 await assert.rejects(pending,/Stale resolution/);wb.switchTab('C');assert.throws(()=>wb.current());
 const c=await wb.consolidate('TRANSLATION',{execute:input=>searchResolution(input)});
 assert.equal(wb.c.union.groups.length,0);assert.equal(wb.c.union.unique.length,2);
 assert.equal(wb.c.union.unique.find(p=>p.source==='5210').origins.length,2);
 assert(wb.c.union.unique.find(p=>p.source==='5210').origins.some(o=>o.label==='Edited proposal from Manual B anchor'));
 assert.equal(c.candidates.rows.length,2);
});
test('different B input revision preserves A; mixed revisions cannot silently consolidate',async()=>{
 const {wb,a}=await comparisons();
 const originalSha=wb.tabs.A.session.state.graphs.SOURCE.sha256;
 await wb.load('SOURCE',new Uint8Array(readFileSync(new URL('./fixtures/S1-R4.xml',import.meta.url))),'B-new-original.xml');
 assert.equal(wb.tabs.A.display,a);assert.equal(wb.tabs.A.session.state.anchors.length,2);
 assert.equal(wb.tabs.A.session.state.graphs.SOURCE.sha256,originalSha);
 assert.notEqual(wb.state.graphs.SOURCE.sha256,originalSha);
 wb.addAnchor('5210','5210');wb.run();wb.switchTab('C');
 await assert.rejects(wb.consolidate('TRANSLATION',{execute:input=>searchResolution(input)}),/different original XML pairs/);
 wb.switchTab('A');for(const p of [...wb.entry.proposals.values()]) wb.editProposal(p.source,{checked:false});
 wb.switchTab('C');const onlyB=await wb.consolidate('TRANSLATION',{execute:input=>searchResolution(input)});
 assert.equal(onlyB.source.sha256,wb.tabs.B.result.source.sha256);
 wb.switchTab('B');wb.reuseAInputs();assert.equal(wb.state.graphs.SOURCE.sha256,originalSha);
 assert.equal(wb.state.anchors.length,0);assert.equal(wb.tabs.A.session.state.anchors.length,2);
});
