import { spawnSync } from 'node:child_process';

const [earlierPath, laterPath] = process.argv.slice(2);
if (!earlierPath || !laterPath) process.exit(2);

const run = spawnSync(process.execPath, ['tests/csv-rev-compare-phase3-load-change.test.js'], { stdio: 'inherit' });
process.exit(run.status ?? 20);
