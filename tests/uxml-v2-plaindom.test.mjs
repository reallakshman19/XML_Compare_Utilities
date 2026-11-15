// UXML step 3: PlainDom (the DOM stand-in for the ported support sub-steps) and the replay-miss report.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parsePlainXml, serializePlainXml, elementsByName, childText, setChildText, textContent } from '../uxml/v2/supports/PlainDom.js';
import { readPsi116V2 } from '../uxml/v2/UxmlV2Psi116Reader.js';
import { supportTableOf } from '../uxml/v2/supports/SupportTable.js';
import { createReplayCore } from '../uxml/v2/supports/CoreReplay.js';
import { loadCalls } from '../uxml/v2/supports/CoreCallsLib.js';

const FX = fileURLToPath(new URL('../fixtures/uxml-v2-supports/', import.meta.url));
const BENCHES = ['G30', 'G30-NOJSON', 'G30-CUSTOM', 'RMS-BLOW-1', 'ACTIVE-AUDIT'];
const table = (text) => supportTableOf(readPsi116V2(text, { fileSha256: createHash('sha256').update(text).digest('hex') }));

test('every stage XML: parse -> serialize gives the same support table as the file', () => {
  let files = 0;
  for (const b of BENCHES) {
    for (const f of fs.readdirSync(path.join(FX, 'oracle', b, 'xml'))) {
      const text = fs.readFileSync(path.join(FX, 'oracle', b, 'xml', f), 'utf8');
      assert.deepEqual(table(serializePlainXml(parsePlainXml(text))), table(text), `${b}/${f}`);
      files += 1;
    }
  }
  assert.equal(files, 30);
});

test('helpers read and write like today\'s xmlText / xmlSetText', () => {
  const { root } = parsePlainXml('<M><Node><NodeNumber> 10 </NodeNumber><NodeName>A &amp; B</NodeName></Node></M>');
  const [node] = elementsByName(root, 'Node');
  assert.equal(childText(node, 'NodeNumber'), '10');
  assert.equal(childText(node, 'NodeName'), 'A & B');
  setChildText(node, 'DTXR_PS', 'PS-1');
  assert.equal(node.kids.at(-1).__el, 'DTXR_PS');
  setChildText(node, 'DTXR_PS', '');
  assert.deepEqual(node.kids.at(-1).kids, []);
  assert.equal(textContent(node), ' 10 A & B');
  assert.throws(() => parsePlainXml('<a:M/>'), { code: 'PLAIN_XML_PREFIX_UNSUPPORTED' });
});

test('a replay miss names the nearest recorded call and the first difference', () => {
  const files = [path.join(FX, 'core-calls', 'G30.core-calls.json')];
  const core = createReplayCore(files);
  const call = loadCalls(files).find((c) => c.name === 'applyXmlRestraints');
  const node = structuredClone(call.args[1]);
  node.kids.push({ __el: 'Extra', attrs: {}, kids: [] });
  assert.throws(() => core.applyXmlRestraints(call.args[0], node, call.args[2], call.args[3]), (e) => e.code === 'CORE_REPLAY_MISS'
    && e.nearest.seq === call.seq && e.nearest.firstDifference.startsWith(`args[1].kids[${node.kids.length - 1}]`));
});
