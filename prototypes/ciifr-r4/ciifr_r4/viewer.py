"""Offline, self-contained read-only viewer for S2 source-qualified projection.

All user-controlled data enters the DOM via textContent, never innerHTML.
Script-tag boundary escaping is necessary even for application/json payloads.
"""
from __future__ import annotations
import json

_HTML = r'''<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<title>CIIFR R4 · Engineering source hierarchy</title>
<style>
:root{color-scheme:light;--bg:#f4f7fa;--paper:#fff;--text:#172938;--muted:#607384;--blue:#176594;--edge:#d9e3eb;--high:#e5f1fa;--navy:#102e43;--warn:#875724}
*{box-sizing:border-box}body{margin:0;font:14px/1.46 system-ui,-apple-system,Segoe UI,sans-serif;background:var(--bg);color:var(--text)}
header{background:var(--navy);color:white;padding:22px 28px}header h1{font-size:22px;margin:0 0 5px}header p{margin:0;color:#d3e2ea}.meta{background:#e9f0f6;border-bottom:1px solid var(--edge);padding:10px 28px;display:flex;gap:12px;flex-wrap:wrap;font:12px/1.5 ui-monospace,Consolas,monospace}.meta span{overflow-wrap:anywhere}.chip{display:inline-block;background:#e7eef5;border:1px solid #ccdbe5;border-radius:20px;padding:3px 9px;font:12px/1.4 system-ui;color:#244c65}.chip.warning{background:#fff4df;border-color:#f1d2a5;color:#80531c}.shell{display:grid;grid-template-columns:minmax(230px,290px) minmax(0,1fr);max-width:1720px;margin:auto;min-height:calc(100vh - 180px)}aside{border-right:1px solid var(--edge);background:#fff;padding:18px;position:sticky;top:0;align-self:start;max-height:100vh;overflow:auto}main{padding:22px 30px;min-width:0}.minor{font-size:12px;color:var(--muted)}.line{width:100%;margin:5px 0;padding:10px 12px;border:1px solid var(--edge);border-radius:8px;background:var(--paper);color:var(--text);text-align:left;cursor:pointer;word-break:break-word}.line:hover,.line:focus-visible{outline:2px solid #8fbdde}.line.active{border-color:var(--blue);background:#e7f3fc;box-shadow:inset 3px 0 var(--blue)}.line strong{display:block}.section{border:1px solid var(--edge);border-radius:11px;background:var(--paper);padding:17px;margin:18px 0;box-shadow:0 1px 2px #102e430c}.section h2{margin:0 0 10px;font-size:18px}.section h3{margin:15px 0 5px;font-size:15px}details{border:1px solid var(--edge);border-radius:8px;margin:8px 0;background:#fff}details>summary{cursor:pointer;padding:12px 15px;display:flex;justify-content:space-between;gap:12px;font-weight:600;align-items:baseline}details[open]>summary{background:#f0f6fa;border-bottom:1px solid var(--edge)}.content{padding:12px 16px}.tabs{display:flex;gap:6px;flex-wrap:wrap}.tab{border:1px solid #b7ccd9;border-radius:7px;background:white;padding:9px 15px;cursor:pointer;color:#174965}.tab[aria-selected=true]{background:var(--navy);color:white}.table-wrap{overflow:auto;margin:10px 0}table{border-collapse:collapse;width:100%;font-size:12px}th,td{padding:7px 9px;border:1px solid #e2e9ef;text-align:left;vertical-align:top;overflow-wrap:anywhere}th{background:#edf3f7;white-space:nowrap}td.lex{font:12px/1.5 ui-monospace,Consolas,monospace;white-space:pre-wrap;word-break:break-word}code{font:12px ui-monospace,Consolas,monospace;overflow-wrap:anywhere}input[type=search]{width:100%;padding:10px 12px;border:1px solid #aec2d0;border-radius:7px}.hint{border-left:4px solid #dcac6d;background:#fff6e8;padding:10px 13px;margin:13px 0;color:#6b4b28}.summary-grid{display:flex;gap:10px;flex-wrap:wrap}.metric{padding:8px 12px;border:1px solid var(--edge);border-radius:7px;background:#f6f9fb;min-width:90px}.metric strong{display:block;font-size:18px}.empty{padding:10px;color:var(--muted);font-style:italic}.rowbadges{display:flex;gap:6px;flex-wrap:wrap;align-items:center}footer{color:var(--muted);padding:22px 28px;border-top:1px solid var(--edge);font-size:12px}@media(max-width:800px){.shell{grid-template-columns:1fr}aside{position:static;max-height:none;border-bottom:1px solid var(--edge)}main{padding:15px}.meta{padding:8px 15px}header{padding:18px}}
</style></head><body>
<header><h1>CIIFR R4 · Engineering source hierarchy</h1><p>Offline inspection · CII → XMLv2 → CII · READ ONLY / not an engineering approval</p></header>
<div class="meta" id="metadata"></div>
<div class="shell"><aside><label for="lineSearch"><strong>Engineering lines</strong></label><p class="minor">Select a source label. Blank is intentionally not inherited.</p><input id="lineSearch" type="search" placeholder="Filter line labels" autocomplete="off"><div id="lineList" role="navigation" aria-label="Engineering lines"></div></aside>
<main><div class="summary-grid" id="summary"></div><section id="selected" aria-live="polite"></section></main></div>
<footer>Source values and row locations only. Unresolved: sentinels, material catalog, effective inheritance, native CAESAR meaning. No data leaves this file; no network, write or export action.</footer>
<script type="application/json" id="ciifr-source">__MODEL_JSON__</script>
<script>
'use strict';
(function(){
const model=JSON.parse(document.getElementById('ciifr-source').textContent);
const lines=Object.entries(model.lines||{});const $=id=>document.getElementById(id);
function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined&&text!==null)n.textContent=String(text);if(cls)n.className=cls;return n}
function add(p,c){p.appendChild(c);return c}
function code(p,text){add(p,el('code',text==null?'UNKNOWN':text))}
function badge(p,text,warning){const b=el('span',text,'chip'+(warning?' warning':''));return add(p,b)}
function section(p,title){let d=add(p,el('section',null,'section'));add(d,el('h2',title));return d}
function detail(p,label,summaryText){let d=add(p,document.createElement('details'));const s=add(d,el('summary'));add(s,el('span',label));add(s,el('span',summaryText||'', 'minor'));const c=add(d,el('div',null,'content'));return {outer:d,body:c}}
function fieldTable(parent,rows){if(!rows||!rows.length){add(parent,el('div','No source fields recorded','empty'));return}
 const wrap=add(parent,el('div',null,'table-wrap')),table=add(wrap,el('table')),thead=add(table,el('thead')),tr=add(thead,el('tr'));
 for(const h of ['Source field','Parsed source value','Original lexeme','Physical CII row','Kind'])add(tr,el('th',h));
 const tbody=add(table,el('tbody'));for(const f of rows){const t=add(tbody,el('tr'));
 add(t,el('td',f.key??'UNKNOWN'));add(t,el('td',f.value??'UNKNOWN'));add(t,el('td',f.lexeme??'UNKNOWN','lex'));add(t,el('td',f.cii_line??'UNKNOWN'));add(t,el('td',f.kind??'UNKNOWN'));}}
function lineTitle(s){return s===''?'(blank source label)':s}
function renderComponent(p,c){const d=detail(p,c.section+' · auxiliary record #'+c.record_index,'pointer row '+c.pointer_field_line+' → auxiliary row '+c.aux_source_line);add(d.body,el('div','Owned by element #'+c.element_index+'; not automatically a nodal restraint.','minor'));
 d.outer.addEventListener('toggle',()=>{if(d.outer.open&&!d.outer.dataset.ready){d.outer.dataset.ready='1';fieldTable(d.body,c.fields)}});}
function renderElements(panel,line){const box=section(panel,'Line → ordered elements');for(const x of line.elements){const d=detail(box,'Element #'+x.element_index+' · '+x.from+' → '+x.to,'source row '+x.source_line+' · '+x.pointers.length+' links');
 const bs=add(d.body,el('div',null,'rowbadges'));badge(bs,'source row '+x.source_line);badge(bs,'material ID '+x.material_id,true);badge(bs,'material source row '+x.material_source_line);
 add(d.body,el('div','Material ID is an external reference; catalog/effective meaning UNKNOWN.','hint'));
 const prop=detail(d.body,'53 ordered source properties','raw value + lexeme + physical source row');
 const identity=detail(d.body,'Element identity fields','original labels and source fields');
 const components=detail(d.body,'Pointer-linked source components',x.components.length+' records');
 let prepared=false;d.outer.addEventListener('toggle',()=>{if(d.outer.open&&!prepared){prepared=true;fieldTable(prop.body,x.properties);fieldTable(identity.body,x.identity);if(x.components.length)for(const c of x.components)renderComponent(components.body,c);else add(components.body,el('div','No populated auxiliary pointer','empty'));}});
 }if(!line.elements.length)add(box,el('div','No elements','empty'))}
function renderNodes(panel,line){const box=section(panel,'Line → source-qualified nodes');add(box,el('p','Entries include endpoint occurrences and auxiliary-only references. Shared node numbers do not carry events across lines.','minor'));
 const nodes=line.node_occurrences||[];for(const n of nodes){const d=detail(box,'Node '+n.number,n.auxiliary_only?'auxiliary-only association':n.endpoints.length+' endpoint occurrence(s)');
 if(n.auxiliary_only)badge(d.body,'No endpoint on this line',true);
 if(n.endpoints.length){add(d.body,el('h3','Endpoint occurrences'));for(const e of n.endpoints){const p=add(d.body,el('p'));code(p,'Element #'+e.element_index+' · '+e.side+' · line '+lineTitle(e.line_label)+' · CII row '+(e.source_line??'UNKNOWN'))}}
 add(d.body,el('h3','Auxiliary / node-name associations'));
 if(!n.events.length)add(d.body,el('div','No auxiliary event owned by this line','empty'));
 for(const e of n.events){const eText=e.type+' · element #'+e.owner_element+' · '+e.section+' record #'+e.aux_index;
 const sub=detail(d.body,eText,'physical auxiliary row '+e.source_line+' · occurrence '+e.event_ordinal);
 add(sub.body,el('div','Owner: element #'+e.owner_element+'; source: '+e.section+' record #'+e.aux_index+', physical CII row '+e.source_line,'minor'));
 sub.outer.addEventListener('toggle',()=>{if(sub.outer.open&&!sub.outer.dataset.ready){sub.outer.dataset.ready='1';fieldTable(sub.body,e.fields)}});
 }}if(!nodes.length)add(box,el('div','No source-qualified nodes','empty'))}
function renderUnits(panel){const box=section(panel,'Raw source units and factors');add(box,el('p','Original unit fields only; no inferred conversion or effective material policy.','minor'));
 for(const r of model.units||[]){const d=detail(box,'Source units record #'+(r.record_index??'UNKNOWN'),(r.fields||[]).length+' source fields');d.outer.addEventListener('toggle',()=>{if(d.outer.open&&!d.outer.dataset.ready){d.outer.dataset.ready='1';fieldTable(d.body,r.fields)}})}}
const src=model.source||{};const meta=$('metadata');for(const text of ['Profile: '+(src.profile??'UNKNOWN'),'Original bytes: '+(src.bytes??'UNKNOWN'),'Original SHA-256: '+(src.sha256??'UNKNOWN')])add(meta,el('span',text));
for(const [label,count] of [['Elements',model.counts?.elements],['Lines',model.counts?.lines],['Nodes (global)',model.counts?.nodes],['Pointer links',model.counts?.pointer_links],['Blank-label elements',model.counts?.blank_label_elements]]){let m=add($('summary'),el('div',null,'metric'));add(m,el('strong',count??'UNKNOWN'));add(m,el('span',label,'minor'))}
let chosen=lines.length?lines[0][0]:null;
function renderNav(){const q=$('lineSearch').value.trim().toLowerCase(),p=$('lineList');p.replaceChildren();let shown=0;
 for(const [label,record] of lines){if(!lineTitle(label).toLowerCase().includes(q))continue;shown++;const b=add(p,el('button',null,'line'+(label===chosen?' active':'')));b.type='button';b.setAttribute('aria-pressed',String(label===chosen));add(b,el('strong',lineTitle(label)));add(b,el('span',record.elements.length+' elements · '+(record.node_occurrences||[]).length+' local nodes','minor'));b.addEventListener('click',()=>{chosen=label;renderNav();renderLine()})}
 if(!shown)add(p,el('div','No matching line labels','empty'))}
function renderLine(){const p=$('selected');p.replaceChildren();if(chosen===null){add(p,el('div','No lines','empty'));return}const record=model.lines[chosen];
 const top=section(p,'Engineering line: '+lineTitle(chosen));badge(top,'Original source label: '+(chosen===''?'BLANK (empty string)':chosen),chosen==='');badge(top,record.elements.length+' ordered elements');badge(top,(record.node_occurrences||[]).length+' source-qualified nodes');
 const hint=add(top,el('div','Source labels, node numbers and material IDs are not normalized into inferred engineering truth.','hint'));
 const nav=add(top,el('div',null,'tabs')),body=add(p,el('div'));let selected='elements';
 const buttons=[['elements','Elements / properties'],['nodes','Nodes / associations'],['units','Source units']].map(([key,title])=>{const b=add(nav,el('button',title,'tab'));b.type='button';b.addEventListener('click',()=>{selected=key;draw()});return[key,b]});
 function draw(){for(const [key,b] of buttons)b.setAttribute('aria-selected',String(key===selected));body.replaceChildren();if(selected==='elements')renderElements(body,record);else if(selected==='nodes')renderNodes(body,record);else renderUnits(body)}draw();}
$('lineSearch').addEventListener('input',renderNav);renderNav();renderLine();
})();
</script></body></html>
'''


def render_hierarchy(model: dict) -> str:
    """Render portable offline HTML; injected labels are JSON-escaped and DOM-only."""
    payload = json.dumps(model, ensure_ascii=True, separators=(',', ':'))
    # Escaping '<' protects the literal script element from </script> injection.
    payload = payload.replace('<', '\\u003c').replace('>', '\\u003e').replace('&', '\\u0026')
    return _HTML.replace('__MODEL_JSON__', payload)
