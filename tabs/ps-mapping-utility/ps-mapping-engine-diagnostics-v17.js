import {
  DEFAULT_OPTIONS,
  DEFAULT_SUPPORT_KEYWORD_RULES_TEXT,
  normalizePsMappingOptions,
  runPsMappingResolver as runV16PsMappingResolver,
  rowsToCsv,
} from './ps-mapping-engine-diagnostics-v16.js?v=20260614-legacy-reason-presentation-1';
import { supportTypesFromText } from './ps-mapping-support-gap-logic.js?v=20260614-support-parent-gap-1';

export { DEFAULT_OPTIONS, DEFAULT_SUPPORT_KEYWORD_RULES_TEXT, normalizePsMappingOptions, rowsToCsv };

const SUPPORT_ORDER = Object.freeze(['REST', 'GUIDE', 'LINE_STOP']);

function clean(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function upper(value) {
  return clean(value).toUpperCase();
}

function labelSupport(type) {
  return type === 'LINE_STOP' ? 'LINE STOP' : clean(type).replace(/_/g, ' ');
}

function formatSupportList(types) {
  const ordered = SUPPORT_ORDER.filter((type) => types?.has?.(type));
  return ordered.map(labelSupport).join(' + ');
}

function table1PsNo(row = {}) {
  return clean(row.table1PsNo || row.mappedTable1PsNo || row.psNo || row['Table-1 PS No'] || '');
}

function baseTable1PsNo(row = {}) {
  return clean(table1PsNo(row).split('|')[0]).replace(/\/DATUM$/i, '');
}

function candidateNode(row = {}) {
  return clean(row.mappedNode || row.candidateNode || row.node || row.table1Node || row.nodeNo || row['Candidate Node'] || '');
}

function lineFamily(row = {}) {
  return clean(row.nodeLineFamily || row.t1LineFamily || row['T1 Line Family'] || '');
}

function derivedDn(row = {}) {
  return clean(row.derivedDn || row.table1Dn || row.dn || row['Derived DN'] || '');
}

function modelPsNo(row = {}) {
  return clean(row.psnoModel || row.modelPsNo || row.rawPsNo || row.basePs || row['PSNO_Model'] || '');
}

function normalizeSupportSource(...values) {
  return values
    .map((value) => String(value ?? '').toUpperCase())
    .join(' ')
    .replace(/[_-]+/g, ' ')
    .replace(/[\[\](){}:;,|/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function supportSet(...values) {
  const source = normalizeSupportSource(...values);
  const out = supportTypesFromText(source);

  // Directional anchor / anchor-on-shoe is a stop support for the matrix.
  // Do not let "shoe" create a false REST contributor.
  if (/\bDIRECTIONAL\s+ANCHOR\b|\bANCHOR\s+ON\s+SHOE\b/.test(source)) {
    out.add('LINE_STOP');
    out.delete('REST');
  }

  return out;
}

function t1Text(row = {}) {
  const iso = row.nodeIsonote || row.nodeIsonoteRaw || row.isonote || row.ISONOTE || row['ISONOTE'];
  return iso || [row.supportTypesAvailable, row.nodeMasterKeywords, row.table1SupportTypes].filter(Boolean).join(' ');
}

function t2Text(row = {}) {
  return [
    row.supportTypesRequested,
    row.modelDtxrKeywords,
    row.dtxr,
    row.t2Keywords,
    row.DTXR,
    row['T2 Keywords'],
  ].filter(Boolean).join(' ');
}

function t1Types(row = {}) {
  return supportSet(t1Text(row));
}

function t2Types(row = {}) {
  const types = supportSet(t2Text(row));
  // A model REST component with a non-contact requirement is not an active
  // REST restraint for node coverage; its gap is checked independently.
  if (/\bDO\s+NOT\s+REST\b/i.test(t1Text(row)) && types.has('REST')) {
    types.delete('REST');
  }
  return types;
}

function orderedDifference(a, b) {
  return SUPPORT_ORDER.filter((type) => a?.has?.(type) && !b?.has?.(type));
}

function unionInto(target, source) {
  for (const type of SUPPORT_ORDER) {
    if (source?.has?.(type)) target.add(type);
  }
  return target;
}

function sameNumberText(a, b) {
  if (a === '' || a == null || b === '' || b == null) return false;
  const na = Number(a);
  const nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb)) return Math.abs(na - nb) < 1e-6;
  return clean(a) === clean(b);
}

function isLineBoreClean(row = {}) {
  const lineBasis = upper(row.lineBasis || row.lineMatch || '');
  const boreBasis = upper(row.boreBasis || row.boreMatch || '');
  if (/CONFLICT|REJECT|MISMATCH/.test(lineBasis) || /CONFLICT|REJECT|MISMATCH/.test(boreBasis)) return false;

  const t1Line = lineFamily(row);
  const t2Line = clean(row.lineFamily || row.t2LineFamily || row['T2 Line Family'] || '');
  if (t1Line && t2Line && t1Line !== t2Line) return false;

  const t1Dn = derivedDn(row);
  const t2Bore = clean(row.modelBore || row.t2Bore || row.bore || row['T2 Bore'] || '');
  if (t1Dn && t2Bore && !sameNumberText(t1Dn, t2Bore)) return false;

  return true;
}

function groupKey(row = {}) {
  const ps = table1PsNo(row);
  if (!ps) return '';
  return [ps, candidateNode(row), lineFamily(row), derivedDn(row)].join('||');
}

function buildGroup(row = {}) {
  return {
    key: groupKey(row),
    table1PsNo: table1PsNo(row),
    basePs: baseTable1PsNo(row),
    node: candidateNode(row),
    line: lineFamily(row),
    dn: derivedDn(row),
    rows: [],
    t1: new Set(),
    t2: new Set(),
    cleanT2: new Set(),
    gapActions: [],
  };
}

function rowGapAction(row = {}) {
  const action = clean(row.psNoWiseAction || '');
  return /^Correct Table-2 .+(?:GAP|REST clearance) to Table-1/i.test(action) ? action : '';
}

function addUnique(list, value) {
  const text = clean(value);
  if (text && !list.includes(text)) list.push(text);
}

function isAcceptedMapping(row = {}) {
  // Canonical physical-presence rule: gap review changes compliance, not hardware.
  // Only actual, identity-resolved model components can establish presence.
  if (row.source === 'TABLE1C_MISSING_SUPPORT' || row.syntheticMissingSupport === true
      || row.syntheticMissingSupport === 'true') return false;
  const modelNo = modelPsNo(row);
  if (!modelNo || modelNo === '-' || /^0(?:\.0+)?$/.test(modelNo)) return false;
  const source = clean(row.modelSourceId || row.table2SourceId || '');
  if (source && !/^T2:\d+$/i.test(source)) return false;
  if (row.ambiguousMultiTable1Context || !['PS_BASE', 'PS_EXACT'].includes(row.psBasis)) return false;
  if (!isLineBoreClean(row)) return false;
  const types = t2Types(row);
  if (!types.size || !orderedDifference(types, t1Types(row)).length && !orderedDifference(t1Types(row), types).length
      && row.supportBasis === 'SUPPORT_CONFLICT') return false;
  const exact = row.supportBasis === 'SUPPORT_EXACT'
    || (!row.supportBasis && /\b(?:REST|GUIDE|LINE STOP)\s+(?:non-contact clearance\s+)?Match\b/i.test(clean(row.supportMatch)));
  if (!exact) return false;
  const mapped = row.mapped === true || row.mapped === 'true'
    || row.selected === true || row.finalStatus === 'MATCHED';
  if (!mapped) return false;
  return row.finalStatus === 'MATCHED' || row.finalStatus === 'USER_REVIEW_REQUIRED';
}

function buildGroups(rows = [], physicalCandidates = []) {
  const groups = new Map();
  // result.rows alone excludes some physically mapped review candidates. The
  // physical inventory includes resolved candidateRows without accepting merely
  // suggested / unanchored or line-and-bore-conflicting alternatives.
  const allRows = [...rows, ...physicalCandidates];
  const coveredSources = new Set();
  for (const row of allRows) {
    const key = groupKey(row);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, buildGroup(row));
    const group = groups.get(key);
    group.rows.push(row);
    unionInto(group.t1, t1Types(row));
    unionInto(group.t2, t2Types(row));
    if (isAcceptedMapping(row)) {
      const sourceKey = [key, clean(row.modelSourceId || row.table2SourceId || modelPsNo(row))].join('||');
      if (!coveredSources.has(sourceKey)) {
        unionInto(group.cleanT2, t2Types(row));
        coveredSources.add(sourceKey);
      }
    }
    addUnique(group.gapActions, rowGapAction(row));
  }

  return groups;
}

function proposedMissingSupportIds(group) {
  const missing = orderedDifference(group.t1, group.cleanT2);
  const base = group.basePs || group.table1PsNo || '';
  if (!isValidProposedBase(base)) return [];
  const out = [];
  missing.forEach((type, index) => {
    out.push({ type, psNo: `${base}.X${index + 1}` });
  });
  return out;
}

function isValidProposedBase(value) {
  const text = clean(value).replace(/^\//, '');
  return !!text && !/^(?:0+(?:\.0+)?|[-?]+|(?:PS[-_ ]?)?X{2,}|UNKNOWN|NA|N\/A|NONE|NULL)$/i.test(text)
    && !/[|,\n]/.test(text) && !/\b(?:XXXX|UNKNOWN|PLACEHOLDER)\b/i.test(text);
}

function proposedPsNoText(proposed = []) {
  return proposed.map((item) => `${labelSupport(item.type)}=${item.psNo}`).join('; ');
}

function missingActionText(group, proposed = proposedMissingSupportIds(group)) {
  if (!isValidProposedBase(group.basePs || group.table1PsNo)) {
    return orderedDifference(group.t1, group.cleanT2).map(type =>
      `Missing ${labelSupport(type)} at Node ${group.node || '-'}; reference support identity is unavailable or a placeholder. Manual identification required before proposing hardware.`);
  }
  return proposed.map((item) => {
    const label = labelSupport(item.type);
    return `Table-1 data has ${label} but missing in Table-2 data. Action: Add ${label} as ${item.psNo} as per Table-1 ISONOTE.`;
  });
}

function extraActionText(group) {
  const extras = orderedDifference(group.cleanT2, group.t1);
  return extras.map((type) => {
    const label = labelSupport(type);
    return `Remove or reclassify extra ${label} in Table-2; Table-1 does not require ${label}.`;
  });
}

function groupAction(group) {
  const parts = [
    ...missingActionText(group),
    ...group.gapActions,
    ...extraActionText(group),
  ];
  return parts.length ? parts.join(' ') : 'No Action based on Table-2';
}

function noTable1Action(row = {}) {
  const model = modelPsNo(row);
  return model
    ? `No Table-1 PS No. match for Table-2 PS ${model}. Action: manual review.`
    : 'No Table-1 PS No. match for Table-2 PS. Action: manual review.';
}

function rowSpecificAction(row = {}, group = null) {
  if (!table1PsNo(row)) return 'Manual review: No Match in Table-1';

  const gapAction = rowGapAction(row);
  if (gapAction) return gapAction;

  const t1 = t1Types(row);
  const t2 = t2Types(row);
  const extras = orderedDifference(t2, t1);
  if (extras.length) {
    const label = labelSupport(extras[0]);
    return `Remove or reclassify extra ${label} in Table-2; Table-1 does not require ${label}.`;
  }

  // Missing support is a node/package action, not a correction to this matched row.
  return '';
}

function applyNodeRestraintCoverage(rows, groups) {
  if (!Array.isArray(rows)) return rows;

  return rows.map((row) => {
    const key = groupKey(row);
    const group = key ? groups.get(key) : null;
    if (!group) {
      return {
        ...row,
        t1NodeRestraints: '',
        t2CoveredRestraints: '',
        missingNodeRestraints: '',
        extraTable2Restraints: '',
        proposedMissingSupportPsNo: '',
        psNoWiseAction: table1PsNo(row) ? rowSpecificAction(row, null) : 'Manual review: No Match in Table-1',
        consolidatedNodeWiseAction: table1PsNo(row) ? clean(row.consolidatedNodeWiseAction || '') : noTable1Action(row),
      };
    }

    const missing = new Set(orderedDifference(group.t1, group.cleanT2));
    const extra = new Set(orderedDifference(group.cleanT2, group.t1));
    const proposed = proposedMissingSupportIds(group);
    const action = groupAction(group);

    return {
      ...row,
      t1NodeRestraints: formatSupportList(group.t1),
      t2CoveredRestraints: formatSupportList(group.cleanT2),
      missingNodeRestraints: formatSupportList(missing),
      extraTable2Restraints: formatSupportList(extra),
      proposedMissingSupportPsNo: proposedPsNoText(proposed),
      psNoWiseAction: rowSpecificAction(row, group),
      consolidatedNodeWiseAction: action,
    };
  });
}

export function runPsMappingResolver(input = {}) {
  const result = runV16PsMappingResolver(input);
  const groups = buildGroups(result.rows || [], result.candidateRows || result.candidates || []);
  return {
    ...result,
    rows: applyNodeRestraintCoverage(result.rows, groups),
    outputRows: applyNodeRestraintCoverage(result.outputRows, groups),
    validatorRows: applyNodeRestraintCoverage(result.validatorRows, groups),
    candidateRows: applyNodeRestraintCoverage(result.candidateRows, groups),
    candidates: applyNodeRestraintCoverage(result.candidates, groups),
    approxConfig: {
      ...(result.approxConfig || {}),
      psMappingPresentationRules: 'Readable v17: node restraint package coverage is shown separately from row-local support matching. Missing support actions use synthetic PS-XYZ.Xn IDs and never reuse existing .1/.2 Table-2 row numbers.',
    },
  };
}
