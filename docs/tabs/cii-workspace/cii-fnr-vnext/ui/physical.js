/* Independent, byte-addressed V11/V14 NODENAME field custody. No legacy runtime imports. */
const ascii = (bytes) => String.fromCharCode(...bytes);
const numeric = (s) => /^[+\-]?\d+(?:\.0*)?$/.test(s.trim()) ? Number(s.trim()) : NaN;
const fail = (code) => { throw new Error(code); };

export function scanLines(input) {
  if (!(input instanceof Uint8Array)) fail('TARGET_BYTES_REQUIRED');
  const lines = []; let start = 0;
  for (let i = 0; i < input.length; i++) {
    if (input[i] !== 10 && input[i] !== 13) continue;
    const end = i; const term = input[i] === 13 && input[i + 1] === 10 ? 2 : 1;
    lines.push({ start, end, next: i + term, text: ascii(input.subarray(start, end)) });
    i += term - 1; start = i + 1;
  }
  if (start < input.length) lines.push({ start, end: input.length, next: input.length, text: ascii(input.subarray(start)) });
  return lines;
}

function fixed(line, from, to, code) {
  if (!line || line.end - line.start < to) fail(`${code}_ROW_SHORT`);
  const value = line.text.slice(from, to);
  if (!/^[\x20-\x7e]*$/.test(value)) fail(`${code}_NON_ASCII`);
  return value;
}
function marker(text) { return /^\s*#\$\s*(\S.*?)\s*$/i.exec(text)?.[1]?.toUpperCase() || null; }

export function parseCii(bytes) {
  const lines = scanLines(bytes), sections = new Map(), order = [];
  let current = null;
  for (const line of lines) {
    const name = marker(line.text);
    if (name) {
      if (sections.has(name)) fail('DUPLICATE_SECTION_' + name);
      current = name; sections.set(name, []); order.push(name);
    } else if (current && line.text.trim()) sections.get(current).push(line);
  }
  if (!['VERSION', 'CONTROL', 'ELEMENTS'].every((key) => sections.has(key))) fail('REQUIRED_CII_SECTIONS_ABSENT');
  if (order[0] !== 'VERSION') fail('VERSION_SECTION_NOT_FIRST');
  const header = sections.get('VERSION')[0]?.text?.trim()?.split(/\s+/).map(Number) || [];
  const version = header[1];
  if (![11, 14].includes(version)) fail('UNSUPPORTED_CII_VERSION');
  const control = sections.get('CONTROL');
  const nonam = numeric(fixed(control[0], 41, 54, 'CONTROL_NONAM'));
  if (!Number.isSafeInteger(nonam) || nonam < 0) fail('CONTROL_NONAM_INVALID');
  const names = sections.get('NODENAME') || [];
  if (names.length !== nonam) fail('CONTROL_NODENAME_CARDINALITY_MISMATCH');
  const elementRows = sections.get('ELEMENTS');
  if (elementRows.length % 15 !== 0) fail('ELEMENT_RECORD_CARDINALITY_NOT_15');
  const elements = [], owners = new Map();
  for (let i = 0; i < elementRows.length; i += 15) {
    const row = elementRows[i];
    const from = numeric(fixed(row, 0, 15, 'ELEMENT_FROM'));
    const to = numeric(fixed(row, 15, 28, 'ELEMENT_TO'));
    if (![from, to].every(Number.isSafeInteger)) fail('ELEMENT_ENDPOINT_NOT_INTEGER');
    const pointer = numeric(fixed(elementRows[i + 13], 67, 80, 'ELEMENT_NODENAME_POINTER'));
    if (!Number.isSafeInteger(pointer) || pointer < 0 || pointer > nonam) fail('NODENAME_POINTER_INVALID');
    const element = { index: i / 15, from, to, pointer, witness: `${i / 15}:${from}:${to}` };
    elements.push(element);
    if (pointer) owners.set(pointer, [...(owners.get(pointer) || []), element]);
  }
  const fields = [];
  for (let i = 0; i < names.length; i++) {
    const line = names[i];
    const bound = owners.get(i + 1) || [];
    for (const [identity, a, b] of [['NODENAME.FROM', 2, 28], ['NODENAME.TO', 28, 53]]) {
      const before = fixed(line, a, b, identity);
      fields.push({ section: 'NODENAME', fieldIdentity: identity,
        byteStart: line.start + a, byteEnd: line.start + b, before,
        pointer: i + 1, owners: bound.map((item) => item.witness),
        shared: bound.length !== 1, orphan: bound.length === 0 });
    }
  }
  return { version, lines, sections: order, counts: Object.fromEntries([...sections].map(([k,v]) => [k,v.length])),
    elements, nonam, fields };
}

export function sameStructure(a, b) {
  return a.version === b.version && JSON.stringify(a.sections) === JSON.stringify(b.sections)
    && JSON.stringify(a.counts) === JSON.stringify(b.counts)
    && JSON.stringify(a.elements) === JSON.stringify(b.elements)
    && a.nonam === b.nonam && a.lines.length === b.lines.length
    && a.lines.every((line, i) => line.next - line.end === b.lines[i].next - b.lines[i].end);
}
