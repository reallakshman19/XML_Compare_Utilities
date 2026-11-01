"""Private source-derived cases; none are native CAESAR-qualified models."""
from cii_raw import (assemble, control, control_rows, elements, exact_integer, misc,
                     packed_materials, pointer_block, pointers, sections)


def flatten(blocks):
    return tuple(row for block in blocks for row in block)


def growth(source, extra):
    original = sections(source)
    blocks = elements(original)
    materials, execution = misc(original)
    copied = blocks[:extra]
    replacement = {
        'CONTROL': control_rows(original, {'ELEMENTS': len(blocks)+extra}),
        'ELEMENTS': flatten(blocks+copied),
        'MISCEL_1': packed_materials(materials+materials[:extra])+execution}
    return {'id': f'growth-{len(blocks)+extra}', 'family': 'growth',
            'data': assemble(original, replacement), 'extra': extra,
            'expected_intended_match': True}


def reverse_growth(case, original_source):
    parts = sections(case['data'])
    keep = len(elements(parts))-case['extra']
    material, execution = misc(parts)
    output = assemble(parts, {
        'CONTROL': control_rows(parts, {'ELEMENTS': keep}),
        'ELEMENTS': flatten(elements(parts)[:keep]),
        'MISCEL_1': packed_materials(material[:keep])+execution})
    assert output == original_source, 'Growth reversal not original bytes'
    return output


def permutation(source, wrong=False):
    parts = sections(source)
    blocks = list(elements(parts))
    material, execution = misc(parts)
    pair = next(((i, j) for i in range(len(blocks)) for j in range(i+1, len(blocks))
                 if exact_integer(material[i]) != exact_integer(material[j])
                 and blocks[i] != blocks[j]), None)
    assert pair is not None, 'No discriminating actual element/material pair'
    i, j = pair
    blocks[i], blocks[j] = blocks[j], blocks[i]
    assigned = list(material)
    if not wrong:
        assigned[i], assigned[j] = assigned[j], assigned[i]
    return {'id': 'permutation-wrong' if wrong else 'permutation-paired',
            'family': 'permutation', 'source_pair_zero_based': [i, j],
            'expected_intended_match': not wrong,
            'data': assemble(parts, {'ELEMENTS': flatten(blocks),
                                    'MISCEL_1': packed_materials(assigned)+execution})}


def rigid_insertion(source, wrong=False):
    parts = sections(source)
    blocks = elements(parts)
    rigid = parts['RIGID'][1]
    owners = [(i, pointers(b)[1]) for i, b in enumerate(blocks) if pointers(b)[1]]
    choice = next(((owner, target, copy_index) for owner, target in owners
                   for copy_index, row in enumerate(rigid)
                   if row != rigid[target-1]), None)
    assert choice is not None, 'No discriminating actual RIGID payload pair'
    selected_owner, target, copy_index = choice
    changed = []
    for i, block in enumerate(blocks):
        old = pointers(block)[1]
        shift = old >= target and old > 0
        new = old+1 if shift and not (wrong and i == selected_owner) else old
        changed.append(pointer_block(block, 1, new) if new != old else block)
    inserted = rigid[:target-1]+(rigid[copy_index],)+rigid[target-1:]
    return {'id': 'rigid-wrong-owner' if wrong else 'rigid-reindexed',
            'family': 'rigid', 'target_one_based': target,
            'copied_source_ordinal': copy_index+1,
            'selected_owner_zero_based': selected_owner,
            'expected_intended_match': not wrong,
            'data': assemble(parts, {
                'CONTROL': control_rows(parts, {'RIGID': control(parts)['RIGID']+1}),
                'RIGID': inserted, 'ELEMENTS': flatten(changed)})}


def build_cases(source):
    return [growth(source, 1), growth(source, 2), permutation(source),
            permutation(source, True), rigid_insertion(source),
            rigid_insertion(source, True)]
