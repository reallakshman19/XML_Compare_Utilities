import { parseTableSource } from './table-categorized-xml-source-parser.js';

// Explicit table schema aliases, not a global fuzzy header guess.
export const ISO_NOTE_S1_HEADER_ALIASES = Object.freeze({ 'Support No': 'PS NO' });

// Detect pasted data from its actual headers rather than trusting whichever
// source selector happened to be active when the user pasted.
export function classifyIsoNoteSource(source = {}) {
  if (!String(source.sourceText || '').trim()) return 'empty';
  const parsed = parseTableSource(source.sourceText, {
    sourceId: source.sourceId || 'source',
    delimiterMode: 'auto',
  });
  const headers = new Set((parsed.headers || []).map((header) => String(header).trim().toLowerCase()));
  if ((headers.has('ps no') || headers.has('support no')) && headers.has('pipe')) return 'mapping';
  if (headers.has('supportisonote')) return 'notes';
  return 'unknown';
}

export function assignIsoNoteSourceRoles(sources = []) {
  const existing = sources.filter((source) => String(source?.sourceText || '').trim());
  if (!existing.length) return Object.freeze({
    mapping: null, notes: null, useExamples: true, swapped: false,
  });
  const mapping = existing.find((source) => classifyIsoNoteSource(source) === 'mapping') || null;
  const notes = existing.find((source) => source !== mapping && classifyIsoNoteSource(source) === 'notes') || null;
  // Preserve unrecognized user data too. It will receive one actionable
  // source-layout blocker, not be replaced by fabricated sample rows.
  const remaining = existing.filter((source) => source !== mapping && source !== notes);
  const s1 = mapping || remaining.shift() || null;
  const s2 = notes || remaining.shift() || null;
  return Object.freeze({
    mapping: s1,
    notes: s2,
    useExamples: false,
    swapped: Boolean((s1 && s1.sourceId !== 'S1') || (s2 && s2.sourceId !== 'S2')),
  });
}

// The ordinary level validator would report the same missing source/column
// dozens of times (once per nested resolver). Collapse that to one diagnostic
// per missing source or role and direct the user to the Table step.
export function validateIsoNoteSourceLayout(profile = {}, sources = []) {
  if (profile.isoNotePlaceholderPolicy !== 'warn-and-preserve') return [];
  const requirements = [
    { sourceId: 'S1', role: 'PS mapping', required: ['PS NO', 'pipe'] },
    { sourceId: 'S2', role: 'ISO notes', required: ['SupportISONOTE', 'LinenoinCII'] },
  ];
  return requirements.flatMap(({ sourceId, role, required }) => {
    const source = sources.find((item) => item.sourceId === sourceId);
    if (!source || !(source.rows || []).length) return [{
      severity: 'BLOCKER', code: 'iso_note_source_not_parsed',
      message: `ISO Note Template needs ${sourceId} (${role}). Add/paste its table and choose Read Table (Parse) before building the graph.`,
      ref: sourceId, status: 'FAIL', gate: 'iso_note_source_not_parsed',
    }];
    const headers = new Set((source.headers || []).map((header) => String(header).trim().toLowerCase()));
    const missing = required.filter((header) => !headers.has(header.toLowerCase()) && !(sourceId === 'S1' && header === 'PS NO' && headers.has('support no')));
    if (!missing.length) return [];
    return [{
      severity: 'BLOCKER', code: 'iso_note_source_role_mismatch',
      message: `${sourceId} must be the ${role} table. Missing column(s): ${missing.join(', ')}. Select Load ISO Note Template to auto-assign existing table text, or paste the correct table and parse it.`,
      ref: sourceId, status: 'FAIL', gate: 'iso_note_source_role_mismatch',
    }];
  });
}
