import {exportPreview} from './evidence.js';
import {escapeMethodCXml} from '../../tabs/cii-workspace/cii-workspace-method-c-svg.js';

function ledger(wb) {
  const result=wb.current();
  return {schema:'CIIFR.MultibaseWorkbench.v1',comparison:wb.active,epoch:result.epoch,
    inputIdentity:{source:{member:result.source.member,sha256:result.source.sha256},
      target:{member:result.target.member,sha256:result.target.sha256}},
    comparisons:Object.fromEntries(Object.entries(wb.tabs).map(([id,entry]) => [id,{
      anchors:entry.session.state.anchors,pose:entry.result?.transform || null,
      originSnapshot:entry.result?.candidates.snapshot || null,proposals:[...entry.proposals.values()]}])),
    union:wb.active==='C'?wb.c.union:null,resolution:wb.active==='C'?wb.c.resolution:null,
    manualPins:wb.c.pins,scoringFrame:'TARGET_WORLD_XYZ',score:'ABSOLUTE_AXIS_SUM_MM',
    transform:result.transform,projection:result.projection,writerEligible:false,physicalIdentityQualified:false};
}
const csv = value => {
  let text=typeof value==='object'?JSON.stringify(value):String(value??'');
  if (typeof value!=='number' && /^\s*[=+@-]/.test(text)) text="'"+text;
  return '"'+text.replaceAll('"','""')+'"';
};
export function exportWorkbench(wb,kind) {
  const data=ledger(wb);
  if (kind==='json') return JSON.stringify({...JSON.parse(exportPreview(wb,'json')),workbench:data},null,2)+'\n';
  if (kind==='svg') return exportPreview(wb,'svg').replace('<style>',
    '<metadata>'+escapeMethodCXml(JSON.stringify(data))+'</metadata><style>');
  if (kind!=='csv') throw Error('Unsupported export');
  const extra=['comparison','proposalOrigins','manualPins','resolutionStatus','searchCoverage'];
  const result=wb.current(), bySource=new Map((result.selectedPairs || []).map(p => [p.source,p.origins]));
  return exportPreview(wb,'csv').trimEnd().split('\r\n').map((line,i) => line+','+
    (i?[wb.active,wb.active==='C'?bySource.get(result.candidates.rows[i-1].source):
      wb.entry.proposals.get(result.candidates.rows[i-1].source),data.manualPins,data.resolution?.status,
    data.resolution?{evaluated:data.resolution.enumerated,total:data.resolution.totalAssignments,exact:data.resolution.exact}:null]:extra)
      .map(csv).join(',')).join('\r\n')+'\r\n';
}
