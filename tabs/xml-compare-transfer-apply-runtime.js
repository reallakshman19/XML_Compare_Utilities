export const XML_COMPARE_TRANSFER_APPLY_RUNTIME_SCHEMA = 'xml-compare-transfer-apply-runtime/v4';
const STYLE_ID = 'xml-compare-transfer-apply-runtime-style';
const clean = (value) => String(value ?? '').trim();

function injectStyle() {
  if (typeof document === 'undefined') return;
  let style = document.getElementById(STYLE_ID);
  if (!style) { style = document.createElement('style'); style.id = STYLE_ID; document.head.append(style); }
  style.textContent = '.xml-compare-transfer-apply-actions{display:flex;gap:8px;flex-wrap:wrap;padding:8px 10px;border-top:1px solid rgba(148,163,184,.12);border-bottom:1px solid rgba(148,163,184,.12)}.xml-compare-transfer-apply-actions button{border:1px solid rgba(52,211,153,.42)!important;background:rgba(6,78,59,.58)!important;color:#d1fae5!important}';
}

function selectedBlocksFromPane(pane) {
  const checkboxes = pane?.querySelectorAll?.('input[type="checkbox"][data-xml-compare-transfer-block-checkbox]');
  if (checkboxes && checkboxes.length > 0) {
    const selected = [];
    checkboxes.forEach(cb => {
      if (cb.checked) selected.push(clean(cb.dataset.xmlCompareTransferBlockCheckbox));
    });
    return selected;
  }
  const staged = pane?.querySelector?.('[data-xml-compare-selected-transfer-blocks]');
  const source = staged || pane?.querySelector?.('select[multiple]');
  if (!source) return [];
  const rows = Array.from(source.options || []).filter((option) => Boolean(staged) || option.selected);
  return rows.map((option) => clean(option.value || option.textContent)).filter(Boolean);
}

function approvedPairIdsFromPane(pane) {
  const ids = [];
  pane?.querySelectorAll?.('[data-xml-compare-transfer-pair]').forEach((input) => {
    if (input.checked && clean(input.dataset.xmlCompareTransferPair)) ids.push(clean(input.dataset.xmlCompareTransferPair));
  });
  return Object.freeze([...new Set(ids)]);
}

function stageSelectedBlocks(button) {
  const pane = button.closest('.xml-compare-scope-body');
  const available = pane?.querySelector?.('select[data-xml-compare-transfer-node-blocks],select[data-xml-compare-transfer-element-blocks],select[data-xml-compare-transfer-line-blocks]');
  const staged = pane?.querySelector?.('[data-xml-compare-selected-transfer-blocks]');
  if (!available || !staged) return;
  const existing = new Set([...staged.options].map((option) => clean(option.value)));
  for (const option of [...available.selectedOptions]) addSelectedBlock(staged, existing, option);
}

function addSelectedBlock(staged, existing, option) {
  const value = clean(option.value || option.textContent);
  if (!value || existing.has(value)) return;
  staged.add(new Option(value, value, true, true));
  existing.add(value);
}

function selectTransferPairs(button, checked) {
  const pane = button.closest('.xml-compare-scope-body');
  pane?.querySelectorAll?.('[data-xml-compare-transfer-pair]').forEach((input) => { input.checked = checked; });
}

function dispatchTransferAction(button) {
  const scope = clean(button.dataset.xmlCompareTransferScope || 'node');
  const pane = button.closest('[data-xml-compare-automap-popup]')?.querySelector(`.xml-compare-scope-body.is-${scope}-scope`);
  document.dispatchEvent(new CustomEvent('xml-compare:state-action', { detail: { type: clean(button.dataset.xmlCompareTransferStateAction), scope, selectedBlocks: selectedBlocksFromPane(pane), approvedPairIds: approvedPairIdsFromPane(pane) } }));
}

function setBlockCheckboxes(button, checked) {
  const pane = button.closest('.xml-compare-scope-body');
  pane?.querySelectorAll?.('input[type="checkbox"][data-xml-compare-transfer-block-checkbox]').forEach(cb => { cb.checked = checked; });
}

function onClick(event) {
  const stage = event.target?.closest?.('[data-xml-compare-action="stage-transfer-blocks"]');
  if (stage) { event.preventDefault(); event.stopPropagation(); stageSelectedBlocks(stage); return; }
  const selectAllBlocks = event.target?.closest?.('[data-xml-compare-action="select-all-transfer-blocks"]');
  if (selectAllBlocks) { event.preventDefault(); event.stopPropagation(); setBlockCheckboxes(selectAllBlocks, true); return; }
  const selectNoneBlocks = event.target?.closest?.('[data-xml-compare-action="select-none-transfer-blocks"]');
  if (selectNoneBlocks) { event.preventDefault(); event.stopPropagation(); setBlockCheckboxes(selectNoneBlocks, false); return; }
  const selectAll = event.target?.closest?.('[data-xml-compare-action="select-all-transfer-pairs"]');
  if (selectAll) { event.preventDefault(); event.stopPropagation(); selectTransferPairs(selectAll, true); return; }
  const selectNone = event.target?.closest?.('[data-xml-compare-action="select-none-transfer-pairs"]');
  if (selectNone) { event.preventDefault(); event.stopPropagation(); selectTransferPairs(selectNone, false); return; }
  const transfer = event.target?.closest?.('[data-xml-compare-transfer-state-action]');
  if (!transfer) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  dispatchTransferAction(transfer);
}

function install() {
  if (typeof document === 'undefined') return;
  injectStyle();
  document.addEventListener('click', onClick, { capture: true });
  document.documentElement.dataset.xmlCompareTransferApplyRuntime = XML_COMPARE_TRANSFER_APPLY_RUNTIME_SCHEMA;
}

install();
export const _test = Object.freeze({ clean, selectedBlocksFromPane, approvedPairIdsFromPane, stageSelectedBlocks, selectTransferPairs });
