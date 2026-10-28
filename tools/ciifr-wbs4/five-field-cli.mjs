#!/usr/bin/env node
/* Writes local-only private report to a restricted temp directory; stdout never prints private data. */
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { inspectFiveFieldEvidence, publicFiveFieldSummary } from './five-field-evidence.mjs';
import { writePrivateReports } from './private-output.mjs';

export async function runFiveFieldCli(args, log = console.log) {
  if (args.length !== 2 || !/^[1-9]\d*$/.test(args[1])) {
    throw Error('USAGE: node tools/ciifr-wbs4/five-field-cli.mjs <private-input.CII> <physical-element-ordinal-1-based>');
  }
  const ordinal = Number(args[1]);
  if (!Number.isSafeInteger(ordinal)) throw Error('FIVE_FIELD_OCCURRENCE_RANGE');
  const bytes = new Uint8Array(await readFile(args[0]));
  const report = inspectFiveFieldEvidence(bytes, {elementIndex: ordinal - 1});
  const summary = publicFiveFieldSummary(report);
  const directory = await writePrivateReports(report, summary);
  log(`LOCAL_ONLY_DIRECTORY=${directory}`);
  return directory;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runFiveFieldCli(process.argv.slice(2)).catch(() => {
    // Upstream errors can carry private paths, element ordinals or byte offsets.
    console.error('FIVE_FIELD_INSPECTOR_ERROR=SOURCE_REJECTED');
    process.exitCode = 1;
  });
}
