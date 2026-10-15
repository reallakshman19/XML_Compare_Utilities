import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {evaluateCiiOwnerPhase2Recall} from './cii-workspace-owner-phase2-recall.js';
// Pure benchmark qualification: uses existing full-Owner-golden readiness
// output. Without authentic original Owner text, 70% MUST NOT be computable.
const dir=fileURLToPath(new URL('../test-results/cii-method-a-qualification/',import.meta.url));
const goldenReport=JSON.parse(readFileSync(join(dir,'owner-golden-readiness.json'),'utf8'));
const result=evaluateCiiOwnerPhase2Recall({
  goldenReport,
  physicalReviewReceipts:[], // #101 currently certifies zero globally.
  expectedSourceSetSha256:'5390166aab9504880bd4514af865c914ba8a41ce2922e7d473311d62b10723a3',
  expectedTargetOriginalSha256:'abfa3ffc9281fe75d4170b2d885d554cb1f120dadedae7c7ab609548b63cc060'
});
const report={...result,source:'EXISTING_OWNER_GOLDEN_READINESS_NO_BENCHMARK_INVENTION',
  exactHead:process.env.GITHUB_SHA||null,runId:process.env.GITHUB_RUN_ID||null,
  physicalCertificatesProvided:0,reviewIndependentlyCompleted:false,
  actualF2PhysicalNodeCertificationsPreviouslyObserved:0,
  note:'No Owner expected relation labels may enter production candidate generation.'};
assert.equal(report.ownerAccepted,false);
assert.equal(report.writerAuthority,false);
assert.equal(report.mergeAuthorized,false);
if(goldenReport.status==='BLOCKED_AUTHENTIC_OWNER_GOLDEN_MISSING'){
  assert.equal(report.denominator,null);
  assert.equal(report.validatedRecallPct,null);
  assert.equal(report.status,'NOT_EVALUABLE_AUTHENTIC_FULL_OWNER_GOLDEN_MISSING');
} else {
  assert.equal(report.denominator,goldenReport.observedRowCount);
  assert.equal(report.validatedRows,0,
    'No independent global NODE certificates have been supplied; do not count BOUND rows');
}
mkdirSync(dir,{recursive:true});
writeFileSync(join(dir,'owner-phase2-validated-recall.json'),JSON.stringify(report,null,2)+'\n');
console.log('CII_OWNER_PHASE2_RECALL_GATE',JSON.stringify({
  status:report.status,denominator:report.denominator,
  validated:report.validatedRows,validatedPct:report.validatedRecallPct,
  ownerAccepted:false,writerAuthority:false
}));
