/** Pure staged-document metadata extraction for revision preflight. */

function record(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
function text(value) { return String(value ?? '').trim(); }

function firstText(values) {
  for (const value of values) { const result = text(value); if (result) return result; }
  return 'UNKNOWN';
}

function declaredText(values) {
  for (const value of values) { const result = text(value); if (result) return result; }
  return '';
}

/** Root collection shape must be retained by later target writers. */
export function stagedRootShape(document) {
  if (Array.isArray(document)) return 'array';
  const root = record(document);
  for (const key of ['objects', 'hierarchy', 'branches']) if (Array.isArray(root[key])) return key;
  return 'unknown';
}

/** Extract declared engineering frame facts without inferring missing values. */
export function stagedDocumentMetadata(document) {
  const root = record(document);
  const metadata = record(root.metadata);
  const coordinateSystem = record(root.coordinateSystem);
  return Object.freeze({
    stagedSchema: declaredText([root.schema, metadata.schema]) || 'UNDECLARED',
    rootShape: stagedRootShape(document),
    unit: firstText([root.unit, root.units, metadata.unit, metadata.units]),
    verticalAxis: firstText([root.verticalAxis, root.upAxis, metadata.verticalAxis, coordinateSystem.upAxis]),
    coordinateFrame: firstText([root.coordinateFrame, root.frame, metadata.coordinateFrame, coordinateSystem.name]),
  });
}
