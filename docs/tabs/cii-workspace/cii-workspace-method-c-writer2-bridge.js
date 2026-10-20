/**
 * I126-I01: native Writer2 -> read-only Method C A evidence bridge.
 * The host supplies original-byte SHA-bound custody; no A/B correspondence,
 * BOUND certifier, BM001 authorization or Writer2 mutation API is imported.
 */
import { buildOriginalGraphFromBytes } from './cii-workspace-method-c-original-geometry.js';
import { registerMethodC } from './cii-workspace-method-c-registration.js';
import { findMethodCCandidates } from './cii-workspace-method-c-candidates.js';
import { createMethodCASidecar } from './cii-workspace-method-c-a-sidecar.js';
import { methodCAReviewMarkup } from './cii-workspace-method-c-a-review-markup.js';
import { mountMethodCAOnlyCandidateWorkbench } from './cii-workspace-method-c-a-candidate-review.js';

const nodeId = value => /^[0-9]+$/.test(String(value || '').trim());

export function mountMethodCWriter2ABridge(container, { getCustody, cryptoRef = globalThis.crypto } = {}) {
  if (!container?.querySelector || typeof getCustody !== 'function')
    throw new Error('METHOD_C_WRITER2_NATIVE_CONTAINER_AND_CUSTODY_REQUIRED');
  const documentRef = container.ownerDocument;
  const intake = container.querySelector('[data-ciiw-panel="inputs"] .ciiw-intake');
  const compare = container.querySelector('[data-ciiw-panel="compare"] .ciiw-results');
  if (!intake || !compare) throw new Error('METHOD_C_WRITER2_REAL_PANELS_REQUIRED');
  if (container.querySelector('[data-ciiw-method-c-run]')) throw new Error('METHOD_C_WRITER2_DUPLICATE_ACTION');
  const controls = documentRef.createElement('section');
  controls.setAttribute('data-ciiw-method-c-controls','1');
  controls.innerHTML = `<button type="button" data-ciiw-method-c-run aria-expanded="false">Method C — original signed geometry (read only)</button>
    <div data-ciiw-method-c-inputs hidden>
      <p>Use originals already selected in Writer2. Select a SOURCE member explicitly. A-only geometry cannot qualify BOUND or authorize Apply.</p>
      <label>SOURCE member <select data-ciiw-method-c-member><option value="" selected>Select S1, S2 or S3…</option><option value="S1">S1</option><option value="S2">S2</option><option value="S3">S3</option></select></label>
      <label>Experimental SOURCE physical NODE <input data-ciiw-method-c-anchor-source type="text" inputmode="numeric" autocomplete="off" placeholder="e.g., 3910"></label>
      <label>Experimental TARGET physical NODE <input data-ciiw-method-c-anchor-target type="text" inputmode="numeric" autocomplete="off" placeholder="e.g., 875"></label>
      <button type="button" data-ciiw-method-c-start>Inspect Method C A geometry →</button>
      <button type="button" data-ciiw-method-c-cancel>Cancel / close</button>
    </div><p data-ciiw-method-c-message role="status" aria-live="polite">NOT_RUN</p>`;
  const review = documentRef.createElement('div');
  review.innerHTML = methodCAReviewMarkup(null);
  compare.insertBefore(review, compare.querySelector('[data-ciiw-results]'));
  intake.appendChild(controls);
  const runButton = controls.querySelector('[data-ciiw-method-c-run]');
  const inputs = controls.querySelector('[data-ciiw-method-c-inputs]');
  const select = controls.querySelector('[data-ciiw-method-c-member]');
  const srcNode = controls.querySelector('[data-ciiw-method-c-anchor-source]');
  const tgtNode = controls.querySelector('[data-ciiw-method-c-anchor-target]');
  const start = controls.querySelector('[data-ciiw-method-c-start]');
  const cancel = controls.querySelector('[data-ciiw-method-c-cancel]');
  const message = controls.querySelector('[data-ciiw-method-c-message]');
  let epoch=0, disposed=false, evidence=null;
  const candidateReview = mountMethodCAOnlyCandidateWorkbench(review, {
    isCurrent: current => !disposed && evidence === current &&
      current.sessionEpoch === epoch && Boolean(getCustody()) &&
      getCustody().sourceSetSha256 === current.sourceSetSha256 &&
      getCustody().targetOriginalSha256 === current.targetOriginalSha256 &&
      getCustody().sources?.some(s => s.sourceId === current.sourceId &&
        s.originalSha256 === current.sourceOriginalSha256),
  });
  const say = value => { message.textContent = value; };
  const invalidate = (reason = 'INVALIDATED — original custody or Method C policy changed') => {
    epoch += 1; evidence=null; candidateReview.clear(); review.innerHTML=methodCAReviewMarkup(null,reason);
    say(reason);start.disabled=false;
  };
  const close = () => {
    invalidate('Method C cancelled; prior geometric evidence invalidated.');
    inputs.hidden=true;runButton.setAttribute('aria-expanded','false');runButton.focus();
  };
  const open = () => {
    if (disposed) return;
    if (!getCustody()) { say('HOLD — inspect exact original S1/S2/S3 and TARGET first.'); return; }
    inputs.hidden=false;runButton.setAttribute('aria-expanded','true');select.focus();
  };
  const sameCustody = (before, after, source) => Boolean(after &&
    before.sourceSetSha256===after.sourceSetSha256 &&
    before.targetOriginalSha256===after.targetOriginalSha256 &&
    after.sources?.some(s=>s.sourceId===source.sourceId && s.originalSha256===source.originalSha256));
  const inspect = async () => {
    if (disposed) return;
    const state=getCustody(), id=select.value, source=state?.sources?.find(s=>s.sourceId===id);
    if (!state || !source || !/^S[123]$/.test(id) || !nodeId(srcNode.value) || !nodeId(tgtNode.value)) {
      say('HOLD — inspect originals, select a SOURCE member, then enter two original physical NODE IDs.');
      return;
    }
    const revision=++epoch, anchor={source:srcNode.value.trim(),target:tgtNode.value.trim(),role:'experimental-unverified'};
    const sourceOriginalSha256=source.originalSha256;
    evidence=null;candidateReview.clear();review.innerHTML=methodCAReviewMarkup(null);
    start.disabled=true;say(`${id}: read-only original graph and signed orientation analysis…`);
    try {
      const [sourceGraph,targetGraph]=await Promise.all([
        buildOriginalGraphFromBytes({bytes:source.bytes,member:id,
          expectedSha256:sourceOriginalSha256,cryptoRef}),
        buildOriginalGraphFromBytes({bytes:state.targetBytes,member:'T',
          expectedSha256:state.targetOriginalSha256,cryptoRef}),
      ]);
      if (disposed || revision!==epoch) return;
      const pose=registerMethodC(sourceGraph,targetGraph,[anchor],
        {orientationMode:'AUTO_GEOMETRIC_PREVIEW'});
      const tolerance={x:100,y:100,z:100};
      const candidates=pose.status==='HOLD' ? null :
        findMethodCCandidates(sourceGraph,targetGraph,pose,tolerance);
      if (disposed || revision!==epoch || !sameCustody(state,getCustody(),source)) {
        invalidate('HOLD — stale source-set/TARGET originals changed during Method C.');return;
      }
      const sidecar=createMethodCASidecar({sourceSetSha256:state.sourceSetSha256,
        sourceId:id,sessionEpoch:revision,sourceGraph,targetGraph,
        registration:pose,candidates,tolerance});
      if (disposed || revision!==epoch) return;
      evidence=sidecar;review.innerHTML=methodCAReviewMarkup(sidecar);
      candidateReview.setEvidence(sidecar);
      say(`${id}: ${pose.status}; ${sidecar.rows.length} read-only geometric observations; Method C BOUND=0, Apply=0.`);
      container.querySelector('[data-ciiw-tab="compare"]')?.click();
    } catch (error) {
      if (!disposed && revision===epoch) {
        evidence=null;candidateReview.clear();review.innerHTML=methodCAReviewMarkup(null,`HOLD: ${String(error?.message || error)}`);
        say(`HOLD — ${String(error?.message || error)}`);
      }
    } finally { if (!disposed && revision===epoch) start.disabled=false; }
  };
  const onInputChanged = () => {
    if(evidence || start.disabled)invalidate('HOLD — experimental member/anchor changed, rerun Method C.');
  };
  const onKeyDown = event => {
    if(event.key==='Escape' && !inputs.hidden && container.contains(event.target)) close();
  };
  runButton.addEventListener('click',open);
  start.addEventListener('click',inspect);
  cancel.addEventListener('click',close);
  for(const element of [select,srcNode,tgtNode])element.addEventListener('input',onInputChanged);
  documentRef.addEventListener('keydown',onKeyDown);
  return {invalidate, getEvidence(){return evidence;}, destroy(){
    if(disposed)return;disposed=true;epoch+=1;
    runButton.removeEventListener('click',open);start.removeEventListener('click',inspect);
    cancel.removeEventListener('click',close);
    for(const element of [select,srcNode,tgtNode])element.removeEventListener('input',onInputChanged);
    documentRef.removeEventListener('keydown',onKeyDown);
    candidateReview.destroy();controls.remove();review.remove();
  }};
}
