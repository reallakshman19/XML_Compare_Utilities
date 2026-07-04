import assert from 'node:assert/strict';

import { applyXmlCompareCanvasAction, createXmlCompareCanvasState } from '../xml-compare/XmlCompareCanvasStateController.js';
import { createValidationCandidateSet } from '../xml-compare/XmlCompareManualValidationBuilderModel.js';
import { renderXmlCompareManualValidationBuilderHtml } from '../xml-compare/XmlCompareManualValidationBuilderPanel.js';

const source = { uid: 'SRC-N10', displayName: 'FROM 10', globalX: '100.0', globalY: '200.0', globalZ: '300.0', tag: 'PS-100-A' };
const target = { uid: 'TGT-N1000', displayName: 'FROM 1000', globalX: '90.0', globalY: '190.0', globalZ: '310.0', tag: 'ps-100-a' };
const fields = ['globalX', 'globalY', 'globalZ'];

let state = createXmlCompareCanvasState({ selectedRecords: { source, target }, compareFields: fields });
state = applyXmlCompareCanvasAction(state, { type: 'set-validation-builder-field-type', fieldType: 'numeric' });
state = applyXmlCompareCanvasAction(state, { type: 'set-validation-auto-anchor', autoAnchorSelectedNodes: true });
state = applyXmlCompareCanvasAction(state, { type: 'set-validation-numeric-round-off', roundOff: 2 });
state = applyXmlCompareCanvasAction(state, { type: 'compare-validate-selection' });

assert.equal(state.validationBuilder.candidateSet.schema, 'validation-candidate-set/v1');
assert.equal(state.validationBuilder.candidateSet.fieldType, 'numeric');
assert.equal(state.validationBuilder.candidateSet.transformPolicy.autoAnchorSelectedNodes, true);
assert.ok(state.validationBuilder.candidateSet.candidates.some((row) => row.targetVariant === 'transformed'));
assert.ok(state.validationBuilder.candidateSet.selectedCandidateIds.length >= 3);
assert.equal(state.approvedMatchSet, null, 'validation candidates do not auto-approve links');

const first = state.validationBuilder.candidateSet.selectedCandidateIds[0];
state = applyXmlCompareCanvasAction(state, { type: 'toggle-validation-candidate', candidateId: first, selected: false });
assert.equal(state.validationBuilder.selectedCandidateIds.includes(first), false);

const numericHtml = renderXmlCompareManualValidationBuilderHtml({ builder: state.validationBuilder, compareFields: fields, selectedRecords: { source, target }, validation: state.validation });
assert.ok(numericHtml.includes('Compare / Validate Selection'));
assert.ok(numericHtml.includes('Regex position for numeric extraction'));
assert.ok(numericHtml.includes('Auto anchor selected nodes'));
assert.ok(numericHtml.includes('Selected Validation Basis'));
assert.ok(numericHtml.includes('transformed'));

let textState = createXmlCompareCanvasState({ selectedRecords: { source, target }, compareFields: ['tag'] });
textState = applyXmlCompareCanvasAction(textState, { type: 'set-validation-text-mode', field: 'tag', mode: 'exact-normalized' });
textState = applyXmlCompareCanvasAction(textState, { type: 'compare-validate-selection' });
assert.equal(textState.validationBuilder.candidateSet.fieldType, 'text');
assert.equal(textState.validationBuilder.candidateSet.summary.selectedCount, 1);
const textHtml = renderXmlCompareManualValidationBuilderHtml({ builder: textState.validationBuilder, compareFields: ['tag'], selectedRecords: { source, target }, validation: textState.validation });
assert.ok(textHtml.includes('Text mode'));
assert.ok(textHtml.includes('Pattern'));
assert.ok(textHtml.includes('Group spec'));
assert.ok(textHtml.includes('Direction'));
assert.ok(textHtml.includes('Case-sensitive'));

const blocked = createValidationCandidateSet({ sourceRecord: null, targetRecord: target, compareFields: fields });
assert.equal(blocked.summary.blockerCount > 0, true);
console.log('XML Compare manual validation builder tests passed');
