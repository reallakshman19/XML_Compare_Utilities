/**
 * S4.2 slice 2 — exact, deliberately small S4.0 projection→source map.
 * Derived / line-owned / globally harvested values are NOT writable here.
 * Source audit: CategorizedInputXmlConverter.js BLOCK_FIELDS and
 * categorizedElementXml() -> blockXml() at lines 99-102, 209-223.
 */
export const S42_PROJECTION_MAP=Object.freeze([
  ...['FROM_NAME','TO_NAME','NAME'].map(tag=>Object.freeze({
    block:'NameBlock',tag,sourceTag:'PIPINGELEMENT',attribute:tag})),
  ...['DELTA_X','DELTA_Y','DELTA_Z'].map(tag=>Object.freeze({
    block:'RouteGeometryBlock',tag,sourceTag:'PIPINGELEMENT',attribute:tag})),
  ...['DIAMETER','WALL_THICK','INSUL_THICK'].map(tag=>Object.freeze({
    block:'SectionDimensionBlock',tag,sourceTag:'PIPINGELEMENT',attribute:tag})),
]);
export const S42_PROJECTION_REFUSE=Object.freeze([
  'DerivedBlock.* (ElementLengthMm, BoreMm, MaterialName)',
  'LineBlock.* (Branchname, LineNo, PipingClass, Rating)',
  'LineBlocks.ProcessBlock.* (merged across records)',
  'LineBlocks.MaterialBlock.* (merged across records)',
  'NodesBlock.* (grouped external / computed coordinates / temperatures)',
  'FromCoordinateBlock.*, ToCoordinateBlock.* (computed/solved coordinates)',
  'BendBlock.*, RigidBlock.*, FlangeBlock.* (child markup, not direct leaf map)',
  'MiscBlock.UnmappedAttribute (key/value and sentinel ambiguity)',
  'Any omitted, inferred, unit-converted, identity, duplicated, or unmapped tag',
]);
export function categorizedElementRanges(text){
  const elements=[],re=/<Element\b[^>]*>[\s\S]*?<\/Element>/g;
  let m;
  while((m=re.exec(text)))elements.push({start:m.index,end:m.index+m[0].length,text:m[0]});
  return elements;
}
// Exact S4.0 emitted flat direct child leaf only; no XML parser inference.
export function projectionLeaf(elementText,entry){
  const name=entry.block,field=entry.tag;
  const blockRe=new RegExp('<'+name+'(?:\\s+[^>]*)?>([\\s\\S]*?)<\\/'+name+'>','g');
  const blocks=[...elementText.matchAll(blockRe)];
  if(blocks.length>1)return {error:'AMBIGUOUS_BLOCK'};
  if(!blocks.length)return null;
  const body=blocks[0][1],fieldRe=new RegExp('<'+field+'>([^<]*)<\\/'+field+'>','g');
  const fields=[...body.matchAll(fieldRe)];
  if(fields.length>1)return {error:'AMBIGUOUS_FIELD'};
  if(!fields.length)return null;
  const from=blocks[0].index+blocks[0][0].indexOf(body)+fields[0].index+
    fields[0][0].indexOf('>')+1;
  return {start:from,end:from+fields[0][1].length,value:fields[0][1]};
}

// B8: S4.0 mergeLineAttrs(target, attrs) picks the first non-empty,
// non--1.0101 source attribute per line. The exact fields are mirrored here;
// S4.0 itself is deliberately unchanged (see converter BLOCK_FIELDS).
export const S42_LINE_PROJECTION_MAP=Object.freeze({
  ProcessBlock:Object.freeze([
    ...Array.from({length:9},(_,i)=>'TEMP_EXP_C'+(i+1)),
    ...Array.from({length:9},(_,i)=>'PRESSURE'+(i+1)),
    'HYDRO_PRESSURE','INSUL_DENSITY','FLUID_DENSITY','REFRACTORY_DENSITY',
    'REFRACTORY_THK','CLADDING_DEN','CLADDING_THK',
    'INSUL_CLAD_UNIT_WEIGHT','INSUL_CLAD_UNIT_WEIGH',
  ].map(tag=>Object.freeze({block:'ProcessBlock',tag,sourceTag:'PIPINGELEMENT',attribute:tag}))),
  MaterialBlock:Object.freeze([
    'MATERIAL_NUM','MATERIAL_NAME','CORR_ALLOW','MODULUS',
    ...Array.from({length:9},(_,i)=>'HOT_MOD'+(i+1)),
    'POISSONS','PIPE_DENSITY','MILL_TOL_PLUS','MILL_TOL_MINUS','SEAM_WELD',
  ].map(tag=>Object.freeze({block:'MaterialBlock',tag,sourceTag:'PIPINGELEMENT',attribute:tag}))),
});
export const S42_LINE_FIELDS=Object.freeze([
  ...S42_LINE_PROJECTION_MAP.ProcessBlock,...S42_LINE_PROJECTION_MAP.MaterialBlock,
]);
export function categorizedLineRanges(text){
  const lines=[],re=/<Line\b([^>]*)>[\s\S]*?<\/Line>/g;
  let m;
  while((m=re.exec(String(text)))){
    const id=m[1].match(/\bid\s*=\s*(["'])(.*?)\1/)?.[2];
    lines.push({start:m.index,end:m.index+m[0].length,text:m[0],id:id??null});
  }
  return lines;
}
