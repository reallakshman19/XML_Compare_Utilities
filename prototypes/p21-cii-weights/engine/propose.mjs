import { require } from '../vendor/kit/core.mjs';
import { numberOf, weightValue, formatCiiNumber } from '../vendor/kernel/format.mjs';
import { validate } from '../vendor/vendor/validate.mjs';

// The shared validator is the authoritative gate for all exported Change sets.
export function checkChangeset(cs) {
  const errors = validate(cs);
  require(cs?.format === 'topofix.changeset' && errors.length === 0, 'KERNEL_CHANGESET_INVALID', 'changeset',
    errors.map(e => `${e.code} ${e.msg}`).join('; ') || 'Expected a Change set v1.');
}

// CSV parser: standard quoted fields, escaped quotes, CRLF/LF, optional note.
export function parseCsv(text) {
  const records = []; let row = [], cell = '', quoted = false, closed = false;
  const endCell = () => {row.push(cell); cell=''; closed=false;};
  const endRow = () => {endCell(); if (row.some(s=>s.trim())) records.push(row); row=[];};
  text = String(text).replace(/^\uFEFF/, '');
  for (let i=0;i<text.length;i++) {
    const ch=text[i];
    if (quoted) { if(ch==='"') { if(text[i+1]==='"'){cell+='"';i++;} else {quoted=false;closed=true;} } else cell+=ch; continue; }
    if(ch===',') endCell();
    else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&text[i+1]==='\n')i++;endRow();}
    else if(ch==='"'){require(!cell&&!closed,'WEIGHTS_CSV_INVALID','CSV','Unexpected quote.');quoted=true;}
    else {require(!closed,'WEIGHTS_CSV_INVALID','CSV','Text after closing quote.');cell+=ch;}
  }
  require(!quoted,'WEIGHTS_CSV_INVALID','CSV','Unclosed quote.');
  endRow();
  const header=records.shift()?.map(s=>s.trim()).join(',');
  require(header==='fromNode,toNode,newWeight'||header==='fromNode,toNode,newWeight,note','WEIGHTS_CSV_INVALID','CSV','Expected fromNode,toNode,newWeight[,note].');
  const width=header.split(',').length;
  return records.map((r,i)=>{require(r.length===width&&r.slice(0,3).every(s=>s.trim()),'WEIGHTS_CSV_INVALID',`row ${i+2}`,'Missing or extra field.');return {fromNode:r[0].trim(),toNode:r[1].trim(),newWeight:r[2].trim(),note:r[3]||''};});
}

// Explicit metadata is supplied by the caller from the exact bytes used for inventory.
export function proposeFromTable(inventory, rows, {base, createdAt} = {}) {
  const changes = rows.map((row,i) => {
    const where=`row ${i+2}`;
    const hits=inventory.filter(r=>r.fromNode===String(row.fromNode)&&r.toNode===String(row.toNode));
    require(hits.length>0,'WEIGHTS_ROW_NOT_FOUND',where,`${row.fromNode} -> ${row.toNode} has no rigid.`);
    require(hits.length===1,'WEIGHTS_ROW_AMBIGUOUS',where,`${row.fromNode} -> ${row.toNode} matches ${hits.length} rigids.`);
    const hit=hits[0];
    // CSV has no zero-confirmation column. Zero may only be supplied via a valid, explicitly confirmed Change set.
    const value=weightValue(row.newWeight, false, where);
    formatCiiNumber(value,hit.weightToken,13,where);
    return {changeId:`W${i+1}`,target:{kind:'cii',elementIndex:hit.elementIndex,fromNode:hit.fromNode,toNode:hit.toNode},
      field:'RIGID/WEIGHT',unit:'kg',oldToken:hit.weightToken,newValue:value,
      evidence:{source:'manual',detail:String(row.note||'CSV weight proposal')},approval:{approved:false}};
  });
  const cs={format:'topofix.changeset',version:1,createdAt,base,changes};
  checkChangeset(cs); return cs;
}
