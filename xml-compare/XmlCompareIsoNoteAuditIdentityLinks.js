import { buildIsoNoteAnchorCandidates } from './XmlCompareIsoNoteDirectCompare.js';

// Review evidence only. This collection is intentionally NOT an ApprovedMatchSet.
export const ISO_NOTE_AUDIT_IDENTITY_LINKS_SCHEMA = 'iso-note-audit-identity-links/v1';

export function createIsoNoteAuditIdentityLinks({ report = null, sourceRecords = [], targetRecords = [] } = {}) {
  const candidates = buildIsoNoteAnchorCandidates({ report, sourceRecords, targetRecords });
  const byPair = new Map((report?.rows || []).filter(row => row.status === 'MATCH')
    .map(row => [row.sourceUid + '=>' + row.targetUid, row]));
  const links = Object.freeze(candidates.map(candidate => {
    const row = byPair.get(candidate.sourceUid + '=>' + candidate.targetUid) || {};
    return Object.freeze({
      linkId: 'audit:' + candidate.sourceUid + '=>' + candidate.targetUid,
      sourceUid: candidate.sourceUid,
      targetUid: candidate.targetUid,
      pipeline: row.pipe || '',
      supportId: row.psNo || '',
      s1Ref: row.s1Ref || '',
      s2Ref: row.s2Ref || '',
      identityRule: row.matchRule || 'NORMALIZED_PIPE_PLUS_FULL_SUPPORT_ID_V1',
      disposition: 'IDENTITY_VERIFIED_NOT_TRANSFER_APPROVED',
    });
  }));
  return Object.freeze({
    schema: ISO_NOTE_AUDIT_IDENTITY_LINKS_SCHEMA,
    readOnly: true,
    links,
    linkedCount: links.length,
  });
}
