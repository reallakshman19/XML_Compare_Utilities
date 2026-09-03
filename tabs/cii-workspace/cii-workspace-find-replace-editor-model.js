const MODES = Object.freeze({
  DOCUMENT: Object.freeze(['findText', 'replaceText']),
  ELEMENT: Object.freeze(['findText', 'replaceText', 'from', 'to']),
  BLOCK: Object.freeze(['findText', 'replaceText', 'from', 'to', 'block']),
});

function sequenceOf(row, index) {
  const value = Number(row?.sequence);
  return Number.isInteger(value) && value > 0 ? value : index + 1;
}

function rawReplacement(row) {
  return String(row?.rawReplaceText ?? row?.replaceText ?? row?.after ?? '');
}

function effectiveReplacement(row) {
  return String(row?.replaceText ?? row?.after ?? '');
}

function activeRow(row) {
  return String(row?.status || 'PROPOSED').toUpperCase() !== 'REJECTED';
}

function freezeEntry(entry) {
  return Object.freeze({ ...entry, sequences: Object.freeze([...(entry.sequences || [])]) });
}

export function normalizeFindReplaceReplacement(value) {
  const raw = String(value ?? '');
  const trimmed = raw.trim();
  if (!trimmed.startsWith('/')) {
    return Object.freeze({ raw, effective: raw, normalized: false, rule: null, valid: true });
  }
  const first = trimmed.split(',')[0].trim();
  const effective = first.slice(1).trim();
  return Object.freeze({
    raw,
    effective,
    normalized: raw !== effective,
    rule: 'FIRST_SLASH_TOKEN',
    valid: effective.length > 0,
  });
}

export function editorFieldsForMode(mode) {
  return MODES[String(mode || 'DOCUMENT').trim().toUpperCase()] || MODES.DOCUMENT;
}

export function parseFindReplaceSpreadsheetPaste(text) {
  const normalized = String(text ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');
  if (lines.length > 1 && lines.at(-1) === '') lines.pop();
  return Object.freeze(lines.map((line) => Object.freeze(line.split('\t'))));
}

export function findReplaceRowsToTsv(rows = []) {
  return (rows || [])
    .filter((row) => String(row?.findText ?? row?.before ?? '').length || rawReplacement(row).length)
    .map((row) => `${String(row?.findText ?? row?.before ?? '')}\t${rawReplacement(row)}`)
    .join('\n');
}

export function analyzeFindReplaceEditorRows(rows = [], operationSummaries = []) {
  const entries = [];
  const blockedSequences = new Set();
  const byFind = new Map();
  const byReplacement = new Map();

  (rows || []).forEach((row, index) => {
    const sequence = sequenceOf(row, index);
    const findText = String(row?.findText ?? row?.before ?? '');
    const raw = rawReplacement(row);
    const effective = effectiveReplacement(row);
    const normalization = normalizeFindReplaceReplacement(raw);

    if (normalization.normalized) {
      entries.push(freezeEntry({
        severity: normalization.valid ? 'INFO' : 'ERROR',
        code: normalization.valid ? 'REPLACEMENT_NORMALIZED' : 'REPLACEMENT_NORMALIZATION_EMPTY',
        sequences: [sequence],
        message: normalization.valid
          ? `Row ${sequence}: using “${effective}” from pasted replacement “${raw}”.`
          : `Row ${sequence}: slash-list replacement does not contain a usable first token.`,
      }));
      if (!normalization.valid) blockedSequences.add(sequence);
    }

    for (const blocker of row?.blockers || []) {
      entries.push(freezeEntry({
        severity: 'ERROR', code: String(blocker), sequences: [sequence],
        message: `Row ${sequence}: ${String(blocker)}`,
      }));
      blockedSequences.add(sequence);
    }

    if (!activeRow(row) || !findText) return;
    const findGroup = byFind.get(findText) || [];
    findGroup.push({ sequence, effective });
    byFind.set(findText, findGroup);

    if (effective) {
      const replacementGroup = byReplacement.get(effective) || [];
      replacementGroup.push({ sequence, findText });
      byReplacement.set(effective, replacementGroup);
    }
  });

  for (const [findText, group] of byFind) {
    if (group.length < 2) continue;
    const replacements = [...new Set(group.map((item) => item.effective))];
    const sequences = group.map((item) => item.sequence);
    if (replacements.length > 1) {
      entries.push(freezeEntry({
        severity: 'ERROR', code: 'CONFLICTING_REPLACEMENTS', sequences,
        message: `Rows ${sequences.join(', ')}: “${findText}” maps to conflicting replacements: ${replacements.map((value) => `“${value}”`).join(', ')}.`,
      }));
    } else {
      entries.push(freezeEntry({
        severity: 'ERROR', code: 'DUPLICATE_FIND_REPLACE', sequences,
        message: `Rows ${sequences.join(', ')} duplicate the same Find → Replace mapping for “${findText}”. Delete or reject duplicates before validation.`,
      }));
    }
    for (const sequence of sequences) blockedSequences.add(sequence);
  }

  for (const [replacement, group] of byReplacement) {
    const finds = [...new Set(group.map((item) => item.findText))];
    if (finds.length < 2) continue;
    entries.push(freezeEntry({
      severity: 'INFO', code: 'SHARED_REPLACEMENT_TARGET', sequences: group.map((item) => item.sequence),
      message: `Replacement “${replacement}” is shared by ${finds.length} different Find values.`,
    }));
  }

  for (const summary of operationSummaries || []) {
    const sequence = Number(summary?.sequence);
    if (!Number.isInteger(sequence)) continue;
    if (Number(summary?.matchCount) === 0) {
      entries.push(freezeEntry({
        severity: 'ERROR', code: 'NO_MATCHES_IN_SCOPE', sequences: [sequence],
        message: `Row ${sequence}: Find value has no match in the resolved CII scope.`,
      }));
      blockedSequences.add(sequence);
    }
    for (const blocker of summary?.blockers || []) {
      const code = String(blocker);
      if (code === 'NO_MATCHES_IN_SCOPE') continue;
      entries.push(freezeEntry({
        severity: 'ERROR', code, sequences: [sequence],
        message: `Row ${sequence}: ${code}`,
      }));
      blockedSequences.add(sequence);
    }
  }

  const counts = { error: 0, warning: 0, info: 0 };
  for (const entry of entries) counts[entry.severity.toLowerCase()] += 1;
  return Object.freeze({
    entries: Object.freeze(entries),
    blockedSequences: Object.freeze([...blockedSequences].sort((a, b) => a - b)),
    counts: Object.freeze(counts),
    hasErrors: counts.error > 0,
  });
}

export const _test = Object.freeze({ rawReplacement, effectiveReplacement, activeRow });
