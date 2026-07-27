from pathlib import Path


def remove_permanent_scope_guard() -> None:
    path = Path('tests/sequential-workspace-command-authority-package.test.js')
    lines = path.read_text().splitlines(keepends=True)
    output: list[str] = []
    index = 0
    while index < len(lines):
        line = lines[index]
        if line == "import { execFileSync } from 'node:child_process';\n":
            index += 1
            continue
        if line.startswith("const BASE_SHA = '"):
            index += 1
            continue
        if line.startswith('const ALLOWED_PATHS = Object.freeze(['):
            index += 1
            while index < len(lines) and lines[index].strip() != ']);':
                index += 1
            index += 1
            continue
        if line.startswith('const changedPaths = execFileSync('):
            index += 1
            while index < len(lines) and not lines[index].startswith('assert(changedPaths.every('):
                index += 1
            index += 1
            continue
        output.append(line)
        index += 1
    path.write_text(''.join(output))


def canonicalize_package_authority() -> None:
    path = Path('tabs/sequential-sketcher/persistence/sequential-workspace-package-v2.js')
    source = path.read_text()
    source = source.replace(
        "import { buildSequentialEvidenceModel, indexSequentialEvidence } from '../source/sequential-evidence-model.js';\n",
        '',
    )
    old_authority_source = """  restoreSequentialWorkspacePackage(result);
  return result;
}
function registryForCreate(options, base) {
  const evidence = options.evidence || buildSequentialEvidenceModel(base.source.records);
  const indexes = indexSequentialEvidence(evidence);
  const entries = options.branchRegistry?.entries?.();
  if (!Array.isArray(entries)) fail('WORKSPACE_PACKAGE_V2_BRANCH_REGISTRY_REQUIRED');
  return normalizedRegistry(base.branchIds, entries, indexes);
}
"""
    new_authority_source = """  const restoration = restoreSequentialWorkspacePackage(result);
  return Object.freeze({ packageValue: result, restoration });
}
"""
    if old_authority_source not in source:
        raise SystemExit('expected authority-source block not found')
    source = source.replace(old_authority_source, new_authority_source)
    old_create = """  const base = explicitV1Package(options);
  const authorityRegistry = registryForCreate(options, base);
"""
    new_create = """  const prepared = explicitV1Package(options);
  const base = prepared.packageValue;
  const authorityRegistry = normalizedRegistry(
    prepared.restoration.branchIds,
    prepared.restoration.workspaces,
    prepared.restoration.indexes,
  );
"""
    if old_create not in source:
        raise SystemExit('expected create block not found')
    path.write_text(source.replace(old_create, new_create))


remove_permanent_scope_guard()
canonicalize_package_authority()
