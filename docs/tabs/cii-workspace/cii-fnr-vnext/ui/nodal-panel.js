/* Standalone Nodal Based Node Name Transfer UI. Intentionally separate from legacy F&R. */
import { parseNodalCsv,planNodalTransfer,validateNodalTransfer } from './nodal-transfer.js';
import { sha256 } from './writer.js';

export function mountNodalPanel(root,getTarget) {
  const $ = selector => root.querySelector(selector);
  const panel=$('[data-nodal-area]');
  const body=$('[data-nodal-rows]'),status=$('[data-nodal-status]');
  let rows=[],plan=null,approvals=new Set(),validated=null,applied=null,hash=null;
  let epoch=0,uploadEpoch=0,uploaded=false;
  const display = message => { status.textContent=message; };
  function reset(message='Input or approval changed. Regenerate and validate before export.') {
    epoch++;plan=null;approvals.clear();validated=null;applied=null;hash=null;render();display(message);
  }
  function revoke() {
    epoch++;validated=null;applied=null;render();
  }
  const cell=(tag,value)=>{
    const t=document.createElement(tag);t.textContent=String(value??'');return t;
  };
  function render() {
    body.replaceChildren();
    for(const [i,r] of rows.entries()) {
      const record=plan?.records[i],tr=document.createElement('tr');
      tr.append(cell('td',i+1),cell('td',r.findInfo||'—'),cell('td',r.findNode),
        cell('td',r.replaceName));
      tr.append(cell('td',record?.status||'Not checked'),
        cell('td',record?record.occurrences:'—'),
        cell('td',record?.originalNames?.join(' | ')||'—'),
        cell('td',record?.createRecords??'—'),
        cell('td',record?.reason||'—'),
        cell('td',record?.infoMismatch?'Find info differs from TARGET0':'—'));
      const last=document.createElement('td');
      if(record?.status==='READY'){
        const checkbox=document.createElement('input');checkbox.type='checkbox';
        checkbox.dataset.nodalApproval=record.id;checkbox.checked=approvals.has(record.id);
        checkbox.setAttribute('aria-label','Approve node '+record.node);last.append(checkbox);
      }else last.textContent='Held';
      tr.append(last);body.append(tr);
    }
    $('[data-nodal-count]').textContent=plan?
      `${plan.counts.ready} ready · ${plan.counts.held} held · ${plan.counts.fields} field(s) · ${plan.counts.newRecords} new record(s)`:
      `${rows.length} imported row(s)`;
    const issues=$('[data-nodal-diagnostics]');
    issues.replaceChildren();
    for(const r of plan?.records||[]){
      if(r.status==='HELD')issues.append(cell('li',`Row ${r.row} · node ${r.node} · ${r.reason}`));
      if(r.infoMismatch)issues.append(cell('li',`INFO · Row ${r.row}: Find is audit-only; TARGET0 physical names: ${r.originalNames.join(' | ')||'(blank)'}`));
      for(const f of r.audit||[]){
        if(r.status==='READY' && f.operation==='CREATE_NAME_RECORD_AND_POINTER')
          issues.append(cell('li',`Row ${r.row} · ELEMENTS index ${f.elementIndex} (ordinal ${f.elementIndex+1}) · ${f.field}: creates a new pointer/name record`));
      }
    }
    const ready=plan?.records.filter(r=>r.status==='READY')||[];
    $('[data-nodal-preview]').disabled=!uploaded||!getTarget()?.parsed||!rows.length;
    $('[data-nodal-approve-all]').disabled=!ready.length||ready.every(r=>approvals.has(r.id));
    $('[data-nodal-validate]').disabled=!approvals.size||!plan;
    $('[data-nodal-apply]').disabled=!validated;
    $('[data-nodal-export]').disabled=!applied;
    $('[data-nodal-audit]').disabled=!plan;
    $('[data-nodal-targethash]').textContent=applied?.target1Hash||validated?.target1Hash||'—';
  }
  function csvReport() {
    return {
      schema:'CiiFnrVnext.NodalAudit.v1',target0:hash,rows:plan?.records||[],
      selected:[...approvals],target1:validated?.target1Hash||null,
      structuralAmendment:validated?{insertedRecords:validated.insertedRecords,
        insertedBytes:validated.insertedBytes,patchedFields:validated.patchedFields}:null,
      applied:!!applied
    };
  }
  function download(filename, data, type) {
    const blob=new Blob([data],{type}),url=URL.createObjectURL(blob);
    const link=document.createElement('a');link.href=url;link.download=filename;link.click();
    setTimeout(()=>URL.revokeObjectURL(url),5000);
  }
  panel.addEventListener('change',async event=>{
    if(event.target.dataset.nodalApproval!==undefined){
      const id=event.target.dataset.nodalApproval;
      if(event.target.checked)approvals.add(id);else approvals.delete(id);
      revoke();display(`${approvals.size} row(s) approved. Validate to inspect the new copy.`);
    }
    if(event.target.dataset.nodalCsv!==undefined){
      const f=event.target.files?.[0],req=++uploadEpoch;
      uploaded=false;rows=[];reset('Loading Node-based CSV.');
      if(!f){display('Import a CSV with Node,Replace (Find optional).');return;}
      try{
        const txt=await f.text();
        if(req!==uploadEpoch)return;
        rows=parseNodalCsv(txt);uploaded=true;reset(`Imported ${rows.length} row(s). Generate preview before approval.`);
      }catch(err){if(req===uploadEpoch)display(err.message||String(err));}
    }
  });
  panel.addEventListener('click',async event=>{
    const btn=event.target.closest('button');
    if(!btn)return;
    const d=btn.dataset;
    if(d.nodalPreview!==undefined){
      const t=getTarget();if(!t?.parsed||!rows.length)return;
      reset('Planning node-number assignments.');
      const ticket=epoch,selected=t;
      try{
        const digest=await sha256(t.bytes);
        if(ticket!==epoch||selected!==getTarget())return;
        const next=planNodalTransfer(t.parsed,rows);
        if(ticket!==epoch||selected!==getTarget())return;
        hash=digest;plan=next;render();
        display(`Preview: ${plan.counts.ready} ready, ${plan.counts.held} held. No CII bytes modified.`);
      }catch(err){display('Preview blocked: '+(err.message||String(err)));}
    }
    if(d.nodalApproveAll!==undefined){
      for(const r of plan?.records||[])if(r.status==='READY')approvals.add(r.id);
      revoke();display(`Approved ${approvals.size} READY row(s). HELD rows remain excluded.`);
    }
    if(d.nodalValidate!==undefined){
      const t=getTarget(),ticket=++epoch;
      validated=null;applied=null;render();
      try{
        if(!t||!plan||!hash)throw Error('NODAL_PREVIEW_REQUIRED');
        const result=await validateNodalTransfer({
          targetBytes:t.bytes,originalHash:hash,plan,approvedIds:[...approvals]});
        if(ticket!==epoch||t!==getTarget())return;
        validated=result;render();
        display(`Validated new copy: ${result.outputLength} bytes; ${result.insertedRecords} appended name record(s). Apply separately.`);
      }catch(err){if(ticket===epoch)display('Validation blocked: '+(err.message||String(err)));}
    }
    if(d.nodalApply!==undefined){
      const t=getTarget(),ticket=++epoch;
      if(!t||!validated)return;
      const previous=validated;applied=null;render();
      try{
        const result=await validateNodalTransfer({
          targetBytes:t.bytes,originalHash:hash,plan,approvedIds:[...approvals]});
        if(ticket!==epoch||t!==getTarget())return;
        if(result.target1Hash!==previous.target1Hash)throw Error('NODAL_VALIDATED_COPY_STALE');
        applied=result;render();display('New copy ready for export; original TARGET0 unchanged.');
      }catch(err){if(ticket===epoch)display('Apply blocked: '+(err.message||String(err)));}
    }
    if(d.nodalExport!==undefined&&applied){
      const t=getTarget(),ticket=epoch,previous=applied;
      try{
        const result=await validateNodalTransfer({
          targetBytes:t.bytes,originalHash:hash,plan,approvedIds:[...approvals]});
        if(ticket!==epoch||t!==getTarget())return;
        if(result.target1Hash!==previous.target1Hash)throw Error('NODAL_EXPORT_STALE');
        download(t.name.replace(/\.cii$/i,'')+'-NODAL-TARGET1.CII',result.bytes,'application/octet-stream');
        display('Exported verified new CII copy '+result.target1Hash);
      }catch(err){display('Export blocked: '+(err.message||String(err)));}
    }
    if(d.nodalAudit!==undefined&&plan)
      download('nodal-transfer-audit.json',JSON.stringify(csvReport(),null,2),'application/json');
  });
  render();
  return {invalidate:()=>reset('TARGET0 or SOURCE changed. Generate a new node-number preview.'),
    render, getState:()=>({plan,approved:[...approvals],validated,applied})};
}
