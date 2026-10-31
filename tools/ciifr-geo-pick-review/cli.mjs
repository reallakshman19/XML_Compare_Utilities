#!/usr/bin/env node
import {readFile} from 'node:fs/promises';
import {reviewSnapshotPick} from './review.mjs';

async function main(args) {
  if (args.length !== 4) throw new Error('USAGE: node cli.mjs preview.json SOURCE|TARGET NODE|ELEMENT id');
  const [path, side, kind, id] = args;
  const payload = JSON.parse(await readFile(path, 'utf8'));
  const review = reviewSnapshotPick(payload, {side, kind, id});
  process.stdout.write(JSON.stringify(review, null, 2) + '\n');
}

main(process.argv.slice(2)).catch(error => {
  process.stderr.write(`CIIFR read-only pick review failed: ${error.message}\n`);
  process.exitCode = 1;
});
