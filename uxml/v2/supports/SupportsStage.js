// UXML supports stage on plain data (steps 3 + 4): today's order, real ports, no replay, no DOM, no XML page.
//   branch pass (step 4) -> 01 parent support loop -> 02 DTXR enrichment -> 03 ATTA default closure -> 04 MDS closure.
// Input is the XML the supports stage receives today (after the topology stage, e.g. gasket drop; that stage is not here).
// Masters arrive as rows: today's async loaders are not ported. Only the material map differs from the parsed config.
// Not here (engineering values, not support results): today's preview process data after 01 and process parity between 02 and 03.
import { parsePlainXml, serializePlainXml } from './PlainDom.js';
import { toFiniteNumber } from './config/EnrichmentConfig.js';
import { branchEngineeringPass } from '../engineering/BranchPass.js';
import { finishParentEnrichment } from './parent/ParentEnrichmentFinish.js';
import {
  closeGovernedAttaDefaultRestraintsXml, closeGovernedMdsPositionRestraintsXml, createRealCore, enrichStandaloneDtxrAnnotations,
  parentSupportLoop,
} from './SupportsChain.js';

/**
 * @param {{xmlText: string, stagedJsonText?: string, supportConfig?: object, masters?: {materialMapRows?: object[]},
 *          diagnostics?: object[]}} input
 * @returns {{xmlText: string, stages: Record<string, string>, config: object, stats: object, diagnostics: object[]}}
 */
export function runSupportsStage({ xmlText, stagedJsonText = '', supportConfig = {}, masters = {}, diagnostics = [] }) {
  const core = createRealCore();
  const config = core.parseXmlCiiEnrichmentConfig(JSON.stringify(supportConfig));
  if (Array.isArray(masters.materialMapRows) && masters.materialMapRows.length) config.material.mapRows = masters.materialMapRows;
  const tolerance = toFiniteNumber(config.coordinateTolerance, 1);
  const stats = {};

  const doc = parsePlainXml(xmlText);
  branchEngineeringPass({ root: doc.root, config, tolerance, stats, diagnostics });
  const loopStartXmlText = serializePlainXml(doc);
  const stages = { 'branch-pass': loopStartXmlText };

  const loopEnd = parsePlainXml(parentSupportLoop({ sourceXmlText: xmlText, loopStartXmlText, stagedJsonText, config, tolerance, diagnostics }).xmlText);
  finishParentEnrichment(loopEnd.root, config, stats, diagnostics);
  stages['01-parent-enrichment'] = serializePlainXml(loopEnd);
  const dtxr = enrichStandaloneDtxrAnnotations(stages['01-parent-enrichment'], stagedJsonText, supportConfig);
  stages['02-dtxr-enrichment'] = dtxr.text || stages['01-parent-enrichment'];
  const atta = closeGovernedAttaDefaultRestraintsXml(stages['02-dtxr-enrichment'], supportConfig);
  stages['03-atta-default'] = atta.xmlText || stages['02-dtxr-enrichment'];
  const mds = closeGovernedMdsPositionRestraintsXml(stages['03-atta-default'], stagedJsonText, supportConfig);
  stages['04-mds-closure'] = mds.xmlText || stages['03-atta-default'];

  for (const [name, step] of [['dtxr', dtxr], ['atta', atta], ['mds', mds]]) {
    stats[name] = step.stats || {};
    for (const d of step.diagnostics || []) diagnostics.push({ ...d, supportsSubStep: name });
  }
  return { xmlText: stages['04-mds-closure'], stages, config, stats, diagnostics };
}
