// T4 step 2 (road map 26 Nov 2026): the full step 10 (the v045 copy the live page loads) in headless Chromium, with the
// UXML route and "Engine reads UXML" on and output "both", as the engineer runs it before a transfer by node id.
// Needs U3B_3DC (a 3D_Converters checkout) and Playwright (U3B_PLAYWRIGHT, a path to its module, or the global
// 'playwright'); U3B_CHROMIUM may name the browser executable when Playwright's own build is not installed.
//
// step10Runner() -> null when Playwright is missing, else run(xmlPaths) -> [{ok, cii, enriched, sidecar, logs}], one per
// XML, in one browser (each run in a fresh page, so no run record or switch carries over).
import {readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {extname, resolve, sep} from 'node:path';

const MIME = {'.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.html': 'text/html',
  '.css': 'text/css', '.wasm': 'application/wasm'};
const API = '/v045/tabs/xml-cii-2019-standalone/';

function playwright() {
  try { return createRequire(import.meta.url)(process.env.U3B_PLAYWRIGHT || 'playwright').chromium; } catch { return null; }
}

function serve(root, files) {
  return createServer((req, res) => {
    const route = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = route === '/__step10.html' ? null : files.get(route) || resolve(root, '.' + route);
    if (file && !files.has(route) && !file.startsWith(root + sep)) { res.writeHead(403); res.end(); return; }
    try {
      const body = file ? readFileSync(file) : '<!doctype html><meta charset="utf-8"><title>step 10</title>';
      res.writeHead(200, {'content-type': file ? MIME[extname(file)] || 'application/octet-stream' : 'text/html',
        'cache-control': 'no-store'});
      res.end(body);
    } catch { res.writeHead(404); res.end(); }
  });
}

/** In the page: switches on, the workflow run, and the sidecar the run kept for its download. */
async function inPage({route, name, api}) {
  localStorage.setItem('xmlCii.uxmlRoute', 'on');
  localStorage.setItem('xmlCii.engineReadsUxml', 'on');
  const flow = await import(api + 'xml-cii-workflow-api-atta-default.js');
  const record = await import(api + 'xml-cii-uxml-run-record.js');
  const sourceText = await (await fetch(route)).text();
  const r = await flow.runXmlCii2019Workflow({sourceText, sourceName: name, sourceKind: 'auto',
    options: {...flow.DEFAULT_XML_CII_WORKFLOW_OPTIONS, outputMode: 'both'}});
  const sidecars = record.ciiSidecars();
  return {ok: r.ok, cii: r.ciiText || '', enriched: r.enrichedText || '', logs: JSON.stringify(r.logs || []),
    sidecar: sidecars.length ? JSON.stringify(sidecars[sidecars.length - 1], null, 1) : ''};
}

export function step10Runner() {
  const chromium = playwright();
  if (!chromium || !process.env.U3B_3DC) return null;
  return async xmlPaths => {
    const root = resolve(process.env.U3B_3DC);
    const files = new Map(xmlPaths.map((p, i) => [`/__xml/${i}.xml`, p]));
    const server = serve(root, files);
    await new Promise(ok => server.listen(0, '127.0.0.1', ok));
    const browser = await chromium.launch({headless: true,
      ...(process.env.U3B_CHROMIUM ? {executablePath: process.env.U3B_CHROMIUM} : {})});
    try {
      const out = [];
      for (const [route, path] of files) {
        const page = await browser.newPage();
        await page.goto(`http://127.0.0.1:${server.address().port}/__step10.html`);
        out.push(await page.evaluate(inPage, {route, name: path.replace(/^.*[\\/]/, ''), api: API}));
        await page.close();
      }
      return out;
    } finally { await browser.close(); server.close(); }
  };
}
