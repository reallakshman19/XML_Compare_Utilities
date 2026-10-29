"""Structural consistency guard; its digest is not an authorization signature."""
import hashlib
import json


def locked_value(section, name):
    return (section == 'CONTROL' or name in ('from_node', 'to_node')
            or name.startswith(('pointer_', 'material_id_'))
            or section == 'COORDS')


def structure_contract(node, section=''):
    if node.tag == 'Section':
        section = node.get('name', '')
    attributes = dict(node.attrib)
    if node.tag == 'Field' and not locked_value(section, node.get('name', '')):
        attributes.pop('value', None)
        attributes.pop('edited', None)
    return [node.tag, sorted(attributes.items()),
            [structure_contract(child, section) for child in node]]


def structure_digest(storage):
    data = json.dumps(structure_contract(storage), ensure_ascii=True,
                      separators=(',', ':')).encode('ascii')
    return hashlib.sha256(data).hexdigest()


def view_contract(node):
    if (node.text or '').strip() or (node.tail or '').strip():
        raise ValueError('XMLv3 views contain references only; text values are prohibited')
    return [node.tag, sorted(node.attrib.items()), [view_contract(c) for c in node]]
