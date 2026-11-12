#!/usr/bin/env node
import { writeFileSync, mkdtempSync, linkSync, rmSync } from 'node:fs';
import { extname, dirname, join } from 'node:path';
import { readBytes, finish, usage } from './kit/node.mjs';
import { attempt, refuse, require } from './kit/core.mjs';
import { proposeFromReference } from './engine/propose.mjs';

const [cmd, reference, target, mapPath, out, ...extra] = process.argv.slice(2);
if (cmd !== 'propose' || !reference || !target || !mapPath || !out || extra.length) {
  usage('node cli.mjs propose <reference.cii> <target.cii> <map.json> <out.json>');
}
const result = await attempt(async () => {
  require(extname(out).toLowerCase() === '.json', 'PROPOSE_OUTPUT_NOT_JSON', out, 'Only a new JSON file may be written');
  const a = readBytes(reference), b = readBytes(target);
  const mapBytes = readBytes(mapPath);
  let map;
  try { map = JSON.parse(new TextDecoder().decode(mapBytes)); }
  catch { refuse('PROPOSE_MAP_INVALID', mapPath, 'Cannot parse Map JSON'); }
  const r = await proposeFromReference(a, b, map);
  if (!r.ok) return r;
  // Exclusive creation: never overwrite a file, including an input or symlink.
  let temp;
  try {
    temp = mkdtempSync(join(dirname(out), '.p33-'));
    const staged = join(temp, 'proposals.json');
    writeFileSync(staged, JSON.stringify(r.changeset, null, 2) + '\n', { flag: 'wx' });
    linkSync(staged, out); // atomic publication without replacing any existing file
  } catch (e) { refuse('PROPOSE_OUTPUT_FAILED', out, e.code || 'Cannot write output'); }
  finally { if (temp) rmSync(temp, { recursive: true, force: true }); }
  return r;
});
finish(result);
