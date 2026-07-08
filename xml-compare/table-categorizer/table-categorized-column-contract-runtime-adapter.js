import {
  createColumnContractFromSource,
  createConfirmedFieldCatalog,
  confirmColumnContract,
  updateColumnContractField,
  updateColumnContractDerivedRule,
  validateColumnContract,
} from './table-categorized-column-contract.js';

export const TABLE_CATEGORIZED_COLUMN_CONTRACT_RUNTIME_SCHEMA = 'ColumnContractRuntimeAdapter.v1';

const freeze = (value) => Object.freeze(value);
const clean = (value) => String(value ?? '').trim();

export function createColumnContractRuntimeState({ source = {}, contract = null, selectedColumnId = '', columnsConfirmed = false } = {}) {
  const safeContract = contract || createColumnContractFromSource(source);
  const selected = selectedColumnForContract(safeContract, selectedColumnId);
  const diagnostics = validateColumnContract(safeContract, source);
  const hasBlocker = diagnostics.some((item) => item.severity === 'BLOCKER');
  return freeze({
    schema: TABLE_CATEGORIZED_COLUMN_CONTRACT_RUNTIME_SCHEMA,
    sourceId: source.sourceId || safeContract.sourceId || 'S1',
    contract: freeze({ ...safeContract, diagnostics }),
    selectedColumnId: selected?.columnId || '',
    columnsConfirmed: Boolean(columnsConfirmed && !hasBlocker),
    confirmedFieldCatalog: columnsConfirmed && !hasBlocker ? createConfirmedFieldCatalog(source, safeContract) : null,
    diagnostics,
  });
}

export function selectColumnContractRuntimeColumn(runtimeState = {}, columnId = '') {
  return createColumnContractRuntimeState({
    source: runtimeState.source || {},
    contract: runtimeState.contract,
    selectedColumnId: columnId,
    columnsConfirmed: runtimeState.columnsConfirmed,
  });
}

export function updateColumnContractRuntimeField(runtimeState = {}, source = {}, columnId = '', patch = {}) {
  const contract = updateColumnContractField(runtimeState.contract || createColumnContractFromSource(source), columnId, patch);
  return createColumnContractRuntimeState({ source, contract, selectedColumnId: columnId, columnsConfirmed: false });
}

export function updateColumnContractRuntimeDerivedRule(runtimeState = {}, source = {}, ruleId = '', patch = {}) {
  const contract = updateColumnContractDerivedRule(runtimeState.contract || createColumnContractFromSource(source), ruleId, patch);
  return createColumnContractRuntimeState({ source, contract, selectedColumnId: runtimeState.selectedColumnId, columnsConfirmed: false });
}

export function confirmColumnContractRuntime(runtimeState = {}, source = {}) {
  const contract = confirmColumnContract(runtimeState.contract || createColumnContractFromSource(source), source);
  return createColumnContractRuntimeState({
    source,
    contract,
    selectedColumnId: runtimeState.selectedColumnId,
    columnsConfirmed: contract.confirmed,
  });
}

export function resetColumnContractRuntime(source = {}) {
  return createColumnContractRuntimeState({ source, contract: createColumnContractFromSource(source), selectedColumnId: '', columnsConfirmed: false });
}

export function columnContractRuntimePatchFromInput(input = {}) {
  const field = clean(input.dataset?.columnContractField);
  const columnId = clean(input.dataset?.columnId);
  const value = input.type === 'checkbox' ? Boolean(input.checked) : input.value;
  return freeze({ columnId, patch: field ? freeze({ [field]: value }) : freeze({}) });
}

export function derivedContractRuntimePatchFromInput(input = {}) {
  const field = clean(input.dataset?.derivedContractField);
  const ruleId = clean(input.dataset?.derivedRuleId);
  const value = input.type === 'checkbox' ? Boolean(input.checked) : input.value;
  return freeze({ ruleId, patch: field ? freeze({ [field]: value }) : freeze({}) });
}

export function selectedColumnForContract(contract = {}, selectedColumnId = '') {
  const columns = contract.columns || [];
  return columns.find((column) => column.columnId === selectedColumnId) || columns[0] || null;
}
