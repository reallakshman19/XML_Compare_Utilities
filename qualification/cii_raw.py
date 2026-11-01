"""Isolated B001 physical-byte lab helpers; never a product CII writer.

Shapes are independently transcribed from retained physical source evidence.
No production parser, formatter, count, profile or relationship imports.
"""
from decimal import Decimal
import hashlib


CONTROL = ('ELEMENTS NOZZLES HANGERS NODENAME REDUCERS FLANGES BEND RIGID '
           'EXPJT RESTRANT DISPLMNT FORCMNT UNIFORM WIND OFFSETS ALLOWBLS '
           'SIF&TEES IZUP EQUIPMNT').split()
POINTERS = ('BEND RIGID EXPJT RESTRANT DISPLMNT FORCMNT UNIFORM WIND OFFSETS '
            'ALLOWBLS SIF&TEES NODENAME REDUCERS FLANGES EQUIPMNT').split()
RECORD_ROWS = dict(ELEMENTS=15, NODENAME=1, REDUCERS=2, BEND=3, RIGID=1,
                   EXPJT=1, RESTRANT=24, DISPLMNT=20, FORCMNT=20, UNIFORM=6,
                   WIND=1, OFFSETS=1, ALLOWBLS=28, EQUIPMNT=6)
RECORD_ROWS.update({'SIF&TEES': 14, 'FLANGES': None})
EXECUTION_KINDS = ('IIIIRI', 'IIRRII', 'IIIIRI', 'I')


def fingerprint(data):
    return {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}


def sections(data):
    data.decode('ascii')
    assert data.endswith(b'\r\n'), 'Missing final CRLF'
    assert data.count(b'\n') == data.count(b'\r\n'), 'Mixed terminators'
    lines = data.split(b'\r\n')[:-1]
    markers = [(i, r[3:].decode('ascii').strip()) for i, r in enumerate(lines)
               if r.startswith(b'#$ ')]
    assert len(markers) == 22 and markers[0][0] == 0, 'Section boundaries'
    assert len({n for _, n in markers}) == 22, 'Duplicate section'
    result = {}
    for j, (start, name) in enumerate(markers):
        stop = markers[j+1][0] if j+1 < len(markers) else len(lines)
        result[name] = (lines[start], tuple(lines[start+1:stop]))
    return result


def assemble(parts, replacements=None):
    replacements = replacements or {}
    return b''.join(header + b'\r\n' + b''.join(r + b'\r\n' for r in
                   replacements.get(name, rows))
                   for name, (header, rows) in parts.items())


def tokens(row):
    assert row[:2] == b'  ' and (len(row)-2) % 13 == 0, 'Numeric row shape'
    return tuple(row[i:i+13] for i in range(2, len(row), 13))


def exact_integer(token):
    value = Decimal(token.decode('ascii').strip())
    if not value.is_finite() or value != value.to_integral_value():
        raise ValueError('Expected finite exact integer')
    return int(value)


def integer_token(number):
    assert isinstance(number, int) and number >= 0, 'Integer fixture domain'
    result = str(number).rjust(13).encode('ascii')
    assert len(result) == 13, 'Fixture integer overflow'
    return result


def replace_slot(row, slot, number):
    fields = tokens(row)
    assert 0 <= slot < len(fields), 'Slot range'
    start = 2 + 13*slot
    return row[:start] + integer_token(number) + row[start+13:]


def control(parts):
    rows = parts['CONTROL'][1]
    assert [len(tokens(r)) for r in rows] == [6, 6, 6, 1], 'CONTROL layout'
    return dict(zip(CONTROL, [exact_integer(t) for r in rows for t in tokens(r)]))


def control_rows(parts, updates):
    rows = list(parts['CONTROL'][1])
    for name, number in updates.items():
        ordinal = CONTROL.index(name)
        row, slot = divmod(ordinal, 6)
        rows[row] = replace_slot(rows[row], slot, number)
    return tuple(rows)


def records(parts, name):
    rows = parts[name][1]
    width = RECORD_ROWS[name]
    if width is None:
        assert not rows, 'Unqualified populated FLANGES'
        return ()
    assert len(rows) % width == 0, 'Incomplete physical record'
    return tuple(rows[i:i+width] for i in range(0, len(rows), width))


def elements(parts):
    return records(parts, 'ELEMENTS')


def pointers(block):
    result = tuple(exact_integer(t) for r in block[12:15] for t in tokens(r))
    assert len(result) == 15, 'Pointer cardinality'
    return result


def pointer_block(block, slot, number):
    result = list(block)
    row, field = divmod(slot, 6)
    result[12+row] = replace_slot(result[12+row], field, number)
    return tuple(result)


def misc(parts):
    count = len(elements(parts))
    row_count = (count+5)//6
    rows = parts['MISCEL_1'][1]
    assert len(rows) == row_count+4, 'MISC row cardinality'
    material = tuple(t for row in rows[:row_count] for t in tokens(row))
    assert len(material) == count, 'Material cardinality'
    assert [len(tokens(r)) for r in rows[:row_count]] == [
        min(6, count-i) for i in range(0, count, 6)], 'Material packing'
    assert all(1 <= exact_integer(t) <= 699 for t in material), 'Material range'
    for row, kinds in zip(rows[row_count:], EXECUTION_KINDS):
        fields = tokens(row)
        assert len(fields) == len(kinds), 'Execution row cardinality'
        for token, kind in zip(fields, kinds):
            if kind == 'I':
                exact_integer(token)
            else:
                assert Decimal(token.decode().strip()).is_finite(), 'Finite real'
    return material, rows[row_count:]


def packed_materials(material):
    return tuple(b'  ' + b''.join(material[i:i+6])
                 for i in range(0, len(material), 6))


def physical_check(parts):
    declared = control(parts)
    actual = {name: len(records(parts, name)) for name in RECORD_ROWS}
    assert all(declared[n] == v for n, v in actual.items()), 'Logical counts'
    assert all(declared[n] == 0 for n in ('NOZZLES', 'HANGERS', 'IZUP')), 'Special profile'
    for block in elements(parts):
        assert all(0 <= p <= actual[n] for n, p in zip(POINTERS, pointers(block))), 'Pointer bounds'
    material, execution = misc(parts)
    return {'logical_counts': actual, 'control_entries': 19,
            'material_rows': (len(material)+5)//6,
            'last_material_fields': len(material) % 6 or 6,
            'execution_rows': len(execution)}
