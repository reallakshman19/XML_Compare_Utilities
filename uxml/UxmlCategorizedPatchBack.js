/**
 * UXML S4.2, slice 1: fail-closed original-byte attribute-value patcher.
 * Source authority: exact SHA + S4.1 one-to-one refs + shared scanner offsets.
 * No inverse converter, XML rebuild, geometry inference, or UI/application.
 */
import {inputXmlToCategorizedInputXml,_test as s40} from '../xml-compare/CategorizedInputXmlConverter.js';
import {mapCategorizedInputXmlToUxml} from './UxmlCategorizedInputXmlSchemaMapper.js';
import {mapCaesarInputXmlToUxmlStrict} from './UxmlInputXmlSchemaMapper.js';
import {scanOriginalInputXmlStructure} from './UxmlInputXmlSourceStructure.js';
import {S42_PROJECTION_MAP,S42_LINE_FIELDS,categorizedLineRanges,categorizedElementRanges,projectionLeaf} from './UxmlCategorizedProjectionMap.js';
import {withPatchRowProvenance} from './UxmlCategorizedPatchBackProvenance.js';

export const UXML_CATEGORIZED_PATCH_REFUSALS=Object.freeze({
  INPUT:'S42_INVALID_INPUT',
  HASH:'S42_ORIGINAL_SHA_MISMATCH',
  BASELINE:'S42_BASELINE_NOT_S40_EXACT',
  UNBOUND:'S42_UNBOUND_RECORD',
  STRUCTURE:'S42_ELEMENT_ADDED_REMOVED_OR_MARKUP_EDITED',
  NESTED:'S42_NESTED_ATTRIBUTE_EDIT_REFUSED',
  REORDER:'S42_ELEMENT_REORDERED',
  IDENTITY:'S42_RECORD_IDENTITY_EDITED',
  EXTERNAL:'S42_SHARED_EXTERNAL_EDIT_REFUSED',
  UNITS:'S42_UNITS_EDIT_REFUSED',
  VALUE:'S42_ATTRIBUTE_VALUE_UNSAFE',
  OFFSET:'S42_SOURCE_OFFSET_NOT_EXACT',
  PARITY:'S42_PARITY_FAILED',
  CONVERTER:'S42_S40_CONVERSION_REFUSED',
  S40_MISMATCH:'S42_S40_PROJECTION_MISMATCH',
  UNMAPPED:'S42_UNMAPPED_OR_DERIVED_PROJECTION_EDIT',
  ROUNDTRIP:'S42_PROJECTION_VALUE_NOT_EXACT',
  GLOBAL:'S42_GLOBAL_SHARED_STANZA_READ_ONLY',
  LINE_DERIVED:'S42_LINE_DERIVED_OR_DISAGREEING_VALUES',
  CROSS_LINE:'S42_CROSS_LINE_CARRY_FORWARD_REFUSED',
  NUMERIC:'S42_NUMERIC_VALUE_NOT_CANONICAL',
  OMITTED:'S42_SOURCE_ATTRIBUTE_OMITTED_OR_DERIVED',
  GRAPH:'S42_SOURCE_GRAPH_CONFLICT',
  S41_BINDING:'S42_S41_SOURCE_BINDING_REFUSED',
});
const fail=(code,refusals=[])=>({ok:false,code,bytes:null,refusals});
const encoder=new TextEncoder();
const utf8=(value)=>encoder.encode(value);
const hex=(bytes)=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
const sha=async(bytes)=>hex(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',bytes)));
const clean=(x)=>String(x??'').trim();
const refKeys=(doc)=>doc.components.map(c=>c.sourceRefs?.[0]?.recordKey);
const equalArray=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
export const s42StrictS3KeysEqual=(before,after)=>equalArray(refKeys(before),refKeys(after));
const identityFields=new Set(['FROM_NODE','TO_NODE','LINE_ID','PIPELINE-REFERENCE']);
const externalTags=new Set(['RESTRAINT','DISPLACEMENTS','FORCESMOMENTS','ALLOWABLESTRESS','SIF']);
// Exact S4.0 CONTROL_ATTRS (CategorizedInputXmlConverter.js:23), plus the
// basis/record node references S4.0 uses when solving source-derived fields.
// These are never user-editable on globally projected external stanzas.
const externalControlAttrs=new Set(['NUM','NUMBER','SIF_NUM','DISP_NUM',
  'FORCMNT_NUM','NODE','NODE_NUM','NODE1','NODE2','NODE3','CNODE',
  'GLOBAL_COORD_BASIS_NODE','FROM_NODE','TO_NODE']);
// Keep S4.0 normalizeNode / isUnset numerical semantics, not raw node strings.
const normalizeExternalNode=value=>{
  const raw=clean(value),n=Number(raw);
  return Number.isFinite(n)&&Math.abs(n-Math.round(n))<1e-6
    ?String(Math.round(n)):raw.replace(/\.0+$/,'');
};
const externalNodeField=tag=>
  tag==='RESTRAINT'||tag==='SIF'?'NODE':
  tag==='DISPLACEMENTS'||tag==='FORCESMOMENTS'?'NODE_NUM':null;

import {createB8SourceModel} from './UxmlCategorizedPatchBackSourceModel.js';
import {createB8SourceIntegrity} from './UxmlCategorizedPatchBackSourceIntegrity.js';
import {createB8Slice1} from './UxmlCategorizedPatchBackSlice1.js';
import {createB8Projection} from './UxmlCategorizedPatchBackProjection.js';
import {createB8Carry} from './UxmlCategorizedPatchBackCarry.js';
import {createB8Classifier} from './UxmlCategorizedPatchBackClassifier.js';
import {createB8Preflight} from './UxmlCategorizedPatchBackPreflight.js';
import {createB8Writer} from './UxmlCategorizedPatchBackWriter.js';
const b8Modules={inputXmlToCategorizedInputXml,s40,mapCategorizedInputXmlToUxml,mapCaesarInputXmlToUxmlStrict,scanOriginalInputXmlStructure,S42_PROJECTION_MAP,S42_LINE_FIELDS,categorizedLineRanges,categorizedElementRanges,projectionLeaf,UXML_CATEGORIZED_PATCH_REFUSALS,fail,encoder,utf8,hex,sha,clean,refKeys,equalArray,s42StrictS3KeysEqual,identityFields,externalTags,externalControlAttrs,normalizeExternalNode,externalNodeField};
Object.assign(b8Modules,createB8SourceModel(b8Modules));
Object.assign(b8Modules,createB8SourceIntegrity(b8Modules));
Object.assign(b8Modules,createB8Slice1(b8Modules));
Object.assign(b8Modules,createB8Projection(b8Modules));
Object.assign(b8Modules,createB8Carry(b8Modules));
Object.assign(b8Modules,createB8Classifier(b8Modules));
Object.assign(b8Modules,createB8Preflight(b8Modules));
Object.assign(b8Modules,createB8Writer(b8Modules));
export const classifyCategorizedEditableFields=b8Modules.classifyCategorizedEditableFields;
const patchOriginalFromCategorizedImpl=(...a)=>b8Modules.patchOriginalFromCategorizedImpl(...a);
const categorizedItems=(...a)=>b8Modules.categorizedItems(...a);
// Metadata-only wrapper: preserve the engine's decision, bytes and row
// ordering; annotate every available success/refusal with both coordinates.
export async function patchOriginalFromCategorized(originalText,baselineCategorized,
  editedCategorized,options={}){
  const outcome=await patchOriginalFromCategorizedImpl(originalText,
    baselineCategorized,editedCategorized,options);
  return withPatchRowProvenance(outcome,originalText,baselineCategorized,{
    scan:scanOriginalInputXmlStructure,parse:categorizedItems});
}
