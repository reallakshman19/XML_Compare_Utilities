// Browser wrapper only: the engine is shared with the command line.
import { proposeFromReference } from './engine/propose.mjs';
const byId = id => document.getElementById(id);
const form = byId('form'), button = byId('run'), download = byId('export'), table = byId('rows'), summary = byId('summary'), json = byId('json');
let output = null;
let revision = 0;
function clear() { output = null; download.disabled = true; table.replaceChildren(); json.value = ''; }
form.addEventListener('change', () => { revision++; clear(); summary.textContent = 'Inputs changed. Review again.'; });
form.addEventListener('submit', async event => {
  event.preventDefault(); clear(); const current = ++revision; button.disabled = true;
  summary.textContent = 'Reading inputs…';
  try {
    const a = byId('reference').files[0], b = byId('target').files[0], m = byId('map').files[0];
    const [ab, bb, mt] = await Promise.all([a.arrayBuffer(),b.arrayBuffer(),m.text()]);
    const r = await proposeFromReference(new Uint8Array(ab), new Uint8Array(bb), JSON.parse(mt));
    if (current !== revision) return;
    if (!r.ok) { summary.textContent = r.refusals.map(x=>`${x.code}: ${x.where} ${x.detail}`).join('\n'); return; }
    const frag = document.createDocumentFragment();
    for (const row of r.rows) {
      const tr = document.createElement('tr');
      const values = [row.pairId,row.fromNode == null ? '—' : `${row.fromNode} → ${row.toNode}`,row.targetWeight,row.referenceWeight,
        row.differencePct == null ? '—' : row.differencePct.toFixed(2),row.reason];
      for (const value of values) { const td = document.createElement('td'); td.textContent = value ?? '—'; tr.append(td); }
      frag.append(tr);
    }
    table.append(frag);
    output = JSON.stringify(r.changeset,null,2)+'\n'; json.value = output; download.disabled = false;
    summary.textContent = `${r.changeset.changes.length} proposals · ${r.unchanged.length} unchanged · ${r.notComparable.length} not comparable · ${r.review.length} review rows`;
  } catch (e) { if (current === revision) summary.textContent = `Cannot review: ${e.message}`; }
  finally { button.disabled = false; }
});
download.addEventListener('click', () => {
  if (output === null) return;
  const url = URL.createObjectURL(new Blob([output], {type:'application/json'}));
  const a = document.createElement('a'); a.href = url; a.download = 'weight-proposals.json'; a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
});
