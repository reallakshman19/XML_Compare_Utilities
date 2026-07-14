from pathlib import Path
import json
import re


def read(path):
    return Path(path).read_text(encoding='utf-8')


def write(path, content):
    Path(path).write_text(content, encoding='utf-8')


def replace_once(source, old, new, label):
    count = source.count(old)
    if count == 0 and new in source:
        return source
    if count != 1:
        raise SystemExit(f'{label}: expected one match, found {count}')
    return source.replace(old, new, 1)


def regex_once(source, pattern, replacement, label):
    updated, count = re.subn(pattern, replacement, source, count=1, flags=re.S)
    if count == 0 and replacement.strip() in source:
        return source
    if count != 1:
        raise SystemExit(f'{label}: expected one regex match, found {count}')
    return updated


# Contracts and canonical coordinate normalization.
path = 'tabs/navis-tag-isonote/navis-tag-isonote-contracts.js'
source = read(path)
source = source.replace("navis-tag-isonote-audit/v4", "navis-tag-isonote-audit/v5")
source = source.replace("staged-json-canonical-tree/v4", "staged-json-canonical-tree/v5")
source = source.replace("navis-tag-identity-node-trace/v4", "navis-tag-identity-node-trace/v5")
source = replace_once(source, "  tableUnits: 'auto',\n", "  tableUnits: 'auto',\n  tableCoordinateProfileName: 'TABLE_DEFAULT',\n  tableEastingDatumMm: 0,\n  tableNorthingDatumMm: 0,\n  tableElevationDatumMm: 0,\n", 'table coordinate defaults')
source = replace_once(source, "  jsonUnits: 'auto',\n", "  jsonUnits: 'auto',\n  jsonCoordinateProfileName: 'JSON_DEFAULT',\n  jsonEastingDatumMm: 0,\n  jsonNorthingDatumMm: 0,\n  jsonElevationDatumMm: 0,\n", 'json coordinate defaults')
source = replace_once(source, "  navisUnits: 'auto',\n", "  navisUnits: 'auto',\n  navisCoordinateProfileName: 'NAVIS_DEFAULT',\n  navisEastingDatumMm: 0,\n  navisNorthingDatumMm: 0,\n  navisElevationDatumMm: 0,\n", 'navis coordinate defaults')
coordinate_block = r'''export function coordinateProfileOptions(config = {}, source = 'json') {
  const prefix = text(source).toLowerCase();
  const profilePrefix = prefix === 'table' ? 'table' : prefix === 'navis' ? 'navis' : 'json';
  return {
    profileName: text(config[`${profilePrefix}CoordinateProfileName`]) || `${profilePrefix.toUpperCase()}_DEFAULT`,
    eastingDatumMm: signedFiniteNumber(config[`${profilePrefix}EastingDatumMm`], 0),
    northingDatumMm: signedFiniteNumber(config[`${profilePrefix}NorthingDatumMm`], 0),
    elevationDatumMm: signedFiniteNumber(config[`${profilePrefix}ElevationDatumMm`], 0),
  };
}
function inlineCoordinateUnit(raw) {
  if (typeof raw !== 'string') return '';
  const units = [...raw.matchAll(/-?\d+(?:\.\d+)?(?:[Ee][+-]?\d+)?\s*(mm|cm|m|ft|in)\b/gi)].map((match) => match[1].toLowerCase());
  return units.length && units.every((unit) => unit === units[0]) ? units[0] : '';
}
function directionalObjectPoint(raw) {
  const entries = Object.fromEntries(Object.entries(raw || {}).map(([key, value]) => [String(key).toUpperCase(), value]));
  const choose = (positive, negative, ordinary) => {
    for (const key of positive) {
      const value = numeric(entries[key]);
      if (Number.isFinite(value)) return Math.abs(value);
    }
    for (const key of negative) {
      const value = numeric(entries[key]);
      if (Number.isFinite(value)) return -Math.abs(value);
    }
    for (const key of ordinary) {
      const value = numeric(entries[key]);
      if (Number.isFinite(value)) return value;
    }
    return null;
  };
  const x = choose(['E', 'EAST', 'EASTING'], ['W', 'WEST', 'WESTING'], ['X']);
  const y = choose(['N', 'NORTH', 'NORTHING'], ['S', 'SOUTH', 'SOUTHING'], ['Y']);
  const z = choose(['U', 'UP', 'EL', 'ELEV', 'ELEVATION'], ['D', 'DOWN'], ['Z']);
  return [x, y, z].every(Number.isFinite) ? { x, y, z } : null;
}
export function parseCoordinate(raw, unit = 'auto', options = {}) {
  if (raw == null || raw === '') return null;
  let point = null;
  let axisBasis = 'NUMERIC_TRIPLET';
  if (Array.isArray(raw)) {
    const values = raw.slice(0, 3).map(numeric);
    if (values.length === 3 && values.every(Number.isFinite)) point = { x: values[0], y: values[1], z: values[2] };
    axisBasis = 'ARRAY_XYZ';
  } else if (typeof raw === 'object') {
    point = directionalObjectPoint(raw);
    axisBasis = point && Object.keys(raw).some((key) => /^(E|W|N|S|U|D|EAST|WEST|NORTH|SOUTH|UP|DOWN|EL|ELEV|ELEVATION)$/i.test(key)) ? 'DIRECTIONAL_OBJECT' : 'OBJECT_XYZ';
  } else {
    const source = text(raw);
    const directional = {};
    const axisPattern = /\b(EASTING|EAST|WESTING|WEST|NORTHING|NORTH|SOUTHING|SOUTH|ELEVATION|ELEV|EL|UP|DOWN|E|W|N|S|U|D|Z)\s*[:=]?\s*(-?\d+(?:\.\d+)?(?:[Ee][+-]?\d+)?)(?:\s*(mm|cm|m|ft|in))?/gi;
    source.replace(axisPattern, (_, axis, value) => {
      const key = axis.toUpperCase();
      const magnitude = Math.abs(Number(value));
      if (/^(E|EAST|EASTING)$/.test(key)) directional.x = magnitude;
      else if (/^(W|WEST|WESTING)$/.test(key)) directional.x = -magnitude;
      else if (/^(N|NORTH|NORTHING)$/.test(key)) directional.y = magnitude;
      else if (/^(S|SOUTH|SOUTHING)$/.test(key)) directional.y = -magnitude;
      else if (/^(D|DOWN)$/.test(key)) directional.z = -magnitude;
      else directional.z = magnitude;
      return '';
    });
    if ([directional.x, directional.y, directional.z].every(Number.isFinite)) {
      point = directional;
      axisBasis = 'DIRECTIONAL_ENU';
    }
    if (!point) {
      const values = source.match(/-?\d+(?:\.\d+)?(?:[Ee][+-]?\d+)?/g)?.slice(0, 3).map(Number) || [];
      if (values.length === 3 && values.every(Number.isFinite)) point = { x: values[0], y: values[1], z: values[2] };
    }
  }
  if (!point) return null;
  const requestedUnit = text(unit).toLowerCase() || 'auto';
  const detectedUnit = requestedUnit === 'auto' ? inlineCoordinateUnit(raw) : '';
  const effectiveUnit = detectedUnit || requestedUnit;
  const scale = unitScaleToMm(effectiveUnit, [point.x, point.y, point.z]);
  const datumOffsetMm = {
    x: signedFiniteNumber(options.eastingDatumMm, 0),
    y: signedFiniteNumber(options.northingDatumMm, 0),
    z: signedFiniteNumber(options.elevationDatumMm, 0),
  };
  const rawPoint = { ...point };
  return {
    x: (point.x * scale) + datumOffsetMm.x,
    y: (point.y * scale) + datumOffsetMm.y,
    z: (point.z * scale) + datumOffsetMm.z,
    unitScale: scale,
    sourceUnit: effectiveUnit,
    requestedUnit,
    rawPoint,
    datumOffsetMm,
    profileName: text(options.profileName) || 'DEFAULT',
    axisBasis,
  };
}
'''
source = regex_once(source, r"export function parseCoordinate\(raw, unit = 'auto'\) \{.*?\n\}\n(?=function normalizeLookup)", coordinate_block, 'coordinate parser')
source = replace_once(source, "    coordinateDisagreementToleranceMm: finiteNumber(input.coordinateDisagreementToleranceMm, defaults.coordinateDisagreementToleranceMm),\n", "    coordinateDisagreementToleranceMm: finiteNumber(input.coordinateDisagreementToleranceMm, defaults.coordinateDisagreementToleranceMm),\n    tableEastingDatumMm: signedFiniteNumber(input.tableEastingDatumMm, defaults.tableEastingDatumMm),\n    tableNorthingDatumMm: signedFiniteNumber(input.tableNorthingDatumMm, defaults.tableNorthingDatumMm),\n    tableElevationDatumMm: signedFiniteNumber(input.tableElevationDatumMm, defaults.tableElevationDatumMm),\n    jsonEastingDatumMm: signedFiniteNumber(input.jsonEastingDatumMm, defaults.jsonEastingDatumMm),\n    jsonNorthingDatumMm: signedFiniteNumber(input.jsonNorthingDatumMm, defaults.jsonNorthingDatumMm),\n    jsonElevationDatumMm: signedFiniteNumber(input.jsonElevationDatumMm, defaults.jsonElevationDatumMm),\n    navisEastingDatumMm: signedFiniteNumber(input.navisEastingDatumMm, defaults.navisEastingDatumMm),\n    navisNorthingDatumMm: signedFiniteNumber(input.navisNorthingDatumMm, defaults.navisNorthingDatumMm),\n    navisElevationDatumMm: signedFiniteNumber(input.navisElevationDatumMm, defaults.navisElevationDatumMm),\n", 'normalize datum offsets')
source = replace_once(source, "function finiteNumber(value, fallback) {\n", "function signedFiniteNumber(value, fallback = 0) {\n  const number = Number(value);\n  return Number.isFinite(number) ? number : fallback;\n}\nfunction finiteNumber(value, fallback) {\n", 'signed number helper')
write(path, source)

# Table coordinate profile.
path = 'tabs/navis-tag-isonote/navis-tag-table-source.js'
source = read(path)
source = replace_once(source, "import { normalizeConfig, normalizeReference, normalizeSupportIdentity, parseCoordinate, supportRoot, text } from './navis-tag-isonote-contracts.js';", "import { coordinateProfileOptions, normalizeConfig, normalizeReference, normalizeSupportIdentity, parseCoordinate, supportRoot, text } from './navis-tag-isonote-contracts.js';", 'table source import')
source = source.replace("parseCoordinate(raw, config.tableUnits)", "parseCoordinate(raw, config.tableUnits, coordinateProfileOptions(config, 'table'))")
write(path, source)

# Staged JSON hierarchy coordinate profile and provenance.
path = 'tabs/navis-tag-isonote/navis-tag-staged-tree.js'
source = read(path)
source = replace_once(source, "  STAGED_JSON_TREE_SCHEMA,\n", "  STAGED_JSON_TREE_SCHEMA,\n  coordinateProfileOptions,\n", 'staged coordinate import')
source = replace_once(source, "  const position = parseCoordinate(positionEvidence.value, config.jsonUnits);", "  const position = parseCoordinate(positionEvidence.value, config.jsonUnits, coordinateProfileOptions(config, 'json'));", 'staged position parse')
source = replace_once(source, "    positionUnits: config.jsonUnits,\n", "    positionUnits: config.jsonUnits,\n    positionSourceUnit: position?.sourceUnit || '',\n    positionUnitScale: position?.unitScale ?? null,\n    positionRawPoint: position?.rawPoint || null,\n    positionDatumOffsetMm: position?.datumOffsetMm || coordinateProfileOptions(config, 'json'),\n    positionProfileName: position?.profileName || config.jsonCoordinateProfileName,\n    positionAxisBasis: position?.axisBasis || '',\n", 'staged position provenance')
source = replace_once(source, "      positionPath: facts.positionPath,\n", "      positionPath: facts.positionPath,\n      positionSourceUnit: facts.positionSourceUnit,\n      positionUnitScale: facts.positionUnitScale,\n      positionRawPoint: facts.positionRawPoint,\n      positionDatumOffsetMm: facts.positionDatumOffsetMm,\n      positionProfileName: facts.positionProfileName,\n      positionAxisBasis: facts.positionAxisBasis,\n", 'staged index provenance')
write(path, source)

# Navis coordinate profile remains independent from JSON/table datum.
path = 'tabs/navis-tag-isonote/navis-tag-xml-parser.js'
source = read(path)
source = replace_once(source, "import { NAVIS_TAG_EVIDENCE_SCHEMA, unitScaleToMm } from './navis-tag-isonote-contracts.js';", "import { NAVIS_TAG_EVIDENCE_SCHEMA, coordinateProfileOptions, normalizeConfig, parseCoordinate } from './navis-tag-isonote-contracts.js';", 'navis parser import')
source = replace_once(source, "  const source = String(xmlText || '');\n  const diagnostics = [];", "  const source = String(xmlText || '');\n  const config = normalizeConfig(inputConfig);\n  const diagnostics = [];", 'navis normalized config')
source = replace_once(source, "  const units = rootUnit(source, inputConfig.navisUnits);", "  const units = rootUnit(source, config.navisUnits);", 'navis units config')
source = replace_once(source, "      const scale = unitScaleToMm(units, rawPosition ? Object.values(rawPosition) : []);\n      const position = rawPosition ? { x: rawPosition.x * scale, y: rawPosition.y * scale, z: rawPosition.z * scale, unitScale: scale, sourceUnit: units } : null;", "      const position = rawPosition ? parseCoordinate(rawPosition, units, coordinateProfileOptions(config, 'navis')) : null;", 'navis position normalization')
source = replace_once(source, "        rawPosition, position, positionSource, units, tagAttributes: tagAttrs, diagnostics: codes,", "        rawPosition, position, positionSource, units, coordinateProfileName: position?.profileName || config.navisCoordinateProfileName, datumOffsetMm: position?.datumOffsetMm || null, tagAttributes: tagAttrs, diagnostics: codes,", 'navis provenance')
source = replace_once(source, "      units,\n", "      units,\n      coordinateProfileName: config.navisCoordinateProfileName,\n      datumOffsetMm: coordinateProfileOptions(config, 'navis'),\n", 'navis summary provenance')
write(path, source)

# Explicit evidence-layer separation in Identity Node Trace.
path = 'tabs/navis-tag-isonote/navis-tag-identity-trace.js'
source = read(path)
selection_block = """      identitySelectionEvidence: {
        candidatePool: matchType,
        tableIdentityRaw: record.identityRaw,
        canonicalIdentity: record.identity,
        supportRoot: record.supportRoot,
        tableReference: record.inputReference,
        tablePipe: record.inputPipe,
        candidateCount: ranked.length,
        selectionStatus: selection.status,
        selectionReason: selection.reason,
        scoreGap: selection.scoreGap ?? null,
        selectedNodeId: selected?.nodeId || '',
        selectedIdentity: selected?.identity || '',
        selectedReference: selected?.reference || '',
        selectedBranch: selected?.resolvedBranch || selected?.resolvedPipe || '',
        referenceMatch: selected ? referenceMatches(record, selected) : false,
        pipeBranchMatch: selected ? branchMatches(record, selected) : false,
        positionAvailable: Boolean(selected?.position),
        physicalOdAvailable: Number.isFinite(selected?.odMm),
      },
      traceOnlyEvidence: {
        sourceFile: selected?.sourceFile || '',
        nodeId: selected?.nodeId || '',
        jsonPath: selected?.jsonPath || '',
        ancestorIds: selected?.ancestorIds || [],
        hierarchyPath: selected?.hierarchyPath || [],
        rawType: selected?.rawType || '',
        rawName: selected?.rawName || '',
        identityPath: selected?.identityPath || '',
        referencePath: selected?.referencePath || '',
        branchPath: selected?.resolvedBranchPath || '',
        pipePath: selected?.resolvedPipePath || '',
        zonePath: selected?.resolvedZonePath || '',
      },
      navisProximityEvidence: {
        positionRaw: selected?.positionRaw ?? '',
        canonicalPosition: selected?.position || null,
        positionSourcePath: selected?.positionPath || '',
        positionSourceUnit: selected?.positionSourceUnit || selected?.position?.sourceUnit || '',
        positionUnitScale: selected?.positionUnitScale ?? selected?.position?.unitScale ?? null,
        positionRawPoint: selected?.positionRawPoint || selected?.position?.rawPoint || null,
        positionDatumOffsetMm: selected?.positionDatumOffsetMm || selected?.position?.datumOffsetMm || null,
        positionProfileName: selected?.positionProfileName || selected?.position?.profileName || config.jsonCoordinateProfileName,
        positionAxisBasis: selected?.positionAxisBasis || selected?.position?.axisBasis || '',
        boreNominalMm: selected?.boreNominalMm ?? null,
        borePath: selected?.borePath || '',
        physicalOdMm: selected?.odMm ?? null,
        odPath: selected?.odPath || '',
        odSource: selected?.odSource || 'NONE',
        navisStatus: 'PENDING_NAVIS_RESOLUTION',
      },
"""
source = replace_once(source, "      inputPipeColumn: record.inputPipeColumn,\n      matchType,", "      inputPipeColumn: record.inputPipeColumn,\n" + selection_block + "      matchType,", 'identity evidence layers')
source = replace_once(source, "      supportIsonote: decision.supportIsonote || '',\n", "      supportIsonote: decision.supportIsonote || '',\n      navisProximityEvidence: {\n        ...(row.navisProximityEvidence || {}),\n        navisStatus: decision.status,\n        selectedEvidenceId: decision.selectedEvidenceId || '',\n        selectedViewName: selected?.viewName || '',\n        selectedViewGuid: selected?.viewGuid || decision.selectedViewGuid || '',\n        selectedTagId: selected?.tagId || decision.selectedTagId || '',\n        selectedCommentId: selected?.commentId || decision.selectedCommentId || '',\n        selectedCommentBody: selected?.commentBody || '',\n        selectedNavisPosition: selected?.tagPosition || null,\n        selectedNavisPositionSource: selected?.positionSource || '',\n        deltaEMm: selected?.deltaEMm ?? null,\n        deltaNMm: selected?.deltaNMm ?? null,\n        deltaElMm: selected?.deltaElMm ?? null,\n        verticalBasis: selected?.verticalBasis || '',\n        verticalResidualMm: selected?.verticalResidualMm ?? null,\n      },\n", 'attach proximity evidence')
write(path, source)

# UI configuration and evidence-layer visibility.
path = 'tabs/navis-tag-isonote/navis-tag-isonote-ui-view.js'
source = read(path)
source = replace_once(source, "    <label class=\"nti-field\">Table coordinate units${unitsSelect('tableUnits', cfg.tableUnits, true)}</label>\n", "    <label class=\"nti-field\">Table coordinate units${unitsSelect('tableUnits', cfg.tableUnits, true)}</label>\n    <label class=\"nti-field\">Table coordinate profile<input data-nti-config=\"tableCoordinateProfileName\" value=\"${esc(cfg.tableCoordinateProfileName)}\"></label>\n    <label class=\"nti-field\">Table Easting datum mm<input type=\"number\" data-nti-config=\"tableEastingDatumMm\" value=\"${esc(cfg.tableEastingDatumMm)}\"></label>\n    <label class=\"nti-field\">Table Northing datum mm<input type=\"number\" data-nti-config=\"tableNorthingDatumMm\" value=\"${esc(cfg.tableNorthingDatumMm)}\"></label>\n    <label class=\"nti-field\">Table Elevation datum mm<input type=\"number\" data-nti-config=\"tableElevationDatumMm\" value=\"${esc(cfg.tableElevationDatumMm)}\"></label>\n", 'table profile UI')
source = replace_once(source, "    <label class=\"nti-field\">JSON position units${unitsSelect('jsonUnits', cfg.jsonUnits, true)}</label>\n", "    <label class=\"nti-field\">JSON position units${unitsSelect('jsonUnits', cfg.jsonUnits, true)}</label>\n    <label class=\"nti-field\">JSON coordinate profile<input data-nti-config=\"jsonCoordinateProfileName\" value=\"${esc(cfg.jsonCoordinateProfileName)}\"></label>\n    <label class=\"nti-field\">JSON Easting datum mm<input type=\"number\" data-nti-config=\"jsonEastingDatumMm\" value=\"${esc(cfg.jsonEastingDatumMm)}\"></label>\n    <label class=\"nti-field\">JSON Northing datum mm<input type=\"number\" data-nti-config=\"jsonNorthingDatumMm\" value=\"${esc(cfg.jsonNorthingDatumMm)}\"></label>\n    <label class=\"nti-field\">JSON Elevation datum mm<input type=\"number\" data-nti-config=\"jsonElevationDatumMm\" value=\"${esc(cfg.jsonElevationDatumMm)}\"></label>\n", 'json profile UI')
source = replace_once(source, "    <label class=\"nti-field\">JSON bore units${unitsSelect('jsonBoreUnits', cfg.jsonBoreUnits, false)}</label>\n", "    <label class=\"nti-field\">JSON bore units${unitsSelect('jsonBoreUnits', cfg.jsonBoreUnits, false)}</label>\n    <label class=\"nti-field\">Navis coordinate units${unitsSelect('navisUnits', cfg.navisUnits, true)}</label>\n    <label class=\"nti-field\">Navis coordinate profile<input data-nti-config=\"navisCoordinateProfileName\" value=\"${esc(cfg.navisCoordinateProfileName)}\"></label>\n    <label class=\"nti-field\">Navis Easting datum mm<input type=\"number\" data-nti-config=\"navisEastingDatumMm\" value=\"${esc(cfg.navisEastingDatumMm)}\"></label>\n    <label class=\"nti-field\">Navis Northing datum mm<input type=\"number\" data-nti-config=\"navisNorthingDatumMm\" value=\"${esc(cfg.navisNorthingDatumMm)}\"></label>\n    <label class=\"nti-field\">Navis Elevation datum mm<input type=\"number\" data-nti-config=\"navisElevationDatumMm\" value=\"${esc(cfg.navisElevationDatumMm)}\"></label>\n", 'navis profile UI')
source = replace_once(source, "  { key: 'tableRowIndex', label: 'Table Row' },", "  { key: 'tableRowIndex', label: 'Table Row' }, { key: 'identitySelectionEvidence', label: 'Identity Selection Evidence' }, { key: 'traceOnlyEvidence', label: 'Trace-only Evidence' }, { key: 'navisProximityEvidence', label: 'Navis Proximity Evidence' },")
source = replace_once(source, "Table identity/reference → canonical identity → JSON node/path/reference → branch/pipe/zone and position source → Navis tag/comment resolution → selected Support ISONOTE.", "Identity selection evidence is separated from trace-only hierarchy evidence and later Navis proximity evidence. The end-to-end row remains table identity/reference → canonical identity → JSON node/path/reference → branch/pipe/zone and normalized coordinate profile → Navis tag/comment → selected Support ISONOTE.", 'identity help')
write(path, source)

# Static contracts.
path = 'tests/navis-tag-isonote-static.test.js'
source = read(path)
source = replace_once(source, "assert.match(utilityView, /data-nti-config=\"tableElevationColumn\"/);\n", "assert.match(utilityView, /data-nti-config=\"tableElevationColumn\"/);\nassert.match(utilityView, /data-nti-config=\"tableElevationDatumMm\"/);\nassert.match(utilityView, /data-nti-config=\"jsonElevationDatumMm\"/);\nassert.match(utilityView, /data-nti-config=\"navisElevationDatumMm\"/);\nassert.match(utilityView, /identitySelectionEvidence/);\nassert.match(utilityView, /traceOnlyEvidence/);\nassert.match(utilityView, /navisProximityEvidence/);\n", 'static coordinate contracts')
write(path, source)

# Add focused test to package suite.
path = 'package.json'
package = json.loads(read(path))
command = package['scripts']['test:navis-tag-isonote']
new_test = 'node tests/navis-tag-isonote-coordinate-profile.test.js'
if new_test not in command:
    package['scripts']['test:navis-tag-isonote'] = command + ' && ' + new_test
write(path, json.dumps(package, indent=2) + '\n')

print('NTI-005 coordinate normalization patch applied')
