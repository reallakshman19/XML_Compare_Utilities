import { require } from '../vendor/kit/core.mjs';
import { numberOf, weightValue } from '../vendor/kernel/format.mjs';
import { checkChangeset } from './propose.mjs';

export function checkWeightFields(cs) {
  checkChangeset(cs);
  require(cs.base.kind==='cii','KERNEL_BASE_KIND','base.kind','This prototype edits CII only.');
  for(const c of cs.changes) {
    require(c.field==='RIGID/WEIGHT'&&c.target.kind==='cii', 'WEIGHTS_FIELD_UNSUPPORTED',c.changeId,'Only RIGID/WEIGHT element edits are supported.');
    require(c.unit===undefined||c.unit.trim().toLowerCase().replace(/\.$/,'')==='kg','WEIGHTS_UNIT_MISMATCH',c.changeId,'Weight must be in kg.');
  }
}
export function approveAll(changeset,{by,at,errorLimitPct=20}={}) {
  checkWeightFields(changeset);
  require(typeof by==='string'&&by.trim()&&typeof at==='string'&&at.trim()&&Number.isFinite(errorLimitPct)&&errorLimitPct>=0,
    'WEIGHTS_APPROVAL_INVALID','approval','Supply a name, timestamp and nonnegative percentage.');
  const changes=[],skippedWithinLimit=[];
  for(const c of changeset.changes) {
    const old=numberOf(c.oldToken,c.changeId), next=weightValue(c.newValue,c.approval.zeroConfirmed,c.changeId);
    // A nonzero change from zero has no finite relative percentage; it exceeds any finite limit.
    const beyond = old===0 ? next!==0 : Math.abs(next-old)>Math.abs(old)*(errorLimitPct/100);
    if(beyond) changes.push({...c,approval:{...c.approval,approved:true,by,at}});
    else skippedWithinLimit.push(c);
  }
  const result={...changeset,changes}; checkChangeset(result);
  return {changeset:result,skippedWithinLimit};
}
