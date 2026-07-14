import assert from 'node:assert/strict';
import fs from 'node:fs';

const files = [
  'xml-compare/categorized-inputxml-api/categorized-inputxml-api-contracts.js',
  'xml-compare/categorized-inputxml-api/categorized-inputxml-api-model.js',
  'xml-compare/categorized-inputxml-api/categorized-inputxml-api-diagnostics.js',
  'xml-compare/categorized-inputxml-api/categorized-inputxml-api-source-export.js',
  'xml-compare/categorized-inputxml-api/categorized-inputxml-api-service.js',
  'xml-compare/categorized-inputxml-api/index.js',
];
const forbiddenRuntime = [
  'document.', 'window.', 'localStorage', 'sessionStorage',
  'new Worker', 'addEventListener(', 'fetch(', 'XMLHttpRequest',
];

function source(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

function closingBrace(text, openIndex) {
  let depth = 0, quote = '', escaped = false, lineComment = false, blockComment = false;
  for (let index = openIndex; index < text.length; index += 1) {
    const char = text[index], next = text[index + 1] || '';
    if (lineComment) { if (char === '\n') lineComment = false; continue; }
    if (blockComment) { if (char === '*' && next === '/') { blockComment = false; index += 1; } continue; }
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '/' && next === '/') { lineComment = true; index += 1; continue; }
    if (char === '/' && next === '*') { blockComment = true; index += 1; continue; }
    if (char === '"' || char === "'" || char === '`') { quote = char; continue; }
    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    if (depth === 0) return index;
  }
  return -1;
}

function functionLengths(text = '') {
  const rows = [], pattern = /(?:export\s+)?function\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/g;
  let match;
  while ((match = pattern.exec(text))) {
    const openIndex = text.indexOf('{', match.index), closeIndex = closingBrace(text, openIndex);
    assert.ok(closeIndex > openIndex, `Unable to resolve function ${match[1]}`);
    rows.push({ name: match[1], lines: text.slice(match.index, closeIndex + 1).split('\n').length });
    pattern.lastIndex = closeIndex + 1;
  }
  return rows;
}

for (const path of files) {
  const text = source(path), lines = text.split('\n').length;
  assert.ok(lines <= 300, `${path} exceeds 300 lines (${lines})`);
  assert.equal(/export\s+default\b/.test(text), false, `${path} uses a default export`);
  assert.equal(/from\s+['"]\.\.\/\.\.\/tabs\//.test(text), false, `${path} imports a UI tab module`);
  for (const token of forbiddenRuntime) assert.equal(text.includes(token), false, `${path} contains forbidden runtime token ${token}`);
  for (const fn of functionLengths(text)) assert.ok(fn.lines <= 40, `${path}:${fn.name} exceeds 40 lines (${fn.lines})`);
}

const indexSource = source('xml-compare/categorized-inputxml-api/index.js');
for (const publicName of [
  'createCategorizedInputXmlService',
  'validateCategorizedInputXml',
  'inspectCategorizedInputXml',
  'serializeCategorizedInputXml',
  'exportCategorizedSourceInputXml',
]) assert.ok(indexSource.includes(publicName), `Public API export missing: ${publicName}`);

console.log('CategorizedInputXML API structure checks passed');
