import {attempt, require} from '../kit/core.mjs';
import {readCii14,fieldDiff} from '../kit/cii14.mjs';
import {applyChangeset} from '../vendor/kernel/apply.mjs';
import {nameIndex,validateNamesDoc} from './plan.mjs';
export async function applyNames(targetBytes, changeset) {
  return attempt(async () => {
    validateNamesDoc(changeset,'topofix.changeset');
    const result=await applyChangeset(targetBytes,changeset);
    if (!result.ok) throw Object.assign(new Error('REFUSED'),{refusals:result.refusals});
    return {bytes:result.bytes,sha256:result.sha256,applied:result.applied,...verifyNames(targetBytes,result.bytes,changeset)};
  });
}
// Independently re-read and verify the kernel output before exposing any bytes.
export function verifyNames(targetBytes, outputBytes, changeset) {
    const before=readCii14(targetBytes), after=readCii14(outputBytes);
    let names;
    try { names=nameIndex(after); } catch (e) {
      if (e.code === 'NAMES_SOURCE_NAME_CONFLICT') require(false,'NAMES_READBACK_FAILED',e.where,e.detail);
      throw e;
    }
    const report=changeset.changes.map(c=>{
      const n=names.get(c.target.node),readBack=n?.name;
      const ok=!!n && n.slots>0 && !n.missing && readBack===c.newValue;
      require(ok,'NAMES_READBACK_FAILED',c.changeId,'Revised name does not match the requested name.');
      return {changeId:c.changeId,node:c.target.node,old:c.oldToken,new:c.newValue,readBack,ok};
    });
    const diff=fieldDiff(before,after);
    require(diff.every(d=>d.section==='NODENAME'),'NAMES_READBACK_FAILED','diff','An element field or other non-name field changed.');
    return {report,diff};
}
