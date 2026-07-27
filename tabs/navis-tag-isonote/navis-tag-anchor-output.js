import { anchorFinalBasis } from './navis-tag-audit-remarks.js';
import { parseAppliesToDirective } from './navis-tag-applies-to.js';

function text(value) { return String(value ?? '').trim(); }
function compact(value, digits = 3) {
  const number = Number(value);
  return Number.isFinite(number) ? String(Number(number.toFixed(digits))) : '';
}
function pointLabel(point) {
  if (![point?.x, point?.y, point?.z].every((value) => Number.isFinite(Number(value)))) return '';
  return `E=${compact(point.x)};N=${compact(point.y)};EL=${compact(point.z)}`;
}
function tagText(value, config = {}) {
  const source = text(value);
  if (!source) return '';
  const directive = parseAppliesToDirective(source, config);
  return text((directive.matched ? directive.note : source).replace(/\s*\(\s*Based\s+on\s+Tag\s+[^)]+\)\s*$/i, ''));
}
function exactIdentity(value) {
  const normalized = text(value).replace(/\s+/g, '');
  return normalized ? `/${normalized.replace(/^\/+/, '')}` : '';
}

export function configuredAnchorTagIds(audit = {}) {
  return new Set((audit.anchor?.attempts || [])
    .filter((row) => row.valid && row.resolvedTagId)
    .map((row) => text(row.resolvedTagId)));
}

export function buildAnchorOutputRows(audit = {}, navisParse = {}, config = {}, excludedTagIds = new Set()) {
  const byTag = new Map((navisParse?.tags || []).map((tag) => [text(tag.tagId), tag]));
  const rows = [];
  for (const attempt of audit.anchor?.attempts || []) {
    const tagId = text(attempt.resolvedTagId);
    if (!attempt.valid || !tagId || excludedTagIds.has(tagId)) continue;
    const tag = byTag.get(tagId) || {};
    const status = text(attempt.status);
    rows.push({
      'Name of the element': exactIdentity(attempt.resolvedSupportIdentity),
      PIPE: attempt.resolvedPipe || '',
      POS: pointLabel(attempt.supportPosition),
      'Navis Tag ID': tagId,
      'Navis Tag POS': pointLabel(tag.position || attempt.tagPosition),
      Tag: tagText(tag.commentBody || attempt.commentBody, config),
      'Support ISONOTE': '',
      confidence: status === 'AVAILABLE_FALLBACK_CONFLICT' ? 'ANCHOR_CONFLICT' : status.startsWith('SELECTED_') ? 'ANCHOR_AUTHORITY' : 'ANCHOR_LINKED',
      Basis: anchorFinalBasis(attempt),
    });
  }
  return rows;
}

export const _test = Object.freeze({ exactIdentity, pointLabel, tagText });