export const SUPPORT_REPORT_NPS_TO_DN_MM = Object.freeze({
  '0.5': 15,
  '0.75': 20,
  '1': 25,
  '1.5': 40,
  '2': 50,
  '2.5': 65,
  '3': 80,
  '4': 100,
  '6': 150,
  '8': 200,
  '10': 250,
  '12': 300,
  '14': 350,
  '16': 400,
  '18': 450,
  '20': 500,
  '24': 600,
});

export function normalizeSupportReportSizeValue(value) {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? round(value) : '';
  const text = clean(value);
  const match = text.match(/^([+]?(?:\d+(?:\.\d+)?|\.\d+))\s*(?:mm)?$/iu);
  if (!match) return '';
  const number = Number(match[1]);
  return Number.isFinite(number) && number > 0 ? round(number) : '';
}

export function deriveSupportReportNominalSizeMm(fullLineTag) {
  const match = stripLeadingSlash(fullLineTag).match(/-(\d+(?:\.\d+)?)"-/u);
  if (!match) return '';
  const nps = Number(match[1]);
  if (!Number.isFinite(nps)) return '';
  return SUPPORT_REPORT_NPS_TO_DN_MM[String(nps)] ?? '';
}

export function supportReportPreviousName(member) {
  const raw = firstPreviousName(member?.attributes || {});
  if (!raw) return '';
  const current = normalizeMemberId(member?.memberId);
  const values = raw.split(/[,;]+/u).map(clean).filter(Boolean)
    .filter((value) => normalizeMemberId(value) !== current);
  return values.join(', ');
}

function firstPreviousName(attrs) {
  const keys = ['PREV_PRIMARY_SUPPORT_NAME', 'PREV_NAME', 'PREVIOUS_NAME', 'OLD_NAME', 'PREVIOUS_SUPPORT_NAME'];
  const normalized = new Map(Object.entries(attrs || {}).map(([key, value]) => [normalizeKey(key), value]));
  for (const key of keys) {
    const value = clean(normalized.get(normalizeKey(key)));
    if (value) return value;
  }
  return '';
}
function normalizeMemberId(value) {
  const text = clean(value).replace(/\(REF\)$/iu, '').replace(/^\/+/, '').toUpperCase();
  return text ? `/${text}` : '';
}
function normalizeKey(value) { return String(value || '').replace(/[\s./-]+/g, '_').toUpperCase(); }
function stripLeadingSlash(value) { return clean(value).replace(/^\/+/, ''); }
function round(value) { return Math.round(Number(value) * 1000) / 1000; }
function clean(value) { return value == null ? '' : String(value).trim(); }
