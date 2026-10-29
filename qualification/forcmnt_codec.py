"""Experimental indexed FORCMNT evidence; no engineering field semantics.

Numeric lexical fields are the only body payload. The digest detects inconsistent
artifacts; it is neither authentication nor proof of correspondence to a source.
"""
from decimal import Decimal, InvalidOperation
import hashlib
import json
import re
import xml.etree.ElementTree as ET


SHAPE = (1, *([6] * 9), 1, *([6] * 9))
RECORD_BYTES = 1510
META = ('source_sha256 source_bytes body_start body_end first_line record_count '
        'element_count element_first_line element_start element_end').split()
FIXED = {'schema': 'forcmnt-section-evidence-1', 'purpose': 'qualification-only',
         'meanings': 'UNRESOLVED'}
NUMBER = re.compile(r' *[+-]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[Ee][+-]?[0-9]+)? *\Z')


def require(condition, message):
    if not condition:
        raise ValueError(message)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def real(lexeme):
    require(isinstance(lexeme, str) and len(lexeme) == 13,
            'Numeric lexical field must contain exactly13 ASCII characters')
    require(lexeme.isascii() and NUMBER.fullmatch(lexeme), 'Unsupported numeric lexeme')
    try:
        value = Decimal(lexeme.strip())
    except InvalidOperation as exc:
        raise ValueError('Invalid Decimal field') from exc
    require(value.is_finite(), 'Nonfinite scalar is unsupported')
    return value


def integer(lexeme):
    value = real(lexeme)
    require(value == value.to_integral_value(), 'Pointer/count must be exactly integral')
    require(-1_000_000_000 <= value <= 1_000_000_000, 'Qualification integer size limit')
    return int(value)


def natural(text, label, positive=False):
    require(isinstance(text, str) and len(text) <= 10 and re.fullmatch(r'0|[1-9][0-9]*', text),
            label + ': expected canonical nonnegative integer')
    value = int(text)
    require(not positive or value > 0, label + ': expected positive integer')
    return value


def structure(node):
    attrs = {k: v for k, v in node.attrib.items() if k != 'integrity'}
    text = node.text if node.tag in ('Field', 'Pointer') else None
    return [node.tag, sorted(attrs.items()), text, [structure(c) for c in node]]


def seal(root):
    root.set('integrity', sha(json.dumps(structure(root), ensure_ascii=True,
                                       separators=(',', ':')).encode('ascii')))


def node_contract(node, tag, attrs, children=None, text=False):
    require(node.tag == tag and set(node.attrib) == set(attrs), tag + ': schema attributes')
    if children is not None:
        require([c.tag for c in node] == children, tag + ': children/order/cardinality')
    if not text:
        require(not (node.text or '').strip(), tag + ': unexpected text payload')
    require(not (node.tail or '').strip(), tag + ': unexpected trailing text')


def metadata(root):
    node_contract(root, 'ForcmntSectionEvidence', [*META, *FIXED, 'body_sha256', 'integrity'],
                  ['Records', 'ElementPointers'])
    require(all(root.get(k) == v for k, v in FIXED.items()), 'Evidence purpose/meaning contract')
    for k in ('source_sha256', 'body_sha256', 'integrity'):
        require(re.fullmatch(r'[0-9a-f]{64}', root.get(k, '')), 'Invalid ' + k)
    meta = {k: natural(root.get(k), k, k in ('source_bytes', 'first_line',
            'record_count', 'element_count', 'element_first_line')) for k in META[1:]}
    require(meta['source_bytes'] <= 16_000_000 and meta['record_count'] <= 1000
            and meta['element_count'] <= 10_000, 'Qualification metadata size limit')
    require(meta['body_end'] - meta['body_start'] == meta['record_count'] * RECORD_BYTES,
            'Section span/count contract')
    require(0 <= meta['element_start'] < meta['element_end'] <= meta['body_start']
            < meta['body_end'] <= meta['source_bytes'], 'Source section bounds')
    return meta


def read_pointers(node, meta):
    node_contract(node, 'ElementPointers', [], ['Pointer'] * meta['element_count'])
    pointers, previous_end = [], meta['element_start']
    for ordinal, child in enumerate(node, 1):
        node_contract(child, 'Pointer', ['element', 'target', 'line', 'start', 'end'], [], True)
        require(child.get('element') == str(ordinal), 'Pointer occurrence/order')
        target = natural(child.get('target'), 'target')
        start, end = (natural(child.get(k), k) for k in ('start', 'end'))
        line = natural(child.get('line'), 'line', True)
        require(line == meta['element_first_line'] + (ordinal - 1) * 15 + 12,
                'Pointer line provenance')
        require(previous_end <= start and end - start == 13 and
                end <= meta['element_end'], 'Pointer byte provenance')
        require(integer(child.text) == target and target <= meta['record_count'],
                'Pointer lexeme/target/range')
        pointers.append({**child.attrib, 'lexeme': child.text})
        previous_end = end
    return pointers


def read_row(node, index, start, line, slot):
    count = SHAPE[index - 1]
    end = start + 4 + 13 * count
    node_contract(node, 'Row', ['index', 'line', 'start', 'end', 'prefix', 'eol'],
                  ['Field'] * count)
    expected = dict(index=str(index), line=str(line), start=str(start), end=str(end),
                    prefix='  ', eol='CRLF')
    require(node.attrib == expected, 'Row shape/layout/provenance')
    fields, tokens = [], []
    for column, field in enumerate(node, 1):
        node_contract(field, 'Field', ['slot', 'column', 'start', 'end', 'kind', 'value'], [], True)
        offset = start + 2 + (column - 1) * 13
        fixed = dict(slot=str(slot + column), column=str(column), start=str(offset),
                     end=str(offset + 13), kind='decimal')
        require(all(field.get(k) == v for k, v in fixed.items()), 'Field identity/provenance/type')
        require(field.get('value') == str(real(field.text)), 'Typed value/lexeme disagreement')
        fields.append({**field.attrib, 'lexeme': field.text, 'meaning': 'UNRESOLVED'})
        tokens.append(field.text.encode('ascii'))
    return b'  ' + b''.join(tokens) + b'\r\n', fields, end


def read_record(node, ordinal, meta, pointers):
    start = meta['body_start'] + (ordinal - 1) * RECORD_BYTES
    line = meta['first_line'] + (ordinal - 1) * 20
    node_contract(node, 'Record', ['ordinal', 'first_line', 'start', 'end', 'sha256'],
                  ['Owners', 'Rows'])
    expected = dict(ordinal=str(ordinal), first_line=str(line), start=str(start),
                    end=str(start + RECORD_BYTES))
    require(all(node.get(k) == v for k, v in expected.items()), 'Record identity/provenance')
    owners = ['element-' + p['element'].zfill(6) for p in pointers if int(p['target']) == ordinal]
    node_contract(node[0], 'Owners', [], ['Owner'] * len(owners))
    for child, ref in zip(node[0], owners):
        node_contract(child, 'Owner', ['pointer'], [])
        require(child.get('pointer') == ref, 'Owner reference disagrees with pointer inventory')
    node_contract(node[1], 'Rows', [], ['Row'] * 20)
    output, fields = [], []
    for index, row in enumerate(node[1], 1):
        raw, values, start = read_row(row, index, start, line + index - 1, len(fields))
        output.append(raw)
        fields.extend(values)
    body = b''.join(output)
    require(len(fields) == 110 and sha(body) == node.get('sha256'), 'Record payload fingerprint')
    return body, {'ordinal': ordinal, 'owners': owners, 'fields': fields,
                  'sha256': sha(body), 'ownership': 'unreferenced' if not owners else
                  ('shared' if len(owners) > 1 else 'one-owner')}


def decode(data):
    require(len(data) <= 8_000_000 and b'<!' not in data, 'XML size/declaration limit')
    try:
        root = ET.fromstring(data)
    except ET.ParseError as exc:
        raise ValueError('Malformed section XML') from exc
    meta = metadata(root)
    pointers = read_pointers(root[1], meta)
    node_contract(root[0], 'Records', [], ['Record'] * meta['record_count'])
    chunks, records = [], []
    for ordinal, node in enumerate(root[0], 1):
        raw, record = read_record(node, ordinal, meta, pointers)
        chunks.append(raw)
        records.append(record)
    body = b''.join(chunks)
    require(sha(body) == root.get('body_sha256'), 'Section payload fingerprint')
    expected = root.get('integrity')
    seal(root)
    require(root.get('integrity') == expected, 'Artifact consistency digest')
    return body, {'metadata': dict(root.attrib), 'records': records, 'pointers': pointers,
                  'zero_pointers': sum(p['target'] == '0' for p in pointers),
                  'meanings': 'UNRESOLVED', 'whole_file_conversion': 'NOT_SUPPORTED'}


def add_row(parent, raw, index, line, start, slot):
    require(raw.endswith(b'\r\n') and len(raw) == 4 + SHAPE[index - 1] * 13
            and raw[:2] == b'  ', 'Source row shape/CRLF')
    row = ET.SubElement(parent, 'Row', index=str(index), line=str(line), start=str(start),
                        end=str(start + len(raw)), prefix='  ', eol='CRLF')
    for column in range(SHAPE[index - 1]):
        offset = 2 + 13 * column
        text = raw[offset:offset + 13].decode('ascii')
        ET.SubElement(row, 'Field', slot=str(slot + column + 1), column=str(column + 1),
                      start=str(start + offset), end=str(start + offset + 13), kind='decimal',
                      value=str(real(text))).text = text
    return start + len(raw), slot + SHAPE[index - 1]


def encode(body, meta, pointers):
    require(len(body) == int(meta['record_count']) * RECORD_BYTES, 'Source section count/bytes')
    rows = body.splitlines(keepends=True)
    require(len(rows) == int(meta['record_count']) * 20, 'Source section row count')
    root = ET.Element('ForcmntSectionEvidence', {**FIXED, **{k: str(meta[k]) for k in META},
                                              'body_sha256': sha(body), 'integrity': '0' * 64})
    records = ET.SubElement(root, 'Records')
    for ordinal in range(1, int(meta['record_count']) + 1):
        block = rows[(ordinal - 1) * 20:ordinal * 20]
        start = int(meta['body_start']) + (ordinal - 1) * RECORD_BYTES
        first_line = int(meta['first_line']) + (ordinal - 1) * 20
        record = ET.SubElement(records, 'Record', ordinal=str(ordinal), start=str(start),
                               end=str(start + RECORD_BYTES), first_line=str(first_line),
                               sha256=sha(b''.join(block)))
        owners = ET.SubElement(record, 'Owners')
        for pointer in pointers:
            if int(pointer['target']) == ordinal:
                ET.SubElement(owners, 'Owner', pointer='element-' + str(pointer['element']).zfill(6))
        row_nodes, slot = ET.SubElement(record, 'Rows'), 0
        for index, raw in enumerate(block, 1):
            start, slot = add_row(row_nodes, raw, index, first_line + index - 1, start, slot)
    inventory = ET.SubElement(root, 'ElementPointers')
    for pointer in pointers:
        ET.SubElement(inventory, 'Pointer', {k: str(v) for k, v in pointer.items()
                                            if k != 'lexeme'}).text = pointer['lexeme']
    seal(root)
    result = ET.tostring(root, encoding='utf-8', xml_declaration=True)
    decode(result)
    return result
