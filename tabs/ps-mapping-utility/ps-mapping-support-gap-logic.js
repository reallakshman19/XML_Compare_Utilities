const GAP_NUMBER = '(-?\\d+(?:\\.\\d+)?)';
const MM_UNIT = '(?:m\\s*m|millimet(?:er|re)s?)';
const GAP_SEP = '(?:=|:|-|\\bis\\b)?';
const SUPPORT_ORDER = Object.freeze(['GUIDE', 'LINE_STOP']);

function clean(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function upper(value) {
  return clean(value).toUpperCase();
}

export function normalizeGapSource(value) {
  return String(value ?? '')
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/[\[\](){}]/g, ' ')
    .replace(/,/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function numeric(value) {
  const parsed = Number(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function setGap(out, kind, rawValue) {
  const value = numeric(rawValue);
  if (value == null) return;
  out[kind] = value;
}

export function supportTypesFromText(...values) {
  const raw = values.join(' ').toUpperCase().replace(/[_-]+/g, ' ');
  // Non-contact REST instructions and wear plates are not active REST restraints.
  const source = raw.replace(/\b(?:DO\s+NOT|DON'T|NO|NOT)\s+(?:PIPE\s+)?REST\b/g, ' ')
    .replace(/\bREST\s+NOT\s+(?:REQUIRED|ALLOWED|PERMITTED)\b/g, ' ')
    .replace(/\bWEAR\s+PLATE\b/g, ' ')
    .replace(/[\[\](){}:;,|/]+/g, ' ').replace(/\s+/g, ' ').trim();
  const out = new Set();
  if (/\bREST\b|\bPIPE\s+REST\b|\bXRT\b|\bPIPE\s+SHOE\b|\bSHOE\b/.test(source)) out.add('REST');
  if (/\bGUIDE\b/.test(source)) out.add('GUIDE');
  if (/\bLINE\s*STOP\b|\bLINESTOP\b|\bLIMIT\s*STOP\b|\bPIPE\s+STOP\b|\bDIRECTIONAL\s+ANCHOR\b|\bANCHOR\b|\bSTOP\b/.test(source)) out.add('LINE_STOP');
  return out;
}

function singleGapParent(parentTypes = new Set()) {
  const parents = SUPPORT_ORDER.filter((type) => parentTypes.has(type));
  return parents.length === 1 ? parents[0] : '';
}

function firstMatchValue(source, patterns = []) {
  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function extractTypedSupportGaps(value, parentTypes = new Set(), { fieldFallback = false } = {}) {
  const source = normalizeGapSource(value).toUpperCase();
  const out = {};
  if (!source) return out;

  const lineStopValue = firstMatchValue(source, [
    new RegExp(`\\b(?:LINE\\s*STOP|LINESTOP|STOP)\\s*GAP\\b\\s*${GAP_SEP}\\s*${GAP_NUMBER}\\s*(?:${MM_UNIT})?\\b`, 'i'),
    new RegExp(`\\b${GAP_NUMBER}\\s*(?:${MM_UNIT})?\\s*(?:LINE\\s*STOP|LINESTOP|STOP)\\s*GAP\\b`, 'i'),
  ]);
  if (lineStopValue != null) setGap(out, 'LINE_STOP', lineStopValue);

  const guideValue = firstMatchValue(source, [
    new RegExp(`\\bGUIDE\\s*GAP\\b\\s*${GAP_SEP}\\s*${GAP_NUMBER}\\s*(?:${MM_UNIT})?\\b`, 'i'),
    new RegExp(`\\b${GAP_NUMBER}\\s*(?:${MM_UNIT})?\\s*GUIDE\\s*GAP\\b`, 'i'),
  ]);
  if (guideValue != null) setGap(out, 'GUIDE', guideValue);

  // "DO NOT REST [25mm GAP]" is a non-contact clearance, not GUIDE GAP.
  const restProhibited = /\b(?:DO\s+NOT|DON'T|NO|NOT)\s+(?:PIPE\s+)?REST\b|\bREST\s+NOT\s+(?:REQUIRED|ALLOWED|PERMITTED)\b/i.test(source);
  const genericValue = firstMatchValue(source, [
    /\bGAP\b\s*(?:=|:|-|IS)?\s*(-?\d+(?:\.\d+)?)\s*(?:MM|MILLIMETERS?)?\b/i,
    /\b(-?\d+(?:\.\d+)?)\s*(?:MM|MILLIMETERS?)?\s*GAP\b/i,
  ]);
  if (genericValue != null && restProhibited) {
    setGap(out, 'REST_CLEARANCE', genericValue);
    return out;
  }
  if (out.GUIDE != null || out.LINE_STOP != null) return out;
  const types = [...parentTypes];
  const inferredParent = types.length === 1 && types[0] === 'REST'
    ? 'REST_CLEARANCE'
    : types.includes('REST') ? '' : singleGapParent(parentTypes);
  if (!inferredParent) return out;
  if (genericValue != null) {
    setGap(out, inferredParent, genericValue);
    return out;
  }

  if (fieldFallback) {
    const fallback = source.match(new RegExp(`^\\s*${GAP_NUMBER}\\s*(?:${MM_UNIT})?\\s*$`, 'i'));
    if (fallback) setGap(out, inferredParent, fallback[1]);
  }

  return out;
}

function supportLabel(type) {
  return type === 'LINE_STOP' ? 'LINE STOP' : type;
}

function gapLabel(type) {
  return `${supportLabel(type)} GAP`;
}

function formatNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return clean(value);
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(3)));
}

export function evaluateSupportGapComparison({
  table1Text = '',
  table2Text = '',
  table2GapRaw = '',
  tolerance = 0,
  enabled = true,
} = {}) {
  const empty = { status: '', detail: '', kind: '', table1GapMm: '', table2GapMm: '' };
  if (enabled === false) return empty;

  const table1Types = supportTypesFromText(table1Text);
  const table2Types = supportTypesFromText(table2Text);
  const table1Gaps = extractTypedSupportGaps(table1Text, table1Types);
  const table2Gaps = {
    ...extractTypedSupportGaps(table2Text, table2Types),
    ...extractTypedSupportGaps(table2GapRaw, table2Types, { fieldFallback: true }),
  };
  const tol = Math.max(0, Number(tolerance) || 0);
  const restProhibited = /\b(?:DO\s+NOT|DON'T|NO|NOT)\s+(?:PIPE\s+)?REST\b|\bREST\s+NOT\s+(?:REQUIRED|ALLOWED|PERMITTED)\b/i.test(table1Text);

  function compare(kind, t1, t2) {
    const label = kind === 'REST_CLEARANCE' ? 'REST clearance' : gapLabel(kind);
    const prefix = kind === 'REST_CLEARANCE' ? 'REST_CLEARANCE' : kind + '_GAP';
    if (t1 == null && t2 == null) return empty;
    if (t1 != null && t2 != null) {
      const exact = Math.abs(Number(t2) - Number(t1)) <= tol;
      return {
        status: prefix + (exact ? '_EXACT' : '_CONFLICT'),
        detail: exact
          ? 'Table-2 ' + label + ' ' + formatNumber(t2) + ' mm matches Table-1C ' + label + ' ' + formatNumber(t1) + ' mm.'
          : 'Support gap conflict: Table-2 ' + label + ' ' + formatNumber(t2) + ' mm differs from Table-1C ' + label + ' ' + formatNumber(t1) + ' mm.',
        kind, table1GapMm: t1, table2GapMm: t2,
      };
    }
    return {
      status: prefix + (t1 == null ? '_MISSING_TABLE1' : '_MISSING_TABLE2'),
      detail: t1 == null
        ? 'Table-2 ' + label + ' ' + formatNumber(t2) + ' mm exists but Table-1C ' + label + ' is unspecified; verify the source.'
        : 'Table-2 ' + label + ' is missing; Table-1C ' + label + ' is ' + formatNumber(t1) + ' mm.',
      kind, table1GapMm: t1 == null ? '' : t1, table2GapMm: t2 == null ? '' : t2,
    };
  }

  // A REST model row can compare non-contact clearance, never GUIDE/STOP gap.
  if (restProhibited && table2Types.has('REST') && !table2Types.has('GUIDE') && !table2Types.has('LINE_STOP')) {
    return compare('REST_CLEARANCE', table1Gaps.REST_CLEARANCE, table2Gaps.REST_CLEARANCE);
  }
  for (const kind of SUPPORT_ORDER) {
    if (!table2Types.has(kind) || !table1Types.has(kind)) continue;
    const compared = compare(kind, table1Gaps[kind], table2Gaps[kind]);
    if (compared.status) return compared;
  }
  return empty;
}
