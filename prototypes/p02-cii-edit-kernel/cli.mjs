#!/usr/bin/env node
// p02-cii-edit-kernel command line. Thin wrapper: parse args, read files, call engine, print JSON.
//   node cli.mjs apply <base.cii> <changeset.json> <out.cii>
//   node cli.mjs diff <a.cii> <b.cii>
//   node cli.mjs read <file.cii>
import { writeFileSync, realpathSync, existsSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { attempt, refuse } from './kit/core.mjs';
import { parseArgs, readBytes, finish, usage } from './kit/node.mjs';
import { readCii14, fieldDiff } from './kit/cii14.mjs';
import { applyChangeset } from './engine/apply.mjs';

const USAGE = 'node cli.mjs apply <base.cii> <changeset.json> <out.cii> | diff <a.cii> <b.cii> | read <file.cii>';
const args = parseArgs();
const [command, a, b, c] = args._;

/** True when two paths name the same file (symlinks resolved; case-insensitive on Windows). */
function samePath(x, y) {
  const real = p => { const r = resolve(p); return existsSync(r) ? realpathSync(r) : resolve(existsSync(dirname(r)) ? realpathSync(dirname(r)) : dirname(r), basename(r)); };
  const norm = p => process.platform === 'win32' ? real(p).toLowerCase() : real(p);
  return norm(x) === norm(y);
}

const counts = cii => ({ version: cii.version, eol: cii.eol, lines: cii.lines.length, sections: cii.sectionOrder.length,
  numelt: cii.counts.NUMELT, rigids: cii.rigids.length, nodeNames: cii.nodeNames.length });

if (command === 'read' && a) {
  finish(await attempt(() => counts(readCii14(readBytes(a)))));
} else if (command === 'diff' && a && b) {
  finish(await attempt(() => {
    const x = readCii14(readBytes(a)), y = readCii14(readBytes(b));
    const diffs = fieldDiff(x, y);
    return { count: diffs.length, diffs };
  }));
} else if (command === 'apply' && a && b && c) {
  if (samePath(a, c)) usage(USAGE + '  (out.cii must not be the base file)');
  const result = await attempt(async () => {
    const bytes = readBytes(a);
    let cs;
    try { cs = JSON.parse(new TextDecoder().decode(readBytes(b))); } catch (e) { if (e instanceof SyntaxError) refuse('KERNEL_CHANGESET_INVALID', b, 'not JSON: ' + e.message); throw e; }
    const r = await applyChangeset(bytes, cs);
    if (!r.ok) { const e = new Error('REFUSED'); e.refusals = r.refusals; throw e; }
    writeFileSync(c, r.bytes);
    return { out: c, sha256: r.sha256, changed: r.applied.length, applied: r.applied };
  });
  finish(result);
} else usage(USAGE);
