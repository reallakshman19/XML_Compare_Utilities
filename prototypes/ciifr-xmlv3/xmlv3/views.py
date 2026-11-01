"""Reference-only connector view. Branch labels do not establish topology."""
import xml.etree.ElementTree as ET
from collections import defaultdict

from .baseline import ENGINE


def field_key(record, name):
    return record.get('id') + '/' + name


def field_index(storage):
    return {field_key(rec, f.get('name')): f
            for rec in storage.findall('./Sections/Section/Record')
            for f in ENGINE.fields(rec)}


def element_fields(record):
    return {f.get('name'): f for f in ENGINE.fields(record)}


def add_element(record, container, branch, nodes, aliases, names):
    rid = record.get('id')
    fields = element_fields(record)
    ET.SubElement(branch, 'ElementRef', ref=rid,
                  line_number_field=field_key(record, 'line_label'))
    element = ET.SubElement(container, 'Element', id=rid)
    data = ET.SubElement(element, 'Data')
    for name in fields:
        if name not in ('from_node', 'to_node') and not name.startswith('pointer_'):
            ET.SubElement(data, 'FieldRef', ref=field_key(record, name))
    for side in ('from', 'to'):
        number = ENGINE.integer_of(fields[side + '_node'], rid)
        node_id = 'node-' + str(number)
        ET.SubElement(element, 'EndpointRef', role=side, node=node_id,
                      field=field_key(record, side + '_node'))
        nodes[node_id].append((rid, side, field_key(record, side + '_node')))
        pointer = ENGINE.integer_of(fields['pointer_nodename'], rid)
        if pointer:
            name_record = names[pointer - 1]
            ref = field_key(name_record, side + '_node_name')
            aliases[node_id].append((ref, rid, side))
    for name, f in fields.items():
        if name.startswith('pointer_') and ENGINE.integer_of(f, rid):
            section = name.removeprefix('pointer_')
            target = f'{section}-{ENGINE.integer_of(f, rid):06d}'
            ET.SubElement(element, 'AuxiliaryRef', record=target,
                          field=field_key(record, name))


def add_nodes(container, issues, nodes, aliases, index):
    owners = defaultdict(set)
    for node_id in sorted(nodes, key=lambda n: int(n.removeprefix('node-'))):
        node = ET.SubElement(container, 'Node', id=node_id)
        data = ET.SubElement(node, 'Data')
        for element, side, field in nodes[node_id]:
            ET.SubElement(node, 'EndpointOccurrence', element=element, role=side, field=field)
        distinct = set()
        for ref, element, side in aliases[node_id]:
            ET.SubElement(data, 'NameOccurrence', field=ref, element=element, role=side)
            owners[ref].add(node_id)
            value = index[ref].get('value', '').strip()
            if value:
                distinct.add(value)
        if len(distinct) > 1:
            ET.SubElement(issues, 'Issue', kind='conflicting-node-names', node=node_id)
    for ref, node_ids in sorted(owners.items()):
        if len(node_ids) > 1:
            ET.SubElement(issues, 'Issue', kind='shared-name-field-across-nodes', field=ref,
                          nodes=' '.join(sorted(node_ids)))


def build_views(storage):
    views = ET.Element('EngineeringViews', authority='derived-references',
                       node_scope='model-local', branch_basis='exact-line-label-group')
    branches = ET.SubElement(views, 'Branches')
    elements = ET.SubElement(views, 'Elements')
    nodes_container = ET.SubElement(views, 'Nodes')
    issues = ET.SubElement(views, 'Issues')
    groups = {}
    nodes, aliases = defaultdict(list), defaultdict(list)
    names = ENGINE.get_section(storage, 'NODENAME').findall('Record')
    material = ENGINE.get_section(storage, 'MISCEL_1').find('Record')
    for number, record in enumerate(ENGINE.get_section(storage, 'ELEMENTS'), 1):
        label = element_fields(record)['line_label'].get('value')
        if label not in groups:
            groups[label] = ET.SubElement(branches, 'Branch', id=f'branch-{len(groups)+1:06d}')
        add_element(record, elements, groups[label], nodes, aliases, names)
        element = elements[-1]
        ET.SubElement(element.find('Data'), 'FieldRef', role='material-id',
                      ref=field_key(material, f'material_id_{number:06d}'))
    add_nodes(nodes_container, issues, nodes, aliases, field_index(storage))
    return views
