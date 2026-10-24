// Render the actual parsed XML hierarchy with text nodes and lazy child batches.
function nodeLabel(node) {
  const identity = node.getAttribute('name') || node.getAttribute('id') || node.getAttribute('key');
  const value = node.getAttribute('value');
  return `${node.tagName}${identity ? ` · ${identity}` : ''}${value !== null ? ` = ${value}` : ''}${node.children.length ? `  [${node.children.length}]` : ''}`;
}

function createNode(node) {
  const details = document.createElement('details');
  const summary = document.createElement('summary');
  summary.textContent = nodeLabel(node);
  details.append(summary);
  let loaded = false;
  details.addEventListener('toggle', () => {
    if (!details.open || loaded) return;
    loaded = true;
    const attrs = document.createElement('div');
    attrs.className = 'attrs';
    attrs.textContent = Array.from(node.attributes).map(a => `${a.name}: ${a.value}`).join('\n');
    details.append(attrs);
    appendChildren(details, Array.from(node.children), 0);
  });
  return details;
}

function appendChildren(parent, children, offset) {
  const end = Math.min(offset + 100, children.length);
  for (let index = offset; index < end; index += 1) parent.append(createNode(children[index]));
  if (end >= children.length) return;
  const more = document.createElement('button');
  more.className = 'quiet';
  more.textContent = `Load next ${Math.min(100, children.length - end)} of ${children.length - end} remaining`;
  more.addEventListener('click', () => { more.remove(); appendChildren(parent, children, end); });
  parent.append(more);
}

export function showHierarchy(container, bytes) {
  const xml = new DOMParser().parseFromString(new TextDecoder().decode(bytes), 'application/xml');
  if (xml.querySelector('parsererror')) throw new Error('Browser could not parse validated XML');
  container.replaceChildren(createNode(xml.documentElement));
  container.firstElementChild.open = true;
}

export function findLoaded(container, query) {
  const needle = query.trim().toLowerCase();
  container.querySelectorAll('summary').forEach(summary => {
    const text = summary.textContent;
    const at = needle ? text.toLowerCase().indexOf(needle) : -1;
    summary.replaceChildren();
    if (at < 0) { summary.textContent = text; return; }
    const mark = document.createElement('mark');
    mark.textContent = text.slice(at, at + needle.length);
    summary.append(text.slice(0, at), mark, text.slice(at + needle.length));
  });
}
