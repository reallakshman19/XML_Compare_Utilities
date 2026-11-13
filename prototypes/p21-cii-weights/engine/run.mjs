import { attempt, require } from '../vendor/kit/core.mjs';
import { readCii14, rigidOf, fieldDiff } from '../vendor/kit/cii14.mjs';
import { applyChangeset } from '../vendor/kernel/apply.mjs';
import { formatCiiNumber, numberOf } from '../vendor/kernel/format.mjs';
import { checkWeightFields } from './approve.mjs';
import { rigidInventory } from './inventory.mjs';

export async function applyWeights(bytes, changeset, {testReadBack}={}) {
  return attempt(async()=>{
    checkWeightFields(changeset);
    const result=await applyChangeset(bytes,changeset);
    if(!result.ok) throw Object.assign(new Error('REFUSED'),{refusals:result.refusals});
    rigidInventory(bytes); // check units before any output is exposed
    const before=readCii14(bytes), after=readCii14(result.bytes);
    const diff=fieldDiff(before,after);
    const planned=new Map(changeset.changes.map(c=>[rigidOf(before,c.target.elementIndex).weight.start,c]));
    require(diff.length===planned.size&&diff.every(d=>d.section==='RIGID'&&planned.has(d.start)&&d.end===d.start+13),
      'WEIGHTS_DIFF_MISMATCH','diff','Expected exactly one changed weight field per planned edit.');
    const report=changeset.changes.map(c=>{
      const weight=rigidOf(after,c.target.elementIndex).weight;
      const expected=formatCiiNumber(c.newValue,c.oldToken).trim();
      const readBack=testReadBack ? testReadBack(weight.value) : weight.value;
      require(weight.token===expected&&readBack===numberOf(expected), 'WEIGHTS_READBACK_MISMATCH',c.changeId,'Re-read weight does not equal the planned value.');
      return {changeId:c.changeId,fromNode:c.target.fromNode,toNode:c.target.toNode,old:numberOf(c.oldToken),new:numberOf(c.newValue),readBack,ok:true};
    });
    return {...result,report};
  });
}
