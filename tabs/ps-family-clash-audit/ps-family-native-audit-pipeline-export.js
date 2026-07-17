import {
  exportCarrierCatalogCsv,
  exportCarrierResolutionCsv,
  exportSupportCarrierEdgesCsv,
} from './ps-family-carrier-evidence-export.js';
import { createPsFamilyAuditExports } from './ps-family-clash-audit-export.js';

export function exportPsFamilyNativePipelineJson(pipeline) {
  return `${JSON.stringify(pipeline, null, 2)}\n`;
}

export function exportPsFamilyNativeRelationshipBundleJson(pipeline) {
  return `${JSON.stringify(pipeline?.relationshipBundle || {}, null, 2)}\n`;
}

export function exportPsFamilyNativeAuditJson(pipeline) {
  return `${JSON.stringify(pipeline?.audit || {}, null, 2)}\n`;
}

export function exportPsFamilyNativePipelineSummaryCsv(pipeline) {
  const summary = pipeline?.summary || {};
  const headers = [
    'Status', 'SupportFamilyCount', 'SteelGroupCount', 'ResolvedFamilyCount',
    'AmbiguousFamilyCount', 'UnresolvedFamilyCount', 'CarrierObjectCount',
    'ResolvedPhysicalCarrierCount', 'BranchContextOnlyCount',
    'AmbiguousCarrierCount', 'UnresolvedCarrierCount', 'SupportChainEdgeCount',
    'StructuralTerminalCount', 'AuditSupportGroupCount', 'AuditExceptionCount',
    'XmlRequired', 'XmlConsumed',
  ];
  const row = {
    Status: summary.status,
    SupportFamilyCount: summary.supportFamilyCount,
    SteelGroupCount: summary.steelGroupCount,
    ResolvedFamilyCount: summary.resolvedFamilyCount,
    AmbiguousFamilyCount: summary.ambiguousFamilyCount,
    UnresolvedFamilyCount: summary.unresolvedFamilyCount,
    CarrierObjectCount: summary.carrierObjectCount,
    ResolvedPhysicalCarrierCount: summary.resolvedPhysicalCarrierCount,
    BranchContextOnlyCount: summary.branchContextOnlyCount,
    AmbiguousCarrierCount: summary.ambiguousCarrierCount,
    UnresolvedCarrierCount: summary.unresolvedCarrierCount,
    SupportChainEdgeCount: summary.supportChainEdgeCount,
    StructuralTerminalCount: summary.structuralTerminalCount,
    AuditSupportGroupCount: summary.auditSupportGroupCount,
    AuditExceptionCount: summary.auditExceptionCount,
    XmlRequired: pipeline?.xmlRequired,
    XmlConsumed: pipeline?.xmlConsumed,
  };
  return `${headers.join(',')}\n${headers.map((key) => csvCell(row[key])).join(',')}\n`;
}

export function createPsFamilyNativePipelineExports(pipeline) {
  const auditExports = pipeline?.audit ? createPsFamilyAuditExports(pipeline.audit) : {};
  return {
    pipelineJson: exportPsFamilyNativePipelineJson(pipeline),
    relationshipBundleJson: exportPsFamilyNativeRelationshipBundleJson(pipeline),
    auditJson: exportPsFamilyNativeAuditJson(pipeline),
    summaryCsv: exportPsFamilyNativePipelineSummaryCsv(pipeline),
    supportSummaryCsv: auditExports.supportSummaryCsv || '',
    supportExceptionsCsv: auditExports.supportExceptionsCsv || '',
    inputEvidenceCsv: auditExports.inputEvidenceCsv || '',
    carrierCatalogCsv: exportCarrierCatalogCsv(pipeline?.audit),
    carrierResolutionCsv: exportCarrierResolutionCsv(pipeline?.audit),
    supportCarrierEdgesCsv: exportSupportCarrierEdgesCsv(pipeline?.audit),
  };
}

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}
