import { readFile } from 'node:fs/promises';
import { comparePsi116 } from './review.mjs';
const [cmd, original, revised, flag, changesFile, ...extra] = process.argv.slice(2);
if (cmd !== 'diff' || !original || !revised || extra.length || (flag !== undefined && (flag !== '--changes' || !changesFile))) {
  console.error('Usage: node cli.mjs diff <original.xml> <revised.xml> [--changes c.json]'); process.exitCode = 2;
} else {
  try {
    const [a, b, c] = await Promise.all([readFile(original), readFile(revised), changesFile ? readFile(changesFile, 'utf8').then(JSON.parse) : undefined]);
    console.log(JSON.stringify(await comparePsi116(a, b, c), null, 2));
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}
