import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {inputXmlToCategorizedInputXml as s40} from '../xml-compare/CategorizedInputXmlConverter.js';
import {classifyCategorizedEditableFields,patchOriginalFromCategorized as patch}
  from '../uxml/UxmlCategorizedPatchBack.js';
import {_test as workspaceUi} from '../tabs/inputxml-workspace/inputxml-workspace-tab.js';

const sha=value=>createHash('sha256').update(value).digest('hex');
const sources=[
  ['GRE','docs/GREInputxml.xml'],
  ['PLB314','docs/PLB314Inputxml.xml'],
  ['mock','opt/mock-xml.xml'],
  ['BM_CII','converters/scripts/pdf_inputxml_profile_bm_cii.xml'],
];
for(const [name,path] of sources){
  test('B8 R1 engine Editable equals actual patch acceptance for EVERY public leaf '+name,async()=>{
    const source=readFileSync(new URL('../'+path,import.meta.url),'utf8');
    const baseline=s40(source),fileSha256=sha(source);
    const classified=await classifyCategorizedEditableFields(source,baseline,{fileSha256});
    assert.equal(classified.ok,true,name+' original S4.1 source must bind');
    const ui=workspaceUi.b8EditableChoices(baseline,classified.choices);
    const engine=new Map(classified.choices.map(x=>[x.key,x]));
    assert(ui.length>20,name+' must include many representative mapped leaves');
    let eligible=0,refused=0,compared=0;
    for(const choice of ui){
      if(choice.tag==='ALLOWABLESTRESS'){
        assert.equal(choice.editable,false,'global stanza always read-only');
        continue;
      }
      const authority=engine.get(choice.key);
      assert(authority,'engine must classify '+choice.key);
      assert.equal(choice.editable,authority.editable,'UI cannot assert a different verdict');
      const probe=authority.probeValue;
      if(probe===null){assert.equal(choice.editable,false);continue;}
      const edited=baseline.slice(0,choice.start)+probe+baseline.slice(choice.end);
      const result=await patch(source,baseline,edited,{fileSha256});
      const accepted=result?.ok===true&&result.parity==='EQUAL';
      assert.equal(choice.editable,accepted,
        name+' '+choice.key+' '+choice.where+'/'+choice.tag+
        ' engine class='+String(authority.code)+' patch='+String(result.code||result.parity));
      if(accepted){
        assert(result.bytes instanceof Uint8Array);
        eligible++;
      }else{
        assert.equal(result.bytes,null);
        refused++;
      }
      compared++;
    }
    assert(compared>30,name+' no incomplete leaf classification');
    console.log('B8_R1_ALL_PUBLIC_LEAVES '+name+' total='+compared+
      ' accepted='+eligible+' refused='+refused+' exactEngineEquality=true');
  });
}
