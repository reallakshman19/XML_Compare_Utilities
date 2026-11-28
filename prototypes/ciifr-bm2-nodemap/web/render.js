export function cell(value, className = '') {
  const td = document.createElement('td'); td.textContent = value; td.className = className; return td;
}

export function stats(container, model, label) {
  const title = document.createElement('h3'); title.textContent = label;
  const info = document.createElement('p');
  info.textContent = `${model.element_count} elements · ${model.node_count} scoped nodes · ${model.auxiliary_only_nodes.length} auxiliary-only · ${model.displacement_record_count} displacement records`;
  const hash = document.createElement('div'); hash.className = 'digests'; hash.textContent = `SHA-256 ${model.cii_sha256}`;
  container.replaceChildren(title, info, hash);
}

function nodeText(number, aliases) {
  return `${number}\n${aliases.filter(Boolean).join(' / ') || '(unnamed)'}`;
}

export function candidates(container, proposals, selected, filter, onToggle) {
  const needle = filter.toLowerCase();
  const visible = proposals.filter(p => JSON.stringify([p.source_node, p.target_node, p.source_aliases, p.target_aliases]).toLowerCase().includes(needle));
  container.replaceChildren();
  visible.slice(0, 200).forEach(p => {
    const tr = document.createElement('tr'); const td = document.createElement('td');
    const check = document.createElement('input'); check.type = 'checkbox';
    check.setAttribute('aria-label', `Inspect ${p.source_node} to ${p.target_node}`);
    check.checked = selected.some(([a, b]) => a === p.source_node && b === p.target_node);
    check.addEventListener('change', () => onToggle([p.source_node, p.target_node], check.checked)); td.append(check);
    const reasons = p.reasons.join(', ') + (p.disagreement ? ' · DISAGREEMENT' : '') + (p.source_name_conflict || p.target_name_conflict ? ' · ALIAS CONFLICT' : '');
    tr.append(td, cell(nodeText(p.source_node, p.source_aliases)), cell(nodeText(p.target_node, p.target_aliases)), cell(reasons)); container.append(tr);
  });
  if (!visible.length) { const tr = document.createElement('tr'); const td = cell('No candidates for this basis/filter. Manual inspection remains available.'); td.colSpan = 4; tr.append(td); container.append(tr); }
}

export function selectedPairs(container, pairs, onRemove) {
  container.replaceChildren();
  pairs.forEach(([a, b]) => {
    const button = document.createElement('button'); button.className = 'pair'; button.textContent = `${a} → ${b} ×`;
    button.addEventListener('click', () => onRemove(a, b)); container.append(button);
  });
  if (!pairs.length) container.textContent = 'No pairs selected. Selection is for inspection only.';
}

export function catalogue(container, model, filter) {
  const needle = filter.toLowerCase();
  const nodes = model.nodes.filter(n => `${n.node} ${n.aliases.join(' ')}`.toLowerCase().includes(needle));
  const caption = document.createElement('p'); caption.className = 'fine'; caption.textContent = `Showing ${Math.min(nodes.length, 100)} of ${nodes.length} matching nodes. Filter to narrow.`;
  const table = document.createElement('table'); const body = document.createElement('tbody');
  nodes.slice(0, 100).forEach(n => {
    const tr = document.createElement('tr');
    tr.append(cell(nodeText(n.node, n.aliases)), cell(n.auxiliary_only ? 'Displacement-only' : 'Endpoint'), cell(n.name_conflict ? 'ALIAS CONFLICT' : `${n.occurrences.length} occurrences`)); body.append(tr);
  });
  table.append(body); container.replaceChildren(caption, table);
}

export function preview(container, result) {
  container.replaceChildren();
  result.decisions.forEach(d => {
    const tr = document.createElement('tr');
    const status = d.status === 'NO_OP' ? 'No change' : d.status === 'BLOCKED' ? d.reasons.join(', ') : 'Proposed change · unapproved';
    tr.append(cell(`${d.source_node} → ${d.target_node}\n${d.dof}`), cell(d.source_value ?? 'Unavailable'), cell(d.target_before ?? 'Unavailable'), cell(`${d.proposed_value ?? '—'}\n${status}`, d.status === 'BLOCKED' ? 'blocked' : ''));
    container.append(tr);
  });
}
