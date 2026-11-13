"""Raw-source expectations independent of converter APIs and output formatting.

Primary-authored: shares a raw decoder with the fixture builder. It is not a
distinct non-author review. Expectations come from original physical records,
explicit source ordinal mappings and literal changed-byte masks.
"""
import xml.etree.ElementTree as ET

from cii_raw import (CONTROL, POINTERS, control, elements, exact_integer,
                     fingerprint, misc, physical_check, pointers, sections)


def section_audit(source, derivative, allowed):
    before, after = sections(source), sections(derivative)
    assert list(before) == list(after), 'Changed section order'
    changed = []
    for name in before:
        assert before[name][0] == after[name][0], 'Changed header'
        if before[name] != after[name]:
            assert name in allowed, 'Unexpected changed section'
            changed.append(name)
    return changed


def control_audit(before, after, allowed):
    for row_i, (old, new) in enumerate(zip(before['CONTROL'][1], after['CONTROL'][1])):
        assert len(old) == len(new), 'CONTROL row width'
        allowed_bytes = set()
        for name in allowed:
            index = CONTROL.index(name)
            if index//6 == row_i:
                allowed_bytes.update(range(2+13*(index % 6), 15+13*(index % 6)))
        assert all(i in allowed_bytes for i, (a, b) in enumerate(zip(old, new)) if a != b), 'CONTROL outside mask'


def growth_expectation(before, after, extra):
    old, new = elements(before), elements(after)
    material, execution = misc(before)
    actual, suffix = misc(after)
    assert len(new) == len(old)+extra, 'Growth element count'
    assert new[:len(old)] == old and new[len(old):] == old[:extra], 'Growth payloads'
    assert actual == material+material[:extra], 'Growth association'
    assert suffix == execution, 'Execution suffix changed'
    assert control(after)['ELEMENTS'] == len(new), 'Growth CONTROL'
    control_audit(before, after, {'ELEMENTS'})
    return 0


def permutation_expectation(before, after, pair):
    old, new = elements(before), elements(after)
    original, execution = misc(before)
    actual, suffix = misc(after)
    i, j = pair
    expected = list(old)
    expected[i], expected[j] = old[j], old[i]
    assert new == tuple(expected), 'Permutation outside two blocks'
    assert suffix == execution, 'Execution suffix changed'
    expected_materials = list(original)
    expected_materials[i], expected_materials[j] = original[j], original[i]
    assert all(actual[k] == original[k] for k in range(len(old)) if k not in pair), 'Unrelated material changed'
    return sum(a != b for a, b in zip(expected_materials, actual))


def rigid_expectation(before, after, case):
    old, new = elements(before), elements(after)
    k, copy_index = case['target_one_based'], case['copied_source_ordinal']-1
    rigid = before['RIGID'][1]
    expected = rigid[:k-1]+(rigid[copy_index],)+rigid[k-1:]
    assert after['RIGID'][1] == expected, 'RIGID insertion payload scope'
    assert control(after)['RIGID'] == len(rigid)+1, 'RIGID count'
    control_audit(before, after, {'RIGID'})
    assert len(new) == len(old), 'RIGID changed element cardinality'
    mismatches = 0
    for owner, (a, b) in enumerate(zip(old, new)):
        old_target = pointers(a)[1]
        expected_target = old_target+1 if old_target >= k and old_target else old_target
        actual = pointers(b)
        assert all(actual[j] == pointers(a)[j] for j in range(15) if j != 1), 'Other pointer type changed'
        assert all(a[j] == b[j] for j in range(15) if j != 12), 'Other ELEMENT row changed'
        mask = set(range(15, 28))
        assert all(j in mask for j, (x, y) in enumerate(zip(a[12], b[12])) if x != y), 'Outside RIGID field'
        mismatches += actual[1] != expected_target
        if actual[1] == expected_target and old_target:
            assert after['RIGID'][1][actual[1]-1] == rigid[old_target-1], 'Target payload changed'
    return mismatches


def audit_case(source, case):
    before, after = sections(source), sections(case['data'])
    physical = physical_check(after)
    allowed = {'CONTROL', 'ELEMENTS', 'MISCEL_1'} if case['family'] == 'growth' else (
        {'ELEMENTS', 'MISCEL_1'} if case['family'] == 'permutation' else {'CONTROL', 'ELEMENTS', 'RIGID'})
    changed = section_audit(source, case['data'], allowed)
    if case['family'] == 'growth':
        mismatch = growth_expectation(before, after, case['extra'])
    elif case['family'] == 'permutation':
        mismatch = permutation_expectation(before, after, case['source_pair_zero_based'])
    else:
        mismatch = rigid_expectation(before, after, case)
    intended_match = mismatch == 0
    assert intended_match == case['expected_intended_match'], 'Falsifier did not discriminate'
    return {'raw_grammar': 'PASS', 'intended_association_match': intended_match,
            'intended_association_mismatches': mismatch, 'expected_falsifier_detected': not intended_match,
            'allowed_byte_scope': 'PASS', 'changed_sections': changed,
            'input': fingerprint(case['data']), **physical}


def report_expectation(parts, result):
    actual = physical_check(parts)
    model = result['model']
    entries = model['control']['entries']
    assert len(entries) == 19, 'Report CONTROL cardinality'
    declared = control(parts)
    for entry in entries:
        name = entry['name']
        assert entry['declared'] == declared[name], 'Report stored CONTROL'
        if name in actual['logical_counts']:
            assert entry['derived_count'] == actual['logical_counts'][name], 'Report derived count'
            assert entry['role'] == 'logical-record-count', 'Report ordinary role'
        else:
            assert entry['derived_count'] is None, 'Fabricated special count'
    material, _ = misc(parts)
    rows = model['misc']
    assert rows['observed_material_row_count'] == actual['material_rows'], 'Report material rows'
    associations = rows['material_associations']
    assert len(associations) == len(material), 'Report material cardinality'
    for i, (record, token) in enumerate(zip(associations, material), 1):
        assert record['element_ordinal'] == i, 'Report material ordinal'
        assert record['material_number'] == exact_integer(token), 'Report material value'
        assert record['link_target'] == f'material-{exact_integer(token)}', 'Report material link'
    assert model['structural_recalculation'] == 'UNSUPPORTED', 'Unexpected writer capability'
    return {'control_entries_compared': 19, 'ordinary_counts_compared': 16,
            'material_associations_compared': len(material), 'status': 'PASS'}


def xml_pointer_expectation(parts, xml_data):
    storage = ET.fromstring(xml_data).find('Storage')[0]
    section_root = storage.find('Sections')
    raw_blocks = elements(parts)
    element_records = section_root.find("Section[@name='ELEMENTS']").findall('Record')
    links = {(x.get('from'), x.get('field')): x for x in
             storage.find('Relationships').findall("Link[@type='element-auxiliary']")}
    assert len(element_records) == len(raw_blocks), 'XML element cardinality'
    examined = 0
    for block, record in zip(raw_blocks, element_records):
        fields = {f.get('name'): f for f in record.findall('./Row/Field')}
        for name, target in zip(POINTERS, pointers(block)):
            field = 'pointer_'+name.lower().replace('&', '_')
            assert exact_integer(fields[field].get('value').encode()) == target, 'XML pointer value'
            link = links.get((record.get('id'), field))
            if target:
                assert link is not None and int(link.get('storage-index')) == target, 'XML target index'
                assert link.get('to') == f"{name.lower().replace('&', '_')}-{target:06d}", 'XML target ID'
            else:
                assert link is None, 'Unexpected zero pointer link'
            examined += 1
    return {'all_pointer_values_and_links_compared': examined, 'status': 'PASS'}
