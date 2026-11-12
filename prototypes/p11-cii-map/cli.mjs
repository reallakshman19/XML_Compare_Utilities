#!/usr/bin/env node
// p11-cii-map command line. Thin wrapper: parse args, read files, call the engine, print JSON.
//   node cli.mjs compare <a.cii> <b.cii> [--anchors 10:10,20:20,30:30] [--tol 1] [--summary]
import { attempt } from './kit/core.mjs';
import { parseArgs, readBytes, finish, usage } from './kit/node.mjs';
import { readCiiGraph } from './engine/cii-graph.mjs';
import { compareCii } from './engine/compare.mjs';

const USAGE = 'node cli.mjs compare <a.cii> <b.cii> [--anchors 10:10,20:20,30:30] [--tol 1] [--summary]';
const args = parseArgs();
const [command, fa, fb] = args._;
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
