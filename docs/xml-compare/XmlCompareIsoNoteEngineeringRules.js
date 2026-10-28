// ISO Note engineering evidence and policy. Pure domain logic shared by
// comparison, CSV, review and tests. No fuzzy matching or transfer side effects.
export const ISO_NOTE_ENGINEERING_RULES_SCHEMA = 'iso-note-engineering-rules/v1';
export const GAP_KINDS = Object.freeze(['rest', 'guide', 'lineStop']);
export const RESTRAINT_TYPES = Object.freeze(['REST', 'GUIDE', 'LINE_STOP']);
const text = (value) => String(value ?? '').trim();
const unique = (items) => [...new Set(items)];
const frozen = (obj) => Object.freeze(obj);

function signal(kind, amount, phrase, index, rule) {
  return frozen({ kind, mm: amount, phrase: text(phrase), offset: index, rule });
}

export function parseTypedGaps(input = '', { supportGapColumn = false } = {}) {
  const value = text(input);
  const evidence = [];
  const spans = [];
  // Explicit typed gaps take precedence over broad "25mm GAP" recognition.
  // In particular LINE STOP GAP must never be reclassified as a REST gap.
  const typed = [
    { kind: 'lineStop', tag: '(?:LINE\\s*STOP|LINESTOP|STOP)' },
    { kind: 'guide', tag: 'GUIDE' },
    { kind: 'rest', tag: '(?:REST|VERTICAL|BOP\\s*(?:TO|AND)\\s*TOS)' },
  ];
  const unit = '(\\d+(?:[.,]\\d+)?)\\s*(?:mm|millimet(?:re|er)s?)';
  const add = (kind, match, number, rule) => {
    const mm = Number(String(number).replace(',', '.'));
    if (!Number.isFinite(mm) || mm < 0) return;
    const start = match.index, end = start + match[0].length;
    if (spans.some(([a, b]) => start < b && end > a)) return;
    spans.push([start, end]);
    evidence.push(signal(kind, mm, match[0], start, rule));
  };
  for (const { kind, tag } of typed) {
    const patterns = [
      new RegExp('\\b' + tag + '\\s+(?:GAP|CLEARANCE)\\s*(?:=|:|-)?\\s*' + unit, 'gi'),
      new RegExp(unit + '\\s+' + tag + '\\s+(?:GAP|CLEARANCE)\\b', 'gi'),
    ];
    for (const pattern of patterns) {
      for (const match of value.matchAll(pattern)) add(kind, match, match[1], 'TYPED_GAP');
    }
  }
  // Generic GAP in S1 is vertical/pipe clearance only if the dedicated
  // Support Gap field is populated and does not say GUIDE or STOP.
  // In S2 a plain "[25mm GAP]" is likewise a pipe/REST clearance, but
  // a nearby explicit typed prefix must not be swallowed.
  const genericPatterns = [
    new RegExp(unit + '\\s*(?:GAP|CLEARANCE)\\b', 'gi'),
    new RegExp('\\b(?:GAP|CLEARANCE)\\s*(?:=|:|-)\\s*' + unit, 'gi'),
  ];
  for (const pattern of genericPatterns) {
    for (const match of value.matchAll(pattern)) {
      const start = match.index, end = start + match[0].length;
      if (spans.some(([a,b]) => start < b && end > a)) continue;
      const prefix = value.slice(Math.max(0, start - 28), start);
      // "LINE STOP [25mm GAP]", "GUIDE [10mm GAP]" variants.
      const context = prefix.match(/\b(LINE\s*STOP|LINESTOP|STOP|GUIDE|REST|VERTICAL)\s*(?:\[|\(|:|-|\s)*$/i);
      const kind = context ? (/GUIDE/i.test(context[1]) ? 'guide'
        : /STOP/i.test(context[1]) ? 'lineStop' : 'rest') : 'rest';
      add(kind, match, match[1], context ? 'CONTEXT_GAP' : 'UNTYPED_PIPE_GAP');
    }
  }
  // Dedicated S1 gap cell only: "25mm" means pipe/vertical clearance.
  // Bare numbers without units are not safe to interpret automatically.
  if (supportGapColumn && !evidence.length) {
    const plain = value.match(new RegExp('^\\s*' + unit + '\\s*$', 'i'));
    if (plain) add('rest', { index: 0, 0: plain[0] }, plain[1], 'S1_PLAIN_MM');
  }
  const result = {};
  for (const kind of GAP_KINDS) result[kind] = frozen(unique(evidence.filter(e => e.kind === kind).map(e => e.mm)));
  return frozen({ ...result, evidence: frozen(evidence) });
}

export function parseRestraintEvidence(input = '', { fromModel = false } = {}) {
  const value = text(input).toUpperCase();
  const found = new Set(), uncertain = [], evidence = [];
  const rules = fromModel
    ? [
        ['GUIDE', /\bGUIDE\b|\bGUIDING\b/g, 'DTXR_GUIDE'],
        ['LINE_STOP', /\bLINE\s*STOP\b|\bPIPE\s*STOP\b|\bSTOP\s*TYPE\b|\bDIRECTIONAL\s*ANCHOR\b/g, 'DTXR_LINE_STOP'],
        ['REST', /\bPIPE\s*REST\b|\bXRT(?:\d+)?\b|\bPIPE\s*SHOE\b|\bREST\s*TYPE\b/g, 'DTXR_REST'],
      ]
    : [
        ['GUIDE', /\bGUIDE(?:\s*\([^)]*\))?\b/g, 'ISONOTE_GUIDE'],
        ['LINE_STOP', /\bLINE\s*STOP(?:\s*\([^)]*\))?\b/g, 'ISONOTE_LINE_STOP'],
        ['REST', /\bREST(?:\s*\([^)]*\))?\b/g, 'ISONOTE_REST'],
      ];
  for (const [kind, pattern, rule] of rules) {
    for (const match of value.matchAll(pattern)) {
      const previous = value.slice(Math.max(0, match.index - 12), match.index);
      if (!fromModel && kind === 'REST' && /\bDO\s+NOT\s*$/.test(previous)) {
        uncertain.push('DO_NOT_REST requires engineering review; not a positive REST demand');
        evidence.push(frozen({ kind: 'REST', polarity: 'NEGATED', phrase: match[0], offset: match.index, rule: 'ISONOTE_DO_NOT_REST' }));
        continue;
      }
      found.add(kind);
      evidence.push(frozen({ kind, polarity: 'POSITIVE', phrase: match[0], offset: match.index, rule }));
    }
  }
  if (fromModel && /\bWEAR\s*PLATE\b|\bPAD\b/.test(value) && !found.has('REST')) {
    uncertain.push('Wear plate/pad is not proof of a REST restraint');
    evidence.push(frozen({ kind: 'REST', polarity: 'UNCERTAIN', phrase: 'WEAR PLATE/PAD', offset: value.indexOf('WEAR'), rule: 'DTXR_WEAR_PLATE_REVIEW' }));
  }
  return frozen({ types: frozen(RESTRAINT_TYPES.filter(t => found.has(t))), uncertain: frozen(unique(uncertain)), evidence: frozen(evidence) });
}

const joinValues = (items) => items.length ? items.join(' + ') : '';
export function compareRestraintCoverage(dtxr = '', note = '', identityStatus = 'MATCH') {
  const model = parseRestraintEvidence(dtxr, { fromModel: true });
  const required = parseRestraintEvidence(note);
  const missing = required.types.filter(t => !model.types.includes(t));
  const extra = model.types.filter(t => !required.types.includes(t));
  let status = 'NOT_SPECIFIED', reason = 'Neither source establishes a positive restraint requirement.';
  if (identityStatus !== 'MATCH') {
    status = 'NOT_APPLICABLE'; reason = 'Identity not uniquely verified; no restraint assertion made.';
  } else if (model.uncertain.length || required.uncertain.length) {
    status = 'REVIEW'; reason = [...model.uncertain, ...required.uncertain].join('; ');
  } else if (missing.length) {
    status = 'MISSING'; reason = 'ISONOTE requires ' + joinValues(missing) + ' but DTXR does not establish coverage.';
  } else if (extra.length) {
    status = 'EXTRA'; reason = 'DTXR suggests ' + joinValues(extra) + ' not required by the parsed ISONOTE.';
  } else if (required.types.length) {
    status = 'COVERED'; reason = 'Recognized restraint types agree; DTXR text does not verify physical model geometry.';
  } else if (text(dtxr) || text(note)) {
    status = 'REVIEW'; reason = 'No confirmed restraint types; inspect original engineering descriptions.';
  }
  return frozen({
    status, reason,
    required: joinValues(required.types), provided: joinValues(model.types),
    missing: joinValues(missing), extra: joinValues(extra),
    sourceEvidence: model.evidence, targetEvidence: required.evidence,
    warnings: frozen([...model.uncertain, ...required.uncertain]),
  });
}

function compareGapType(kind, source, target, identityStatus) {
  const s1Mm = frozen([...source]), s2Mm = frozen([...target]);
  let status = 'NOT_SPECIFIED', reason = 'No numeric gap of this type in either source.';
  if (identityStatus !== 'MATCH') {
    status = 'NOT_APPLICABLE'; reason = 'Full support identity is not verified.';
  } else if (source.length > 1 || target.length > 1) {
    status = 'REVIEW'; reason = 'Multiple distinct ' + kind + ' clearances require review.';
  } else if (!source.length && target.length) {
    status = 'REVIEW'; reason = 'S2-only ' + kind + ' clearance has no S1 evidence.';
  } else if (source.length && !target.length) {
    status = 'REVIEW'; reason = 'S1-only ' + kind + ' clearance has no S2 evidence.';
  } else if (source.length && target.length && source[0] !== target[0]) {
    status = 'MISMATCH'; reason = 'Different ' + kind + ' clearance in mm.';
  } else if (source.length && target.length) {
    status = 'MATCH'; reason = 'Equal ' + kind + ' clearance in mm.';
  }
  return frozen({ kind, status, reason, s1Mm, s2Mm, rule: 'TYPED_GAP_EXACT_MM_V2' });
}

export function compareEngineeringGaps(s1Value = '', s2Value = '', identityStatus = 'MATCH') {
  const s1 = parseTypedGaps(s1Value, { supportGapColumn: true });
  const s2 = parseTypedGaps(s2Value);
  const byType = frozen(Object.fromEntries(GAP_KINDS.map(kind =>
    [kind, compareGapType(kind, s1[kind], s2[kind], identityStatus)])));
  const considered = GAP_KINDS.filter(kind => s1[kind].length || s2[kind].length);
  const uncertain = considered.filter(kind => byType[kind].status === 'REVIEW');
  const different = considered.filter(kind => byType[kind].status === 'MISMATCH');
  const fmt = values => values.length ? values.join(', ') : '';
  const result = (status, reason) => frozen({
    status, reason, byType, unresolvedTypes: frozen(uncertain),
    s1RestMm: fmt(s1.rest), s2RestMm: fmt(s2.rest),
    s1GuideMm: fmt(s1.guide), s2GuideMm: fmt(s2.guide),
    s1LineStopMm: fmt(s1.lineStop), s2LineStopMm: fmt(s2.lineStop),
    s1Evidence: s1.evidence, s2Evidence: s2.evidence,
    rule: 'TYPED_GAP_EXACT_MM_V2',
  });
  if (identityStatus !== 'MATCH') return result('NOT_APPLICABLE', 'Pipeline and full support ID are not uniquely matched.');
  if (!considered.length) return text(s1Value)
    ? result('REVIEW', 'S1 Support Gap has no unambiguous typed millimetre value.')
    : result('NOT_SPECIFIED', 'Neither side has comparable numeric clearance.');
  if (different.length) return result('MISMATCH', different.map(kind => byType[kind].reason).join(' ') +
    (uncertain.length ? ' Other gap types require review: ' + uncertain.join(', ') + '.' : ''));
  if (uncertain.length) return result('REVIEW',
    'Unverified typed clearances: ' + uncertain.map(kind => byType[kind].reason).join(' '));
  if (text(s1Value) && !s1.evidence.length) return result('REVIEW', 'S1 gap contains unparsed evidence requiring review.');
  return result('MATCH', 'Identical typed clearance values in mm; all declared gap types compared.');
}

export function engineeringReviewAction(identityStatus, gap, coverage) {
  if (identityStatus !== 'MATCH') return frozen({
    code: 'VERIFY_IDENTITY', action: 'Manual review: verify exact pipeline and full support number first. Do not transfer properties.',
    disposition: 'REVIEW', transferReady: false,
  });
  if (gap.status === 'MISMATCH' || coverage.status === 'MISSING') return frozen({
    code: 'ENGINEERING_DISCREPANCY', action: 'Investigate ISONOTE/DTXR and clearance evidence; do not automatically alter the model.',
    disposition: 'REVIEW', transferReady: false,
  });
  if (gap.status === 'REVIEW' || coverage.status === 'REVIEW' || coverage.status === 'EXTRA' ||
      gap.status === 'NOT_SPECIFIED' || coverage.status === 'NOT_SPECIFIED') return frozen({
    code: 'ENGINEERING_REVIEW', action: 'Verify missing/ambiguous restraint or gap evidence against the model before transfer.',
    disposition: 'REVIEW', transferReady: false,
  });
  return frozen({
    code: 'EVIDENCE_ALIGNED', action: 'Identity and parsed evidence aligned; verify actual geometry before any transfer.',
    disposition: 'REVIEW', transferReady: false,
  });
}
