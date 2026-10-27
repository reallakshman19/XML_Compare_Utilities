#!/usr/bin/env python3
"""TEST PREPARATION ONLY: execute unchanged immutable converters from Git objects.

No converter is copied into the product. Public S1 bytes must match the pinned hash.
"""
import hashlib
import importlib.abc
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import types
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent / 'fixtures'
F05 = 'a67487023bcafc13d68b62dbfc9bb74c61b3c64c'
R4 = '9da244e7670a21d963def16543679a6d983d5ba7'
SOURCE_SHA = '9a9cb14db4c13f5aac41cc74a60e7e528722eb5003d09f07192762ab6bfb1a2b'


def source(ref, path):
    return subprocess.check_output(['git', 'show', ref + ':' + path], cwd=ROOT)


class GitLoader(importlib.abc.Loader):
    def __init__(self, name):
        self.name = name

    def create_module(self, spec):
        return None

    def exec_module(self, module):
        path = 'prototypes/ciifr-xmlv11-f05/engine/' + self.name + '.py'
        module.__file__ = '/IMMUTABLE_GIT/' + path
        exec(compile(source(F05, path), module.__file__, 'exec'), module.__dict__)


class GitFinder(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, path=None, target=None):
        if fullname in {'cii_to_richinputxml', 'richcii_schema', 'richcii_validate',
                        'richinputxml_to_cii2019', 'v11_lexical'}:
            return importlib.util.spec_from_loader(fullname, GitLoader(fullname))


def load_r4(name, expected):
    path = 'prototypes/ciifr-r4/baseline_r3/' + name + '.py'
    code = source(R4, path)
    if hashlib.sha256(code).hexdigest() != expected:
        raise ValueError('Frozen R4 dependency hash mismatch: ' + name)
    module = types.ModuleType(name)
    module.__file__ = '/IMMUTABLE_GIT/' + path
    sys.modules[name] = module
    exec(compile(code, module.__file__, 'exec'), module.__dict__)
    return module


def main():
    data = source('c823f0c0edbeb315c07fa2911390dc781968146f', 'Benchmark/S1.CII')
    if len(data) != 108330 or hashlib.sha256(data).hexdigest() != SOURCE_SHA:
        raise ValueError('Original public S1 identity mismatch')
    sys.meta_path.insert(0, GitFinder())
    from cii_to_richinputxml import make_richxml
    root, _ = make_richxml(data)
    ET.indent(root)
    f05 = ET.tostring(root, encoding='utf-8', xml_declaration=True) + b'\n'
    load_r4('profile', '8d2c2123bce98a387d00a3aeca69c8e5dea6b3831e29f65e7760f6a5694204b2')
    engine = load_r4('engine', 'b2bb8ed87440e46f72833424cacd82e6605c47f372f146deec749ad2bb0ee264')
    r4 = engine.xml_bytes(engine.make_xml(data))
    OUT.mkdir(exist_ok=True)
    manifest = {'classification': 'PUBLIC_ORIGINAL_DERIVED_XML',
                'source': {'path': 'Benchmark/S1.CII', 'bytes': len(data), 'sha256': SOURCE_SHA},
                'converterCommits': {'F05': F05, 'R4': R4},
                'limits': 'Same original across two profiles; not an independent physical correspondence pair.',
                'files': {}}
    for name, payload in [('S1-F05.xml', f05), ('S1-R4.xml', r4)]:
        target = OUT / name
        if target.exists() and target.read_bytes() != payload:
            raise ValueError('Fixture exists with different bytes; back it up before replacing: ' + name)
        target.write_bytes(payload)
        manifest['files'][name] = {'bytes': len(payload), 'sha256': hashlib.sha256(payload).hexdigest()}
    target = OUT / 'manifest.json'
    content = json.dumps(manifest, indent=2) + '\n'
    if target.exists() and target.read_text() != content:
        raise ValueError('Manifest differs; back it up before replacing')
    target.write_text(content)
    print(content)


if __name__ == '__main__':
    main()
