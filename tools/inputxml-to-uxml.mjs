#!/usr/bin/env node
/** UXML-S3 strict read-only CAESAR InputXML; byte SHA incl BOM/CRLF. */
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {mapCaesarInputXmlToUxmlStrict} from '../uxml/UxmlInputXmlSchemaMapper.js';
import {validateUxmlDocument} from '../uxml/UxmlValidationGate.js';

try {
  if (process.argv.length !== 3)
    throw new Error('Usage: node tools/inputxml-to-uxml.mjs <source-input.xml>');
  const bytes = readFileSync(process.argv[2]);
  const sha = createHash('sha256').update(bytes).digest('hex');
  const xml = new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);
  const doc = mapCaesarInputXmlToUxmlStrict(xml,{fileSha256:sha});
  const report = validateUxmlDocument(doc);
  doc.validation.gate = {
    schema:report.schema,ready:report.ready,
    blockerCodes:report.blockers.map(item=>item.code),
    warningCodes:report.warnings.map(item=>item.code),
  };
  if (report.blockers.length) throw new Error(
    'UXML_VALIDATION_BLOCKED:' + doc.validation.gate.blockerCodes.join(','));
  process.stdout.write(JSON.stringify(doc,null,2)+'\n');
} catch (error) {
  process.stderr.write('UXML_S3_INPUTXML_ERROR: '+String(error?.message||error)+'\n');
  process.exitCode=1;
}
