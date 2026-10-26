#!/usr/bin/env node
/* Writes local-only private report to a restricted temp directory; stdout never prints private data. */
import { readFile, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { inspectFiveFieldEvidence, publicFiveFieldSummary } from './five-field-evidence.mjs';

export async function runFiveFieldCli(args, log = console.log) {
  if (args.length !== 2 || !/^[1-9]\d*$/.test(args[1])) {
    throw Error('USAGE: node tools/ciifr-wbs4/five-field-cli.mjs <private-input.CII> <physical-element-ordinal-1-based>');
  }
  const ordinal = Number(args[1]);
  if (!Number.isSafeInteger(ordinal)) throw Error('FIVE_FIELD_OCCURRENCE_RANGE');
  const bytes = new Uint8Array(await readFile(args[0]));
  const report = inspectFiveFieldEvidence(bytes, {elementIndex: ordinal - 1});
  const summary = publicFiveFieldSummary(report);
  const directory = await mkdtemp(join(tmpdir(), 'ciifr-five-field-'));
  await writeFile(join(directory, 'private-report.json'), JSON.stringify(report, null, 2) + '\n',
    {flag: 'wx', mode: 0o600});
  await writeFile(join(directory, 'public-summary.json'), JSON.stringify(summary, null, 2) + '\n',
    {flag: 'wx', mode: 0o600});
  log(`LOCAL_ONLY_DIRECTORY=${directory}`);
  return directory;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runFiveFieldCli(process.argv.slice(2)).catch(error => {
    console.error(`FIVE_FIELD_INSPECTOR_ERROR=${error.message}`);
    process.exitCode = 1;
  });
}
