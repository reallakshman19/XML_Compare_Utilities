import {registeredMethodCPoint} from '../../tabs/cii-workspace/cii-workspace-method-c-registration.js';

const fmt = x => Number.isFinite(x)?x.toFixed(3):'—';
const element = (tag,text) => { const el=document.createElement(tag); if (text!==undefined) el.textContent=text; return el; };
const cell = (tr,text) => { const td=element('td',text); tr.append(td); return td; };
function inspectable(tr,source,target,onSelect) {
  const select=() => onSelect(source,null,target?{pairTarget:target}:null);
  tr.tabIndex=0; tr.dataset.source=source; tr.dataset.target=target||'';
  tr.addEventListener('click',event => { if (!event.target.closest('input,button,select')) select(); });
  tr.addEventListener('keydown',event => {
    if (!event.target.closest('input,button,select') && ['Enter',' '].includes(event.key)) { event.preventDefault(); select(); }
  });
}
function comparisonRows(wb,body,result,actions,selection) {
  for (const row of result.candidates.rows) {
    const tr=element('tr'), p=wb.entry.proposals.get(row.source);
    tr.classList.toggle('selected',selection.sources.includes(row.source)); cell(tr,row.source);
    const td=cell(tr), include=element('input'), input=element('input');
    include.type='checkbox'; include.checked=p.checked; include.setAttribute('aria-label','Include '+row.source+' in Consolidated');
    include.addEventListener('change',() => actions.onEdit(row.source,{checked:include.checked}));
    input.value=p.target; input.className='candidate-id'; input.setAttribute('aria-label','TARGET candidate for SOURCE '+row.source);
    input.setAttribute('list','physical-target-ids');
    input.addEventListener('change',() => actions.onEdit(row.source,{target:input.value.trim()}));
    td.append(include,input); cell(tr,row.status);
    for (const d of [0,1,2]) cell(tr,fmt(row.residual?.[d]));
    cell(tr,row.alternatives.map(a => a.target).join(', ') || (row.segment?'ELEMENT only':'No NODE candidate'));
    inspectable(tr,row.source,row.target,actions.onSelect); body.append(tr);
  }
}
function consolidatedRows(wb,body,result,actions,selection) {
  const {union,resolution,pins}=wb.c;
  if (!union) return;
  const chosen=new Set(resolution?.chosen?.choices || []);
  for (const group of [...union.unique.map(p => ({key:p.groupKey,source:p.source,options:[p]})),...union.groups]) {
    const recommendation=resolution?.recommendations.find(r => r.groupKey===group.key);
    for (const option of group.options) {
      const tr=element('tr'), active=group.options.length===1 || chosen.has(option.key);
      tr.classList.toggle('selected',selection.sources.includes(option.source) &&
        (!selection.pick?.pairTarget || selection.pick.pairTarget===option.target));
      cell(tr,option.source); const td=cell(tr);
      if (group.options.length>1) {
        const radio=element('input'); radio.type='radio'; radio.name='choice-'+group.key;
        radio.checked=active; radio.value=option.key;
        radio.setAttribute('aria-label','Choose SOURCE '+option.source+' to TARGET '+option.target);
        radio.addEventListener('change',() => actions.onPin(group.key,option.key)); td.append(radio);
      }
      td.append(element('span',option.target));
      const labels=option.origins.map(o => o.label+' ('+o.tab+')');
      if (active) labels.push(pins[group.key]?'Chosen · manual override':'Chosen');
      if (recommendation?.equalMinima.includes(option.key)) labels.push('Recommended in current context');
      cell(tr,[...new Set(labels)].join(' · '));
      let residual=null;
      if (result) {
        const xyz=registeredMethodCPoint(result.transform,result.source.nodeIndex.get(option.source).xyz);
        residual=result.target.nodeIndex.get(option.target).xyz.map((x,i) => x-xyz[i]);
      }
      for (let i=0;i<3;i++) cell(tr,fmt(residual?.[i]));
      const counterfactual=recommendation?.options.find(o => o.pairKey===option.key);
      cell(tr,recommendation?[
        counterfactual?.valid?'Other-pair error '+fmt(counterfactual.score)+' mm':counterfactual?.reason || 'Not evaluated',
        recommendation.witnessCount+' other pairs',recommendation.support,
        counterfactual?.custody.length?'TARGET reused in this trial':'',
      ].filter(Boolean).join(' · '):'Unique pair · from '+option.origins.map(o => o.tab).join(', '));
      inspectable(tr,option.source,option.target,actions.onSelect); body.append(tr);
    }
  }
}
export function renderWorkbenchRows(wb,body,actions) {
  body.replaceChildren(); let result=null;
  try { result=wb.current(); } catch { /* C can retain its selectable diagnostic table without a feasible pose. */ }
  if (wb.active==='C') consolidatedRows(wb,body,result,actions,wb.entry.selection);
  else if (result) comparisonRows(wb,body,result,actions,wb.entry.selection);
}
export function workbenchSummary(wb,result) {
  if (wb.active!=='C' && !result) return 'Comparison '+wb.active+' · add manual anchors, then run Method C.';
  if (wb.active!=='C') return 'Comparison '+wb.active+' · '+result.candidates.rows.length+
    ' SOURCE nodes · '+[...wb.entry.proposals.values()].filter(p => p.checked).length+' checked proposals';
  const r=wb.c.resolution, u=wb.c.union;
  if (!r) return 'Choose proposals in A/B, then Consolidate.';
  return r.status.replaceAll('_',' ')+' · '+u.unique.length+' unique pairs · '+u.groups.length+
    ' conflict groups · '+r.enumerated+'/'+r.totalAssignments+' assignments · '+
    (r.exact?'complete search':'best found so far')+' · '+(r.chosen?.custody.length?
      'TARGET reuse: diagnostic only':'one-to-one TARGET custody')+
    (u.invalid.length?' · '+u.invalid.length+' invalid checked proposals retained in evidence':'');
}
