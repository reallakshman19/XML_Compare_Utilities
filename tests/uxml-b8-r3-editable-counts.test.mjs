import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {inputXmlToCategorizedInputXml as s40} from '../xml-compare/CategorizedInputXmlConverter.js';
import {classifyCategorizedEditableFields} from '../uxml/UxmlCategorizedPatchBack.js';

const sources=[
  ['GRE','docs/GREInputxml.xml'],
  ['PLB314','docs/PLB314Inputxml.xml'],
  ['mock','opt/mock-xml.xml'],
  ['BM_CII','converters/scripts/pdf_inputxml_profile_bm_cii.xml'],
];
const previous={DIAMETER:37,WALL_THICK:42,INSUL_THICK:5};
test('B8 R3 FAST public section editable counts exceed c222bc89 baseline',async()=>{
  const after={DIAMETER:0,WALL_THICK:0,INSUL_THICK:0},perPublicSample=[];
  for(const [name,path] of sources){
    const source=readFileSync(new URL('../'+path,import.meta.url),'utf8');
    const baseline=s40(source),fileSha256=createHash('sha256').update(source).digest('hex');
    const classified=await classifyCategorizedEditableFields(source,baseline,{fileSha256});
    assert.equal(classified.ok,true,name+' must bind uniquely to original source');
    const counts={DIAMETER:0,WALL_THICK:0,INSUL_THICK:0};
    for(const choice of classified.choices){
      if(!choice.key.startsWith('E:')||choice.editable!==true)continue;
      const tag=choice.key.split(':').at(-1);
      if(Object.prototype.hasOwnProperty.call(counts,tag)){counts[tag]++;after[tag]++;}
    }
    perPublicSample.push({name,...counts});
  }
  for(const tag of Object.keys(previous))
    assert(after[tag]>=previous[tag],
      tag+': baseline='+previous[tag]+', R3='+after[tag]);
  console.log('B8_R3_SECTION_EDITABILITY '+JSON.stringify({
    before:previous,after,perPublicSample,
  }));
});
