/** Canonical-authority binding for reports emitted by the pinned topology producer. */

import { cleanText, deepFreeze, semanticHash } from './topology-validator-values.js';

export const TOPOLOGY_CHECK_REPORT_SCHEMA = 'TopologyCheckReport.v1';

/**
 * Bind one producer report to the exact canonical topology that generated it.
 * Existing non-empty contradictory authority is rejected rather than replaced.
 */
export function bindTopologyCheckReport(canonical, report) {
  if (canonical?.schema !== 'CanonicalTopology.v1') throw new TypeError('Topology checker report binding requires CanonicalTopology.v1.');
  const canonicalTopologyHash = cleanText(canonical.canonicalTopologyHash);
  if (!canonicalTopologyHash) throw new TypeError('Topology checker report binding requires a canonical topology hash.');
  if (report?.schema !== TOPOLOGY_CHECK_REPORT_SCHEMA) throw new TypeError(`Topology checker report binding requires ${TOPOLOGY_CHECK_REPORT_SCHEMA}.`);

  const suppliedCanonicalHash = cleanText(report.canonicalTopologyHash);
  if (suppliedCanonicalHash && suppliedCanonicalHash !== canonicalTopologyHash) {
    throw new TypeError(`Topology checker report canonical hash ${suppliedCanonicalHash} does not match ${canonicalTopologyHash}.`);
  }

  const { topologyCheckReportHash: _discardedHash, ...reportWithoutHash } = report;
  const material = { ...reportWithoutHash, canonicalTopologyHash };
  return deepFreeze({ ...material, topologyCheckReportHash: semanticHash(material) });
}

/** Execute the pinned producer check and bind its result to the supplied canonical authority. */
export function runBoundTopologyChecks(core, canonical, options) {
  if (typeof core?.runTopologyChecks !== 'function') throw new TypeError('Bound topology checks require runTopologyChecks().');
  return bindTopologyCheckReport(canonical, core.runTopologyChecks(canonical, options));
}

export const _test = Object.freeze({ TOPOLOGY_CHECK_REPORT_SCHEMA });
