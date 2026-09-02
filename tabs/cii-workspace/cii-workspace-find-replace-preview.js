/*
 * CII v14 Find & Replace Preview Adapter
 *
 * Purpose:
 * - Convert approved CII candidates into review rows.
 * - No XML mutation.
 * - No writer execution.
 * - Preview only.
 */

export function buildFindReplacePreview(candidates = []) {
    return candidates.map((candidate, index) => ({
        sequence: index + 1,
        scope: candidate.scope || 'UNKNOWN',
        entity: candidate.entity || null,
        id: candidate.id || null,
        field: candidate.field || null,
        before: candidate.before ?? null,
        after: candidate.after ?? null,
        status: 'PROPOSED'
    }));
}

export function summarizeFindReplacePreview(rows = []) {
    return {
        total: rows.length,
        proposed: rows.filter((row) => row.status === 'PROPOSED').length,
        approved: 0,
        rejected: 0
    };
}