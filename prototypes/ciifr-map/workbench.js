import {createPreviewSession} from './compare.js';
import {readXmlGraph} from './xml-intake.js';
import {methodCSvgScene} from '../../tabs/cii-workspace/cii-workspace-method-c-svg.js';
import {createGeometryScene} from './geo-scene.js';
import {initialProposals,displayProposals,checkedUnion,proposalDiagnostic} from './proposal-ledger.js';
import {FIT_POLICIES,fitResolutionTrial,resolutionCandidates} from './resolution-fit.js';
import {trialPairs} from './resolution-search.js';

function decorate(context, epoch, projection) {
  const result = {...context,epoch,projection};
  result.scene = methodCSvgScene(result); result.viewerScene = createGeometryScene(result);
  return result;
}
/** Separate mutable comparisons share only the measured immutable input graphs. */
export function createGeometryWorkbench({read = readXmlGraph, createSession = createPreviewSession,
  makeWorker = () => new Worker(new URL('./resolution-worker.js',import.meta.url),{type:'module'})} = {}) {
  const makeEntry = () => ({session:createSession(),result:null,display:null,proposals:new Map(),
    camera:null,svgViewBox:null,selection:{sources:[],element:null,pick:null}});
  const tabs = {A:makeEntry(),B:makeEntry()};
  const c = {display:null,union:null,resolution:null,pins:{},previous:[],projection:'XZ',
    camera:null,svgViewBox:null,selection:{sources:[],element:null,pick:null}};
  let active = 'A', revision = 0, epoch = 0, worker = null, rejectWorker = null;
  const tokens = {A:{SOURCE:0,TARGET:0},B:{SOURCE:0,TARGET:0}};
  function cancelResolution() {
    revision++; worker?.terminate(); worker = null;
    if (rejectWorker) { rejectWorker(Error('Resolution superseded by changed inputs or choices')); rejectWorker=null; }
    c.display=null; c.resolution=null;
  }
  function invalidate() {
    cancelResolution();
    if (active !== 'C') {
      const entry=tabs[active]; entry.session.invalidate(); entry.result=null; entry.display=null;
    }
  }
  function clearEntry(entry) {
    entry.session.invalidate(); entry.session.state.anchors=[];
    entry.result=null; entry.display=null; entry.proposals.clear();
    entry.selection={sources:[],element:null,pick:null}; entry.camera=null; entry.svgViewBox=null;
  }
  async function load(side,bytes,name) {
    if (active==='C' || !['SOURCE','TARGET'].includes(side)) throw Error('Load original XML in A or B');
    const tab=active,entry=tabs[tab],token=++tokens[tab][side];
    cancelResolution(); c.pins={}; c.previous=[]; c.camera=null; c.svgViewBox=null;
    clearEntry(entry);entry.session.state.graphs[side]=null;entry.session.state.pending.add(side);
    try {
      const graph=await read(await bytes,{member:side+':'+name});
      if (tokens[tab][side]!==token) return false;
      entry.session.state.graphs[side]=graph;
      // First A intake initializes an untouched B side; subsequent input changes are isolated.
      if (tab==='A' && tokens.B[side]===0 && !tabs.B.session.state.graphs[side] && !tabs.B.session.state.pending.has(side))
        tabs.B.session.state.graphs[side]=graph;
      return true;
    } catch(error) {if (tokens[tab][side]===token) throw error;return false;}
    finally {if (tokens[tab][side]===token) entry.session.state.pending.delete(side);}
  }
  function reuseAInputs() {
    const a=tabs.A.session.state,b=tabs.B.session.state;
    if (!a.graphs.SOURCE || !a.graphs.TARGET || a.pending.size) throw Error('Load both original XML files in A first');
    for (const side of ['SOURCE','TARGET']) tokens.B[side]++;
    cancelResolution();clearEntry(tabs.B);b.pending.clear();b.graphs={...a.graphs};c.pins={};c.previous=[];
  }
  function refresh(tab) {
    const entry=tabs[tab];
    entry.display=decorate(displayProposals(entry.result,entry.proposals),++epoch,entry.session.state.projection);
    entry.display.comparisonId=tab; return entry.display;
  }
  function run() {
    if (active==='C') throw Error('Use Consolidate for checked A/B proposals');
    cancelResolution(); const entry=tabs[active];
    entry.result=entry.session.run(); entry.proposals=initialProposals(entry.result,active); entry.svgViewBox=null;
    return refresh(active);
  }
  function current() {
    if (active==='C') { if (!c.display) throw Error('Consolidate current checked proposals first'); return c.display; }
    const entry=tabs[active]; entry.session.current();
    if (!entry.display) throw Error('Run Method C in comparison '+active); return entry.display;
  }
  function configure(options) {
    if (active==='C') return;
    tabs[active].session.configure(options); tabs[active].result=null; tabs[active].display=null; cancelResolution();
  }
  function addAnchor(source,target) {
    if (active==='C') throw Error('Anchors belong to A or B');
    const entry=tabs[active]; entry.session.addAnchor(source,target);
    entry.result=null; entry.display=null; cancelResolution();
  }
  function removeAnchor(index) {
    const entry=tabs[active]; entry.session.removeAnchor(index); entry.result=null; entry.display=null; cancelResolution();
  }
  function editProposal(source,changes) {
    const entry=tabs[active], prior=entry?.proposals.get(source);
    if (!prior) throw Error('Run A/B comparison before editing its proposals');
    entry.proposals.set(source,{...prior,...changes,revision:prior.revision+1});
    cancelResolution(); return refresh(active);
  }
  function setProjection(projection) {
    if (!['XZ','YZ','XY','ISO'].includes(projection)) throw Error('Unknown evidence projection');
    if (active==='C') {
      c.projection=projection; c.svgViewBox=null; if (c.display) c.display=decorate(c.display,++epoch,projection); return;
    }
    const entry=tabs[active]; entry.session.state.projection=projection; entry.svgViewBox=null;
    if (entry.result) {
      const native={...entry.result,projection}; native.scene=methodCSvgScene(native);
      native.viewerScene=createGeometryScene(native); entry.session.state.result=native; entry.result=native; refresh(active);
    }
  }
  function resolutionInput(mode) {
    const participants=Object.values(tabs).filter(entry=>entry.result && [...entry.proposals.values()].some(p=>p.checked && p.target && !proposalDiagnostic(entry.result,p)));
    const basis=participants[0];
    if (!basis?.result) throw Error('Run at least one A/B comparison before consolidation');
    const identity=result=>JSON.stringify([result.source.member,result.source.sha256,result.target.member,result.target.sha256]);
    if (participants.some(entry=>identity(entry.result)!==identity(basis.result)))
      throw Error('A/B checked proposals use different original XML pairs. Reuse A inputs in B or include one base only.');
    const union=checkedUnion(tabs);
    if (!union.allPairs.length) throw Error('No checked valid physical NODE pairs');
    c.union=union;
    const pins=Object.fromEntries(Object.entries(c.pins).filter(([key,pair]) =>
      union.groups.some(g => g.key===key && g.options.some(o => o.key===pair))));
    c.pins=pins;
    const {source,target}=basis.result;
    return {snapshotId:JSON.stringify([revision,source.sha256,target.sha256,mode,union.allPairs.map(p => p.key),pins]),
      source,target,union,pins,previous:c.previous,
      policy:{mode,version:FIT_POLICIES[mode],rotation:basis.result.transform.rotation,basisTab:basis===tabs.A?'A':'B',
        scoringFrame:'TARGET_WORLD_XYZ',score:'ABSOLUTE_AXIS_SUM_MM',fitOrder:'CANONICAL_PAIR_KEY'}};
  }
  function materialize(input,resolution) {
    if (!resolution.chosen) throw Error('No comparable fit. A/B remain available; see excluded trial reasons.');
    const pairs=trialPairs(input.union,resolution.chosen.choices);
    const fit=fitResolutionTrial(input.source,input.target,pairs,input.policy);
    const candidates=resolutionCandidates(input.source,input.target,fit.transform,pairs,{x:100,y:100,z:100});
    c.display=decorate({source:input.source,target:input.target,transform:fit.transform,candidates,
      evidenceMode:'MULTIBASE_CHECKED_PROPOSALS_DIAGNOSTIC',comparisonId:'C',resolution,union:input.union,
      selectedPairs:pairs},++epoch,c.projection);
    c.resolution=resolution; c.previous=resolution.chosen.choices;
    return c.display;
  }
  async function consolidate(mode='TRANSLATION',{execute,onProgress=()=>{}}={}) {
    cancelResolution(); const owner=revision, input=resolutionInput(mode);
    const result=await (execute ? execute(input) : new Promise((resolve,reject) => {
      const instance=makeWorker(); worker=instance; rejectWorker=reject;
      instance.onmessage=event => {
        if (owner!==revision || worker!==instance || event.data.snapshotId!==input.snapshotId) return;
        if (event.data.progress) { onProgress(event.data.progress); return; }
        worker=null; rejectWorker=null; instance.terminate();
        if (event.data.error) reject(Error(event.data.error)); else resolve(event.data.result);
      };
      instance.onerror=event => { if (worker!==instance) return; worker=null; rejectWorker=null;
        instance.terminate(); reject(Error(event.message || 'Resolution Worker failed')); };
      instance.postMessage(input);
    }));
    if (owner!==revision || result.snapshotId!==input.snapshotId) throw Error('Stale resolution rejected');
    c.resolution=result;
    return materialize(input,result);
  }
  function pin(groupKey,key) { c.pins={...c.pins,[groupKey]:key}; cancelResolution(); }
  function clearPins() { c.pins={}; cancelResolution(); }
  function switchTab(tab) { if (!['A','B','C'].includes(tab)) throw Error('Unknown comparison tab'); active=tab; }
  const entry=() => active==='C'?c:tabs[active];
  return {tabs,c,load,reuseAInputs,run,current,configure,addAnchor,removeAnchor,editProposal,setProjection,
    consolidate,pin,clearPins,switchTab,invalidate,cancelResolution,
    get active(){return active;},get revision(){return revision;},get entry(){return entry();},
    get state(){return active==='C'?{result:c.display,anchors:[],projection:c.projection,
      graphs:c.display?{SOURCE:c.display.source,TARGET:c.display.target}:tabs.A.session.state.graphs}:
      {...tabs[active].session.state,result:tabs[active].display};}};
}
