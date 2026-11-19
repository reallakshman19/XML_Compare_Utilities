/**
 * Run records (Owner 17 Nov 2026): the file 3D_Converters step 10 downloads after a Run on the UXML route. It holds that
 * Run's own supports-stage provenance, the XML the CII engine received, hashes, and the transfer-protected values.
 * This module reads it for review page section 4; it runs no stage.
 */
import {sha256Hex} from './UxmlV2Kernel.js';

export const RUN_RECORD_FORMAT = 'uxml-run-record';

/** The records in a downloaded file (one file may hold several models). Throws with a plain message when it is not one. */
export function readRunRecordFile(text) {
  let file;
  try { file = JSON.parse(String(text || '')); } catch { throw new Error('the Run record is not valid JSON'); }
  const records = file?.format === `${RUN_RECORD_FORMAT}s` ? file.records : file?.format === RUN_RECORD_FORMAT ? [file] : null;
  if (!Array.isArray(records) || !records.length) throw new Error('this file is not a Run record from 3D_Converters step 10');
  for (const r of records) {
    if (r?.format !== RUN_RECORD_FORMAT || r.version !== 1) throw new Error(`unsupported Run record (${r?.format} v${r?.version})`);
    if (typeof r.ciiInputXml !== 'string' || !r.provenance?.rows || !r.engineeringProvenance?.rows) throw new Error(`the Run record for ${r.model} is incomplete`);
    if (sha256Hex(r.ciiInputXml) !== r.hashes?.ciiInputXml) throw new Error(`the Run record for ${r.model} was changed after the Run (CII input XML hash differs)`);
  }
  return records;
}

/** The shape the section 4 tables read (as runSupportsStage returns it). */
export const asStageResult = record => ({
  stages: {'04-mds-closure': record.ciiInputXml}, provenance: record.provenance,
  engineeringProvenance: record.engineeringProvenance, diagnostics: record.diagnostics || [],
});

/** Which XML of the Run `xmlText` is: 'source' (the file that was run), 'cii-input' (the XML the CII came from), or null. */
export function runRecordXmlMatch(record, xmlText) {
  const sha = sha256Hex(String(xmlText ?? ''));
  if (sha === record.hashes?.sourceXml) return 'source';
  if (sha === record.hashes?.ciiInputXml) return 'cii-input';
  return null;
}

/** Plain lines about the Run, for the page. */
/** 'held' (parity failed: no CII) or 'released-to-engine'; records before 17 Nov have no outcome: taken from parity. */
export const runOutcome = record => record.outcome || (record.parity?.ok ? 'released-to-engine' : 'held');

export function runRecordFacts(record) {
  const p = record.parity || {};
  return [runOutcome(record) === 'held' ? 'HELD: this Run wrote no CII (parity failed on the UXML XML).'
    : 'The UXML XML was released to the CII engine (this record does not say whether the engine then wrote the CII).',
    `${record.model}, run ${record.createdAt} with ${record.stage}`,
    `parity ${p.ok ? 'PASS' : 'HELD'} (${p.comparisons ?? '?'} comparisons, ${p.mismatches ?? '?'} mismatches)`,
    record.compare?.equal ? 'XML equal to today\'s route' : `differs from today's route on ${record.compare?.nodesDiffer ?? '?'} node(s): ${Object.keys(record.compare?.fields || {}).join(', ') || 'branch values'}`,
    ...(record.document ? [`UXML document: the source was read once (revision ${String(record.document.sourceRevision).slice(0, 12)}); `
      + `the gasket drop removed ${record.document.removed.length} node(s) before the supports stage (revision ${String(record.document.revision).slice(0, 12)}).`] : [])];
}

/** The step-10 UXML document's node removals (end-to-end plan E1) as table rows; [] for records before 19 Nov 2026. */
export const documentRemovedRows = record => (record.document?.removed || []).map(r => [r.branchName ?? '', r.NodeNumber ?? '',
  r.NodeName ?? '', record.document.stage]);

/** Transfer-protected values as table rows; [] when the file had no transfer note. */
export const transferKeptRows = record => (record.transferProtected?.values || []).map(v => [v.branchName, v.nodeNumber ?? 'branch',
  v.path, v.value, v.now ?? '(missing)', v.kept ? 'kept' : 'CHANGED']);
