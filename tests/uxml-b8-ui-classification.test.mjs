import test from 'node:test';
import assert from 'node:assert/strict';
import {inputXmlToCategorizedInputXml as s40} from '../xml-compare/CategorizedInputXmlConverter.js';
import {_test as workspaceUi} from '../tabs/inputxml-workspace/inputxml-workspace-tab.js';

test('B8 editor classifies mapped root fields, omitted NAME and globally shared AllowableStress read-only',()=>{
  const source='<CAESARII XML_TYPE="Input"><PIPINGMODEL>'+
    '<PIPINGELEMENT FROM_NODE="10" TO_NODE="20" LINE_ID="L" '+
    'DELTA_X="10" DELTA_Y="20" DELTA_Z="30" PRESSURE1="1.5" DIAMETER="100"/>'+
    '<ALLOWABLESTRESS NODE="10" ALLOWABLE_1="100"/></PIPINGMODEL></CAESARII>';
  const choices=workspaceUi.b8EditableChoices(s40(source));
  const pressure=choices.find(x=>x.tag==='PRESSURE1'&&x.where==='Line L');
  assert.equal(pressure?.editable,true,'explicit ProcessBlock source attribute');
  const name=choices.find(x=>x.tag==='NAME'&&x.where==='Element 1');
  assert.equal(name?.editable,false,'source NAME absent; element-key fallback cannot be edited');
  const global=choices.find(x=>x.tag==='ALLOWABLESTRESS');
  assert.equal(global?.editable,false,'global shared stanza must not expose writable value box');
  assert.equal(global?.where,'Line L');
});
