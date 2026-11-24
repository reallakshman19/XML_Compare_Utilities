"""Primary-authored source expectations and deliberate contrary cases.

Expected bytes use literal source slices; expected fields/pointers use the older
raw-byte lab reader, never the section codec's formatter or source scanner.
This is source-method separation, not distinct non-author assessment.
"""
from copy import deepcopy
from decimal import Decimal
import xml.etree.ElementTree as ET

import cii_raw as raw
from forcmnt_codec import decode, seal


def check(condition, message):
    if not condition:
        raise ValueError('Source oracle: ' + message)


def ownership_differences(source, inspection):
    parts = raw.sections(source)
    expected = [raw.pointers(block)[5] for block in raw.elements(parts)]
    actual = [int(p['target']) for p in inspection['pointers']]
    check(len(expected) == len(actual), 'pointer occurrence cardinality')
    return [i for i, (a, b) in enumerate(zip(expected, actual), 1) if a != b]


def compare_fields(expected_body, inspection, pinned):
    rows = expected_body.split(b'\r\n')[:-1]
    total = 0
    for i, record in enumerate(inspection['records']):
        cursor = pinned['records'][i]['source_span_zero_based'][0]
        slot = 0
        for row in rows[i * 20:(i + 1) * 20]:
            for column, token in enumerate(raw.tokens(row), 1):
                field = record['fields'][slot]
                offset = cursor + 2 + (column - 1) * 13
                check(field['lexeme'].encode('ascii') == token, 'literal field bytes/order')
                check(field['value'] == str(Decimal(token.decode('ascii').strip())), 'Decimal value')
                check((int(field['slot']), int(field['column'])) == (slot + 1, column), 'field identity')
                check((int(field['start']), int(field['end'])) == (offset, offset + 13), 'field span')
                slot += 1
            cursor += len(row) + 2
        check(slot == 110 and raw.fingerprint(expected_body[i*1510:(i+1)*1510]) ==
              {k: pinned['records'][i][k] for k in ('bytes', 'sha256')}, 'record bytes')
        total += slot
    return total


def compare_source(source, reconstructed, inspection, pinned):
    check(raw.fingerprint(source) == {k: pinned[k] for k in ('bytes', 'sha256')}, 'original identity')
    start = pinned['records'][0]['source_span_zero_based'][0]
    end = pinned['records'][-1]['source_span_zero_based'][1]
    expected = source[start:end]
    check(reconstructed == expected and raw.fingerprint(expected) == pinned['forcmnt_body'],
          'complete section bytes/length/SHA')
    parts = raw.sections(source)
    check(raw.control(parts)['FORCMNT'] == len(inspection['records']) == 6, 'logical records')
    check(not ownership_differences(source, inspection), 'all original pointer targets')
    meta = inspection['metadata']
    check(meta['source_sha256'] == raw.fingerprint(source)['sha256'] and
          int(meta['source_bytes']) == len(source), 'XML source identity')
    check((int(meta['body_start']), int(meta['body_end'])) == (start, end), 'body span')
    owners = {str(r['ordinal']): [int(p.removeprefix('element-')) for p in r['owners']]
              for r in inspection['records']}
    check(owners == pinned['owner_ordinals_by_record'], 'all original owners')
    fields = compare_fields(expected, inspection, pinned)
    pointer_fields(source, inspection)
    return dict(records=len(inspection['records']), rows=120, fields=fields,
                element_pointer_occurrences=len(inspection['pointers']), nonzero_owners=6,
                section_bytes=len(expected), section_sha256=raw.fingerprint(expected)['sha256'])


def pointer_fields(source, inspection):
    lines = source.split(b'\r\n')[:-1]
    first = next(i for i, line in enumerate(lines) if line.startswith(b'#$ ')
                 and line[3:].strip() == b'ELEMENTS') + 1
    positions, offset = [], 0
    for line in lines:
        positions.append(offset)
        offset += len(line) + 2
    for ordinal, p in enumerate(inspection['pointers']):
        row = first + ordinal * 15 + 12
        expected = raw.tokens(lines[row])[5]
        check(p['lexeme'].encode('ascii') == expected, 'raw pointer lexeme')
        check(int(p['line']) == row + 1, 'raw pointer line')
        check((int(p['start']), int(p['end'])) ==
              (positions[row] + 67, positions[row] + 80), 'raw pointer byte span')


def serial(root, reseal=True):
    if reseal:
        seal(root)
    return ET.tostring(root, encoding='utf-8', xml_declaration=True)


def swap(parent):
    parent[0], parent[1] = parent[1], parent[0]


def bad_half(root):
    rows = root.find('Records/Record/Rows')
    field = rows[9][-1]
    rows[9].remove(field)
    rows[10].append(field)


def negative_cases():
    field = 'Records/Record/Rows/Row/Field'
    rows = 'Records/Record/Rows'
    cases = [
        ('missing-field', lambda t: t.find(rows)[0].remove(t.find(field))),
        ('extra-field', lambda t: t.find(rows)[0].append(deepcopy(t.find(field)))),
        ('reordered-fields', lambda t: swap(t.find(rows)[1])),
        ('duplicate-slot', lambda t: t.find(rows)[1][1].set('slot', '2')),
        ('wrong-width', lambda t: setattr(t.find(field), 'text', '0')),
        ('wrong-kind', lambda t: t.find(field).set('kind', 'integer')),
        ('value-lexeme-conflict', lambda t: t.find(field).set('value', '999')),
        ('nonfinite', lambda t: setattr(t.find(field), 'text', '          NaN')),
        ('record19rows', lambda t: t.find(rows).remove(t.find(rows)[-1])),
        ('record21rows', lambda t: t.find(rows).append(deepcopy(t.find(rows)[-1]))),
        ('half-boundary', bad_half),
        ('missing-record', lambda t: t[0].remove(t[0][-1])),
        ('duplicate-record', lambda t: t[0][1].set('ordinal', '1')),
        ('reordered-records', lambda t: swap(t[0])),
        ('field-span', lambda t: t.find(field).set('start', '1')),
        ('row-line', lambda t: t.find(rows)[0].set('line', '1')),
        ('prefix', lambda t: t.find(rows)[0].set('prefix', ' x')),
        ('terminator', lambda t: t.find(rows)[0].set('eol', 'LF')),
        ('pointer-range', lambda t: t[1][0].set('target', '7')),
        ('fractional-pointer', lambda t: setattr(t[1][0], 'text', ' 1.500000E+00')),
        ('huge-pointer-exponent', lambda t: setattr(t[1][0], 'text', ' 1.00000E+999')),
        ('pointer-provenance', lambda t: t[1][0].set('start', '0')),
        ('duplicate-pointer-occurrence', lambda t: t[1][1].set('element', '1')),
        ('wrong-owner-reference', lambda t: t[0][0][0][0].set('pointer', 'element-000001')),
        ('section-count', lambda t: t.set('record_count', '7')),
        ('count-size-limit', lambda t: t.set('element_count', '9999999999')),
        ('guessed-meaning', lambda t: t.set('meanings', 'FX1')),
        ('opaque-payload', lambda t: ET.SubElement(t, 'OriginalBytes')),
        ('section-fingerprint', lambda t: t.set('body_sha256', '0' * 64)),
    ]
    return cases


def negative_checks(xml):
    results = []
    for name, mutate in negative_cases():
        root = ET.fromstring(xml)
        mutate(root)
        results.append(rejection(name, serial(root)))
    results.append(rejection('truncated-xml', xml[:-1]))
    results.append(rejection('doctype', b'<!DOCTYPE x>' + xml))
    root = ET.fromstring(xml)
    root.set('source_sha256', '0' * 64)
    results.append(rejection('stale-source-provenance-digest', serial(root, False)))
    return results


def rejection(name, data):
    try:
        decode(data)
    except ValueError as exc:
        return {'case': name, 'status': 'PASS_REJECTED', 'reason': str(exc), 'basis': 'SYNTHETIC'}
    raise ValueError('Negative accepted: ' + name)


def wrong_valid_owner(xml, source):
    root = ET.fromstring(xml)
    pointer = next(p for p in root[1] if p.get('target') == '1')
    ordinal = pointer.get('element')
    pointer.set('target', '2')
    pointer.text = '2'.rjust(13)
    ref = 'element-' + ordinal.zfill(6)
    owner = next(o for o in root[0][0][0] if o.get('pointer') == ref)
    root[0][0][0].remove(owner)
    root[0][1][0].append(owner)
    root[0][1][0][:] = sorted(root[0][1][0], key=lambda n: n.get('pointer'))
    mutated = serial(root)
    _, inspection = decode(mutated)
    mismatches = ownership_differences(source, inspection)
    check(mismatches == [int(ordinal)], 'wrong valid target must yield one intended-owner mismatch')
    check(inspection['records'][0]['ownership'] == 'unreferenced' and
          inspection['records'][1]['ownership'] == 'shared', 'unreferenced/shared states')
    return {'case': 'self-consistent-wrong-valid-owner', 'status': 'PASS_DISCRIMINATED',
            'mismatching_occurrences': len(mismatches), 'codec_accepts_consistent_artifact': True,
            'unreferenced_and_shared_states': 'PASS',
            'basis': 'SYNTHETIC; source oracle, not authentication or native validity'}


def lexical_change(xml, original_body):
    root = ET.fromstring(xml)
    field = root.find('Records/Record/Rows')[1][0]
    token = b' 1.234567E+01'
    offset = int(field.get('start')) - int(root.get('body_start'))
    check(len(token) == 13 and original_body[offset:offset + 13] != token, 'literal causal splice')
    expected = original_body[:offset] + token + original_body[offset + 13:]
    field.text = token.decode('ascii')
    field.set('value', str(Decimal(field.text.strip())))
    root[0][0].set('sha256', raw.fingerprint(expected[:1510])['sha256'])
    root.set('body_sha256', raw.fingerprint(expected)['sha256'])
    result = serial(root)
    actual, _ = decode(result)
    check(actual == expected, 'XML field causality outside literal splice')
    return result, expected, {'case': 'indexed-field-causality', 'status': 'PASS',
                              'basis': 'SYNTHETIC literal13-byte splice; no force-edit semantics',
                              'offset_in_section': offset, **raw.fingerprint(expected)}
