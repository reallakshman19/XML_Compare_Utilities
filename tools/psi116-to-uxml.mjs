#!/usr/bin/env node
/**
 * UXML-S1 CLI. stdout contains ONLY UXML JSON. No writer, no reconstruction.
 * Source SHA-256 is over original file bytes, not decoded/re-encoded text.
 * Usage: node tools/psi116-to-uxml.mjs <psi116.xml>
 */
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {mapPsi116ToUxml} from '../uxml/UxmlPsi116SchemaMapper.js';

function main(args) {
  if (args.length !== 1) throw new Error('Usage: node tools/psi116-to-uxml.mjs <psi116.xml>');
  const bytes = readFileSync(args[0]);
  const fileSha256 = createHash('sha256').update(bytes).digest('hex');
  const xmlText = new TextDecoder('utf-8', {fatal: true}).decode(bytes);
  const doc = mapPsi116ToUxml(xmlText, {fileSha256});
  if (doc.validation.blockerCodes.length) {
    throw new Error('UXML_VALIDATION_BLOCKED:' + doc.validation.blockerCodes.join(','));
  }
  process.stdout.write(JSON.stringify(doc, null, 2) + '\n');
}

try {
  main(process.argv.slice(2));
} catch (error) {
  process.stderr.write('UXML_PSI116_CLI_ERROR: ' + String(error?.message || error) + '\n');
  process.exitCode = 1;
}
