/* Independent Property Transfer R0 panel: no shared approval or writer. */
import { indexCiiV14 } from './cii-index.js';
import { inspectElementPair } from './element.js';
import { inspectNodePair } from './node.js';

export function mountPropertyTransfer(root) {
  const panel=root.querySelector('[data-property-transfer-area]');
  const $=s=>panel.querySelector(s);
  const $$=s=>[...panel.querySelectorAll(s)];
  const docs={source:null,target:null},files={source:0,target:0};
  let active='ELEMENT';
  const field=key=>$('[data-pt-input="'+key+'"]')?.value.trim()||'';
  const cell=(value,tag='td')=>{
    const x=document.createElement(tag);x.textContent=String(value??'—');return x;
  };
  const status=message=>{$('[data-pt-status]').textContent=message;};
  function clear() {
    $('[data-pt-results]').replaceChildren();
    $('[data-pt-result-status]').textContent='No inspection performed.';
  }
  function row(table,values) {
    const tr=document.createElement('tr');values.forEach(v=>tr.append(cell(v)));
    table.append(tr);
  }
  function table(headers,rows) {
    const wrap=document.createElement('div');wrap.className='pt-scroll';
    const t=document.createElement('table'),h=document.createElement('thead'),r=document.createElement('tr');
    headers.forEach(x=>r.append(cell(x,'th')));h.append(r);t.append(h);
    const body=document.createElement('tbody');
    rows.forEach(x=>row(body,x));t.append(body);wrap.append(t);return wrap;
  }
  function showElement(result) {
    const root=$('[data-pt-results]');
    for(const [side,data] of [['SOURCE',result.source],['TARGET0',result.target]]) {
      const section=document.createElement('section');section.className='pt-result';
      section.append(cell(side+' · FROM '+(data.from??'?')+' → TO '+(data.to??'?')+
        ' · '+data.entries.length+' element(s)','h3'));
      const records=data.entries.map(e=>[
        e.ordinal,e.from+' → '+e.to,e.branch||'(none)',
        ...e.fields.map(f=>f.identity+': '+f.lexeme.trim()+
          ' [bytes '+f.byteStart+'–'+f.byteEnd+']'),
        'HOLD: effective process semantics / identity not qualified']);
      section.append(table(['Element #','FROM → TO','Branch',
        'T1 stored raw','P1 stored raw','Fluid density stored raw','Qualification'],records));
      root.append(section);
    }
    $('[data-pt-result-status]').textContent='READ ONLY · '+result.reason+
      ' · No automatic element correlation, no TARGET1.';
  }
  function showNode(result) {
    const root=$('[data-pt-results]');
    for(const [side,data] of [['SOURCE',result.source],['TARGET0',result.target]]) {
      const section=document.createElement('section');section.className='pt-result';
      section.append(cell(side+' · Numeric Node '+(data.node??'?'),'h3'));
      const o=data.occurrences;
      const records=[
        ...o.incidents.map(e=>['ELEMENT',e.ordinal,e.from+' → '+e.to,
          'Incident endpoint; element-owned properties']),
        ...o.restraints.map(e=>['RESTRANT',e.ownerElement,
          'Pointer '+e.pointer+' · DOF '+e.slot,
          'Type '+e.type+' · CNode '+e.cnode+' · semantics partial']),
        ...o.displacements.map(e=>['DISPLMNT',e.ownerElement,
          'Pointer '+e.pointer+' · Specification '+e.specification,
          'Vectors/cases not yet qualified']),
        ...o.forces.map(e=>['FORCMNT',e.ownerElement,
          'Pointer '+e.pointer+' · Specification '+e.specification,
          'Input loads only; not computed reactions']),
        ...o.rigids.map(e=>['RIGID',e.ownerElement,
          'Pointer '+e.pointer,'Weight raw '+e.weightLexeme+
          ' · element-owned, semantics partial'])
      ];
      section.append(table(['Family','Owning element #','Occurrence','Evidence / HOLD'],records));
      root.append(section);
    }
    $('[data-pt-result-status]').textContent='READ ONLY · '+result.reason+
      ' · No automatic node or auxiliary mapping, no TARGET1.';
  }
  function updateTabs() {
    for(const button of $$('[data-pt-mode]'))
      button.setAttribute('aria-selected',String(button.dataset.ptMode===active));
    for(const section of $$('[data-pt-module]'))
      section.hidden=section.dataset.ptModule!==active;
    clear();
  }
  panel.addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button)return;
    if(button.dataset.ptMode) {
      active=button.dataset.ptMode;updateTabs();return;
    }
    if(button.dataset.ptRun!==undefined){
      clear();
      if(!docs.target){status('Load TARGET0 before inspection.');return;}
      try{
        const result=active==='ELEMENT'
          ? inspectElementPair(docs.source?.index,docs.target.index,{
              sourceFrom:field('sourceFrom'),sourceTo:field('sourceTo'),
              targetFrom:field('targetFrom'),targetTo:field('targetTo')})
          : inspectNodePair(docs.source?.index,docs.target.index,{
              sourceNode:field('sourceNode'),targetNode:field('targetNode')});
        if(active==='ELEMENT')showElement(result);else showNode(result);
        status('Inspection complete. SOURCE and TARGET0 remain unchanged.');
      }catch(err){status('Inspection blocked: '+(err.message||String(err)));}
    }
  });
  for(const kind of ['source','target']){
    const input=$('[data-pt-file="'+kind+'"]');
    input.addEventListener('change',async event=>{
      const request=++files[kind],f=event.target.files?.[0];
      docs[kind]=null;clear();
      $('[data-pt-file-status="'+kind+'"]').textContent=f?'Loading '+f.name:'No file loaded';
      if(!f)return;
      try {
        const bytes=new Uint8Array(await f.arrayBuffer());
        const index=indexCiiV14(bytes);
        if(request!==files[kind])return;
        const digest=await crypto.subtle.digest('SHA-256',bytes);
        if(request!==files[kind])return;
        const hash=[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
        docs[kind]={index,hash};
        $('[data-pt-file-status="'+kind+'"]').textContent=f.name+
          ' · V14 · '+index.counts.NUMELT+' elements · SHA-256 '+hash;
        status('Read-only property index ready. Cross-model identity remains unproven.');
      }catch(err){
        if(request===files[kind])status('Input rejected: '+(err.message||String(err)));
      }
    });
  }
  updateTabs();
  status('Load TARGET0 V14. SOURCE is optional for evidence comparison. No CII edits.');
  return {getState:()=>({mode:active,sourceHash:docs.source?.hash,
    targetHash:docs.target?.hash,canWrite:false})};
}
