import { normalizeValidationBuilderState } from './XmlCompareManualValidationBuilderModel.js';

export const XML_COMPARE_MANUAL_VALIDATION_BUILDER_PANEL_SCHEMA = 'xml-compare-manual-validation-builder-panel/v1';

const esc = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
const clean = (value) => String(value ?? '').trim();
const labelOf = (record = {}) => clean(record.displayName || record.nodeNumber || record.elementKey || record.lineNo || record.uid || '-');

function option(value, selected) { return `<option value="${esc(value)}" ${value === selected ? 'selected' : ''}>${esc(value)}</option>`; }
function fieldPills(fields = []) { return fields.length ? fields.map((field) => `<span class="xml-compare-compare-field-pill">${esc(field)}</span>`).join('') : '<small>No compare fields selected.</small>'; }
function typeSelect(builder) { return `<label>Field type<select data-xml-compare-validation-builder-field-type>${option('text', builder.fieldType)}${option('numeric', builder.fieldType)}</select></label>`; }
function textOptions() { return ['exact-normalized', 'contains', 'starts-with', 'ends-with', 'regex', 'regex-position', 'token-set', 'engineering-dictionary']; }
function directionOptions() { return ['either', 'target-contains-source', 'source-contains-target', 'either-contains', 'target-starts-source', 'source-starts-target', 'either-starts', 'target-ends-source', 'source-ends-target', 'either-ends']; }
function textControls(validation = {}, fields = []) {
  const field = fields[0] || '', rule = validation.textRules?.[field] || {};
  return `<div class="xml-compare-validation-builder-options"><label>Text mode<select data-xml-compare-validation-text-mode data-validation-field="${esc(field)}">${textOptions().map((mode) => option(mode, rule.mode || 'exact-normalized')).join('')}</select></label><label>Pattern<input data-xml-compare-validation-text-pattern data-validation-field="${esc(field)}" value="${esc(rule.pattern || '')}"></label><label>Group spec<input data-xml-compare-validation-text-group-spec data-validation-field="${esc(field)}" value="${esc(rule.groupSpec || '')}"></label><label>Direction<select data-xml-compare-validation-text-direction data-validation-field="${esc(field)}">${directionOptions().map((mode) => option(mode, rule.direction || 'either-contains')).join('')}</select></label><label>Case-sensitive<input type="checkbox" data-xml-compare-validation-text-case-sensitive data-validation-field="${esc(field)}" ${rule.caseSensitive ? 'checked' : ''}></label></div>`;
}
function numericControls(builder) {
  const numeric = builder.numeric;
  return `<div class="xml-compare-validation-builder-options"><label>Regex position for numeric extraction<input type="number" min="1" step="1" value="${esc(numeric.regexPosition)}" data-xml-compare-validation-numeric-regex-position></label><label>Round off<input type="number" min="0" max="9" step="1" value="${esc(numeric.roundOff)}" data-xml-compare-validation-numeric-round-off></label><label>Auto anchor selected nodes<input type="checkbox" data-xml-compare-validation-auto-anchor ${numeric.autoAnchorSelectedNodes ? 'checked' : ''}></label></div>`;
}
function candidateRow(row = {}) {
  const target = row.targetVariant === 'transformed' ? `transformed ${row.targetField}` : row.targetField;
  const delta = row.delta == null ? '-' : row.delta;
  return `<tr><td><input type="checkbox" data-xml-compare-validation-candidate-toggle="${esc(row.id)}" ${row.selected ? 'checked' : ''}></td><td>${esc(row.sourceField)}</td><td>${esc(target)}</td><td>${esc(delta)}</td><td>${esc(row.rank)}</td><td>${esc(row.reason)}</td></tr>`;
}
function candidateTable(candidateSet = null) {
  const rows = candidateSet?.candidates || [];
  if (!rows.length) return '<p>No validation candidates yet. Select records/fields, then Compare / Validate Selection.</p>';
  return `<table class="xml-compare-topology-table"><thead><tr><th>Select</th><th>Source field</th><th>Target field</th><th>Delta</th><th>Rank</th><th>Reason</th></tr></thead><tbody>${rows.slice(0, 24).map(candidateRow).join('')}</tbody></table>`;
}
function selectedBasis(candidateSet = null) {
  const rows = (candidateSet?.candidates || []).filter((row) => row.selected);
  if (!rows.length) return '<small>No validation basis selected.</small>';
  return `<ul>${rows.map((row) => `<li><b>${esc(row.sourceField)}</b> → <b>${esc(row.targetVariant === 'transformed' ? `transformed ${row.targetField}` : row.targetField)}</b>, Δ ${esc(row.delta ?? '-')}</li>`).join('')}</ul>`;
}
export function renderXmlCompareManualValidationBuilderHtml({ builder = null, compareFields = [], selectedRecords = {}, validation = {} } = {}) {
  const state = normalizeValidationBuilderState(builder || {});
  const options = state.fieldType === 'numeric' ? numericControls(state) : textControls(validation, compareFields);
  return `<section class="xml-compare-manual-validation-builder" data-xml-compare-manual-validation-builder><header><b>Compare / Validate Selection</b><span>${esc(state.fieldType)}</span></header><div class="xml-compare-validation-summary"><span><b>Source selection</b><br>${esc(labelOf(selectedRecords.source))}</span><span><b>Target selection</b><br>${esc(labelOf(selectedRecords.target))}</span></div>${typeSelect(state)}<div class="xml-compare-validation-builder-fields"><b>Selected Source fields</b>${fieldPills(compareFields)}<b>Selected Target fields</b>${fieldPills(compareFields)}</div>${options}<button type="button" data-xml-compare-action="compare-validate-selection">Compare / Validate Selection</button><h4>Validation candidates</h4>${candidateTable(state.candidateSet)}<h4>Selected Validation Basis</h4>${selectedBasis(state.candidateSet)}</section>`;
}
export const _test = Object.freeze({ esc, clean, labelOf, option, fieldPills, typeSelect, textOptions, directionOptions, textControls, numericControls, candidateRow, candidateTable, selectedBasis });
