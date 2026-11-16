// UXML supports stage on plain data (steps 3 + 4): today's order, real ports, no replay, no DOM, no XML page.
//   branch pass (step 4) -> 01 parent support loop -> 02 DTXR enrichment -> 02b process parity -> 03 ATTA default closure
//   -> 04 MDS closure.
// Input is the XML the supports stage receives today (after the topology stage, e.g. gasket drop; that stage is not here).
// Masters arrive as rows: today's async loaders are not ported. Only the material map differs from the parsed config.
// After the parent loop: today's preview run parity rows (process block and node facts, PreviewRunParity.js), then the finish.
// After DTXR: today's process parity (second preview, bore from OD, source walls, transfer protection; process/).
import { childText, elementsByName, parsePlainXml, serializePlainXml } from './PlainDom.js';
import { toFiniteNumber } from './config/EnrichmentConfig.js';
import { branchEngineeringPass, measureElementLengthsFromFinalNumbering } from '../engineering/BranchPass.js';
import { finishParentEnrichment } from './parent/ParentEnrichmentFinish.js';
import { applyPreviewRunParityRows, previewParityConfig } from './parent/PreviewRunParity.js';
import { supportProvenance } from './SupportProvenance.js';
import { runProcessParityStep } from './process/ProcessParityStep.js';
import {
  closeGovernedAttaDefaultRestraintsXml, closeGovernedMdsPositionRestraintsXml, createRealCore, enrichStandaloneDtxrAnnotations,
  parentSupportLoop,
} from './SupportsChain.js';

/**
 * Owner 16 Nov (a re-run must give the same XML): today's restraint writer takes a node's restraints out and adds them back
 * at the end, so on a second run they land after tags a first run put after them (DTXR_POS, DTXR_SOURCE). The stage ends
 * with every node's restraints last, in their own order, which is where a re-run puts them. Values are not touched.
 */
function restraintsLast(xmlText) {
  const doc = parsePlainXml(xmlText);
  let moved = 0;
  for (const node of elementsByName(doc.root, 'Node')) {
    const kids = node.kids || [];
    const firstAt = kids.findIndex((k) => k.__el === 'Restraint');
    if (firstAt < 0 || kids.slice(firstAt).every((k) => k.__el === 'Restraint' || (k.__text !== undefined && !k.__text.trim()))) continue;
    const blank = (i) => i >= 0 && kids[i].__text !== undefined && !kids[i].__text.trim();
    const block = [];
    for (let i = kids.length - 1; i >= 0; i -= 1) if (kids[i].__el === 'Restraint') block.unshift(...kids.splice(blank(i - 1) ? i - 1 : i, blank(i - 1) ? 2 : 1));
    kids.push(...block);
    moved += 1;
  }
  return moved ? serializePlainXml(doc) : xmlText;
}

/**
 * @param {{xmlText: string, stagedJsonText?: string, supportConfig?: object, masters?: {materialMapRows?: object[]},
 *          diagnostics?: object[], lengthsFromFinalNumbering?: boolean,
 *          previewRunParity?: boolean, processParity?: boolean}} input
 * @returns {{xmlText: string, stages: Record<string, string>, config: object, stats: object, diagnostics: object[],
 *            provenance: {rows: object[], counts: object}}} provenance: where each support value came from (SupportProvenance.js).
 */
export function runSupportsStage({ xmlText, stagedJsonText = '', supportConfig = {}, masters = {}, diagnostics = [], lengthsFromFinalNumbering = true,
  previewRunParity = true, processParity = true }) {
  const core = createRealCore();
  const config = core.parseXmlCiiEnrichmentConfig(JSON.stringify(supportConfig));
  if (Array.isArray(masters.materialMapRows) && masters.materialMapRows.length) config.material.mapRows = masters.materialMapRows;
  const tolerance = toFiniteNumber(config.coordinateTolerance, 1);
  const stats = {};

  const doc = parsePlainXml(xmlText);
  branchEngineeringPass({ root: doc.root, config, tolerance, stats, diagnostics });
  const loopStartXmlText = serializePlainXml(doc);
  const stages = { 'branch-pass': loopStartXmlText };

  const parentFrom = diagnostics.length;
  const loopEnd = parsePlainXml(parentSupportLoop({ sourceXmlText: xmlText, loopStartXmlText, stagedJsonText, config, tolerance, diagnostics }).xmlText);
  const parentDiagnostics = diagnostics.slice(parentFrom);
  const parentNumbers = elementsByName(loopEnd.root, 'Node').map((n) => childText(n, 'NodeNumber'));
  // Today's preview rows come from the XML the stage received, with the job config merged over the enrichment config.
  const parityConfig = previewParityConfig(config, core.parseXmlCiiEnrichmentConfig(JSON.stringify(supportConfig)), supportConfig);
  // previewRunParity false: without today's preview rows (gate control only).
  if (previewRunParity) applyPreviewRunParityRows(loopEnd.root, { sourceXmlText: xmlText, config: parityConfig, stagedJsonText, stats, diagnostics });
  finishParentEnrichment(loopEnd.root, config, stats, diagnostics);
  // Owner 16 Nov: lengths from the final numbering (= CII element lengths). false = today's labels (gate control only).
  if (lengthsFromFinalNumbering) measureElementLengthsFromFinalNumbering(loopEnd.root, stats);
  stages['01-parent-enrichment'] = serializePlainXml(loopEnd);
  const dtxr = enrichStandaloneDtxrAnnotations(stages['01-parent-enrichment'], stagedJsonText, supportConfig);
  stages['02-dtxr-enrichment'] = dtxr.text || stages['01-parent-enrichment'];
  // Today's process parity (ProcessParityStep.js); false: without it (gate control only).
  stages['02b-process-parity'] = processParity
    ? runProcessParityStep({ xmlText: stages['02-dtxr-enrichment'], sourceXmlText: xmlText, supportConfig, stagedJsonText,
      defaultMaterialMapRows: masters.materialMapRows || [], diagnostics, stats: (stats.processParity = {}) }).xmlText
    : stages['02-dtxr-enrichment'];
  const atta = closeGovernedAttaDefaultRestraintsXml(stages['02b-process-parity'], supportConfig);
  stages['03-atta-default'] = atta.xmlText || stages['02b-process-parity'];
  const mds = closeGovernedMdsPositionRestraintsXml(stages['03-atta-default'], stagedJsonText, supportConfig);
  stages['04-mds-closure'] = restraintsLast(mds.xmlText || stages['03-atta-default']);

  for (const [name, step] of [['dtxr', dtxr], ['atta', atta], ['mds', mds]]) {
    stats[name] = step.stats || {};
    for (const d of step.diagnostics || []) diagnostics.push({ ...d, supportsSubStep: name });
  }
  const provenance = supportProvenance({ stages, parentNumbers,
    diagnosticsByStep: { parent: parentDiagnostics, dtxr: dtxr.diagnostics, atta: atta.diagnostics, mds: mds.diagnostics } });
  return { xmlText: stages['04-mds-closure'], stages, config, stats, diagnostics, provenance };
}
