/**
 * UXML v2 review page (review.html): open a PSI116 file, make Owner edits, a node split, the
 * repair placeholder or an undo, and compare any two revisions. All work happens in the browser;
 * nothing is uploaded. State lives in one session object (UxmlV2ReviewSession.js).
 */
import {diffRevisions, groupChanges, entityLabel} from './UxmlV2Diff.js';
import {openPsi116, latest, runRepair, setValue, splitNode, undoLast, openDelta, psi116Of, messageOf} from './UxmlV2ReviewSession.js';
import {parseLiteral} from './UxmlV2Psi116Reader.js';

const $ = id => document.getElementById(id);
let session = null;

const TYPE_WORDS = Object.freeze({'set': 'changed', 'add-value': 'value added', 'remove-value': 'value removed',
  'lock': 'locked', 'unlock': 'unlocked', 'add': 'node added', 'split': 'node split', 'remove': 'removed'});
const STAGE_WORDS = Object.freeze({'read-psi116': 'read', 'test-set-value': 'edit', 'test-split-node': 'split',
  'repair': 'repair', 'undo': 'undo'});

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node[k] = v;
  node.append(...children.filter(c => c !== null && c !== undefined));
  return node;
}
const options = (select, items, selected) => {
  select.replaceChildren(...items.map(([value, text]) => el('option', {value, textContent: text})));
  if (selected !== undefined && items.some(([v]) => v === selected)) select.value = selected;
};
const say = (text, isNotice = true) => $('message').replaceChildren(text ? el('div', {className: isNotice ? 'notice' : 'muted', textContent: text}) : '');

function revisionName(step, i) {
  const r = step.doc.revision;
  return `${i}: ${STAGE_WORDS[r.stage] || r.stage} (${r.id.slice(2, 10)})`;
}

function selectedEntity() {
  const pipe = latest(session).doc.pipelines.find(p => p.uid === $('branch').value);
  if (!pipe) return null;
  return $('node').value === pipe.uid ? pipe : pipe.components.find(c => c.uid === $('node').value) || pipe;
}

function fillFields() {
  const entity = selectedEntity();
  const keys = entity ? (entity.fieldOrder || Object.keys(entity.values)).filter(k => entity.values[k]) : [];
  options($('field'), keys.map(k => [k, entity.values[k].lock ? `${k} (locked)` : k]), $('field').value);
  fillValue();
}
function fillValue() {
  const value = selectedEntity()?.values?.[$('field').value];
  $('value').value = value ? (value.text ?? String(value.v ?? '')) : '';
}
function fillNodes() {
  const pipe = latest(session).doc.pipelines.find(p => p.uid === $('branch').value);
  const items = pipe ? [[pipe.uid, '(the branch itself)'], ...pipe.components.map(c => [c.uid, 'Node ' + entityLabel(c, 'component')])] : [];
  options($('node'), items, $('node').value);
  $('split').disabled = !pipe || $('node').value === pipe.uid;
  fillFields();
}
function fillPickers() {
  const doc = latest(session).doc;
  options($('branch'), doc.pipelines.map(p => [p.uid, entityLabel(p, 'pipeline')]), $('branch').value);
  fillNodes();
  const names = session.revisions.map((s, i) => [String(i), revisionName(s, i)]);
  const last = session.revisions.length - 1;
  options($('from'), names, String(Math.max(0, last - 1)));
  options($('to'), names, String(last));
  $('undo').disabled = !latest(session).delta || doc.revision.stage === 'undo';
}

function renderModel() {
  const c = session.revisions[0].doc.readCounts;
  $('model').textContent = `${session.name}: ${c.pipelines} branches, ${c.components} nodes, ${c.restraints} restraints. ` +
    `${session.revisions.length} revision(s).`;
  $('actions').hidden = false;
  $('compare').hidden = false;
}

function changeRow(c) {
  const what = c.key || (c.kind === 'component' ? 'node' : c.kind);
  const from = c.fromLabels?.length ? ` (from node ${c.fromLabels.join(', ')})` : '';
  return el('tr', {className: 't-' + c.type},
    el('td', {textContent: TYPE_WORDS[c.type] || c.type}),
    el('td', {className: 'mono', textContent: what}),
    el('td', {textContent: c.before ?? '—'}),
    el('td', {textContent: (c.after ?? '—') + from}),
    el('td', {textContent: c.src || '—'}),
    el('td', {className: 'mono', textContent: c.rule || '—'}),
    el('td', {textContent: STAGE_WORDS[c.stage] || c.stage}),
    el('td', {textContent: c.lock ? '🔒 locked' : ''}));
}
function changeTable(list) {
  const head = el('tr', {}, ...['Change', 'Field', 'Before', 'After', 'Source', 'Rule', 'Stage', 'Lock'].map(t => el('th', {textContent: t})));
  return el('div', {className: 'scroll'}, el('table', {}, el('thead', {}, head), el('tbody', {}, ...list.map(changeRow))));
}

function renderNotes(to) {
  const items = [...to.diagnostics, ...to.refusals].map(messageOf);
  $('notes').replaceChildren(...items.map(text => el('div', {className: 'notice', textContent: text})));
}
function renderDiff() {
  const from = session.revisions[Number($('from').value)];
  const to = session.revisions[Number($('to').value)];
  const diff = diffRevisions(from.doc, to.doc);
  renderNotes(to);
  const total = diff.changes.length;
  $('counts').replaceChildren(el('span', {textContent: `${total} change${total === 1 ? '' : 's'}`}),
    ...Object.entries(diff.counts).map(([t, n]) => el('span', {className: 'muted', textContent: `${TYPE_WORDS[t] || t}: ${n}`})));
  $('diff').replaceChildren(...groupChanges(diff.changes).flatMap(group => [
    el('div', {className: 'branch', textContent: 'Branch ' + group.pipeline}),
    ...group.nodes.flatMap(n => [el('div', {className: 'node', textContent: n.node ? 'Node ' + n.node : 'Branch values'}), changeTable(n.changes)]),
  ]));
  $('dlDelta').disabled = !to.delta;
}

function refresh() {
  renderModel();
  fillPickers();
  renderDiff();
}
function act(fn) {
  try {
    session = fn(session);
    say('');
    refresh();
  } catch (error) {
    say(messageOf(error));
  }
}

function download(name, text, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], {type}));
  el('a', {href: url, download: name}).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const stem = () => session.name.replace(/\.[^.]+$/, '');
const toStep = () => session.revisions[Number($('to').value)];

function openText(text, name) {
  try {
    session = openPsi116(text, name);
    for (const id of ['branch', 'node', 'field']) $(id).replaceChildren();
    say('');
    refresh();
  } catch (error) {
    $('model').textContent = 'Could not open this file: ' + messageOf(error);
  }
}

function wire() {
  $('file').addEventListener('change', async e => { const f = e.target.files[0]; if (f) openText(await f.text(), f.name); });
  $('sample').addEventListener('click', async () => {
    const res = await fetch('../../fixtures/uxml-v2/golden-30.xml');
    openText(await res.text(), 'GOLDEN-30.xml');
  });
  $('branch').addEventListener('change', fillNodes);
  $('node').addEventListener('change', fillNodes);
  $('field').addEventListener('change', fillValue);
  $('apply').addEventListener('click', () => {
    if (!$('field').value) return say('Pick a field first.');
    return act(s => setValue(s, {uid: selectedEntity().uid, key: $('field').value,
      v: parseLiteral($('value').value), lock: $('lock').checked}));
  });
  $('split').addEventListener('click', () => act(s => splitNode(s, {uid: $('node').value})));
  $('repair').addEventListener('click', () => act(runRepair));
  $('undo').addEventListener('click', () => act(undoLast));
  $('delta').addEventListener('change', async e => {
    const f = e.target.files[0];
    if (!f) return;
    try { const delta = JSON.parse(await f.text()); act(s => openDelta(s, delta)); } catch (error) { say(messageOf(error)); }
    e.target.value = '';
  });
  $('from').addEventListener('change', renderDiff);
  $('to').addEventListener('change', renderDiff);
  $('dlPs').addEventListener('click', () => download(`${stem()}_rev${$('to').value}.xml`, psi116Of(toStep()), 'application/xml'));
  $('dlUxml').addEventListener('click', () => download(`${stem()}_rev${$('to').value}.uxml.json`, JSON.stringify(toStep().doc, null, 1)));
  $('dlDelta').addEventListener('click', () => download(`${stem()}_rev${$('to').value}.delta.json`, JSON.stringify(toStep().delta, null, 1)));
}

wire();
