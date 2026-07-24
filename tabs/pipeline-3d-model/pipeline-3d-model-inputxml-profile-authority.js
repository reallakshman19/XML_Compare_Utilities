import{getPipelineEngineeringProfile}from'./pipeline-3d-model-engineering-profile-registry.js';import{PIPELINE_ANALYSIS_SECTION_PLAN_SCHEMA,
PIPELINE_ANALYSIS_SECTION_SCHEMA,PIPELINE_ELEMENT_SECTION_RESOLUTION_SCHEMA}from'./pipeline-3d-model-analysis-section-contracts.js';import{
PIPELINE_ANALYSIS_DIAMETER_PLAN_SCHEMA,PIPELINE_ANALYSIS_DIAMETER_RESOLUTION_SCHEMA,PIPELINE_DIAMETER_MIGRATION_SCHEMA,PIPELINE_ELEMENT_DIAMETER_RESOLUTION_SCHEMA,
PIPELINE_PROPERTY_SECTION_PLAN_SCHEMA,parsePipelinePositiveScalar}from'./pipeline-3d-model-diameter-contracts.js';import{PIPELINE_BEND_RESOLUTION_SCHEMA,
PIPELINE_NORMAL_FITTING_PLAN_SCHEMA,PIPELINE_NORMAL_FITTING_RESOLUTION_SCHEMA}from'./pipeline-3d-model-normal-fitting-contracts.js';import{
PIPELINE_B314_RADIUS_PLAN_SCHEMA,PIPELINE_B314_RADIUS_RESOLUTION_SCHEMA}from'./pipeline-3d-model-b314-radius-contracts.js';import{PIPELINE_GRE_VENDOR_PLAN_SCHEMA,
PIPELINE_GRE_VENDOR_SECTION_SCHEMA,PIPELINE_GRE_VENDOR_ELEMENT_SCHEMA}from'./pipeline-3d-model-gre-vendor-series-contracts.js';import{PIPELINE_PROPERTY_SECTION_SCHEMA,
PIPELINE_ELEMENT_PROPERTY_RESOLUTION_SCHEMA}from'./pipeline-3d-model-property-sections.js';export const PIPELINE_INPUTXML_PROFILE_AUTHORITY_PLAN_SCHEMA=
'PipelineInputXmlProfileAuthorityPlan.v1';export const PIPELINE_INPUTXML_PROFILE_SECTION_AUTHORITY_SCHEMA='PipelineInputXmlProfileSectionAuthority.v1';export const
PIPELINE_INPUTXML_PROFILE_ELEMENT_AUTHORITY_SCHEMA='PipelineInputXmlProfileElementAuthority.v1';export const PIPELINE_INPUTXML_FITTING_AUTHORITY_SCHEMA=
'PipelineInputXmlFittingAuthority.v1';export const PIPELINE_INPUTXML_AUTHORITY_BLOCKER_ORDER=Object.freeze(['PIPELINE_INPUTXML_AUTHORITY_INPUT_INVALID',
'PIPELINE_INPUTXML_AUTHORITY_SCHEMA_INVALID','PIPELINE_INPUTXML_AUTHORITY_OWNERSHIP_INVALID','PIPELINE_INPUTXML_AUTHORITY_COVERAGE_INVALID',
'PIPELINE_INPUTXML_DIAMETER_CONFLICT','PIPELINE_INPUTXML_PROPERTY_CONFLICT','PIPELINE_INPUTXML_FITTING_AUTHORITY_UNRESOLVED','PIPELINE_INPUTXML_FITTING_GEOMETRY_CONFLICT'
,'PIPELINE_INPUTXML_GRE_BEND_GEOMETRY_REQUIRED','PIPELINE_INPUTXML_WRITER_BLOCKED',]);const text=(v)=>typeof v==='string'?v.trim():'';const cmp=(a,b)=>a<b?-1:a>b?1:0;
const plain=(v)=>Boolean(v&&typeof v==='object'&&!Array.isArray(v)&&[Object.prototype,null].includes(Object.getPrototypeOf(v)));function clone(v){if(v===undefined)return
null;if(v===null||typeof v==='string'||typeof v==='boolean')return v;if(typeof v==='number'&&Number.isFinite(v))return v;if(Array.isArray(v))return v.map(clone);if(!plain
(v))throw new TypeError('Input must be JSON-safe plain data.');return Object.fromEntries(Object.keys(v).sort(cmp).map((k)=>[k,clone(v[k])]));}function freeze(v){if(!v||
typeof v!=='object'||Object.isFrozen(v))return v;Object.values(v).forEach(freeze);return Object.freeze(v);}const diag=(code,details={})=>freeze({severity:'BLOCKING',code,
message:code,details:clone(details)});const rank=(code)=>{const i=PIPELINE_INPUTXML_AUTHORITY_BLOCKER_ORDER.indexOf(code);return i<0?
PIPELINE_INPUTXML_AUTHORITY_BLOCKER_ORDER.length:i;};function finalState(errors){const keyed=Object.create(null);errors.filter(plain).filter((v)=>text(v.code)).forEach((v
)=>{const item=freeze({severity:text(v.severity)||'BLOCKING',code:text(v.code),message:text(v.message)||text(v.code),details:plain(v.details)?clone(v.details):{}});keyed[
`${item.code}:${JSON.stringify(item.details)}`]=item;});const diagnostics=Object.freeze(Object.values(keyed).sort((a,b)=>rank(a.code)-rank(b.code)||cmp(a.code,b.code)||
cmp(JSON.stringify(a.details),JSON.stringify(b.details))));const blockerCodes=Object.freeze([...new Set(diagnostics.map((v)=>v.code))].sort((a,b)=>rank(a)-rank(b)||cmp(a,
b)));return{diagnostics,blockerCodes,ready:blockerCodes.length===0};}function safe(input){try{const source=clone(input);if(plain(source))return{source,errors:[]};}catch{}
return{source:{},errors:[diag('PIPELINE_INPUTXML_AUTHORITY_INPUT_INVALID')]};}const blocked=(v)=>(v?.blockerCodes||[]).length>0||(v?.diagnostics||[]).some((d)=>text(d?.
severity)==='BLOCKING');const exact=(v,schema,ready=true)=>plain(v)&&v.schema===schema&&Array.isArray(v.diagnostics)&&Array.isArray(v.blockerCodes)&&(!ready||v.ready===
true)&&!blocked(v);const canonicalList=(values)=>Array.isArray(values)&&values.every((v,i)=>typeof v==='string'&&text(v)&&(i===0||cmp(values[i-1],v)<0));const add=(errors
,code,details={})=>errors.push(diag(code,details));function analysisAuth(source,errors){const plan=source.analysisSectionPlan;const sections=Array.isArray(plan?.sections)
?plan.sections:[];const elements=Array.isArray(plan?.elementResolutions)?plan.elementResolutions:[];let valid=exact(plan,PIPELINE_ANALYSIS_SECTION_PLAN_SCHEMA)&&sections.
length>0&&elements.length>0;if(!valid)add(errors,'PIPELINE_INPUTXML_AUTHORITY_SCHEMA_INVALID');const byId=Object.create(null),byElement=Object.create(null);sections.
forEach((s,i)=>{const start=s?.startElementIndex,profile=getPipelineEngineeringProfile(text(s?.profileId));const ok=exact(s,PIPELINE_ANALYSIS_SECTION_SCHEMA,false)&&s.
status!=='BLOCKED'&&s.analysisSectionId===`AS${i + 1}`&&profile&&Number.isInteger(start)&&start>=0&&start<elements.length&&(i===0?start===0:start>sections[i-1]?.
startElementIndex);if(!ok||byId[s?.analysisSectionId]){valid=false;add(errors,'PIPELINE_INPUTXML_AUTHORITY_OWNERSHIP_INVALID');}if(ok)byId[s.analysisSectionId]=s;});
elements.forEach((e,i)=>{const owner=sections.filter((s)=>s?.startElementIndex<=i).at(-1);const profile=getPipelineEngineeringProfile(text(owner?.profileId));const ok=
exact(e,PIPELINE_ELEMENT_SECTION_RESOLUTION_SCHEMA)&&e.elementIndex===i&&e.elementId===`E${i + 1}`&&owner&&e.analysisSectionId===owner.analysisSectionId&&e.profileId===
owner.profileId&&e.resolvedMode===profile?.resolvedMode&&e.sectionDisposition===(owner.startElementIndex===i?'SECTION_START':'INHERITED');if(!ok){valid=false;add(errors,
'PIPELINE_INPUTXML_AUTHORITY_OWNERSHIP_INVALID',{elementIndex:i});}else byElement[i]=e;});return{plan:plain(plan)?plan:{},sections:sections.filter(plain),elements:
elements.filter(plain),byId,byElement,valid};}function migrationOk(v){return exact(v,PIPELINE_DIAMETER_MIGRATION_SCHEMA)&&['outsideDiameterSourceKinds',
'nominalPipeSizeSourceKinds','greVendorNominalBoreSourceKinds'].every((field)=>canonicalList(v[field]))&&v.npsToOutsideDiameterConversionApplied===false&&v.
greVendorBoreToOutsideDiameterConversionApplied===false&&typeof v.legacyDiameterEvidenceObserved==='boolean'&&typeof v.legacyDiameterBasisConfirmed==='boolean'&&!(v.
legacyDiameterEvidenceObserved&&!v.legacyDiameterBasisConfirmed);}function diameterAuth(source,analysis,errors){const plan=source.analysisDiameterPlan;const sections=
Array.isArray(plan?.sectionResolutions)?plan.sectionResolutions:[];const elements=Array.isArray(plan?.elementResolutions)?plan.elementResolutions:[];let valid=analysis.
valid&&exact(plan,PIPELINE_ANALYSIS_DIAMETER_PLAN_SCHEMA)&&plan.analysisSectionPlanSchema===PIPELINE_ANALYSIS_SECTION_PLAN_SCHEMA&&plan.propertySectionPlanSchema===
PIPELINE_PROPERTY_SECTION_PLAN_SCHEMA&&migrationOk(plan?.migration)&&sections.length===analysis.sections.length&&elements.length===analysis.elements.length;if(!valid)add(
errors,'PIPELINE_INPUTXML_AUTHORITY_SCHEMA_INVALID');const byId=Object.create(null),byElement=Object.create(null);sections.forEach((d,i)=>{const owner=analysis.byId[
`AS${i + 1}`];const ok=exact(d,PIPELINE_ANALYSIS_DIAMETER_RESOLUTION_SCHEMA)&&d.status==='RESOLVED'&&owner&&d.analysisSectionId===owner.analysisSectionId&&d.
startElementIndex===owner.startElementIndex&&d.profileId===owner.profileId&&d.resolvedMode===analysis.byElement[owner.startElementIndex]?.resolvedMode&&
parsePipelinePositiveScalar(d.caesarDiameterMm)&&d.caesarDiameterMm===d.outsideDiameterMm&&text(d.sourceKind);if(!ok||byId[d?.analysisSectionId]){valid=false;add(errors,
'PIPELINE_INPUTXML_DIAMETER_CONFLICT');}if(ok)byId[d.analysisSectionId]=d;});elements.forEach((d,i)=>{const owner=analysis.byElement[i],section=byId[owner?.
analysisSectionId];const equal=section&&['outsideDiameterMm','nominalPipeSizeNps','greVendorNominalBoreMm','caesarDiameterMm'].every((field)=>d?.[field]===section[field])
;const ok=exact(d,PIPELINE_ELEMENT_DIAMETER_RESOLUTION_SCHEMA)&&owner&&section&&d.elementIndex===i&&d.elementId===`E${i + 1}`&&d.analysisSectionId===owner.
analysisSectionId&&d.profileId===owner.profileId&&d.diameterDisposition===(section.startElementIndex===i?'SECTION_START':'INHERITED')&&parsePipelinePositiveScalar(d.
caesarDiameterMm)&&d.caesarDiameterMm===d.outsideDiameterMm&&equal&&text(d.sourceKind);if(!ok){valid=false;add(errors,'PIPELINE_INPUTXML_DIAMETER_CONFLICT',{elementIndex:
i});}else byElement[i]=d;});return{plan:plain(plan)?plan:{},byId,byElement,valid};}function propertyAuth(source,analysis,errors){const plan=source.propertySectionPlan;
const sections=Array.isArray(plan?.sections)?plan.sections:[];const elements=Array.isArray(plan?.elements)?plan.elements:[];const allowed=new Set([
'PIPELINE_DIAMETER_REQUIRED']);let valid=plain(plan)&&plan.schema===PIPELINE_PROPERTY_SECTION_PLAN_SCHEMA&&Array.isArray(plan.diagnostics)&&Array.isArray(plan.
blockerCodes)&&plan.diagnostics.every((v)=>allowed.has(text(v?.code)))&&plan.blockerCodes.every((v)=>allowed.has(text(v)))&&elements.length===analysis.elements.length;if(
!valid)add(errors,'PIPELINE_INPUTXML_PROPERTY_CONFLICT');const byElement=Object.create(null);sections.forEach((s,i)=>{const ok=plain(s)&&s.schema===
PIPELINE_PROPERTY_SECTION_SCHEMA&&s.sectionId===`S${i + 1}`&&Number.isInteger(s.startElementIndex)&&s.startElementIndex>=0&&s.startElementIndex<elements.length&&(i===0?s.
startElementIndex===0:s.startElementIndex>sections[i-1]?.startElementIndex);if(!ok){valid=false;add(errors,'PIPELINE_INPUTXML_PROPERTY_CONFLICT');}});elements.forEach((e,
i)=>{const owner=sections.filter((s)=>s?.startElementIndex<=i).at(-1);const ok=plain(e)&&e.schema===PIPELINE_ELEMENT_PROPERTY_RESOLUTION_SCHEMA&&e.elementIndex===i&&e.
elementId===`E${i + 1}`&&owner&&e.sectionId===owner.sectionId&&e.propertyDisposition===(owner.startElementIndex===i?'SECTION_START':'INHERITED')&&plain(e.properties)&&
plain(e.emittedProperties);if(!ok){valid=false;add(errors,'PIPELINE_INPUTXML_PROPERTY_CONFLICT',{elementIndex:i});}else byElement[i]=e;});return{plan:plain(plan)?plan:{},
byElement,valid};}function bendAuth(source,analysis,errors){const plan=source.bendResolution,candidates=Array.isArray(plan?.candidates)?plan.candidates:[];let valid=plain
(plan)&&plan.schema===PIPELINE_BEND_RESOLUTION_SCHEMA&&Array.isArray(plan.errors)&&plan.errors.length===0&&plan.hasBlockingErrors===false&&plain(plan.
bendByIncomingElementIndex);if(!valid)add(errors,'PIPELINE_INPUTXML_AUTHORITY_SCHEMA_INVALID');const byId=Object.create(null),byIncoming=Object.create(null),corners=
Object.create(null);candidates.forEach((c)=>{const incoming=analysis.byElement[c?.incomingElementIndex],outgoing=analysis.byElement[c?.outgoingElementIndex];const ok=
plain(c)&&text(c.id)&&Number.isInteger(c.incomingElementIndex)&&c.outgoingElementIndex===c.incomingElementIndex+1&&incoming&&outgoing&&incoming.analysisSectionId===
outgoing.analysisSectionId&&[c.previousNode,c.cornerNode,c.nextNode].every((v)=>Number.isInteger(v)&&v>0);if(!ok||byId[c?.id]||byIncoming[c?.incomingElementIndex]||
corners[c?.cornerNode]){valid=false;add(errors,'PIPELINE_INPUTXML_AUTHORITY_OWNERSHIP_INVALID');}if(ok){byId[c.id]=c;byIncoming[c.incomingElementIndex]=c;corners[c.
cornerNode]=true;}});const geometry=Object.create(null);Object.entries(plain(plan?.bendByIncomingElementIndex)?plan.bendByIncomingElementIndex:{}).forEach(([key,g])=>{
const i=Number(key),c=byIncoming[i];const ok=Number.isInteger(i)&&c&&plain(g)&&text(g.id)===c.id&&g.incomingElementIndex===c.incomingElementIndex&&g.outgoingElementIndex
===c.outgoingElementIndex&&g.cornerNode===c.cornerNode;if(!ok){valid=false;add(errors,'PIPELINE_INPUTXML_AUTHORITY_OWNERSHIP_INVALID');}else geometry[i]=g;});return{plan:
plain(plan)?plan:{},candidates:candidates.filter(plain),byId,geometry,valid};}function candidatePlan(plan,bends,analysis,kind,errors){const normal=kind==='NORMAL';const
schema=normal?PIPELINE_NORMAL_FITTING_PLAN_SCHEMA:PIPELINE_B314_RADIUS_PLAN_SCHEMA;const recordSchema=normal?PIPELINE_NORMAL_FITTING_RESOLUTION_SCHEMA:
PIPELINE_B314_RADIUS_RESOLUTION_SCHEMA;const values=Array.isArray(plan?.[normal?'fittingResolutions':'radiusResolutions'])?plan[normal?'fittingResolutions':
'radiusResolutions']:[];const excluded=Array.isArray(plan?.notApplicableCandidateIds)?plan.notApplicableCandidateIds:[];let valid=exact(plan,schema)&&exact(plan?.
migration,normal?'PipelineNormalFittingMigration.v1':'PipelineB314RadiusMigration.v1')&&plan.analysisSectionPlanSchema===PIPELINE_ANALYSIS_SECTION_PLAN_SCHEMA&&plan.
analysisDiameterPlanSchema===PIPELINE_ANALYSIS_DIAMETER_PLAN_SCHEMA&&plan.bendResolutionSchema===PIPELINE_BEND_RESOLUTION_SCHEMA;const byId=Object.create(null),covered=
Object.create(null);values.forEach((r)=>{const c=bends.byId[r?.candidateId],owner=analysis.byElement[c?.incomingElementIndex];const radius=parsePipelinePositiveScalar(
normal?r?.radiusMm:r?.governingRadiusMm);const ok=exact(r,recordSchema)&&bends.valid&&c&&owner&&r.incomingElementIndex===c.incomingElementIndex&&r.outgoingElementIndex===
c.outgoingElementIndex&&r.incomingElementId===`E${r.incomingElementIndex + 1}`&&r.outgoingElementId===`E${r.outgoingElementIndex + 1}`&&r.analysisSectionId===owner.
analysisSectionId&&r.profileId===owner.profileId&&radius&&(normal||r.bendClass===c.bendClass);if(!ok||byId[r?.candidateId])valid=false;else byId[r.candidateId]=r;covered[
r?.candidateId]=true;});excluded.forEach((id)=>{if(typeof id!=='string'||covered[id])valid=false;covered[id]=true;});if(JSON.stringify(Object.keys(bends.byId).sort(cmp))
!==JSON.stringify(Object.keys(covered).filter(Boolean).sort(cmp)))valid=false;if(!valid)add(errors,'PIPELINE_INPUTXML_AUTHORITY_COVERAGE_INVALID',{kind});return{plan:
plain(plan)?plan:{},byId,valid};}function greAuth(source,analysis,errors){const plan=source.greVendorSeriesPlan;const sections=Array.isArray(plan?.sectionResolutions)?
plan.sectionResolutions:[];const elements=Array.isArray(plan?.elementResolutions)?plan.elementResolutions:[];const excluded=Array.isArray(plan?.
notApplicableAnalysisSectionIds)?plan.notApplicableAnalysisSectionIds:[];let valid=exact(plan,PIPELINE_GRE_VENDOR_PLAN_SCHEMA)&&exact(plan?.migration,
'PipelineGreVendorSeriesMigration.v1')&&plan.analysisSectionPlanSchema===PIPELINE_ANALYSIS_SECTION_PLAN_SCHEMA&&plan.analysisDiameterPlanSchema===
PIPELINE_ANALYSIS_DIAMETER_PLAN_SCHEMA;const bySection=Object.create(null),byElement=Object.create(null),union=Object.create(null);sections.forEach((r)=>{const owner=
analysis.byId[r?.analysisSectionId];const ok=exact(r,PIPELINE_GRE_VENDOR_SECTION_SCHEMA)&&owner&&owner.profileId==='gre'&&r.startElementIndex===owner.startElementIndex&&r
.profileId===owner.profileId&&text(r.vendorId)&&text(r.seriesId)&&parsePipelinePositiveScalar(r.greVendorNominalBoreMm)&&parsePipelinePositiveScalar(r.bendRadiusMm)&&
parsePipelinePositiveScalar(r.bendLocalThicknessMm);if(!ok||bySection[r?.analysisSectionId])valid=false;else bySection[r.analysisSectionId]=r;union[r?.analysisSectionId]=
true;});elements.forEach((r)=>{const owner=analysis.byElement[r?.elementIndex],section=bySection[r?.analysisSectionId];const ok=exact(r,PIPELINE_GRE_VENDOR_ELEMENT_SCHEMA
)&&owner&&section&&r.elementId===owner.elementId&&r.analysisSectionId===owner.analysisSectionId&&r.profileId===owner.profileId&&r.vendorId===section.vendorId&&r.seriesId
===section.seriesId&&r.greVendorNominalBoreMm===section.greVendorNominalBoreMm&&r.sectionDisposition===owner.sectionDisposition;if(!ok||byElement[r?.elementIndex])valid=
false;else byElement[r.elementIndex]=r;});excluded.forEach((id)=>{if(typeof id!=='string'||union[id])valid=false;union[id]=true;});if(JSON.stringify(analysis.sections.map
((s)=>s.analysisSectionId).sort(cmp))!==JSON.stringify(Object.keys(union).filter(Boolean).sort(cmp)))valid=false;analysis.sections.forEach((s)=>{if((s.profileId==='gre')
!==Boolean(bySection[s.analysisSectionId]))valid=false;});analysis.elements.forEach((e)=>{if((e.profileId==='gre')!==Boolean(byElement[e.elementIndex]))valid=false;});if(
!valid)add(errors,'PIPELINE_INPUTXML_AUTHORITY_COVERAGE_INVALID');return{plan:plain(plan)?plan:{},bySection,byElement,valid};}function fittingAuthority(c,analysis,bends,
normal,b314,gre){const owner=analysis.byElement[c.incomingElementIndex],errors=[];let fittingAuthorityKind='',fittingPolicyId='',governingRadiusMm=null;let
fittingThicknessMm=null,bendClass=text(c.bendClass);let geometryDisposition='REQUIRES_RECOMPUTE',writerDisposition='BLOCKED';if(owner?.profileId==='normal-metallic'){
const r=normal.byId[c.id];fittingAuthorityKind='NORMAL_FITTING';fittingPolicyId=text(r?.fittingPolicyId);governingRadiusMm=parsePipelinePositiveScalar(r?.radiusMm);if(!r
||r.candidateRadiusDisposition!=='MATCHES_AUTHORITY')add(errors,'PIPELINE_INPUTXML_FITTING_AUTHORITY_UNRESOLVED',{candidateId:c.id});}else if(owner?.profileId===
'asme-b31.4'){const r=b314.byId[c.id];fittingAuthorityKind='B314_RADIUS';fittingPolicyId=text(r?.radiusPolicyId);governingRadiusMm=parsePipelinePositiveScalar(r?.
governingRadiusMm);bendClass=text(r?.bendClass);if(!r||r.candidateRadiusDisposition!=='MATCHES_AUTHORITY')add(errors,'PIPELINE_INPUTXML_FITTING_AUTHORITY_UNRESOLVED',{
candidateId:c.id});}else if(owner?.profileId==='gre'){const r=gre.bySection[owner.analysisSectionId];fittingAuthorityKind='GRE_VENDOR_SERIES';fittingPolicyId=text(r?.
bendPolicyId);governingRadiusMm=parsePipelinePositiveScalar(r?.bendRadiusMm);fittingThicknessMm=parsePipelinePositiveScalar(r?.bendLocalThicknessMm);geometryDisposition=
'GRE_GEOMETRY_NOT_ADOPTED';add(errors,'PIPELINE_INPUTXML_GRE_BEND_GEOMETRY_REQUIRED',{candidateId:c.id});}else add(errors,'PIPELINE_INPUTXML_FITTING_AUTHORITY_UNRESOLVED'
);if(owner?.profileId!=='gre'&&!errors.length){const geometry=bends.geometry[c.incomingElementIndex];if(geometry&&parsePipelinePositiveScalar(geometry.radiusMm)===
governingRadiusMm){geometryDisposition='MATCHES_AUTHORITY';writerDisposition='READY';}else add(errors,'PIPELINE_INPUTXML_FITTING_GEOMETRY_CONFLICT',{candidateId:c.id});}
const state=finalState(errors);return freeze({schema:PIPELINE_INPUTXML_FITTING_AUTHORITY_SCHEMA,candidateId:text(c.id),incomingElementIndex:c.incomingElementIndex,
incomingElementId:`E${c.incomingElementIndex + 1}`,analysisSectionId:text(owner?.analysisSectionId),profileId:text(owner?.profileId),fittingAuthorityKind,fittingPolicyId,
bendClass,governingRadiusMm,fittingThicknessMm,geometryDisposition,writerDisposition,diagnostics:state.diagnostics,blockerCodes:state.blockerCodes,ready:state.ready&&
writerDisposition==='READY'});}function sectionAuthority(section,analysis,diameter,gre){const element=analysis.byElement[section.startElementIndex],dia=diameter.byId[
section.analysisSectionId];const vendor=gre.bySection[section.analysisSectionId],errors=[];if(!element||!dia||!parsePipelinePositiveScalar(dia.caesarDiameterMm))add(
errors,'PIPELINE_INPUTXML_DIAMETER_CONFLICT');if(section.profileId==='gre'&&!vendor)add(errors,'PIPELINE_INPUTXML_AUTHORITY_COVERAGE_INVALID');const state=finalState(
errors);return freeze({schema:PIPELINE_INPUTXML_PROFILE_SECTION_AUTHORITY_SCHEMA,analysisSectionId:section.analysisSectionId,startElementIndex:section.startElementIndex,
profileId:section.profileId,resolvedMode:text(element?.resolvedMode),caesarDiameterMm:parsePipelinePositiveScalar(dia?.caesarDiameterMm),diameterSourceKind:text(dia?.
sourceKind),vendorId:text(vendor?.vendorId),seriesId:text(vendor?.seriesId),qualificationEvidenceId:text(vendor?.qualificationEvidenceId),requirementReference:text(vendor
?.requirementReference),diagnostics:state.diagnostics,blockerCodes:state.blockerCodes,ready:state.ready});}function elementAuthority(element,diameter,property,gre,fitting
){const dia=diameter.byElement[element.elementIndex],prop=property.byElement[element.elementIndex],errors=[];const caesarDiameterMm=parsePipelinePositiveScalar(dia?.
caesarDiameterMm);const propertyDiameter=parsePipelinePositiveScalar(prop?.properties?.diameter);if(!caesarDiameterMm)add(errors,'PIPELINE_INPUTXML_DIAMETER_CONFLICT',{
elementId:element.elementId});if(propertyDiameter&&propertyDiameter!==caesarDiameterMm)add(errors,'PIPELINE_INPUTXML_PROPERTY_CONFLICT',{elementId:element.elementId});if(
!prop)add(errors,'PIPELINE_INPUTXML_PROPERTY_CONFLICT',{elementId:element.elementId});if(element.profileId==='gre'&&!gre.byElement[element.elementIndex])add(errors,
'PIPELINE_INPUTXML_AUTHORITY_COVERAGE_INVALID',{elementId:element.elementId});if(fitting)errors.push(...fitting.diagnostics);const state=finalState(errors);return freeze(
{schema:PIPELINE_INPUTXML_PROFILE_ELEMENT_AUTHORITY_SCHEMA,elementIndex:element.elementIndex,elementId:element.elementId,analysisSectionId:element.analysisSectionId,
profileId:element.profileId,resolvedMode:element.resolvedMode,caesarDiameterMm,diameterSourceKind:text(dia?.sourceKind),propertySectionId:text(prop?.sectionId),
propertyDisposition:text(prop?.propertyDisposition),fittingCandidateId:text(fitting?.candidateId),fittingAuthorityKind:text(fitting?.fittingAuthorityKind),fittingPolicyId
:text(fitting?.fittingPolicyId),governingRadiusMm:fitting?.governingRadiusMm??null,fittingThicknessMm:fitting?.fittingThicknessMm??null,geometryDisposition:fitting?.
geometryDisposition||'NOT_A_TURN',writerDisposition:state.ready?'READY':'BLOCKED',diagnostics:state.diagnostics,blockerCodes:state.blockerCodes,ready:state.ready});}
export function buildPipelineInputXmlProfileAuthorityPlan(input={}){const safeValue=safe(input),source=safeValue.source,errors=[...safeValue.errors];const analysis=
analysisAuth(source,errors),diameter=diameterAuth(source,analysis,errors);const property=propertyAuth(source,analysis,errors),bends=bendAuth(source,analysis,errors);const
normal=candidatePlan(source.normalFittingPlan,bends,analysis,'NORMAL',errors);const b314=candidatePlan(source.b314RadiusPlan,bends,analysis,'B314',errors);const gre=
greAuth(source,analysis,errors);const fittingAuthorities=Object.freeze(bends.candidates.map((c)=>fittingAuthority(c,analysis,bends,normal,b314,gre)));const
fittingByIncoming=Object.fromEntries(fittingAuthorities.map((v)=>[v.incomingElementIndex,v]));const sectionAuthorities=Object.freeze(analysis.sections.map((s)=>
sectionAuthority(s,analysis,diameter,gre)));const elementAuthorities=Object.freeze(analysis.elements.map((e)=>elementAuthority(e,diameter,property,gre,fittingByIncoming[e
.elementIndex])));const nested=[...sectionAuthorities,...elementAuthorities,...fittingAuthorities];const state=finalState([...errors,...nested.flatMap((v)=>v.diagnostics)
]);return freeze({schema:PIPELINE_INPUTXML_PROFILE_AUTHORITY_PLAN_SCHEMA,analysisSectionPlanSchema:text(analysis.plan.schema),analysisDiameterPlanSchema:text(diameter.
plan.schema),normalFittingPlanSchema:text(normal.plan.schema),b314RadiusPlanSchema:text(b314.plan.schema),greVendorSeriesPlanSchema:text(gre.plan.schema),
bendResolutionSchema:text(bends.plan.schema),propertySectionPlanSchema:text(property.plan.schema),sectionAuthorities,elementAuthorities,fittingAuthorities,diagnostics:
state.diagnostics,blockerCodes:state.blockerCodes,ready:state.ready&&nested.every((v)=>v.ready)});}export const buildPipelineInputXmlProfileAuthorityPlanJson=(plan)=>JSON
.stringify(plan,null,2);
