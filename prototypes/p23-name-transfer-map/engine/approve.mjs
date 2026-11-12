import {attempt, require} from '../kit/core.mjs';
import {validateNamesDoc} from './plan.mjs';
export function approveSelected(changeset, ids, {by,at}={}) {
  return attempt(() => {
    validateNamesDoc(changeset,'topofix.changeset');
    require(typeof by === 'string' && by.trim() && typeof at === 'string' && at.trim(), 'NAMES_APPROVAL_INVALID','approval','Approver and time are required.');
    const known = new Set(changeset.changes.map(c=>c.changeId));
    require(Array.isArray(ids) && ids.every(id=>known.has(id)), 'NAMES_APPROVAL_INVALID','ids','Unknown change ID.');
    const selected = new Set(ids), out = structuredClone(changeset);
    for (const c of out.changes) if (selected.has(c.changeId)) c.approval={...c.approval,approved:true,by:by.trim(),at};
    validateNamesDoc(out,'topofix.changeset');
    return {changeset:out};
  });
}
export function approveAll(changeset, metadata) {
  return approveSelected(changeset, Array.isArray(changeset?.changes)?changeset.changes.map(c=>c?.changeId):[], metadata);
}
