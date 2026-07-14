import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const directory = fileURLToPath(new URL('../tabs/topology-trace-validator/', import.meta.url));
const files = readdirSync(directory).filter((name) => name.endsWith('.js'));
assert(files.length >= 10);
for (const name of files) {
  const fullPath = path.join(directory, name);
  const text = readFileSync(fullPath, 'utf8');
  assert(statSync(fullPath).size > 0);
  assert(text.split(/\r?\n/).length <= 300, `${name} exceeds 300 lines`);
  assert.doesNotMatch(text, /export\s+default/, `${name} must use named exports only`);
  assert.doesNotMatch(text, /(?:from\s+|import\s*)['"]node:|require\(|process\./, `${name} must remain browser-only`);
  assert.doesNotMatch(text, /rvm-pcf-topology|stagedjson_to_inputxml|TopologyBuilder/, `${name} must not import production topology builders`);
}
const tab = readFileSync(path.join(directory, 'topology-trace-validator-tab.js'), 'utf8');
for (const label of ['Load Source JSON', 'Load Canonical Topology', 'Load Trace Ledger', 'Load Topology InputXML', 'Spatial Overlay', 'Source ↔ Canonical', 'Junctions / Boundaries', 'Issues Only', 'Show component symbols']) assert.match(tab, new RegExp(label));
for (const moduleName of ['topology-companion-loader.js', 'topology-component-validator.js', 'topology-ledger-validator.js', 'topology-projection-geometry.js', 'topology-search-panel.js', 'topology-svg-component-symbols.js', 'topology-svg-navigation.js']) assert(files.includes(moduleName));
const renderer = readFileSync(path.join(directory, 'topology-svg-renderer.js'), 'utf8');
assert.doesNotMatch(renderer, /topology-source-reader|topology-artifact-reader|DOMParser|JSON\.parse/);
const utilityTab = readFileSync(new URL('../tabs/psnm-utility-tab.js', import.meta.url), 'utf8');
assert.match(utilityTab, /installTopologyTraceValidatorTile/);
console.log('topology trace validator static architecture tests passed');
