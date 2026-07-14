from pathlib import Path

PATH = Path('tabs/model-converters/json-trace/json-trace-panel.js')
source = PATH.read_text()
if 'function ledgerDiagnosticsFromSnapshot' in source:
    print(f'already patched {PATH}')
    raise SystemExit(0)

marker = "function enabledServices(services, enabled) { return { ...(services || {}), useJsonTraceSource: enabled === true }; }"
helper = '''function ledgerDiagnosticsFromSnapshot(snapshot = {}) {
  return (snapshot?.entries || []).map((entry) => ({
    type: 'dtxr-resolution-ledger',
    nodeNumber: entry.xmlNode || '',
    nodeName: entry.xmlNodeName || '',
    componentType: entry.componentType || '',
    branchName: entry.xmlBranch || '',
    stagedBranch: entry.stagedBranch || '',
    branchRelationship: entry.branchRelationship || '',
    branchRank: entry.branchRank ?? '',
    position: entry.xmlPosition || '',
    distanceMm: entry.distanceMm ?? '',
    toleranceMm: entry.toleranceMm ?? '',
    dtxrPosValue: entry.dtxrPosValue || '',
    dtxrPsName: entry.dtxrPsName || '',
    dtxrPsValue: entry.dtxrPsValue || '',
    sourcePath: entry.dtxrPsPath || '',
    positionPaths: entry.dtxrPositionPaths || [],
    effectiveAuthority: entry.effectiveAuthority || 'NONE',
    status: entry.status || 'UNRESOLVED',
    message: entry.status === 'RESOLVED'
      ? `${entry.effectiveAuthority || 'DTXR'}: ${entry.dtxrSource || ''}`
      : 'Authoritative DTXR ledger retained unresolved provenance.',
  }));
}
async function currentDtxrLedgerSnapshot(services = {}) {
  const supplied = await services?.getDtxrResolutionLedger?.();
  if (supplied?.entries?.length) return supplied;
  return globalThis.xmlCiiDtxrResolutionLedger?.getSnapshot?.() || null;
}
function enabledServices(services, enabled) { return { ...(services || {}), useJsonTraceSource: enabled === true }; }'''
if source.count(marker) != 1:
    raise SystemExit(f'ledger helper marker count={source.count(marker)}')
source = source.replace(marker, helper, 1)
old = "      const diagnosticRows = await services?.buildXmlNodeTrace?.();\n      const next = state();"
new = "      const ledgerSnapshot = await currentDtxrLedgerSnapshot(services);\n      const ledgerDiagnostics = ledgerDiagnosticsFromSnapshot(ledgerSnapshot || {});\n      const diagnosticRows = ledgerDiagnostics.length\n        ? ledgerDiagnostics\n        : (await services?.buildXmlNodeTrace?.());\n      const next = state();"
if source.count(old) != 1:
    raise SystemExit(f'ledger handler marker count={source.count(old)}')
source = source.replace(old, new, 1)
PATH.write_text(source)
print(f'patched {PATH}')
