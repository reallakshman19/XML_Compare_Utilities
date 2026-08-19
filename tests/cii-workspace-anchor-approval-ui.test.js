import assert from 'assert';
import { readFile } from 'node:fs/promises';

const shell = await readFile(new URL('../tabs/cii-workspace/cii-workspace-shell.js', import.meta.url), 'utf8');

assert(shell.includes('Base Anchor suggestions'), 'Tab1 must label paired base-anchor suggestions explicitly');
assert(shell.includes('data-ciiw-accept-anchor'), 'each paired base-anchor suggestion must have an Accept action');
assert(shell.includes('Node-number offsets, OD and wall are not used.'), 'base-anchor UI must state excluded identity evidence');
assert(shell.includes('Accept all HIGH'), 'Correspondence Review must expose bulk HIGH acceptance');
assert(shell.includes('Accept all MEDIUM'), 'Correspondence Review must expose bulk MEDIUM acceptance');
assert(shell.includes('REVIEW and UNRESOLVED rows are never bulk accepted.'), 'bulk acceptance must retain fail-closed review boundary');
assert(shell.includes('<th>Approval</th><th>Source</th><th>Target</th>'), 'Engineering Delta Grid must expose Approval before delta evidence');
assert(shell.includes('Approval is inherited from the parent correspondence Decision above'), 'Delta approval must explicitly derive from correspondence review');
assert(shell.includes('Only accepted/locked correspondence can produce transfer rows.'), 'Transfer Preview must state its approval authority gate');
assert(shell.includes('<th>Approval authority</th>'), 'Transfer Preview rows must expose reviewed/locked authority');
assert(shell.includes('TRANSFER PREVIEW · ${h(plan.status)}'), 'Tab3 must retain explicit transfer-preview status banner');
assert(shell.includes('Preview only. Target mutation is not implemented. Geometry, node numbering, topology, OD and wall remain protected.'), 'Tab3 must retain read-only protected-target wording');
assert(/<button type="button" disabled data-ciiw-apply-target>Apply to target CII<\/button>/.test(shell), 'Tab3 target apply control must remain disabled');
assert(/<button type="button" disabled data-ciiw-apply>Apply to target CII<\/button>/.test(shell), 'Stage06 target apply control must remain disabled');

console.log('CII base-anchor / approval-flow UI checks passed.');
