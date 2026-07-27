import { parseAppliesToDirective } from './navis-tag-applies-to.js';
import { parseNavisTagXml } from './navis-tag-xml-parser.js';

export const UNMATCHED_NAVIS_TAG_LOCATION_MESSAGE = 'Refer Navis file to locate Tag';

export const DEFAULT_ISONOTE_KEYWORD_MAPPINGS = Object.freeze([
  Object.freeze({ key: 'R', value: 'REST' }),
  Object.freeze({ key: 'G', value: 'GUIDE' }),
  Object.freeze({ key: 'LS', value: 'LINE STOP' }),
]);

function text(value) { return String(value ?? '').trim(); }
function compact(value, digits = 3) {
  const number = Number(value);
  return Number.isFinite(number) ? String(Number(number.toFixed(digits))) : '';
}
function unique(values) {
  const seen = new Set();
  const output = [];
  for (const value of values || []) {
    const normalized = text(value);
    const key = normalized.toUpperCase();
    if (!normalized || seen.has(key)) continue;
    seen.add(key);
    output.push(normalized);
  }
  return output;
}
function hasOwn(object, key) { return Object.prototype.hasOwnProperty.call(object || {}, key); }

export function keywordMappingRows(config = {}) {
  const source = hasOwn(config, 'isonoteKeywordMappings')
    ? config.isonoteKeywordMappings
    : DEFAULT_ISONOTE_KEYWORD_MAPPINGS;
  if (Array.isArray(source)) return source.map((item) => ({ key: text(item?.key), value: text(item?.value) }));
  if (source && typeof source === 'object') {
    return Object.entries(source).map(([key, value]) => ({ key: text(key), value: text(value) }));
  }
  return DEFAULT_ISONOTE_KEYWORD_MAPPINGS.map((item) => ({ ...item }));
}

export function keywordMap(config = {}) {
  const map = new Map();
  for (const row of keywordMappingRows(config)) {
    const key = text(row.key).toUpperCase();
    if (key) map.set(key, text(row.value) || key);
  }
  return map;
}

function baseTagText(value, config = {}) {
  const source = text(value);
  if (!source) return '';
  const directive = parseAppliesToDirective(source, config);
  const withoutDirective = directive.matched ? directive.note : source;
  return text(withoutDirective.replace(/\s*\(\s*Based\s+on\s+Tag\s+[^)]+\)\s*$/i, ''));
}

export function expandTagKeywords(value, config = {}) {
  const note = baseTagText(value, config);
  if (!note) return [];
  const mappings = keywordMap(config);
  const tokens = note.includes('+') ? note.split(/\s*\+\s*/) : note.split(/\s*,\s*/);
  return unique(tokens.map((token) => {
    const normalized = text(token);
    return mappings.get(normalized.toUpperCase()) || normalized;
  }));
}

function identityCandidates(decision = {}) {
  const raw = [
    ...(decision.groupedIdentities || []),
    ...(decision.tableIdentityRaw ? String(decision.tableIdentityRaw).split('|') : []),
    decision.canonicalIdentity,
  ];
  return unique(raw.map((value) => {
    const normalized = text(value).replace(/\s+/g, '');
    return normalized ? `/${normalized.replace(/^\/+/, '')}` : '';
  }));
}

export function selectOutputSupportIdentity(decision = {}) {
  const candidates = identityCandidates(decision);
  if (!candidates.length) return '';
  const datum = candidates.filter((value) => /\/DATUM$/i.test(value)).sort((a, b) => a.localeCompare(b))[0];
  if (datum) return datum;
  const numbered = candidates
    .map((value) => ({ value, suffix: Number(value.match(/\.(\d+)$/)?.[1]) }))
    .filter((item) => Number.isFinite(item.suffix))
    .sort((a, b) => a.suffix - b.suffix || a.value.localeCompare(b.value));
  return numbered[0]?.value || candidates[0];
}

export function pointLabel(point) {
  if (![point?.x, point?.y, point?.z].every((value) => Number.isFinite(Number(value)))) return '';
  return `E=${compact(point.x)};N=${compact(point.y)};EL=${compact(point.z)}`;
}

function finalIsonote(identity, tags, config, confidence = '') {
  const expanded = unique(tags.flatMap((tag) => expandTagKeywords(tag, config)));
  if (!identity || !expanded.length) return '';
  const prefix = text(config?.isonoteOutputPrefix) || ':/';
  let isonote = `${prefix}${identity.replace(/^\/+/, '')} ${expanded.join(', ')}`;
  const confStr = text(confidence);
  if (confStr && !/\(C=[^)]+\)$/.test(isonote)) {
    const upper = confStr.toUpperCase();
    const code = upper.includes('HIGH') || upper.startsWith('H') ? 'H'
      : upper.includes('MEDIUM') || upper.startsWith('M') ? 'M'
        : upper.includes('LOW') || upper.startsWith('L') ? 'L' : confStr.charAt(0).toUpperCase();
    if (code) isonote += ` (C=${code})`;
  }
  return isonote;
}

function evidenceKey(record = {}) {
  const explicit = text(record.evidenceId || record.selectedEvidenceId || record.selectedCandidate?.evidenceId);
  if (explicit) return `EVIDENCE:${explicit}`;
  const tagId = text(record.tagId || record.selectedTagId);
  const viewGuid = text(record.viewGuid || record.selectedViewGuid || record.selectedCandidate?.viewGuid);
  const commentId = text(record.commentId || record.selectedCommentId || record.selectedCandidate?.commentId);
  return tagId || viewGuid || commentId ? `TAG:${viewGuid}|${tagId}|${commentId}` : '';
}

function addEvidence(record, keys, tagIds) {
  const key = evidenceKey(record);
  if (key) keys.add(key);
  const tagId = text(record.tagId || record.selectedTagId || record.selectedCandidate?.tagId);
  if (tagId) tagIds.add(tagId);
}

function matchedNavisEvidence(audit) {
  const keys = new Set();
  const tagIds = new Set();
  for (const decision of audit?.decisions || []) addEvidence(decision, keys, tagIds);
  for (const row of audit?.candidateLedger || []) {
    if (row.ledgerKind === 'ACCEPTED_CANDIDATE' && row.withinTolerance) addEvidence(row, keys, tagIds);
  }
  return { keys, tagIds };
}

function candidateLedgerNavisParse(audit) {
  const tags = [];
  const seen = new Set();
  for (const row of audit?.candidateLedger || []) {
    const key = evidenceKey(row);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    tags.push({
      evidenceId: row.evidenceId, viewName: row.viewName, viewGuid: row.viewGuid,
      tagId: row.tagId, commentId: row.commentId, commentBody: row.commentBody,
      position: row.tagPosition, positionSource: row.positionSource,
    });
  }
  return { tags };
}

function browserNavisParse(config) {
  let navisText = '';
  try { navisText = String(globalThis.document?.querySelector?.('[data-nti-field="navisText"]')?.value || ''); } catch {}
  if (!navisText) {
    try { navisText = String(JSON.parse(globalThis.localStorage?.getItem?.('navisTagIsonote.session.v1') || '{}')?.navisText || ''); } catch {}
  }
  if (!navisText) return null;
  try { return parseNavisTagXml(navisText, config); } catch { return null; }
}

function navisParseForOutput(audit, config, explicitNavisParse) {
  if (Array.isArray(explicitNavisParse?.tags)) return explicitNavisParse;
  if (Array.isArray(audit?.navisTags)) return { tags: audit.navisTags };
  const browser = browserNavisParse(config);
  return Array.isArray(browser?.tags) ? browser : candidateLedgerNavisParse(audit);
}

function unmatchedNavisRows(audit, navisParse, config) {
  const accounted = matchedNavisEvidence(audit);
  const rows = [];
  for (const tag of navisParse?.tags || []) {
    const key = evidenceKey(tag);
    const tagId = text(tag.tagId);
    const isAccounted = key ? accounted.keys.has(key) : Boolean(tagId && accounted.tagIds.has(tagId));
    if (isAccounted) continue;
    rows.push({
      'Name of the element': UNMATCHED_NAVIS_TAG_LOCATION_MESSAGE,
      PIPE: '', POS: '', 'Navis Tag ID': tagId, 'Navis Tag POS': pointLabel(tag.position),
      Tag: baseTagText(tag.commentBody, config), 'Support ISONOTE': '', confidence: 'UNRESOLVED',
      Basis: 'NO_PS_MATCH | REFER_NAVIS_FILE_TO_LOCATE_TAG',
    });
  }
  return rows;
}

function propagationByTarget(audit) {
  const byTarget = new Map();
  for (const row of audit?.propagationLedger || []) {
    if (!row?.applied || !row.targetTableRowId) continue;
    if (!byTarget.has(row.targetTableRowId)) byTarget.set(row.targetTableRowId, []);
    byTarget.get(row.targetTableRowId).push(row);
  }
  return byTarget;
}

function sourceDecisionMaps(audit) {
  const byRow = new Map();
  const byTag = new Map();
  for (const decision of audit?.decisions || []) {
    byRow.set(decision.tableRowId, decision);
    if (decision.selectedTagId) byTag.set(String(decision.selectedTagId), decision);
  }
  return { byRow, byTag };
}

function directTag(decision, config) {
  return baseTagText(decision?.appliesToDirective?.note
    || decision?.directSupportIsonote
    || decision?.selectedCandidate?.commentBody
    || '', config);
}
function propagatedBaseTags(decision) {
  return unique((decision?.propagatedIsonotes || []).map((item) => item.baseIsonote || item.note));
}
function propagationBasis(rows) {
  return unique((rows || []).map((row) => [
    `APPLIES_TO_TAG_${text(row.sourceTagId) || 'UNKNOWN'}`, row.pipeMatchBasis,
    row.sourceAxis ? `SOURCE_AXIS=${row.sourceAxis}` : '', row.targetPipeAxis ? `TARGET_AXIS=${row.targetPipeAxis}` : '',
    Number.isFinite(Number(row.alongAxisDeltaMm)) ? `STATION=${compact(row.alongAxisDeltaMm)}mm` : '',
    Number.isFinite(Number(row.parallelOffsetMm)) ? `OFFSET=${compact(row.parallelOffsetMm)}mm` : '',
    Number.isFinite(Number(row.elevationDeltaMm)) ? `EL=${compact(row.elevationDeltaMm)}mm` : '',
  ].filter(Boolean).join('; ')));
}

function candidateReviewBasis(row) {
  const outcome = row.decisionStatus === 'AMBIGUOUS' ? 'IN_TOLERANCE_AMBIGUOUS' : 'IN_TOLERANCE_RUNNER_UP';
  const scoreGap = row.scoreGap == null ? '' : `SCORE_GAP=${compact(row.scoreGap, 6)}<${compact(row.requiredScoreGap, 6)}`;
  return unique([
    outcome, row.decisionReason, `CANDIDATE_RANK=${row.candidateRank}`,
    `SCORE=${compact(row.score, 6)}`, row.topCandidateTagId ? `TOP_TAG=${row.topCandidateTagId}` : '',
    row.runnerUpTagId ? `RUNNER_UP_TAG=${row.runnerUpTagId}` : '', scoreGap,
  ]).join(' | ');
}

function candidateReviewRows(audit, config) {
  const rows = [];
  const seen = new Set();
  for (const candidate of audit?.candidateLedger || []) {
    if (candidate.ledgerKind !== 'ACCEPTED_CANDIDATE' || !candidate.withinTolerance || candidate.accepted) continue;
    const key = `${candidate.tableRowId}|${evidenceKey(candidate)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      'Name of the element': selectOutputSupportIdentity(candidate),
      PIPE: candidate.resolvedPipe || candidate.inputPipe || '',
      POS: pointLabel(candidate.supportPosition),
      'Navis Tag ID': text(candidate.tagId),
      'Navis Tag POS': pointLabel(candidate.tagPosition),
      Tag: baseTagText(candidate.commentBody, config),
      'Support ISONOTE': '',
      confidence: candidate.decisionStatus === 'AMBIGUOUS' ? 'AMBIGUOUS' : 'NOT_SELECTED',
      Basis: candidateReviewBasis(candidate),
    });
  }
  return rows;
}

function resolvedOutputRows(audit, config) {
  const propagated = propagationByTarget(audit);
  const sources = sourceDecisionMaps(audit);
  const output = [];
  for (const decision of audit?.decisions || []) {
    const direct = directTag(decision, config);
    const propagationRows = propagated.get(decision.tableRowId) || [];
    const tags = unique([direct, ...propagatedBaseTags(decision)]);
    if (!tags.length) continue;
    const tagIds = unique([direct ? decision.selectedTagId : '', ...propagationRows.map((row) => row.sourceTagId), ...(decision.propagatedFromTagIds || [])]);
    const navisPositions = [];
    if (direct && decision.selectedNavisPosition) navisPositions.push(pointLabel(decision.selectedNavisPosition));
    for (const row of propagationRows) navisPositions.push(pointLabel(row.sourcePosition));
    const confidence = [];
    if (direct && decision.confidence) confidence.push(decision.confidence);
    for (const row of propagationRows) {
      const source = sources.byRow.get(row.sourceTableRowId) || sources.byTag.get(String(row.sourceTagId));
      if (source?.confidence) confidence.push(source.confidence);
    }
    const basis = direct ? ['DIRECT_TAG_PROXIMITY', ...propagationBasis(propagationRows)] : propagationBasis(propagationRows);
    const identity = selectOutputSupportIdentity(decision);
    const confidenceValue = unique(confidence).join('|') || (propagationRows.length ? 'PROPAGATED' : decision.confidence || '');
    output.push({
      'Name of the element': identity, PIPE: decision.resolvedPipe || decision.inputPipe || '',
      POS: pointLabel(decision.supportPosition), 'Navis Tag ID': tagIds.join('|'),
      'Navis Tag POS': unique(navisPositions).join(' | '), Tag: tags.join(' | '),
      'Support ISONOTE': finalIsonote(identity, tags, config, confidenceValue),
      confidence: confidenceValue, Basis: unique(basis).join(' | '),
    });
  }
  return output;
}

export function buildFinalOutputRows(audit, inputConfig = {}, navisParse = null) {
  const config = { ...(audit?.config || {}), ...inputConfig };
  return [
    ...resolvedOutputRows(audit, config),
    ...candidateReviewRows(audit, config),
    ...unmatchedNavisRows(audit, navisParseForOutput(audit, config, navisParse), config),
  ];
}

export const _test = Object.freeze({
  baseTagText, finalIsonote, identityCandidates, propagationBasis, evidenceKey,
  matchedNavisEvidence, unmatchedNavisRows, candidateLedgerNavisParse,
  navisParseForOutput, candidateReviewBasis, candidateReviewRows,
});
