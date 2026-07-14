from pathlib import Path
import re

_original_subn = re.subn

def _literal_subn(pattern, replacement, string, count=0, flags=0):
    if isinstance(replacement, str):
        return _original_subn(pattern, lambda _match: replacement, string, count=count, flags=flags)
    return _original_subn(pattern, replacement, string, count=count, flags=flags)

def replace_once(source, old, new, label):
    count = source.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one match, found {count}')
    return source.replace(old, new, 1)

re.subn = _literal_subn
patch_path = Path('scripts/apply-nti-coordinate-normalization.py')
patch_source = patch_path.read_text(encoding='utf-8')
old = '''source = replace_once(source, "  { key: 'tableRowIndex', label: 'Table Row' },", "  { key: 'tableRowIndex', label: 'Table Row' }, { key: 'identitySelectionEvidence', label: 'Identity Selection Evidence' }, { key: 'traceOnlyEvidence', label: 'Trace-only Evidence' }, { key: 'navisProximityEvidence', label: 'Navis Proximity Evidence' },")'''
new = old[:-1] + ''', 'identity evidence headers')'''
if old in patch_source:
    patch_source = patch_source.replace(old, new, 1)
exec(compile(patch_source, str(patch_path), 'exec'), {'__name__': '__main__', '__file__': str(patch_path)})

# Reference is identity-selection evidence and must exist before optional index refinement.
staged_path = Path('tabs/navis-tag-isonote/navis-tag-staged-tree.js')
staged = staged_path.read_text(encoding='utf-8')
staged = replace_once(
    staged,
    '  normalizeConfig,\n  normalizeSupportIdentity,',
    '  normalizeConfig,\n  normalizeReference,\n  normalizeSupportIdentity,',
    'staged normalizeReference import',
)
staged = replace_once(
    staged,
    '  const identity = valueForIdentity(node, config.jsonIdentityPaths);\n  const positionEvidence = firstConfiguredValue(node, config.jsonPositionPaths);',
    '  const identity = valueForIdentity(node, config.jsonIdentityPaths);\n  const referenceEvidence = firstConfiguredValue(node, config.jsonReferencePaths);\n  const positionEvidence = firstConfiguredValue(node, config.jsonPositionPaths);',
    'staged reference evidence',
)
staged = replace_once(
    staged,
    "    identityPath: identity?.path || '',\n    positionRaw: positionEvidence.value,",
    "    identityPath: identity?.path || '',\n    referenceRaw: referenceEvidence.value ?? '',\n    reference: normalizeReference(referenceEvidence.value),\n    referencePath: referenceEvidence.path,\n    positionRaw: positionEvidence.value,",
    'staged reference facts',
)
staged = replace_once(
    staged,
    '      supportRoot: facts.supportRoot,\n      position: facts.position,',
    '      supportRoot: facts.supportRoot,\n      referenceRaw: facts.referenceRaw,\n      reference: facts.reference,\n      referencePath: facts.referencePath,\n      position: facts.position,',
    'staged index reference',
)
staged = replace_once(
    staged,
    '      positionedEntryCount: entries.filter((entry) => entry.position).length,\n      branchResolvedEntryCount:',
    '      positionedEntryCount: entries.filter((entry) => entry.position).length,\n      referenceEntryCount: entries.filter((entry) => entry.reference).length,\n      branchResolvedEntryCount:',
    'staged reference summary',
)
staged = replace_once(
    staged,
    "  const position = rankedPaths(catalogue, (entry) => (/POS|COORD|POINT|CENTER/i.test(entry.path) ? 35 : 0) + Math.round(sampleRate(entry, (sample) => Boolean(parseCoordinate(sample, 'auto'))) * 100));",
    "  const reference = rankedPaths(catalogue, (entry) => (/(?:^|\\.)(REF|REFERENCE|COMPONENTREFNO|CMPSUPREFN)$/i.test(entry.path) ? 80 : 0) + Math.round(sampleRate(entry, (sample) => /^=?[A-Z0-9]+\\/\\d+$/i.test(sample)) * 60));\n  const position = rankedPaths(catalogue, (entry) => (/POS|COORD|POINT|CENTER/i.test(entry.path) ? 35 : 0) + Math.round(sampleRate(entry, (sample) => Boolean(parseCoordinate(sample, 'auto'))) * 100));",
    'staged reference recommendation',
)
staged = replace_once(
    staged,
    '  return { identity, position, branch, pipe, zone, od, bore };',
    '  return { identity, reference, position, branch, pipe, zone, od, bore };',
    'staged recommendation return',
)
staged_path.write_text(staged, encoding='utf-8')
