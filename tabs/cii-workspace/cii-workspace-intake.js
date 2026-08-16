import { parse as parseCaesarFile } from '../../parser/caesar-parser.js';
import { CII_WORKSPACE_SCHEMAS, deepFreeze } from './cii-workspace-contracts.js';

function parserAlias(fileName) {
  const name = String(fileName || 'model.cii').trim() || 'model.cii';
  return /\.cii$/i.test(name) ? name.replace(/\.cii$/i, '.accdb') : `${name}.accdb`;
}

function sectionRows(rawText, wanted) {
  const rows = String(rawText ?? '').split(/\r?\n/);
  const marker = new RegExp(`^\\s*#\\$\\s*${wanted}\\s*$`, 'i');
  const start = rows.findIndex((row) => marker.test(row));
  if (start < 0) return [];
  const out = [];
  for (let index = start + 1; index < rows.length; index += 1) {
    if (/^\s*#\$\s*/.test(rows[index])) break;
    if (rows[index].trim()) out.push(rows[index]);
  }
  return out;
}

function parseNodeNames(rawText, parsed) {
  const known = new Set(Object.keys(parsed?.nodes || {}).map(String));
  const names = new Map();
  for (const row of sectionRows(rawText, 'NODENAME')) {
    const match = row.match(/^\s*([+-]?\d+(?:\.0*)?)\s+(.+?)\s*$/);
    if (!match) continue;
    const nodeId = String(Math.round(Number(match[1])));
    const name = match[2].trim();
    if (!known.has(nodeId) || !name || /^[-+\d.E\s]+$/i.test(name)) continue;
    if (!names.has(nodeId)) names.set(nodeId, name);
  }
  return names;
}

async function sha256Text(text, cryptoRef) {
  if (!cryptoRef?.subtle) throw new Error('CII_WORKSPACE_SHA256_UNAVAILABLE');
  const bytes = new TextEncoder().encode(String(text ?? ''));
  const digest = await cryptoRef.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

export async function intakeCiiWorkspaceDocument(rawText, fileName, options = {}) {
  const sourceText = String(rawText ?? '');
  if (!sourceText.trim()) throw new Error('CII_WORKSPACE_EMPTY_INPUT');
  if (!/^#\$\s*(VERSION|CONTROL|ELEMENTS)/m.test(sourceText)) {
    throw new Error('CII_WORKSPACE_NEUTRAL_CII_REQUIRED');
  }
  const parsed = parseCaesarFile(sourceText, parserAlias(fileName));
  if (parsed.format !== 'NEUTRAL') throw new Error('CII_WORKSPACE_NEUTRAL_CII_REQUIRED');
  if (!parsed.elements?.length) throw new Error('CII_WORKSPACE_ELEMENTS_REQUIRED');
  if (parsed.errors?.length) throw new Error(`CII_WORKSPACE_PARSE_BLOCKED: ${parsed.errors[0].msg || parsed.errors[0]}`);
  const cryptoRef = options.cryptoRef ?? globalThis.crypto;
  const contentSha256 = await sha256Text(sourceText, cryptoRef);
  const nodeNames = parseNodeNames(sourceText, parsed);
  return deepFreeze({
    schema: CII_WORKSPACE_SCHEMAS.document,
    side: options.side === 'TARGET' ? 'TARGET' : 'SOURCE',
    fileName: String(fileName || 'model.cii'),
    contentSha256,
    textLength: sourceText.length,
    format: parsed.format,
    parserAuthority: 'parser/caesar-parser.js',
    parserAlias: parserAlias(fileName),
    parsed,
    nodeNames: Object.fromEntries([...nodeNames.entries()].sort((a, b) => Number(a[0]) - Number(b[0]))),
    summary: Object.freeze({
      elementCount: parsed.elements.length,
      nodeCount: Object.keys(parsed.nodes || {}).length,
      bendCount: parsed.bends?.length || 0,
      rigidRecordCount: parsed.rigids?.length || 0,
      nodeNameCount: nodeNames.size,
    }),
  });
}
