/**
 * Review page section 4, end-to-end plan E2c step 3 (Owner 20 Nov 2026, "Yes, start step 3"): what step 10 recorded on
 * the UXML document, from a Run record's `changes` (3D_Converters xml-cii-uxml-route.js changesRecord; the per-stage
 * list is supports/ChangeList.js changeList). Plain rows and lines for the page; nothing is re-run.
 *   - one row per recorded stage (sub-step and rule): changes, nodes removed, supports added / rewritten / removed,
 *     other support values, node and branch values set;
 *   - the nodes removed, supports added and supports rewritten, one row each;
 *   - the duplicates joined, the "|" names and every lock conflict in plain words;
 *   - a notice when the list misses a recorded stage or miscounts one, or a change has no rule (never expected).
 * Records before 20 Nov 2026 have no `changes.list`: the section says so.
 */
import {unlistedStages} from './supports/ChangeList.js';

export const CHANGE_STEP_COLUMNS = ['Sub-step', 'Rule', 'Changes', 'Nodes removed', 'Supports added', 'Supports rewritten',
  'Supports removed', 'Other support values', 'Node and branch values set'];

const stepName = s => String(s.stage || '').replace(/^supports:/, '');
const fieldsText = valuesSet => Object.entries(valuesSet || {}).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(', ');

/** The Run record's change list, or null when the record has none. */
export const changeListOf = record => (record?.changes?.made && Array.isArray(record.changes.list) ? record.changes.list : null);

export const changeStepRows = record => (changeListOf(record) || []).map(s => [stepName(s), s.rule, s.ops, s.removedNodes.length,
  s.supportsAdded.length, s.supportsRewritten.length, s.supportsRemoved.length, s.supportValuesSet, fieldsText(s.valuesSet)]);

const each = (record, key, row) => (changeListOf(record) || []).flatMap(s => s[key].map(x => row(x, stepName(s))));
export const removedNodeRows = record => each(record, 'removedNodes', (x, step) => [x.branch, x.node, x.name, x.ref, step]);
export const addedSupportRows = record => each(record, 'supportsAdded', (x, step) => [x.branch, x.node, x.name, x.type, step]);
export const rewrittenSupportRows = record => each(record, 'supportsRewritten', (x, step) => [x.branch, x.node, x.name, x.was, x.now, step]);

/** One plain line per lock conflict (SupportsUnderLocks.js residualConflicts). */
export function conflictLine(c) {
  const where = `${c.branch} node ${c.node ?? '(branch)'}`, step = c.step ? ` (first wanted by ${c.step})` : '';
  if (c.key === 'Node') return `${where}: kept, because it holds a transfer lock; today's stage removes it${step}.`;
  if (c.key === 'Supports') return `${where}: kept the supports the transfer set (${c.kept}); today's stage wanted ${c.stageWanted}${step}.`;
  return `${where}: ${c.key} kept at the transfer's ${c.kept}; today's stage wanted ${c.stageWanted}${step}.`;
}

/** Plain lines: joins, "|" names, conflicts; and notices (wrong or missing list), each {text, notice}. */
export function changeLines(record) {
  const ch = record?.changes;
  if (!ch) return [];
  if (!ch.made) return [{text: `The changes were not recorded on the UXML document${ch.refusal ? ` (${ch.refusal})` : ''}: this Run used today's supports stage XML.`, notice: true}];
  const list = changeListOf(record);
  const out = [];
  if (!list) out.push({text: 'This Run record has no change list (Run records before 20 Nov 2026); the counts per sub-step are below.', notice: true});
  for (const u of list ? unlistedStages(ch.steps, list) : []) out.push({text: `Recorded stage ${u.stage}: ${u.recorded} change(s) recorded, ${u.listed} listed here. The list is incomplete.`, notice: true});
  const noRule = (list || []).reduce((n, s) => n + s.noRule, 0);
  if (noRule) out.push({text: `${noRule} change(s) name no rule.`, notice: true});
  for (const j of ch.joined || []) out.push({text: `${j.branch}: locked node ${j.from} joined into node ${j.into} (today keeps ${j.into}).`});
  const named = (ch.names || []).filter(n => n.written?.length);
  if (named.length) out.push({text: `${named.length} node(s) carry their names with "|" (the duplicates removed at their point, and earlier history) in the Enriched XML; the CII has the plain names.`});
  out.push({text: ch.conflicts?.length ? `${ch.conflicts.length} lock conflict(s):` : 'No lock conflicts.'});
  for (const c of ch.conflicts || []) out.push({text: conflictLine(c)});
  return out;
}
