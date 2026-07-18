/** Pure staged-document metadata extraction for trusted revision preflight. */

import { cleanText, deepFreeze } from './revision-contract-utils.js';

function record(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function declared(values) {
  for (const value of values) {
    const result = cleanText(value);
    if (result) return result;
  }
  return 'UNKNOWN';
}

export function stagedDocumentMetadata(document) {
  const root = record(document);
  const metadata = record(root.metadata);
  const coordinates = record(root.coordinateSystem);
  return deepFreeze({
    stagedSchema: declared([root.schema, metadata.schema]),
    unit: declared([root.unit, root.units, metadata.unit, metadata.units]),
    verticalAxis: declared([root.verticalAxis, root.upAxis, metadata.verticalAxis, coordinates.upAxis]),
    coordinateFrame: declared([root.coordinateFrame, root.frame, metadata.coordinateFrame, coordinates.name]),
  });
}
