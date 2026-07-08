import assert from 'node:assert/strict';

import { parseTableSource } from '../xml-compare/table-categorizer/table-categorized-xml-source-parser.js';
import { applySourceTransformRules } from '../xml-compare/table-categorizer/table-categorized-xml-source-transforms.js';
import {
  columnContractRuntimePatchFromInput,
  confirmColumnContractRuntime,
  createColumnContractRuntimeState,
  derivedContractRuntimePatchFromInput,
  resetColumnContractRuntime,
  updateColumnContractRuntimeDerivedRule,
  updateColumnContractRuntimeField,
} from '../xml-compare/table-categorizer/table-categorized-column-contract-runtime-adapter.js';

const source = applySourceTransformRules(
  parseTableSource(['PS NO	Rating	Length	Remarks', 'PS-100.1	CL150	1200mm	', 'PS-100.1	CL300	bad	check'].join('\n'), { sourceId: 'S1', delimiterMode: 'tab' }),
  [{ ruleId: 'trim-ps', newColumn: 'PS_NO_Trimmed', sourceColumn: 'PS NO', operation: 'take-before', find: '.' }],
);

let runtime = createColumnContractRuntimeState({ source });
assert.equal(runtime.schema, 'ColumnContractRuntimeAdapter.v1');
assert.equal(runtime.sourceId, 'S1');
assert.equal(runtime.columnsConfirmed, false);
assert.ok(runtime.contract.columns.length >= 4);
assert.ok(runtime.selectedColumnId, 'first detected column is selected by default');
assert.equal(runtime.confirmedFieldCatalog, null);

const psColumnId = runtime.contract.columns.find((column) => column.originalHeader === 'PS NO').columnId;
runtime = updateColumnContractRuntimeField(runtime, source, psColumnId, { fieldName: 'psNo', label: 'PS No', role: 'join-key', duplicatePolicy: 'warn' });
assert.equal(runtime.contract.columns.find((column) => column.columnId === psColumnId).fieldName, 'psNo');
assert.equal(runtime.selectedColumnId, psColumnId);
assert.equal(runtime.columnsConfirmed, false, 'editing clears confirmation');

runtime = confirmColumnContractRuntime(runtime, source);
assert.equal(runtime.columnsConfirmed, true, 'warnings do not block confirmation');
assert.ok(runtime.confirmedFieldCatalog.fields.some((field) => field.fieldId === 'S1.psNo'));

const ratingColumnId = runtime.contract.columns.find((column) => column.originalHeader === 'Rating').columnId;
runtime = updateColumnContractRuntimeField(runtime, source, ratingColumnId, { fieldName: 'psNo' });
assert.equal(runtime.columnsConfirmed, false, 'duplicate edit clears confirmation');
runtime = confirmColumnContractRuntime(runtime, source);
assert.equal(runtime.columnsConfirmed, false, 'blockers prevent confirmation');
assert.ok(runtime.diagnostics.some((item) => item.code === 'column_field_name_duplicate'));
assert.equal(runtime.confirmedFieldCatalog, null);

runtime = resetColumnContractRuntime(source);
assert.equal(runtime.columnsConfirmed, false);
assert.ok(runtime.contract.derivedColumns.some((rule) => rule.ruleId === 'trim-ps'));
runtime = updateColumnContractRuntimeDerivedRule(runtime, source, 'trim-ps', { fieldName: 'psTrimmed' });
assert.equal(runtime.contract.derivedColumns.find((rule) => rule.ruleId === 'trim-ps').fieldName, 'psTrimmed');

assert.deepEqual(columnContractRuntimePatchFromInput({ type: 'text', value: 'newField', dataset: { columnContractField: 'fieldName', columnId: psColumnId } }), { columnId: psColumnId, patch: { fieldName: 'newField' } });
assert.deepEqual(columnContractRuntimePatchFromInput({ type: 'checkbox', checked: false, dataset: { columnContractField: 'enabled', columnId: psColumnId } }), { columnId: psColumnId, patch: { enabled: false } });
assert.deepEqual(derivedContractRuntimePatchFromInput({ type: 'text', value: 'Missing', dataset: { derivedContractField: 'sourceColumn', derivedRuleId: 'trim-ps' } }), { ruleId: 'trim-ps', patch: { sourceColumn: 'Missing' } });

console.log('table-categorized-column-contract-runtime-adapter.test.js passed');
