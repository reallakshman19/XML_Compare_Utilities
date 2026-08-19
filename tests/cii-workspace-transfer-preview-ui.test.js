import assert from 'assert';
import { readFile } from 'node:fs/promises';

const shell = await readFile(new URL('../tabs/cii-workspace/cii-workspace-shell.js', import.meta.url), 'utf8');

assert(shell.includes('<th>Action</th><th>Family</th><th>Property</th>'), 'Tab3 must expose transfer action + family + property');
assert(shell.includes('COPY ${h(byAction.COPY || 0)}'), 'Tab3 must expose COPY count');
assert(shell.includes('CREATE ${h(byAction.CREATE || 0)}'), 'Tab3 must expose CREATE count');
assert(shell.includes('DELETE ${h(byAction.DELETE || 0)}'), 'Tab3 must expose DELETE count');
assert(shell.includes('KEEP ${h(byAction.KEEP || 0)}'), 'Tab3 must expose KEEP count');
assert(shell.includes('Geometry, node numbering, topology, OD and wall remain protected.'), 'Tab3 must state protected target model-defining properties');
assert(/<button type="button" disabled data-ciiw-apply-target>Apply to target CII<\/button>/.test(shell), 'new Tab3 apply control must remain disabled');
assert(/<button type="button" disabled data-ciiw-apply>Apply to target CII<\/button>/.test(shell), 'legacy Stage06 apply control must remain disabled');

console.log('CII Transfer Preview Tab3 action/protection UI checks passed.');
