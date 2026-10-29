"""Explicit local commands; JSON receipts report actual produced bytes."""
import argparse
import json
from pathlib import Path

from .core import (edit_diameter, fingerprint, from_cii, load_xml, summary,
                   to_cii, xml_bytes)
from .intake import read_bounded_xml
from .dependencies import inspect_dependencies
from .baseline import ENGINE_SHA, PROFILE_SHA
from .publish import publish_new


def parser():
    result = argparse.ArgumentParser(description='Bounded byte-exact CII / XMLv3 converter')
    commands = result.add_subparsers(dest='command', required=True)
    for name in ('to-xml', 'to-cii'):
        command = commands.add_parser(name)
        command.add_argument('input', type=Path)
        command.add_argument('output', type=Path)
    for name in ('verify', 'inspect', 'inspect-dependencies'):
        commands.add_parser(name).add_argument('input', type=Path)
    command = commands.add_parser('edit-diameter')
    command.add_argument('input', type=Path)
    command.add_argument('element')
    command.add_argument('value')
    command.add_argument('output', type=Path)
    return result


def convert(args, data):
    if args.command == 'to-xml':
        root = from_cii(data)
        return xml_bytes(root), summary(root)
    root = load_xml(data)
    if args.command == 'edit-diameter':
        root = edit_diameter(root, args.element, args.value)
        return xml_bytes(root), summary(root)
    return to_cii(root), summary(root)


def main(argv=None):
    args = parser().parse_args(argv)
    xml_input = args.command in ('inspect', 'inspect-dependencies', 'to-cii', 'edit-diameter')
    data = read_bounded_xml(args.input) if xml_input else args.input.read_bytes()
    if args.command == 'verify':
        root = from_cii(data)
        output = to_cii(load_xml(xml_bytes(root)))
        if output != data:
            raise ValueError('XMLv3 exact round-trip failed; no output published')
        result = {'status': 'PASS', 'input': fingerprint(data),
                  'reconstructed': fingerprint(output), 'model': summary(root)}
    elif args.command == 'inspect-dependencies':
        root = load_xml(data)
        result = {'status': 'PASS', 'input': fingerprint(data),
                  'dependency_pins': {'engine_sha256': ENGINE_SHA,
                                      'profile_sha256': PROFILE_SHA},
                  'model': inspect_dependencies(root)}
    elif args.command == 'inspect':
        result = {'status': 'PASS', 'model': summary(load_xml(data))}
    else:
        output, model = convert(args, data)
        publish_new(args.output, output, args.input)
        result = {'status': 'PASS', 'output': fingerprint(output), 'model': model}
    print(json.dumps(result, indent=2))
    return 0
