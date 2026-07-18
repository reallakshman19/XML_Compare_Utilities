export const ENGINEERING_SVG_PROPERTY_INSPECTOR_VIEW_SCHEMA = 'EngineeringSvgPropertyInspectorView.v1';

function element(documentRef, tag, attributes = {}) {
  const node = documentRef.createElement(tag);
  Object.entries(attributes).forEach(([name, value]) => node.setAttribute(name, String(value)));
  return node;
}

function clearChildren(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function displayText(row) {
  const { state, value } = row.display;
  if (state === 'mixed') return 'Mixed';
  if (state === 'unavailable') return 'Unavailable for full selection';
  if (state === 'not-applicable') return 'Not applicable';
  if (value == null || value === '') return '—';
  if (row.field.type === 'boolean') return value ? 'Yes' : 'No';
  return `${value}${row.field.unit ? ` ${row.field.unit}` : ''}`;
}

function controlKind(row) {
  if (!row.field.editable || ['unavailable', 'not-applicable'].includes(row.display.state)) return 'readout';
  return row.field.type;
}

function option(documentRef, value, label, disabled = false) {
  const node = element(documentRef, 'option');
  node.value = value;
  node.textContent = label;
  node.disabled = disabled;
  return node;
}

function createControl(documentRef, row, onFieldEdit) {
  const kind = controlKind(row);
  if (kind === 'readout') return element(documentRef, 'output');
  if (kind === 'enum') {
    const select = element(documentRef, 'select');
    select.appendChild(option(documentRef, '', '— Select —', true));
    row.field.options.forEach((value) => select.appendChild(option(documentRef, value, value)));
    select.addEventListener('change', () => onFieldEdit(row.key, select.value));
    return select;
  }
  if (kind === 'boolean') {
    const checkbox = element(documentRef, 'input', { type: 'checkbox' });
    checkbox.addEventListener('change', () => onFieldEdit(row.key, checkbox.checked));
    return checkbox;
  }
  const input = element(documentRef, 'input', { type: kind === 'number' ? 'number' : 'text' });
  if (kind === 'number') {
    input.step = 'any';
    if (row.field.min != null) input.min = String(row.field.min);
    if (row.field.max != null) input.max = String(row.field.max);
  }
  input.addEventListener('input', () => {
    const value = kind === 'number' && input.value !== '' ? Number(input.value) : input.value;
    onFieldEdit(row.key, value);
  });
  return input;
}

function updateControl(documentRef, record, row) {
  const active = documentRef.activeElement === record.control;
  const state = row.display.state;
  if (record.kind === 'readout') record.control.textContent = displayText(row);
  else if (record.kind === 'boolean') {
    if (!active) record.control.checked = state === 'uniform' && row.display.value === true;
    record.control.indeterminate = state === 'mixed';
  } else if (!active) {
    record.control.value = state === 'uniform' && row.display.value != null ? String(row.display.value) : '';
    record.control.placeholder = state === 'mixed' ? 'Mixed' : '';
  }
  record.control.disabled = record.kind === 'readout' || row.valid === false && row.field.editable === false;
  record.root.setAttribute('data-engineering-svg-property-state', state);
  record.root.setAttribute('data-engineering-svg-property-dirty', row.dirty ? 'true' : 'false');
  record.root.setAttribute('data-engineering-svg-property-valid', row.valid ? 'true' : 'false');
  clearChildren(record.messages);
  row.messages.forEach((message) => {
    const item = element(documentRef, 'li');
    item.textContent = message;
    record.messages.appendChild(item);
  });
}

function createRow(documentRef, row, onFieldEdit) {
  const root = element(documentRef, 'div', { 'data-engineering-svg-property-key': row.key });
  const label = element(documentRef, 'label');
  const controlId = `engineering-svg-property-${row.key.replace(/[^a-z0-9_-]/gi, '-')}`;
  label.setAttribute('for', controlId);
  label.textContent = row.field.unit ? `${row.field.label} (${row.field.unit})` : row.field.label;
  const control = createControl(documentRef, row, onFieldEdit);
  control.id = controlId;
  control.setAttribute('data-engineering-svg-property-control', row.key);
  const messages = element(documentRef, 'ul', { 'data-engineering-svg-property-messages': row.key });
  root.append(label, control, messages);
  return { root, label, control, messages, kind: controlKind(row) };
}

export function createEngineeringSvgPropertyInspectorView(options = {}) {
  const host = options.host;
  if (!host?.ownerDocument?.createElement) throw new TypeError('Property inspector view requires a DOM host.');
  const documentRef = host.ownerDocument;
  const rowsHost = element(documentRef, 'div', { 'data-engineering-svg-property-rows': '1' });
  const heading = element(documentRef, 'h2', { 'data-engineering-svg-inspector-heading': '1' });
  const summary = element(documentRef, 'p', { 'data-engineering-svg-inspector-summary': '1' });
  const actions = element(documentRef, 'div', { 'data-engineering-svg-inspector-actions': '1' });
  const apply = element(documentRef, 'button', { type: 'button', 'data-engineering-svg-apply': '1' });
  const cancel = element(documentRef, 'button', { type: 'button', 'data-engineering-svg-cancel': '1' });
  apply.textContent = 'Apply';
  cancel.textContent = 'Cancel';
  actions.append(apply, cancel);
  host.append(heading, summary, rowsHost, actions);
  const records = new Map();
  let currentModel = null;
  let busy = false;

  const onFieldEdit = (key, value) => options.onFieldEdit?.(key, value);
  apply.addEventListener('click', () => options.onApply?.());
  cancel.addEventListener('click', () => options.onCancel?.());

  function render(model) {
    currentModel = model;
    heading.textContent = model.selectedIds.length
      ? `Properties — ${model.selectedIds.join(', ')}`
      : 'Properties — no selection';
    summary.textContent = `${model.rows.length} fields · ${model.dirtyCount} staged · ${model.invalidCount} invalid`;
    const present = new Set();
    model.rows.forEach((row) => {
      present.add(row.key);
      const expectedKind = controlKind(row);
      let record = records.get(row.key);
      if (!record || record.kind !== expectedKind) {
        record?.root.remove();
        record = createRow(documentRef, row, onFieldEdit);
        records.set(row.key, record);
      }
      updateControl(documentRef, record, row);
      rowsHost.appendChild(record.root);
    });
    records.forEach((record, key) => {
      if (!present.has(key)) {
        record.root.remove();
        records.delete(key);
      }
    });
    apply.disabled = busy || !model.applyEligible;
    cancel.disabled = busy || model.dirtyCount === 0;
    return model;
  }

  return Object.freeze({
    schema: ENGINEERING_SVG_PROPERTY_INSPECTOR_VIEW_SCHEMA,
    render,
    getModel: () => currentModel,
    getControl: (key) => records.get(key)?.control || null,
    getApplyButton: () => apply,
    getCancelButton: () => cancel,
    setBusy(value) {
      busy = value === true;
      if (currentModel) render(currentModel);
    },
    destroy() {
      records.clear();
      heading.remove();
      summary.remove();
      rowsHost.remove();
      actions.remove();
    },
  });
}
