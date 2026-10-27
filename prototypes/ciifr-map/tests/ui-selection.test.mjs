import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {webcrypto} from 'node:crypto';
import {readXmlGraph} from '../xml-intake.js';
import {createPreviewSession} from '../compare.js';
import {mountScene, renderRows} from '../view.js';

if (!process.env.CIIFR_TEST_RUNTIME) throw new Error('CIIFR_TEST_RUNTIME required');
const {DOMParser}=createRequire(process.env.CIIFR_TEST_RUNTIME + '/package.json')('@xmldom/xmldom');
const read=(bytes,opts)=>readXmlGraph(bytes,{...opts,cryptoRef:webcrypto,parser:new DOMParser({
  onError:(level,message)=>{ throw Error(level+':'+message); },
})});

// This DOM event fixture tests the real SVG/table selection handlers but is not a served browser/GPU test.
test('actual XML SVG TARGET click/keyboard and table expose both SOURCE rows for reused target', async () => {
  const session=createPreviewSession({read});
  await session.load('SOURCE',new Uint8Array(readFileSync(new URL('./fixtures/S1-F05.xml',import.meta.url))),'S1-F05.xml');
  await session.load('TARGET',new Uint8Array(readFileSync(new URL('./fixtures/S1-R4.xml',import.meta.url))),'S1-R4.xml');
  for (const n of ['3790','3830','3840']) session.addAnchor(n,n);
  const original=session.run();
  const first=original.candidates.rows.find(r=>r.alternatives.length);
  assert(first,'need a real target node with an alternative');
  const other=original.candidates.rows.find(r=>r.source!==first.source);
  const node=first.alternatives[0].target;
  // Inject only a synthetic contradictory alternative; actual physical XML graph is unchanged.
  const reused={...other,target:node,alternatives:[...other.alternatives,{...first.alternatives[0]}]};
  const scenario={...original,candidates:{...original.candidates,rows:[first,reused]}};
  const listeners=new Map();
  const svg={addEventListener:(name,fn)=>listeners.set(name,fn),setAttribute:()=>{}};
  const canvas={set innerHTML(html){this.html=html;},querySelector:()=>svg};
  const received=[];
  mountScene(scenario,canvas,(...args)=>received.push(args),[],null);
  const nodeElement={dataset:{kind:'TARGET',node},closest(sel){return sel==='[data-node]'?this:null;}};
  listeners.get('click')({target:nodeElement});
  assert.deepEqual(received.at(-1)[0],[first.source,other.source]);
  listeners.get('keydown')({target:nodeElement,key:'Enter',preventDefault:()=>{}});
  assert.deepEqual(received.at(-1)[0],[first.source,other.source]);

  const originalDocument=globalThis.document;
  const el=()=>({dataset:{},listeners:{},children:[],classList:{selected:false,toggle(_,flag){this.selected=flag;}},
    append(child){this.children.push(child);},addEventListener(name,fn){this.listeners[name]=fn;}});
  globalThis.document={createElement:el};
  try {
    const body={children:[],replaceChildren(){this.children=[];},append(row){this.children.push(row);}};
    renderRows(scenario,body,sources=>received.push([sources]),[first.source,other.source]);
    assert.equal(body.children.length,2);
    assert(body.children.every(row=>row.classList.selected));
    body.children[1].listeners.click();
    assert.equal(received.at(-1)[0],other.source);
  } finally { globalThis.document=originalDocument; }
});
