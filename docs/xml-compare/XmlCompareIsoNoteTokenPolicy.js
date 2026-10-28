// Canonical ISO Note support-token contract shared by graph import, identity
// approval, and provenance. /DATUM is a note annotation, not part of the PS ID.
export const ISO_NOTE_FULL_ID_PATTERN = '^\\s*:?\\/{0,2}\\s*((?:PS|SL)-\\d+(?:\\.\\d+)?)(?:\\/DATUM)?\\s*:ISONOTE\\b';
export const ISO_NOTE_SUFFIX_PATTERN = '^\\s*:?\\/{0,2}\\s*(?:PS|SL)-\\d+\\.(\\d+)(?:\\/DATUM)?\\s*:ISONOTE\\b';
export const ISO_NOTE_RAW_TOKEN_PATTERN = '^\\s*:?\\/{0,2}\\s*(.*?)\\s*:ISONOTE\\b';
export const ISO_NOTE_TOKEN_POLICY_SCHEMA = 'iso-note-support-token/v1';
const clean = value => String(value ?? '').trim();
export function normalizeIsoNoteSupportToken(value) {
  return clean(value).replace(/^\s*:?\/+/, '').replace(/\/DATUM\s*$/i, '').trim().toUpperCase();
}
export function extractIsoNoteSupportToken(note) {
  const rawText = clean(note);
  const match = new RegExp(ISO_NOTE_RAW_TOKEN_PATTERN, 'i').exec(rawText);
  const rawToken = match?.[1]?.trim() || '';
  const normalized = normalizeIsoNoteSupportToken(rawToken);
  return Object.freeze({
    found: Boolean(match && rawToken),
    rawToken, normalized,
    hasDatum: /\/DATUM\s*$/i.test(rawToken),
    canonical: /^(?:PS|SL)-\d+(?:\.\d+)?$/.test(normalized),
    rule: 'ISO_NOTE_TOKEN_WITH_OPTIONAL_DATUM',
  });
}
export function compareIsoNoteNodeNameAndToken(nodeName, note) {
  const token = extractIsoNoteSupportToken(note);
  const node = normalizeIsoNoteSupportToken(nodeName);
  // Blank NODE_NAME remains an identity REVIEW even if a note token exists.
  const reason = !node ? token.found ? 'NODE_NAME_MISSING_NOTE_TOKEN_PRESENT' : 'NODE_NAME_MISSING'
    : token.found && token.normalized !== node ? 'NODE_NAME_NOTE_MISMATCH' : '';
  return Object.freeze({ valid: !reason, reason, nodeName: clean(nodeName), normalizedNodeName: node, token });
}
