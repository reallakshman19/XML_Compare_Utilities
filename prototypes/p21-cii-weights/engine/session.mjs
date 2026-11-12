// Browser session rules, kept pure so they can be tested without a browser.
import {require} from '../vendor/kit/core.mjs';
import {numberOf} from '../vendor/kernel/format.mjs';
import {checkWeightFields} from './approve.mjs';

export function importForReview(text,baseSha256){
  let cs;try{cs=JSON.parse(text);}catch{require(false,'WEIGHTS_JSON_INVALID','Change set','Invalid JSON.');}
  checkWeightFields(cs);
  zeroRows(cs); // reject invalid numeric tokens before the page adopts the plan
  require(cs.base.sha256.toLowerCase()===baseSha256,'KERNEL_BASE_SHA256_MISMATCH','base.sha256','Change set belongs to a different CII.');
  // R9 requires zeroConfirmed even on unapproved imported rows. Keep that
  // schema flag, but never treat it as a confirmation in this session.
  return {...cs,changes:cs.changes.map(c=>{const {by,at,...approval}=c.approval;return {...c,approval:{...approval,approved:false}};})};
}
export function zeroRows(cs){return (cs?.changes||[]).filter(c=>numberOf(c.newValue,c.changeId)===0);}
export function canApply(cs,approvedInSession){return approvedInSession===true&&!!cs&&cs.changes.length>0&&cs.changes.every(c=>c.approval.approved===true);}
