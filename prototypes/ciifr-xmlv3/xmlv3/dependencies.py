"""Read-only CONTROL and positional MISC dependencies for the pinned B001 profile.

This is a transient projection of validated Storage, not an editor or new writer.
"""
from .baseline import ENGINE
from .core import storage_of, validate
from .views import field_key


SPECIAL_COUNTS = frozenset(('NOZZLES', 'HANGERS'))


def packed_material_rows(element_count):
    """Qualified six-slot arithmetic only; does not authorize a new CII shape."""
    if element_count < 0:
        raise ValueError('Negative element count')
    return [min(6, element_count - i) for i in range(0, element_count, 6)]


def control_entries(storage):
    control = ENGINE.get_section(storage, 'CONTROL').find('Record')
    result = []
    for row_index, row in enumerate(control.findall('Row')):
        for slot_index, field in enumerate(row.findall('Field')):
            name = ENGINE.COUNT_NAMES[len(result)]
            declared = ENGINE.integer_of(field, 'CONTROL/' + name)
            role = ('orientation-flag' if name == 'IZUP' else
                    'unsupported-special-count' if name in SPECIAL_COUNTS else
                    'logical-record-count')
            derived = (len(ENGINE.get_section(storage, name).findall('Record'))
                       if role == 'logical-record-count' else None)
            comparison = ('MATCH' if declared == derived else 'MISMATCH') if derived is not None else ('NOT_A_COUNT' if name == 'IZUP' else 'NOT_DERIVABLE')
            restriction = ('current profile only permits zero orientation flag' if name == 'IZUP'
                           else 'current profile only permits zero; populated grammar unqualified'
                           if name in SPECIAL_COUNTS else 'qualified logical Storage records')
            result.append({'name': name, 'field_ref': field_key(control, field.get('name')),
                           'role': role, 'declared': declared, 'derived_count': derived,
                           'comparison': comparison, 'profile_restriction': restriction,
                           'row_index_zero_based': row_index, 'slot_index_zero_based': slot_index,
                           'source_line': int(row.get('line'))})
    return result


def material_links(storage):
    links = storage.find('Relationships')
    return {link.get('from'): link for link in links.findall('Link')
            if link.get('type') == 'element-material'}


def material_associations(elements, material_record, links):
    """Associate physical slots by Storage ordinal, not field value uniqueness."""
    rows = material_record.findall('Row')
    result = []
    for ordinal, element in enumerate(elements, 1):
        row_index, slot_index = divmod(ordinal - 1, 6)
        row, field = rows[row_index], rows[row_index].findall('Field')[slot_index]
        material_number = ENGINE.integer_of(field, 'MISCEL_1 material assignment')
        link = links[element.get('id')]
        start = 2 + 13 * slot_index
        result.append({'element_record_id': element.get('id'), 'element_ordinal': ordinal,
                       'material_field_ref': field_key(material_record, field.get('name')),
                       'material_number': material_number, 'link_target': link.get('to'),
                       'link_resolution': link.get('resolution'),
                       'row_index_zero_based': row_index,
                       'slot_index_zero_based': slot_index, 'source_line': int(row.get('line')),
                       'field_ordinal': int(field.get('ordinal')),
                       'lexical_span_in_row': [start, start + 13]})
    return result


def row_shape(row, row_index, expected, record, *, include_fields=False):
    fields = row.findall('Field')
    result = {'row_index_zero_based': row_index, 'source_line': int(row.get('line')),
              'row_key': row.get('key'), 'observed_field_count': len(fields),
              'expected_field_count': len(expected),
              'field_count_match': len(fields) == len(expected)}
    if include_fields:
        result['fields'] = [dict(field_ref=field_key(record, field.get('name')),
                                 name=field.get('name'), kind=field.get('kind'),
                                 expected_kind=expected[j][1], value=field.get('value'),
                                 field_ordinal=int(field.get('ordinal')),
                                 slot_index_zero_based=j,
                                 lexical_span_in_row=[2 + 13*j, 2 + 13*(j+1)])
                            for j, field in enumerate(fields)]
    return result


def misc_layout(element_count, material_record):
    rows = material_record.findall('Row')
    expected = packed_material_rows(element_count)
    matrows = len(expected)
    materials = [row_shape(row, i, [None]*expected[i], material_record)
                 for i, row in enumerate(rows[:matrows])]
    execution = []
    for i, row in enumerate(rows[matrows:], matrows):
        _, contract, _ = ENGINE._row_contract('MISCEL_1', i, element_count)
        execution.append(row_shape(row, i, contract, material_record, include_fields=True))
    actual_ids = sum(f.get('name', '').startswith('material_id_')
                     for row in rows for f in row.findall('Field'))
    return {'element_count': element_count, 'expected_material_field_count': element_count,
            'observed_material_field_count': actual_ids,
            'material_field_count_match': actual_ids == element_count,
            'expected_material_row_count': matrows, 'observed_material_row_count': len(rows)-4,
            'material_rows': materials, 'expected_execution_row_count': 4,
            'observed_execution_row_count': len(execution), 'execution_rows': execution,
            'row_count_match': len(rows) == matrows + 4,
            'structural_recalculation': 'UNSUPPORTED'}


def inspect_dependencies(root):
    """Public validated entrypoint; reporting does not recalculate or mutate."""
    validate(root)
    storage = storage_of(root)
    elements = ENGINE.get_section(storage, 'ELEMENTS').findall('Record')
    misc = ENGINE.get_section(storage, 'MISCEL_1').find('Record')
    assignments = material_associations(elements, misc, material_links(storage))
    return {'profile': ENGINE.PROFILE, 'scope': 'qualified-B001-read-only-inspection',
            'engineering_acceptance': 'NOT_ESTABLISHED',
            'structural_recalculation': 'UNSUPPORTED',
            'unsupported_semantics': [
                'NOZZLES/HANGERS nonzero grammar not qualified',
                'IZUP nonzero orientation not qualified; IZUP is not a record count',
                'MISC option index engineering meanings not qualified',
                'material catalogue not loaded; identifiers are not properties',
                'element insertion, deletion, reordering and material reassignment unsupported'],
            'control': {'expected_entries': 19, 'expected_row_fields': [6, 6, 6, 1],
                        'observed_row_fields': [len(r.findall('Field')) for r in
                            ENGINE.get_section(storage, 'CONTROL').find('Record').findall('Row')],
                        'entries': control_entries(storage)},
            'misc': {**misc_layout(len(elements), misc), 'material_associations': assignments}}
