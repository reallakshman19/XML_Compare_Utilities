import { compareIsoNoteNodeNameAndToken, normalizeIsoNoteSupportToken } from './XmlCompareIsoNoteTokenPolicy.js';
import {
  createCompositeIdentityPolicy, resolveCompositeIdentity, validateCompositeCandidate,
  normalizeIdentityPart, summarizeCompositeCoverage,
} from './XmlCompareCompositeIdentityPolicy.js';

export const ISO_NOTE_COMPOSITE_ID_POLICY = createCompositeIdentityPolicy({
  id: 'iso-note-pipeline-plus-full-support/v2',
  sourceRole: 'PS_MAPPING_S1', targetRole: 'ISO_NOTES_S2',
  parts: [
    { name: 'pipeline', sourceField: 'pipe', targetField: 'lineNoInCii',
      normalization: { stripLeadingSlashes: true } },
    { name: 'support', sourceField: 'psNo', targetField: 'nodeName',
      normalization: { stripLeadingSlashes: true } },
  ],
  validity(parts, side, record) {
    if (side === 'target') {
      const consistent = compareIsoNoteNodeNameAndToken(record?.nodeName,
        record?.rawNote || record?.supportISONOTE || '');
      if (consistent.reason) return consistent.reason;
    }
    const support = parts.find(p => p.name === 'support')?.normalized || '';
    if (!/^(PS|SL)-\d+(?:\.\d+)?$/.test(support)) return support ? 'NONCANONICAL_ID' : 'MISSING_IDENTITY_PART';
    return '';

  },
});
export const normalizeIsoPipeline = value => normalizeIdentityPart(value, { stripLeadingSlashes: true });
export const normalizeIsoSupportId = value => normalizeIdentityPart(value, { stripLeadingSlashes: true });
export function isoNoteCompositeIdentity(record, side = 'source') {
  return resolveCompositeIdentity(record, ISO_NOTE_COMPOSITE_ID_POLICY, side);
}
export function validateIsoNoteCompositeCandidate(candidate, sourceRecords, targetRecords) {
  return validateCompositeCandidate(candidate, sourceRecords, targetRecords, ISO_NOTE_COMPOSITE_ID_POLICY);
}
export function isoNoteInputCoverage(s1Rows, s2Rows) {
  return summarizeCompositeCoverage(s1Rows, s2Rows, ISO_NOTE_COMPOSITE_ID_POLICY);
}
