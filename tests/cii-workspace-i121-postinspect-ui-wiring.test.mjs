import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const source=readFileSync(fileURLToPath(new URL('../docs/tabs/cii-workspace/cii-workspace-multisource-writer2-ui.js',import.meta.url)),'utf8');
function block(begin,end) {
  const at=source.indexOf(begin),until=source.indexOf(end,at+begin.length);
  assert.ok(at>=0 && until>at,'missing committed UI handler '+begin);
  return source.slice(at,until);
}
const functions=[
  ['const analyzeMultiSource = async','const applyMultiSourceReview = async','preview = nextPreview'],
  ['const applyMultiSourceReview = async','const bindExpectedScope = async','preview = nextPreview'],
  ['const bindExpectedScope = async','const applyScoped = async','scopedPreview = bindCiiTransferScopeToPreview'],
  ['const applyScoped = async','function bindTransferActions()','downloadApplied(container.ownerDocument, applied)'],
];

test('all four actual UI handlers guard post-await state or export',()=>{
  for(const [begin,end,effect] of functions) {
    const s=block(begin,end),awaitIndex=s.indexOf(' = await ');
    const guard=s.indexOf('if (!currentOperation(stamp)');
    const effectIndex=s.indexOf(effect);
    assert.match(s,/asyncRevision\.begin\(\)/,begin+' must obtain operation generation');
    assert.ok(awaitIndex>=0 && guard>awaitIndex && effectIndex>guard,
      begin+' must reject superseded result before '+effect);
    assert.match(s,/catch \(error\) \{ if \(currentOperation\(stamp\)\)/,
      begin+' late rejected promise must not replace current status');
  }
});

test('real input, anchor/review changes and dispose revoke the generation',()=>{
  for(const [begin,end] of [
    ['const refreshAnchorEvidence = () => {','const renderTransfer = () => {'],
    ['const markReviewDirty = (message) => {','const resetMulti = () => {'],
    ['const resetMulti = () => {','function bindAnchorActions()']
  ]) assert.match(block(begin,end),/asyncRevision\.invalidate\(\)/,begin);
  assert.match(block('destroy() {','sourceInput.removeEventListener'),/asyncRevision\.dispose\(\)/);
});

test('existing derived preview and Writer2 scope are cleared on base change and reset',()=>{
  const anchor=block('const refreshAnchorEvidence = () => {','const renderTransfer = () => {');
  assert.match(anchor,/preview = null; scopedPreview = null/);
  assert.match(anchor,/clearDerivedDisplay\(\)/);
  const reset=block('const resetMulti = () => {','function bindAnchorActions()');
  assert.match(reset,/clearDerivedDisplay\(\)/);
});

test('download requires current scope and exact original TARGET byte identity',()=>{
  const s=block('const applyScoped = async','function bindTransferActions()');
  assert.match(s,/scopedPreview !== sourceScope/);
  assert.match(s,/cachedTargetBytes !== sourceTargetBytes/);
  assert.ok(s.indexOf('cachedTargetBytes !== sourceTargetBytes')<s.indexOf('downloadApplied('));
});
