"""CLI for frozen-R3 roundtrips, with verified, failure-atomic output publication.

No verified result is presented at the requested output path until *all* artifacts
have been serialized successfully. An unsuccessful run removes private staging bytes.
"""
import argparse
import json
import os
import shutil
import sys
import tempfile
from pathlib import Path

from .core import hard_roundtrip, make_xml, snapshot, xml_only_rebuild, checksum
from .viewer import render_hierarchy


def publish(out: Path, xml: bytes | None, rebuilt: bytes, report: dict, model: dict | None) -> None:
    """Prepare same-filesystem staging, then rename as the only publication step.

    Output must be a fresh pathname with an existing parent. The final existence
    recheck is not an interprocess compare-and-swap: callers must not deliberately
    race writers to the same target. Staging is private (mode 0700 where supported).
    """
    parent = out.parent
    if not parent.is_dir():
        raise ValueError('output parent directory does not exist')
    if out.exists() or out.is_symlink():
        raise FileExistsError('output path already exists')
    stage = Path(tempfile.mkdtemp(prefix=f'.{out.name}.pending-', dir=parent))
    try:
        if xml is not None:
            (stage / 'model.xmlv2.xml').write_bytes(xml)
        (stage / 'reconstructed.CII').write_bytes(rebuilt)
        (stage / 'roundtrip_report.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
        if model is not None:
            (stage / 'hierarchy.json').write_text(json.dumps(model, indent=2) + '\n', encoding='utf-8')
            (stage / 'hierarchy.html').write_text(render_hierarchy(model), encoding='utf-8')
        if out.exists() or out.is_symlink():
            raise FileExistsError('output path appeared during staging')
        os.rename(stage, out)
    finally:
        if stage.exists():
            shutil.rmtree(stage)


def main():
    p = argparse.ArgumentParser(prog='python -m ciifr_r4')
    p.add_argument('--input', help='private local CII file; never uploaded')
    p.add_argument('--xml', help='XML-only regeneration, requires independently trusted original hash and byte size')
    p.add_argument('--expected-sha256', help='trusted original checksum')
    p.add_argument('--expected-bytes', type=int, help='trusted original byte length')
    p.add_argument('--out', required=True, help='fresh directory; existing destinations refused')
    p.add_argument('--no-tree', action='store_true')
    a = p.parse_args()
    out = Path(a.out)
    if bool(a.input) == bool(a.xml):
        p.error('specify exactly one of --input or --xml')
    if a.xml and (not a.expected_sha256 or a.expected_bytes is None):
        p.error('XML-only path requires --expected-sha256 and --expected-bytes')
    if out.exists() or out.is_symlink():
        p.error('output directory already exists: fail closed')
    try:
        if a.xml:
            rebuilt, report = xml_only_rebuild(Path(a.xml), a.expected_sha256, a.expected_bytes)
            xml = None
            model = None
        else:
            src = Path(a.input).read_bytes()
            if a.expected_sha256 and checksum(src)['sha256'] != a.expected_sha256.lower():
                raise ValueError('input does not match pinned fixture hash')
            if a.expected_bytes is not None and len(src) != a.expected_bytes:
                raise ValueError('input does not match pinned fixture size')
            xml, rebuilt, report = hard_roundtrip(src)
            model = None if a.no_tree else snapshot(make_xml(src))
        publish(out, xml, rebuilt, report, model)
        print(json.dumps({'gate': 'PASS', 'out': str(out),
                          'counts': model['counts'] if model else None,
                          'roundtrip': report}, sort_keys=True))
        return 0
    except Exception as e:
        print('FAIL_CLOSED', type(e).__name__, str(e), file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
