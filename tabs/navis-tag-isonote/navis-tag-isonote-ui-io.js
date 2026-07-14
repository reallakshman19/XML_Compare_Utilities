import { parseStagedJsonText } from './navis-tag-staged-tree.js';

export async function readNavisTagTableFile(file) {
  if (/\.(xlsx|xlsm|xlsb|xls|ods)$/i.test(file.name)) {
    const XLSX = await import('https://esm.sh/xlsx@0.18.5');
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_csv(sheet, { FS: '\t' });
  }
  return file.text();
}
export async function readNavisTagStagedFile(file) {
  if (!/\.zip$/i.test(file.name)) {
    const parsed = parseStagedJsonText(await file.text(), file.name);
    if (!parsed.documents.length) throw new Error(parsed.diagnostics[0]?.message || 'JSON parse failed');
    return parsed.documents;
  }
  const module = await import('https://esm.sh/jszip@3.10.1');
  const JSZip = module.default || module;
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const documents = [];
  for (const [name, entry] of Object.entries(zip.files)) {
    if (entry.dir || !/\.json$/i.test(name)) continue;
    const parsed = parseStagedJsonText(await entry.async('text'), name);
    documents.push(...parsed.documents);
  }
  if (!documents.length) throw new Error('ZIP contains no parseable JSON documents.');
  return documents;
}
export function downloadNavisTagFile(name, content, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url);
}
