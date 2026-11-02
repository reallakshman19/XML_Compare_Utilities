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
