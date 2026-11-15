// Writes the support table of a PSI116 file read into UXML v2 (UXML step 3).
//   node scripts/uxml-v2-supports-table.mjs <psi116.xml> <out.json>
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {readPsi116V2} from '../uxml/v2/UxmlV2Psi116Reader.js';
import {supportTableOf} from '../uxml/v2/supports/SupportTable.js';

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error('usage: node scripts/uxml-v2-supports-table.mjs <psi116.xml> <out.json>');
  process.exit(2);
}
const bytes = readFileSync(input);
const fileSha256 = createHash('sha256').update(bytes).digest('hex');
const table = supportTableOf(readPsi116V2(bytes.toString('utf8'), {fileSha256}));
writeFileSync(output, JSON.stringify(table, null, 1));
console.log(`nodes=${table.length} restraints=${table.reduce((n, r) => n + r.restraints.length, 0)}`);
