import {
  extractFamilyRoot,
  findField,
  makeDisplayName,
  makeExactMemberKey,
  parseNumber,
  parsePipeTag,
  parsePosition,
  rowsToObjects,
} from './ps-family-token-utils.js';
import { PS_FAMILY_ELEMENT_DETAIL_SCHEMA } from './ps-family-clash-audit-contract.js';

export function parsePsFamilyElementDetailCsv(csvText) {
  const objects = rowsToObjects(csvText);
  const rows = [];
  const diagnostics = [];

  objects.forEach((object) => {
    const rawName = findField(object, ['name of the element', 'item name', 'element name', 'name']);
    if (!String(rawName || '').trim()) {
      diagnostics.push({ level: 'WARN', code: 'DETAIL_NAME_MISSING', message: `Row ${object.__rowIndex} has no element name.` });
      return;
    }
    const pipe = findField(object, ['pipe']);
    const positionText = findField(object, ['position']);
    const position = parsePosition(positionText);
    if (positionText && !position) diagnostics.push({ level: 'WARN', code: 'POSITION_PARSE_FAILED', message: `Position could not be parsed for ${makeDisplayName(rawName)}.` });
    const pipeInfo = pipe ? parsePipeTag(pipe) : null;
    rows.push({
      schema: PS_FAMILY_ELEMENT_DETAIL_SCHEMA,
      rowIndex: object.__rowIndex,
      rawName,
      displayName: makeDisplayName(rawName),
      exactMemberKey: makeExactMemberKey(rawName),
      sourceFamily: extractFamilyRoot(rawName),
      p1bore: parseNumber(findField(object, ['p1bore', 'bore'])),
      pipe,
      pipeInfo,
      lineFamily: pipeInfo?.lineFamily || '',
      supportText: findField(object, ['rtext of detailing text', 'rtext', 'detailing text']),
      supportGap: findField(object, ['support gap', 'gap']),
      reference: findField(object, ['reference of the element', 'reference']),
      positionText,
      position,
      isometricNotes: findField(object, ['isometric notes', 'notes']),
      posFamilyId: '',
    });
  });

  if (!rows.length) diagnostics.push({ level: 'INFO', code: 'NO_ELEMENT_DETAILS', message: 'No element detail rows were parsed.' });
  return { rows, diagnostics };
}
