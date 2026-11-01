"""XMLv3 envelope over pinned typed storage; no source-file replay."""
import copy
import hashlib
import re
import xml.etree.ElementTree as ET

from .baseline import ENGINE
from .guards import structure_digest, view_contract
from .views import build_views, element_fields


SCHEMA = 'RichInputXMLv3.0'
MAX_XML = 150_000_000


def storage_of(root):
    wrapper = root.find('Storage')
    if wrapper is None or wrapper.attrib or len(wrapper) != 1:
        raise ValueError('XMLv3 requires exactly one typed Storage model')
    if (wrapper.text or '').strip() or (wrapper.tail or '').strip():
        raise ValueError('XMLv3 Storage cannot contain opaque text payloads')
    return wrapper[0]


def validate(root):
    if root.tag != 'RichInputXMLv3' or root.get('schema') != SCHEMA:
        raise ValueError('XMLv3 unsupported root/schema')
    if root.get('profile') != ENGINE.PROFILE or set(root.attrib) != {
            'schema', 'profile', 'structure-sha256'}:
        raise ValueError('XMLv3 unsupported profile or envelope attributes')
    if [c.tag for c in root] != ['Storage', 'EngineeringViews']:
        raise ValueError('XMLv3 requires ordered Storage and EngineeringViews only')
    if (root.text or '').strip() or (root.tail or '').strip():
        raise ValueError('XMLv3 envelope cannot contain opaque text payloads')
    storage = storage_of(root)
    result = ENGINE.validate(storage)
    if root.get('structure-sha256') != structure_digest(storage):
        raise ValueError('XMLv3 structural/lexical contract changed; structural edits unsupported')
    expected = build_views(storage)
    if view_contract(root[1]) != view_contract(expected):
        raise ValueError('XMLv3 stale, duplicate or altered engineering references')
    return result


def from_cii(data):
    storage = ENGINE.make_xml(data)
    root = ET.Element('RichInputXMLv3', schema=SCHEMA, profile=ENGINE.PROFILE,
                      attrib={'structure-sha256': structure_digest(storage)})
    ET.SubElement(root, 'Storage').append(storage)
    root.append(build_views(storage))
    validate(root)
    return root


def load_xml(data):
    if len(data) > MAX_XML:
        raise ValueError('XMLv3 input exceeds 150 MB')
    if re.search(rb'<!\s*(?:DOCTYPE|ENTITY)', data.replace(b'\x00', b''), re.I):
        raise ValueError('XMLv3 DTD/entities prohibited')
    try:
        root = ET.fromstring(data)
    except ET.ParseError as error:
        raise ValueError(f'XMLv3 malformed XML: {error}') from error
    validate(root)
    return root


def to_cii(root):
    validate(root)
    return ENGINE.write_cii(storage_of(root))


def xml_bytes(root):
    validate(root)
    result = copy.deepcopy(root)
    ET.indent(result, space='  ')
    return ET.tostring(result, encoding='utf-8', xml_declaration=True)


def edit_diameter(root, element_id, value):
    validate(root)
    if ENGINE.dec(value, 'outside_diameter') <= 0:
        raise ValueError('XMLv3 diameter edit requires a positive value in source units')
    result = copy.deepcopy(root)
    records = ENGINE.get_section(storage_of(result), 'ELEMENTS')
    record = next((r for r in records if r.get('id') == element_id), None)
    if record is None:
        raise ValueError(f'XMLv3 unknown element: {element_id}')
    field = element_fields(record)['outside_diameter']
    field.set('value', value)
    field.set('edited', 'true')
    validate(result)
    return result


def fingerprint(data):
    return {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}


def summary(root):
    result = validate(root)
    views = root.find('EngineeringViews')
    result.update(schema=SCHEMA, branches=len(views.find('Branches')),
                  view_nodes=len(views.find('Nodes')),
                  issues=[dict(i.attrib) for i in views.find('Issues')])
    elements = result['elements']
    result['misc'] = {'material_assignments': elements,
                      'material_rows': (elements + 5) // 6,
                      'execution_rows': 4, 'structural_recalculation': 'UNSUPPORTED'}
    return result
