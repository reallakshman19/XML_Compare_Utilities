// S1 is the PS mapping table; S2 is the ISO Note table. Neither is a
// revision of the other, so build separate source-scoped partitions rather
// than joining unrelated rows or silently discarding the non-driving source.
export const ISO_NOTE_DUAL_SOURCE_PROFILE_ID = 'iso-note-ps-mapping-s1-iso-notes-s2/v1';

const column = (sourceId, name) => ({ op: 'trim', sourceId, column: name });
const fallback = (...resolvers) => ({ op: 'fallback', resolvers, defaultResolver: { op: 'rowRef' } });
const extract = (input, pattern, group = 1) => ({
  op: 'regexExtract', input, pattern, group, flags: 'i', severity: 'INFO',
});
const number = (input) => ({ op: 'numberParser', input, severity: 'INFO' });

// Keep .1/.2/.5/.7 in the support identifier. Legacy rev-to-rev ISOrecipe
// extracts a base ID separately and is intentionally left unchanged.
export const ISO_NOTE_FULL_ID_PATTERN = '^\\s*:?\\/{0,2}\\s*((?:PS|SL)-\\d+(?:\\.\\d+)?)(?:\\/DATUM)?\\s*:ISONOTE\\b';
export const ISO_NOTE_SUFFIX_PATTERN = '^\\s*:?\\/{0,2}\\s*(?:PS|SL)-\\d+\\.(\\d+)(?:\\/DATUM)?\\s*:ISONOTE\\b';

const note = column('S2', 'SupportISONOTE');
const supportFromNote = extract(note, ISO_NOTE_FULL_ID_PATTERN);
const supportFromS1 = column('S1', 'PS NO');
const rawNodeName = column('S2', 'NODE_NAME');
const normalizedNodeName = {
  op: 'trim', input: { op: 'regexReplace', input: rawNodeName, pattern: '^\\s*:?\\/{0,2}\\s*', replacement: '' },
};
const notePrefixId = extract(note, '^\\s*:?\\/{0,2}\\s*(.*?)\\s*:ISONOTE\\b');
const nodeNo = column('S2', 'NODE_NUM');
// NODE_NAME is the authoritative original support identity. Its leading
// formatting slash is removed for the display/key, but rawSupportId retains
// it byte-for-byte. Note regex is only a fallback when NODE_NAME is empty.
// NODE_NUM is a locator, NEVER a substitute PS identity.
const supportId = fallback(normalizedNodeName, supportFromNote, notePrefixId, supportFromS1);
const pipeline = {
  op: 'fallback',
  resolvers: [column('S2', 'LinenoinCII'), column('S1', 'pipe')],
  defaultValue: 'UNSPECIFIED_PIPE',
};
// Row provenance is an instance ID, not part of the engineering join key.
// Ensures two PS-XXXX rows never collapse into one graph node.
const identity = { op: 'concat', separator: '|', parts: [pipeline, supportId, { op: 'rowRef' }] };
const noteValue = (pattern) => number(extract(note, pattern));

export const ISO_NOTE_DUAL_SOURCE_PROFILE = Object.freeze({
  schema: 'UniversalCategorizerProfile.v1',
  profileId: ISO_NOTE_DUAL_SOURCE_PROFILE_ID,
  displayName: 'ISO Notes S2 + PS Mapping S1',
  version: '1.0.0',
  drivingSourceId: 'S2',
  sourceRowMode: 'perSource',
  isoNotePlaceholderPolicy: 'warn-and-preserve',
  rootPartitionMode: 'static',
  rootPartitions: [
    { key: 'PS_MAPPING_S1', displayName: 'PS Mapping / S1', sourceScope: ['S1'] },
    { key: 'ISO_NOTES_S2', displayName: 'ISO Notes / S2', sourceScope: ['S2'] },
  ],
  requiredColumns: [],
  optionalColumns: ['Bore', 'DTXR', 'Support Gap', 'Mandatory', 'X', 'Y', 'Z', 'Remarks', 'JOBNAME', 'PIPEAXIS', 'NODE_NAME', 'NODE_NUM', 'NPS', 'TYPE'],
  joins: [],
  duplicateKeyPolicy: 'merge-sourceRefs',
  multiValuePolicy: 'preserve-parallel-evidence',
  exportPolicy: {
    documentRootTag: 'IsoNoteXml', rootPartitionTag: 'IsoPartition',
    includeDiagnosticsElement: true,
    childElementFields: [
      'connectorKey', 'supportId', 'rawSupportId', 'revision',
      'pipe', 'psNo', 'bore', 'dtxr', 'supportGap', 'mandatory', 'x', 'y', 'z',
      'rawNote', 'jobName', 'lineNoInCii', 'pipeAxis', 'nodeNumber', 'nodeName',
      'nps', 'supportType', 'remarks', 'restKn', 'guideKn', 'guideGapMm', 'lineStopKn',
    ],
  },
  levelDefinitions: [{
    levelId: 'isoNoteXml', xmlTag: 'IsoNoteXml', levelType: 'container',
    creationMode: 'static', key: 'IsoNoteXml', documentRoot: true,
    children: [{
      // The graph builder recognizes source-scoped partitions by this levelId.
      levelId: 'rootPartition', xmlTag: 'IsoPartition', levelType: 'partition',
      creationMode: 'static', key: 'ISO_SOURCE',
      children: [{
        levelId: 'isoItem', xmlTag: 'IsoItem', levelType: 'group',
        creationMode: 'one-per-key', keyResolver: identity,
        displayNameResolver: supportId,
        fieldResolvers: {
          connectorKey: identity,
          supportId,
          rawSupportId: rawNodeName,
          // A .1/.2 support suffix is not a document revision.
          revision: { op: 'literal', value: '' },
          pipe: pipeline,
          psNo: supportFromS1,
          bore: column('S1', 'Bore'),
          dtxr: column('S1', 'DTXR'),
          supportGap: column('S1', 'Support Gap'),
          mandatory: column('S1', 'Mandatory'),
          x: column('S1', 'X'), y: column('S1', 'Y'), z: column('S1', 'Z'),
          rawNote: note,
          jobName: column('S2', 'JOBNAME'),
          lineNoInCii: column('S2', 'LinenoinCII'),
          pipeAxis: column('S2', 'PIPEAXIS'),
          nodeNumber: number(nodeNo),
          nodeName: column('S2', 'NODE_NAME'),
          nps: number(column('S2', 'NPS')),
          supportType: column('S2', 'TYPE'),
          remarks: column('S2', 'Remarks'),
          restKn: noteValue('\\bREST\\s*\\(\\s*([-+]?\\d*\\.?\\d+)\\s*kN\\s*\\)'),
          guideKn: noteValue('\\bGUIDE\\s*\\(\\s*([-+]?\\d*\\.?\\d+)\\s*kN\\s*\\)'),
          guideGapMm: noteValue('\\bGUIDE\\s+GAP\\s*=\\s*([-+]?\\d*\\.?\\d+)\\s*mm'),
          lineStopKn: noteValue('\\bLINE\\s*STOP\\s*\\(\\s*([-+]?\\d*\\.?\\d+)\\s*kN\\s*\\)'),
        },
        children: [],
      }],
    }],
  }],
});

// Ambiguous values are evidence, not export blockers. NODE_NUM (or ultimately
// the source-row reference) makes each such row independently traceable.
export function isoNoteIdentityWarnings(sources = []) {
  const mappingWarnings = sources.filter(source => source.sourceId === 'S1').flatMap(source =>
    (source.rows || []).flatMap(row => {
      const raw = String(row.rawByHeader?.['PS NO'] ?? row.rawByHeader?.['Support No'] ?? '').trim();
      return raw && !/^(?:PS|SL)-\d+(?:\.\d+)?$/i.test(raw) ? [{
        severity: 'WARNING', code: 'NONCANONICAL_ID',
        message: 'Mapping identifier retained verbatim; not eligible for automatic composite-key approval.',
        sourceRef: row.rowId, rawIdentifier: raw,
      }] : [];
    }));
  return [...mappingWarnings, ...sources.filter((source) => source.sourceId === 'S2').flatMap((source) =>
    (source.rows || []).flatMap((row) => {
      const text = String(row.rawByHeader?.SupportISONOTE || '').trim();
      const rawNode = String(row.rawByHeader?.NODE_NAME || '').trim();
      if (rawNode && !/^(?:\/{0,2})?(?:PS|SL)-\d+(?:\.\d+)?$/i.test(rawNode)) return [{
        severity: 'WARNING', code: 'NONCANONICAL_ID',
        message: 'Original NODE_NAME is preserved without NODE_NUM substitution; manual review required.',
        sourceRef: row.rowId, rawIdentifier: rawNode,
      }];
      const noteId = text.match(/^\s*:?\/{0,2}\s*(.*?)\s*:ISONOTE\b/i)?.[1] || '';
      const norm = (value) => String(value || '').trim().replace(/^\s*:?\/{0,2}\s*/, '').toUpperCase();
      if (rawNode && noteId && norm(rawNode) !== norm(noteId)) return [{
        severity: 'WARNING', code: 'iso_note_identity_conflict',
        message: 'NODE_NAME and support token in SupportISONOTE differ; original NODE_NAME retained, automatic identity requires review.',
        sourceRef: row.rowId, rawIdentifier: rawNode, noteIdentifier: noteId,
      }];
      if (!text) return [{
        severity: 'WARNING', code: 'iso_note_missing_identity',
        message: 'Empty ISO note; original NODE_NAME and row reference retained.',
        sourceRef: row.rowId,
      }];
      const placeholder = /(?:^|[\/:\s])(?:PS|SL)-X{3,}(?=\s|:|\/|$)/i.test(text);
      if (placeholder) return [{
        severity: 'WARNING', code: 'iso_note_placeholder_identity',
        message: 'Placeholder support ID preserved verbatim; distinct row identity.',
        sourceRef: row.rowId,
      }];
      if (!new RegExp(ISO_NOTE_FULL_ID_PATTERN, 'i').test(text)) return [{
        severity: 'WARNING', code: 'iso_note_nonstandard_identity',
        message: 'Nonstandard ISONOTE string; NODE_NAME retained and note text preserved.',
        sourceRef: row.rowId,
      }];
      return [];
    }))];
}
