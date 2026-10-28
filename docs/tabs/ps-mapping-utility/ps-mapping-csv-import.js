// Browser-independent CSV import for the two primary PS Mapping source tables.
// The existing resolver consumes TSV; parsing CSV here preserves quoted commas,
// embedded quotes, empty cells and Excel CRLF without modifying mapping logic.
export const PS_MAP_MAX_CSV_BYTES = 15 * 1024 * 1024;

export const PS_MAP_REFERENCE_MOCK_CSV = [
  'Line No,Node,Support No,Pipe size,ISONOTE,Mandatory',
  '"ASIM-1885-PL-8""-S8810109-01",5790,PS-123.1,8,"DO NOT REST [25mm GAP], GUIDE(1kN), [GUIDE GAP=10mm]",Yes',
  '"ASIM-1885-PL-8""-S8810109-01",5790,PS-123.2,8,"DO NOT REST [25mm GAP], GUIDE(1kN), [GUIDE GAP=10mm]",Yes',
  '"ASIM-1885-PL-8""-S8810110-01",6690,PS-126.1,8,"REST(2kN), LINE STOP(3kN), [LINE STOP GAP=20mm]",Yes',
].join('\r\n');

export const PS_MAP_MODEL_MOCK_CSV = [
  'Support No,Bore,pipe,DTXR,Support Gap,Mandatory',
  'PS-123.1,200,"ASIM-1885-PL-8""-S8810109-PP-01",GUIDE PDO-TYPE-604A/B,10,Yes',
  'PS-123.2,200,"ASIM-1885-PL-8""-S8810109-PP-01",Pipe Rest XRT01,25mm GAP BETWEEN BOP AND TOS,No',
  'PS-126.1,200,"ASIM-1885-PL-8""-S8810110-PP-01",PIPE STOP TYPE-602,20,Yes',
].join('\r\n');

export const PS_MAP_MOCK_CSV_BY_SOURCE = Object.freeze({
  table1CText: PS_MAP_REFERENCE_MOCK_CSV,
  table2Text: PS_MAP_MODEL_MOCK_CSV,
});

const TABLE_LABEL = Object.freeze({
  table1CText: 'Table 1 — Rich Reference',
  table2Text: 'Table 2 — Model PS',
});

function csvDelimiter(source) {
  // Read only the first physical line, excluding delimiters inside quoted labels.
  const first = String(source).split(/\r?\n/, 1)[0];
  let inQuotes = false;
  const counts = { ',': 0, ';': 0, '\t': 0 };
  for (let i = 0; i < first.length; i += 1) {
    const c = first[i];
    if (c === '"') {
      if (inQuotes && first[i + 1] === '"') { i += 1; continue; }
      inQuotes = !inQuotes;
    } else if (!inQuotes && Object.hasOwn(counts, c)) counts[c] += 1;
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (!sorted[0][1]) throw new Error('CSV header has no column delimiters. Export as comma-separated CSV.');
  return sorted[0][0];
}

export function parsePsMappingCsv(content) {
  const raw = String(content ?? '').replace(/^\uFEFF/, '');
  if (!raw.trim()) throw new Error('The CSV file is empty.');
  if (new TextEncoder().encode(raw).length > PS_MAP_MAX_CSV_BYTES) {
    throw new Error('CSV exceeds the 15 MiB safety limit.');
  }
  const source = raw.replace(/^sep=([,;\t])\r?\n/i, '');
  const delimiter = csvDelimiter(source);
  const rows = [];
  let row = [], value = '', inQuotes = false, afterQuote = false;
  let lineNumber = 1;
  function addCell() {
    row.push(value.trim());
    value = '';
    afterQuote = false;
  }
  function addRow() {
    addCell();
    if (row.some((cell) => cell !== '')) rows.push(row);
    row = [];
  }
  for (let i = 0; i < source.length; i += 1) {
    const c = source[i];
    if (inQuotes) {
      if (c === '"') {
        if (source[i + 1] === '"') { value += '"'; i += 1; }
        else { inQuotes = false; afterQuote = true; }
      } else {
        value += c;
        if (c === '\n') lineNumber += 1;
      }
      continue;
    }
    if (c === '"') {
      if (afterQuote || value.trim()) throw new Error('Unexpected quote near CSV line ' + lineNumber + '.');
      // Ignore spaces immediately before the opening quote.
      value = '';
      inQuotes = true;
    } else if (c === delimiter) {
      addCell();
    } else if (c === '\r' || c === '\n') {
      if (c === '\r' && source[i + 1] === '\n') i += 1;
      addRow();
      lineNumber += 1;
    } else if (afterQuote && !/\s/.test(c)) {
      throw new Error('Unexpected characters after closing quote near CSV line ' + lineNumber + '.');
    } else if (!afterQuote) {
      value += c;
    }
  }
  if (inQuotes) throw new Error('Unclosed quoted CSV cell near line ' + lineNumber + '.');
  if (row.length || value !== '' || afterQuote) addRow();
  if (rows.length < 2) throw new Error('CSV must contain a header and at least one data row.');
  const width = rows[0].length;
  if (width < 2) throw new Error('CSV must have at least two columns.');
  rows.forEach((cells, index) => {
    if (cells.length !== width) {
      throw new Error('CSV row ' + (index + 1) + ' has ' + cells.length +
        ' columns, but the header has ' + width + '. Check missing/extra commas and quotes.');
    }
  });
  // Flatten embedded line breaks/tabs so the existing TSV reader sees exactly
  // one logical record per line, and retain literal commas inside ISONOTEs.
  const tsv = rows.map((cells) => cells.map((cell) => cell.replace(/[\r\n\t]+/g, ' ').trim()).join('\t')).join('\n');
  return { tsv, rowCount: rows.length - 1, columnCount: width, delimiter };
}

export function readPsMappingCsvForSource(source, content) {
  if (!Object.hasOwn(TABLE_LABEL, source)) throw new Error('Unsupported PS Mapping table.');
  const parsed = parsePsMappingCsv(content);
  return { ...parsed, label: TABLE_LABEL[source] };
}
