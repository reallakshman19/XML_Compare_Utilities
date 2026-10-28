import {
  DEFAULT_OPTIONS,
  DEFAULT_SUPPORT_KEYWORD_RULES_TEXT,
  normalizePsMappingOptions,
  runPsMappingResolver as runV24PsMappingResolver,
  rowsToCsv,
} from './ps-mapping-engine-diagnostics-v24.js';
import { evaluateSupportGapComparison, supportTypesFromText } from './ps-mapping-support-gap-logic.js';

export { DEFAULT_OPTIONS, DEFAULT_SUPPORT_KEYWORD_RULES_TEXT, normalizePsMappingOptions, rowsToCsv };

const TYPES = Object.freeze(['REST', 'GUIDE', 'LINE_STOP']);
const clean = (v) => String(v ?? '').trim().replace(/\s+/g, ' ');
const val = (row, ...names) => names.map(n => row?.[n]).find(v => v !== undefined && v !== null && clean(v) !== '') ?? '';
const numberText = (x) => clean(x).replace(/^\/+/, '').toUpperCase();
const isTrue = (x) => x === true || x === 'true' || x === 'YES';
const active = (set) => TYPES.filter(t => set.has(t));
const fmt = (set) => active(set).map(t => t === 'LINE_STOP' ? 'LINE STOP' : t).join(' + ');
const normalizeType = (s) => {
  const v = clean(s).toUpperCase().replace(/[\s-]+/g,'_');
  return v === 'STOP' || v === 'LINESTOP' || v === 'LINE_STOP' ? 'LINE_STOP' : TYPES.includes(v) ? v : '';
};
const types = (...values) => supportTypesFromText(...values.filter(Boolean));
const source = row => clean(val(row,'source','Reference Source'));
const isSynthetic = row => source(row) === 'TABLE1C_MISSING_SUPPORT' || isTrue(val(row,'syntheticMissingSupport'));
const refNo = row => clean(val(row,'table1SupportNo','table1PsNo','mappedTable1PsNo','Reference Support No'));
const node = row => clean(val(row,'mappedNode','candidateNode','node','Reference Node'));
const line = row => clean(val(row,'nodeLineFamily','t1LineFamily','Reference Line Family'));
const dn = row => clean(val(row,'derivedDn','table1Dn','Derived DN'));
const groupKey = (row,options={}) => refNo(row) && node(row)
  ? [refNo(row),node(row),...(options.requireLineFamilyInIdentity === false ? [] : [line(row)]),dn(row)].join('\u001f') : '';
const modelNo = row => clean(val(row,'psnoModel','modelPsNo','Model Support No'));
const gapStatus = row => clean(val(row,'gapMatch','supportGapMatch','Gap / Clearance Verdict'));
const note = row => clean(val(row,'nodeIsonote','nodeIsonoteRaw','isonote','Reference ISONOTE'));
const fromModel = row => {
  // Explicit normalized model restraint wins over incidental words such as
  // "Pipe" in "Directional Anchor On Shoe for Hot Insulated Pipe".
  const explicit = val(row,'supportTypesRequested','t2Keywords','Model Restraints');
  return types(explicit || val(row,'dtxr','DTXR'));
};
const required = row => types(note(row) || val(row,'supportTypesAvailable','nodeMasterKeywords','Required at Node'));
const physicalId = row => clean(val(row,'modelSourceId','table2SourceId','Model Source ID'));
const expectedBasis = row => clean(val(row,'psBasis','Support Number Basis'));
const supportBasis = row => clean(val(row,'supportBasis','Restraint Comparison Basis'));
const matchStatus = row => clean(val(row,'finalStatus','Mapping Status'));
const validBase = value => {
  const text = numberText(value);
  return !!text && !/^(?:0+(?:\.0+)?|[-?]+|(?:PS[-_ ]?)?X{2,}|UNKNOWN|NA|N\/A|NONE|NULL)$/i.test(text)
    && !/\b(?:XXXX|UNKNOWN|PLACEHOLDER)\b/i.test(text) && !/[|,\n]/.test(text);
};

function realPhysicalContributor(row,options={}) {
  if (!row || isSynthetic(row)) return false;
  const model = modelNo(row);
  if (!model || model === '-' || model === '0') return false;
  const sourceId = physicalId(row);
  if (sourceId && !/^T2:\d+$/i.test(sourceId)) return false;
  if (row.ambiguousMultiTable1Context || isTrue(row.suppressSyntheticMissingSupport)) return false;
  if (!['PS_BASE','PS_EXACT'].includes(expectedBasis(row))) return false;
  if (!['SUPPORT_EXACT','SUPPORT_PARTIAL'].includes(supportBasis(row))) return false;
  if (!['MATCHED','USER_REVIEW_REQUIRED'].includes(matchStatus(row))) return false;
  if (!isTrue(row.mapped) && !isTrue(row.selected) && matchStatus(row) !== 'MATCHED') return false;
  const b = clean(val(row,'boreBasis','Bore Basis'));
  const l = clean(val(row,'lineBasis','Line Comparison'));
  if (/CONFLICT|REJECT|MISMATCH/i.test(b+' '+l)) return false;
  const t1 = line(row), t2 = clean(val(row,'lineFamily','t2LineFamily','Model Line Family'));
  if (t1 && t2 && t1 !== t2 && !(options.requireLineFamilyInIdentity === false
      && isTrue(row.mapped) && row.mappedStage === 'LOOP1_BASE_DN_NODE'
      && matchStatus(row) === 'USER_REVIEW_REQUIRED')) return false;
  const n1 = Number(dn(row)), n2 = Number(val(row,'modelBore','t2Bore','Model Bore'));
  if (dn(row) && Number.isFinite(n1) && Number.isFinite(n2) && n1 !== n2) return false;
  return true;
}

function normalizeDiagnostic(row) {
  if (!row || isSynthetic(row)) return row;
  let next = { ...row };
  const status = gapStatus(next);
  const raw = clean(val(next,'supportGapRaw'));
  // Only upgrade a missing Table-2 gap when the *same physical row* already
  // exposes a populated numeric gap. Never infer from a different model row.
  if (/_MISSING_TABLE2$/i.test(status) && raw && /^T2:\d+$/i.test(physicalId(next))) {
    const comparison = evaluateSupportGapComparison({
      table1Text: note(next) || val(next,'supportTypesAvailable'),
      table2Text: val(next,'supportTypesRequested','t2Keywords','Model Restraints')
        || val(next,'dtxr','DTXR'),
      table2GapRaw: raw,
    });
    if (comparison.status && comparison.kind
        && comparison.status.startsWith(status.replace(/_MISSING_TABLE2$/i,''))
        && comparison.status !== status) {
      next.gapMatch = comparison.status;
      next.supportGapMatch = comparison.status;
      next.supportGapBasis = comparison.status;
      next.gapMatchDetail = comparison.detail;
      next.supportGapMm = comparison.table2GapMm ?? next.supportGapMm;
      const filterOld = text => clean(text).split(';').map(clean).filter(Boolean)
        .filter(part => !new RegExp('^' + status + '$','i').test(part)).join('; ');
      next.warnings = filterOld(next.warnings);
      if (/^Correct Table-2 /i.test(clean(next.psNoWiseAction))) next.psNoWiseAction = '';
      if (/^Table-2 .*GAP is missing/i.test(clean(next.reviewAction))) next.reviewAction = '';
      if (/^Table-2 .*GAP is missing/i.test(clean(next.reason))) next.reason = '';
      if (comparison.kind === 'GUIDE') next.nodeGuideGapMm = comparison.table1GapMm ?? '';
      if (comparison.kind === 'LINE_STOP') next.nodeLineStopGapMm = comparison.table1GapMm ?? '';
    }
  }
  if (gapStatus(next) === 'REST_CLEARANCE_EXACT' && /\bDO\s+NOT\s+REST\b/i.test(note(next))) {
    // The 25 mm non-contact REST clearance is independently satisfied. Old
    // "REST missing" flags are not evidence of active-restraint deficiency.
    next.supportBasis = 'REST_NONCONTACT_CLEARANCE_EXACT';
    next.warnings = clean(next.warnings).split(';').map(clean).filter(Boolean)
      .filter(w => !/^(?:SUPPORT_CONFLICT|SUPPORT_MISSING_REST)$/i.test(w)).join('; ');
  }
  return next;
}

function createAssessment(key) {
  return { key, required:new Set(), present:new Set(), contributors:new Set(),
    gapActions:new Set(), realRows:[], proposed:[], ref:'', atNode:'', warnings:new Set() };
}
function groupAssessment(rows,options={}) {
  const groups = new Map();
  for (const row of rows) {
    if (!row || isSynthetic(row)) continue;
    const key = groupKey(row,options);
    if (!key) continue;
    let group = groups.get(key);
    if (!group) {group=createAssessment(key);groups.set(key,group);}
    group.ref ||= refNo(row);
    group.atNode ||= node(row);
    for(const type of required(row)) group.required.add(type);
    group.realRows.push(row);
    if (realPhysicalContributor(row,options)) {
      const signature = [key,physicalId(row)||modelNo(row)].join('|');
      if (!group.contributors.has(signature)) {
        group.contributors.add(signature);
        const physical = fromModel(row);
        if (/\bDO\s+NOT\s+REST\b/i.test(note(row))) physical.delete('REST');
        for (const t of physical) group.present.add(t);
      }
    }
    const status = gapStatus(row);
    if (/_(?:CONFLICT|MISSING_TABLE1|MISSING_TABLE2)$/i.test(status)) {
      const detail = clean(val(row,'gapMatchDetail','reviewAction'));
      const kind = status.startsWith('GUIDE_GAP_') ? 'GUIDE GAP'
        : status.startsWith('LINE_STOP_GAP_') ? 'LINE STOP GAP'
        : status.startsWith('REST_CLEARANCE_') ? 'REST clearance' : 'Support gap';
      const fallback = /_MISSING_TABLE2$/i.test(status)
        ? kind + ' is missing in Table-2; verify and specify the Table-1 requirement.'
        : /_MISSING_TABLE1$/i.test(status)
          ? kind + ' exists in Table-2 but is unspecified in Table-1; verify the source.'
          : kind + ' differs between Table-1 and Table-2; reconcile measured values.';
      group.gapActions.add(detail || fallback);
    }
  }
  for (const group of groups.values()) {
    group.missing = new Set([...group.required].filter(t => !group.present.has(t)));
    group.extra = new Set([...group.present].filter(t => !group.required.has(t)));
  }
  return groups;
}
function enforceSynthetic(row) {
  const t = normalizeType(val(row,'supportTypesRequested','t2Keywords','Model Restraints')) || 'REST';
  return {
    ...row, source:'TABLE1C_MISSING_SUPPORT', syntheticMissingSupport:true,
    enabled:false, mapped:false, selected:false, eligible:false,
    autoSelectable:false, reviewRequired:true, finalStatus:'SUPPORT_MISSING_REQUIRED',
    confidence:'AUDIT', confidenceScore:0, score:999999,
    matchGroup:'99_DIAGNOSTIC', mappedStage:'PROPOSED_FROM_TABLE1_ISONOTE',
    matchedTypes:'', matchedSupportKeywords:'', supportBasis:'SUPPORT_MISSING_MASTER_REQUIRED',
    modelSourceId:'', table2SourceId:'PROPOSED_FROM_TABLE1_ISONOTE',
    warnings:'SUPPORT_MISSING_REQUIRED: '+t,
    'Chosen Mapping':'NO','Auto-map Allowed':'NO','Needs Review':'YES',
    'Mapping Status':'SUPPORT_MISSING_REQUIRED',
  };
}
function typeOfSynthetic(row) {
  return normalizeType(val(row,'supportTypesRequested','t2Keywords','Model Restraints'))
    || normalizeType(clean(row.supportMatch).replace(/^Missing /i,''));
}
function actionFor(group) {
  const actions = [];
  for (const t of active(group.missing)) {
    const proposal = group.proposed.find(p=>typeOfSynthetic(p)===t);
    const label=t==='LINE_STOP'?'LINE STOP':t;
    actions.push(proposal
      ? 'Table-1 requires '+label+'; no qualified Table-2 '+label+' exists. Proposed '+clean(proposal.psnoModel)+' requires review.'
      : 'Missing '+label+' at Node '+(group.atNode||'-')+'; manual hardware/identity review required.');
  }
  actions.push(...group.gapActions);
  for (const t of active(group.extra)) actions.push('Review additional model '+(t==='LINE_STOP'?'LINE STOP':t)+' not required by Table-1.');
  return actions.length ? actions.join(' ') : 'No Action based on Table-2';
}

/** Build a single authoritative coverage/evidence assessment for all CSV views. */
export function reconcileCanonicalPsMappingResult(result = {}) {
  const collections = ['rows','outputRows','candidateRows','candidates','validatorRows'];
  // Keep identity-based evidence from both resolved rows and physically mapped
  // Candidate Matrix rows (review-required rows may be absent from result.rows).
  const physical = [...(result.rows||[]),...(result.candidateRows||[])].filter(r=>r&&!isSynthetic(r));
  const patchedPhysical=physical.map(normalizeDiagnostic);
  const policy = result.options || {};
  const groups=groupAssessment(patchedPhysical,policy);
  const syntheticSource=(result.candidateRows||result.rows||[]).filter(isSynthetic);
  const occupied=new Set(physical.map(modelNo).filter(Boolean).map(numberText));
  const syntheticByGroup=new Map(),proposedOwners=new Map();
  for (const row of syntheticSource) {
    const key=groupKey(row,policy),group=groups.get(key),type=typeOfSynthetic(row);
    const id=numberText(modelNo(row));
    if (!group||!type||!group.missing.has(type)||!validBase(refNo(row))||!id||occupied.has(id)) continue;
    if (!syntheticByGroup.has(key)) syntheticByGroup.set(key,[]);
    if (!proposedOwners.has(id)) proposedOwners.set(id,[]);
    proposedOwners.get(id).push({key,row});
  }
  for (const [id, owners] of proposedOwners) {
    if (new Set(owners.map(x=>x.key)).size!==1 || owners.length!==1) {
      for (const owner of owners) groups.get(owner.key)?.warnings.add('PROPOSED_SUPPORT_ID_COLLISION');
      continue;
    }
    const entry=owners[0],synthetic=enforceSynthetic(entry.row);
    syntheticByGroup.get(entry.key).push(synthetic);
    groups.get(entry.key).proposed.push(synthetic);
  }
  const project=(sourceRows) => {
    if(!Array.isArray(sourceRows))return sourceRows;
    return sourceRows.flatMap(row=>{
      const key=groupKey(row,policy),group=groups.get(key);
      if(isSynthetic(row)) {
        const allowed=syntheticByGroup.get(key)||[];
        const id=numberText(modelNo(row));
        return allowed.find(x=>numberText(modelNo(x))===id)?[enforceSynthetic(row)]:[];
      }
      const next=normalizeDiagnostic(row);
      if(!group)return [next];
      next.t1NodeRestraints=fmt(group.required);
      next.t2CoveredRestraints=fmt(group.present);
      next.missingNodeRestraints=fmt(group.missing);
      next.extraTable2Restraints=fmt(group.extra);
      next.proposedMissingSupportPsNo=group.proposed.map(p=>typeOfSynthetic(p)+'='+modelNo(p)).join('; ');
      next.consolidatedNodeWiseAction=actionFor(group);
      return [next];
    });
  };
  const out={...result};
  for(const name of collections) out[name]=project(result[name]);
  out.canonicalAssessments=[...groups.values()].map(g=>({
    referenceSupportNo:g.ref,node:g.atNode,key:g.key,
    required:active(g.required),present:active(g.present),missing:active(g.missing),
    extra:active(g.extra),sourceCount:g.contributors.size,
    proposed:g.proposed.map(p=>modelNo(p)),exceptions:[...g.warnings],
  }));
  out.summary={...(result.summary||{}),canonicalGroups:groups.size,
    canonicalSyntheticProposals:out.candidateRows?.filter(isSynthetic).length||0};
  out.approxConfig={...(result.approxConfig||{}),
    canonicalEngineeringAssessment:'v25: hardware presence is independent of gap compliance; synthetic rows never inherit mapped status; final outputs are projected from reconciled source evidence.'};
  return out;
}
export function runPsMappingResolver(input = {}) {
  return reconcileCanonicalPsMappingResult(runV24PsMappingResolver(input));
}
