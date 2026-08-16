import assert from 'assert';
import fs from 'fs';
import { webcrypto } from 'crypto';
import { intakeCiiWorkspaceDocument } from '../tabs/cii-workspace/cii-workspace-intake.js';

const text = fs.readFileSync(new URL('../output.cii', import.meta.url), 'utf8');
const document = await intakeCiiWorkspaceDocument(text, 'output.cii', { side: 'SOURCE', cryptoRef: webcrypto });
assert.strictEqual(document.schema, 'CIIWorkspaceDocument.v1');
assert.strictEqual(document.format, 'NEUTRAL');
assert(document.summary.elementCount > 0);
assert(/^[a-f0-9]{64}$/.test(document.contentSha256));
assert.strictEqual(document.parserAuthority, 'parser/caesar-parser.js');
assert(document.parserAlias.endsWith('.accdb'));
console.log('CII Workspace neutral intake checks passed.');
