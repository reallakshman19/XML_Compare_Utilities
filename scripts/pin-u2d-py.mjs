// Writes uxml/v2/transfer/u2d-py-pin.json: the Python files the in-browser transfer runs, with their SHA-256.
// Run after changing any of them: node scripts/pin-u2d-py.mjs [<3D_Converters commit of the cii-v11-v14 copy>]
import {createHash} from 'node:crypto';
import {readFileSync, readdirSync, writeFileSync} from 'node:fs';

const PIN = 'uxml/v2/transfer/u2d-py-pin.json';
const VENDOR = 'uxml/v2/vendor/cii-v11-v14';
const old = JSON.parse(readFileSync(PIN, 'utf8'));
const files = {
  'prototypes/u2d-cii-source/u2d.py': 'u2d-cii-source/u2d.py',
  'prototypes/u2d-cii-source/u2d_plan.py': 'u2d-cii-source/u2d_plan.py',
  'prototypes/u2d-cii-source/u2d_browser.py': 'u2d-cii-source/u2d_browser.py',
  'prototypes/u3b-cii-check/u3b_core.py': 'u3b-cii-check/u3b_core.py',
};
for (const f of readdirSync(VENDOR).filter(f => f.endsWith('.py')).sort()) files[`${VENDOR}/${f}`] = `cii-v11-v14/${f}`;
const sha = p => createHash('sha256').update(readFileSync(p)).digest('hex');
const pin = {...old, threeDConvertersCommit: process.argv[2] || old.threeDConvertersCommit,
  files: Object.fromEntries(Object.entries(files).map(([p, to]) => [p, {to, sha256: sha(p)}]))};
writeFileSync(PIN, JSON.stringify(pin, null, 1) + '\n');
console.log(`${Object.keys(pin.files).length} files pinned`);
