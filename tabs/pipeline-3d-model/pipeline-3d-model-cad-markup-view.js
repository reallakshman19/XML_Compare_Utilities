const STYLE_ID = 'pipeline-cad-markup-view-style';
function ensureStyle(doc) {
  if (!doc?.head || doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement('style'); style.id = STYLE_ID;
  style.textContent = `.p3d-cad-markup-panel{position:absolute;z-index:4;right:12px;top:56px;width:min(440px,42vw);max-height:210px;overflow:auto;border:1px solid #475569;border-radius:8px;background:rgba(2,6,23,.94);color:#e2e8f0;font:10px sans-serif}.p3d-cad-markup-panel h3{margin:0;padding:7px 9px;border-bottom:1px solid #334155;font-size:11px}.p3d-cad-markup-panel table{width:100%;border-collapse:collapse}.p3d-cad-markup-panel th,.p3d-cad-markup-panel td{padding:4px 6px;border-bottom:1px solid #1e293b;text-align:left;vertical-align:top}.p3d-cad-markup-panel [data-status="ORPHANED"]{font-weight:700;color:#fecaca}.p3d-cad-markup-empty{padding:8px;color:#94a3b8}`;
  doc.head.appendChild(style);
}
function cell(doc, value) {
  const element = doc.createElement('td'); element.textContent = String(value ?? ''); return element;
}
function renderRows(body, evidence) {
  const doc = body.ownerDocument; body.replaceChildren();
  if (!evidence.length) {
    const row = doc.createElement('tr'); const empty = cell(doc, 'No persistent dimensions or annotations.');
    empty.colSpan = 7; empty.className = 'p3d-cad-markup-empty';
    row.appendChild(empty); body.appendChild(row); return;
  }
  evidence.forEach((item) => {
    const row = doc.createElement('tr'); row.dataset.status = item.status;
    [item.id, item.type, item.graph, item.textValue, item.authority, item.anchors, item.status]
      .forEach((value) => row.appendChild(cell(doc, value)));
    body.appendChild(row);
  });
}
export function mountPipelineCadMarkupView({ dialog, markup }) {
  if (!dialog?.ownerDocument || !markup) return null;
  const doc = dialog.ownerDocument; ensureStyle(doc);
  const section = doc.createElement('section');
  section.className = 'p3d-cad-markup-panel'; section.dataset.p3dCadMarkupPanel = '1';
  section.setAttribute('aria-label', 'Pipeline CAD persistent drawing evidence');
  const heading = doc.createElement('h3'); heading.textContent = 'Persistent drawing evidence';
  const table = doc.createElement('table'); const head = doc.createElement('thead');
  const headRow = doc.createElement('tr');
  ['ID', 'Type', 'Graph', 'Text / value', 'Authority', 'Anchors', 'Status'].forEach((label) => {
    const th = doc.createElement('th'); th.scope = 'col'; th.textContent = label; headRow.appendChild(th);
  });
  head.appendChild(headRow); const body = doc.createElement('tbody');
  body.setAttribute('aria-live', 'polite'); table.append(head, body);
  section.append(heading, table); dialog.appendChild(section);
  const render = () => renderRows(body, markup.getEvidence());
  const unsubscribe = markup.subscribe(render); render(); let destroyed = false;
  return Object.freeze({
    element: section, render,
    destroy() {
      if (destroyed) return false; destroyed = true;
      unsubscribe(); section.remove(); return true;
    },
  });
}
export const _markupViewTest = Object.freeze({ renderRows });
