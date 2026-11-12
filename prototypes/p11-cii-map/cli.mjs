#!/usr/bin/env node
// p11-cii-map command line. Thin wrapper: parse args, read files, call the engine, print JSON.
//   node cli.mjs compare <a.cii> <b.cii> [--anchors 10:10,20:20,30:30] [--tol 1] [--summary]
import { writeFileSync, mkdtempSync, linkSync, rmSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { readInputXmlGraph } from './engine/xml-input.mjs';
import { matchXmlCii } from './engine/xml-match.mjs';
import { xmlMatchToMapFile } from './engine/xml-to-map.mjs';
import { attempt, refuse } from './kit/core.mjs';
import { parseArgs, readBytes, finish, usage } from './kit/node.mjs';
import { readCiiGraph } from './engine/cii-graph.mjs';
import { compareCii } from './engine/compare.mjs';

const USAGE = 'node cli.mjs compare <a.cii> <b.cii> [--anchors 10:10,20:20,30:30] [--tol 1] [--summary]';
const args = parseArgs();
const [command, fa, fb] = args._;
if (command === 'match-xml') {
  if (!fa || !fb || args._.length !== 3 || args.map === true || args.mode === true || args.tol === true) usage('node cli.mjs match-xml <file.xml> <file.cii> [--mode same-run|geometry] [--tol <mm>] [--map out.json]');
  const result = await attempt(async () => {
    const xml = await readInputXmlGraph(readBytes(fa), basename(fa));
    const cii = await readCiiGraph(readBytes(fb), {member: basename(fb)});
    const r = matchXmlCii(xml, cii, {mode: args.mode, toleranceMm: args.tol === undefined ? undefined : Number(args.tol)});
    if (args.map) {
      const map = xmlMatchToMapFile(r, {xmlFile: {fileName: basename(fa), sha256: xml.sha256}, ciiFile: {fileName: basename(fb), sha256: cii.sha256}});
      let temporary;
      try {
        const output = resolve(args.map);
        temporary = mkdtempSync(join(dirname(output), '.p12-map-'));
        const staged = join(temporary, 'map.json');
        writeFileSync(staged, JSON.stringify(map, null, 2) + '\n', {flag: 'wx'});
        // Publish a complete file atomically, without replacing an existing destination.
        linkSync(staged, output);
      } catch (e) { refuse('MATCH_MAP_WRITE_FAILED', args.map, e.message); }
      finally { if (temporary) rmSync(temporary, {recursive: true, force: true}); }
    }
    return r;
  });
  finish(result);
}
if (command !== 'compare' || !fa || !fb) usage(USAGE);
if (args.tol !== undefined && (args.tol === true || !Number.isFinite(Number(args.tol)))) usage(USAGE);
if (args.anchors === true) usage(USAGE);
const result = await attempt(async () => {
  const a = await readCiiGraph(readBytes(fa), { member: 'A' });
  const b = await readCiiGraph(readBytes(fb), { member: 'B' });
  const r = compareCii(a, b, { anchors: args.anchors, toleranceMm: args.tol === undefined ? 1 : Number(args.tol) });
  const files = { a: { file: fa, sha256: a.sha256, bytes: a.byteLength }, b: { file: fb, sha256: b.sha256, bytes: b.byteLength } };
  return args.summary ? { files, summary: r.summary, unmatchedA: r.unmatchedA, unmatchedB: r.unmatchedB, fieldDiffs: r.fieldDiffs, loopClosures: r.loopClosures } : { files, ...r };
});
finish(result);
