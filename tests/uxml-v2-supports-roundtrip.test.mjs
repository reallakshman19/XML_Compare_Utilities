// Supports from CAESAR II, step 5 (Owner 18 Nov 2026): the round trip. Section 5's final XML for the EF-05 four-edit
// CII, run through step 10's writer again, gives a CII whose supports equal the edited CII's, apart from the one support
// the transfer refused (node 99999, a node the XML does not have). Needs U2D_PYODIDE (Pyodide 0.27.2) and U3B_3DC
// (a 3D_Converters checkout, for step 10's writer); skipped without them.
// Support locks in step 10, step 4 (Owner 18 Nov 2026): the same round trip through the FULL step 10 workflow (the
// supports step included), run in headless Chromium on U3B_3DC's files. Also needs Playwright (U3B_PLAYWRIGHT or the
// global 'playwright' module); skipped without it.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {extname, join, resolve, sep} from 'node:path';
import test from 'node:test';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {runStage, sha256Hex} from '../uxml/v2/UxmlV2Kernel.js';
import {readPsi116V2} from '../uxml/v2/UxmlV2Psi116Reader.js';
import {runSupportsStage} from '../uxml/v2/supports/SupportsStage.js';
import {transferStage} from '../uxml/v2/transfer/TransferStage.js';
import {runEngineeringUnderLocks} from '../uxml/v2/transfer/LockedEngineering.js';
import {transferCiiIntoXml} from '../uxml/v2/transfer/U2dInBrowser.js';

const ROOT = new URL('../', import.meta.url);
const EF05 = new URL('fixtures/uxml-v2-transfer/EF05/', ROOT);
const SCRIPT = fileURLToPath(new URL('prototypes/u2d-cii-source/supports_roundtrip.py', ROOT));
const CONVERTER = process.env.U3B_3DC && join(process.env.U3B_3DC, 'converters', 'scripts');
const skip = (!process.env.U2D_PYODIDE && 'U2D_PYODIDE not set') || (!CONVERTER && 'U3B_3DC not set');
const rows = JSON.parse(readFileSync(new URL('fixtures/uxml-v2-supports/bench/default-material-map-rows.json', ROOT), 'utf8'));
const stage = text => runSupportsStage({xmlText: text, stagedJsonText: '', supportConfig: {}, masters: {materialMapRows: rows}}).xmlText;
const compare = (xmlPath, ciiPath) => JSON.parse(execFileSync('python', ['-E', '-s', SCRIPT, xmlPath, fileURLToPath(new URL('supports-edits.cii', EF05)),
  '--step10-cii', ciiPath], {encoding: 'utf8', maxBuffer: 1 << 24}));
const roundtrip = xmlPath => JSON.parse(execFileSync('python', ['-E', '-s', SCRIPT, xmlPath, fileURLToPath(new URL('supports-edits.cii', EF05)),
  '--converter', CONVERTER], {encoding: 'utf8', maxBuffer: 1 << 24}));

async function revisedXml() {
  const dir = process.env.U2D_PYODIDE;
  const {loadPyodide} = await import(pathToFileURL(join(dir, 'pyodide.mjs')));
  const baseBytes = new Uint8Array(readFileSync(new URL('base.xml', EF05)));
  const baseText = new TextDecoder('utf-8', {ignoreBOM: true}).decode(baseBytes);
  const r = await transferCiiIntoXml({targetBytes: baseBytes, ciiBytes: new Uint8Array(readFileSync(new URL('supports-edits.cii', EF05))),
    names: {cii: 'EF-05-supports-edits.cii', target: 'EF-05-step10-enriched.xml', revised: 'r.xml'}, weightScale: 10,
    loadPyodide, indexURL: dir.replace(/[\\/]?$/, '/')});
  const doc = readPsi116V2(baseText, {fileSha256: sha256Hex(baseText)});
  const transfer = runStage(transferStage, doc, {receipt: r.receipt, receiptSha256: sha256Hex(r.receiptText)});
  const tmp = mkdtempSync(join(tmpdir(), 'uxml-rt-'));
  const revised = join(tmp, 'revised.xml');
  writeFileSync(revised, runEngineeringUnderLocks(transfer.uxml, stage).xmlText);
  return revised;
}

test('step 10 on the revised XML gives back the edited supports; only the refused one differs', {skip}, async () => {
  const revised = await revisedXml();
  assert.deepEqual(roundtrip(revised).differ, [{node: '99999', step10: [], edited: ['+Y, stiffness 1.7513E+12']}]);
  // Control: the XML as opened differs at all four edits, so the check above is not empty.
  assert.deepEqual(roundtrip(fileURLToPath(new URL('base.xml', EF05))).differ.map(d => d.node), ['50', '90', '240', '99999']);
});

let chromium;
try { chromium = createRequire(import.meta.url)(process.env.U3B_PLAYWRIGHT || 'playwright').chromium; } catch { /* skipped below */ }
const skipBrowser = skip || (!chromium && 'Playwright not found');
const MIME = {'.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.html': 'text/html', '.css': 'text/css', '.wasm': 'application/wasm'};

// The full step 10 workflow (the v045 copy the live page loads), in headless Chromium, on one XML file.
async function fullStep10(xmlPaths) {
  const root = resolve(process.env.U3B_3DC);
  const files = new Map(xmlPaths.map((p, i) => [`/__xml/${i}.xml`, p]));
  const server = createServer((req, res) => {
    const route = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = route === '/__probe.html' ? null : files.get(route) || resolve(root, '.' + route);
    if (file && !files.has(route) && !file.startsWith(root + sep)) { res.writeHead(403); res.end(); return; }
    try {
      const body = file ? readFileSync(file) : '<!doctype html><meta charset="utf-8"><title>step 10 round trip</title>';
      res.writeHead(200, {'content-type': file ? MIME[extname(file)] || 'application/octet-stream' : 'text/html', 'cache-control': 'no-store'});
      res.end(body);
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise(ok => server.listen(0, '127.0.0.1', ok));
  const browser = await chromium.launch({headless: true});
  try {
    const page = await browser.newPage();
    const missing = [];
    page.on('response', r => { if (r.status() >= 400) missing.push(`${r.status()} ${r.url()}`); });
    await page.goto(`http://127.0.0.1:${server.address().port}/__probe.html`);
    const out = [];
    for (const route of files.keys()) {
      out.push(await page.evaluate(async route => {
        const api = await import('/v045/tabs/xml-cii-2019-standalone/xml-cii-workflow-api-atta-default.js');
        const sourceText = await (await fetch(route)).text();
        const r = await api.runXmlCii2019Workflow({sourceText, sourceName: 'EF-05-revised.xml', sourceKind: 'auto',
          options: {...api.DEFAULT_XML_CII_WORKFLOW_OPTIONS, outputMode: 'both'}});
        return {ok: r.ok, cii: r.ciiText || '', logs: JSON.stringify(r.logs || [])};
      }, route).catch(e => { throw new Error(`${e.message}; failed requests: ${missing.join(', ') || 'none'}`); }));
    }
    return out;
  } finally { await browser.close(); server.close(); }
}

test('the FULL step 10 on the revised XML gives back the edited supports (support locks, step 4)', {skip: skipBrowser, timeout: 600000}, async () => {
  const revised = await revisedXml();
  const base = fileURLToPath(new URL('base.xml', EF05));
  const [onRevised, onBase] = await fullStep10([revised, base]);
  const tmp = mkdtempSync(join(tmpdir(), 'uxml-rt10-'));
  const result = (run, name) => {
    assert.equal(run.ok, true, `step 10 ran on ${name}`);
    writeFileSync(join(tmp, name + '.cii'), run.cii);
    writeFileSync(join(tmp, name + '.logs.json'), run.logs);
    return compare(revised, join(tmp, name + '.cii')).differ;
  };
  // Supports step 10 now writes on unnumbered ATTA points (3D_Converters PR 433) were not in the CII the Owner edited
  // (made by the older step 10); each one is named in the run log, so it is left out by name, never by count.
  const placed = run => [...run.logs.matchAll(/UNNUMBERED_SUPPORT_PLACED [^>]*?-> NodeNumber (\d+) \((?:same point|bend end)\)/g)].map(m => m[1]);
  const extra = run => new Set(placed(run));
  const onRevisedDiffer = result(onRevised, 'revised');
  // The CII is checked first: the supports must be right in what step 10 writes, not only in the XML or the log.
  assert.deepEqual(onRevisedDiffer.filter(d => !extra(onRevised).has(d.node)),
    [{node: '99999', step10: [], edited: ['+Y, stiffness 1.7513E+12']}]);
  assert.match(onRevised.logs, /1 node\(s\) keep the supports transferred from CAESAR II/);
  for (const d of onRevisedDiffer.filter(d => extra(onRevised).has(d.node))) assert.deepEqual(d.edited, [], `node ${d.node} was not in the edited CII`);
  // Control: the XML as opened, through the same full step 10, differs at all four edits.
  assert.deepEqual(result(onBase, 'base').filter(d => !extra(onBase).has(d.node)).map(d => d.node), ['50', '90', '240', '99999']);
});
