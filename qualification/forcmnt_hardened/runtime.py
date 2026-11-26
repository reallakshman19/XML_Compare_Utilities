"""Section-only extract/reconstruct; no force meanings or full-file writer."""
import argparse
from pathlib import Path

from forcmnt_codec import decode, encode, sha
from forcmnt_physical import source_evidence
from io_guards import limited_read, new_destination, require, restrict_writer_open


SOURCE_BYTES = 2866002
SOURCE_SHA = 'abfa3ffc9281fe75d4170b2d885d554cb1f120dadedae7c7ab609548b63cc060'


def arguments(argv):
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='mode', required=True)
    extract = commands.add_parser('extract')
    extract.add_argument('--source', type=Path, required=True)
    extract.add_argument('--xml', type=Path, required=True)
    writer = commands.add_parser('reconstruct')
    writer.add_argument('--xml', type=Path, required=True)
    writer.add_argument('--output', type=Path, required=True)
    return parser.parse_args(argv)


def extract(args):
    output = new_destination(args.xml)
    source = args.source.resolve()
    data = limited_read(source, 16_000_000)
    require(len(data) == SOURCE_BYTES and sha(data) == SOURCE_SHA,
            'Source differs from pinned qualification fixture')
    body, meta, pointers = source_evidence(data)
    xml = encode(body, meta, pointers)
    require(decode(xml)[0] == body, 'Source section reconstruction differs')
    require(limited_read(source, 16_000_000) == data, 'Source changed during extraction')
    return output, xml, {'status': 'PASS_SECTION_EXTRACTION', 'records': meta['record_count'],
                         'source_bytes': len(data), 'source_sha256': sha(data),
                         'body_bytes': len(body), 'body_sha256': sha(body),
                         'pointer_occurrences': len(pointers), 'field_meanings': 'UNRESOLVED'}


def reconstruct(args, runtime_root):
    output = new_destination(args.output)
    xml = args.xml.resolve()
    data = limited_read(xml, 8_000_000)
    restrict_writer_open(xml, output, runtime_root)
    body, view = decode(data)
    return output, body, {'status': 'PASS_XML_ONLY_BODY', 'bytes': len(body), 'sha256': sha(body),
                          'pointer_occurrences': len(view['pointers']), 'field_meanings': 'UNRESOLVED',
                          'input_access': 'XML plus pinned runtime resources; original-source control denied',
                          'os_sandbox_claim': False}


def prepare(runtime_root, argv):
    args = arguments(argv)
    return extract(args) if args.mode == 'extract' else reconstruct(args, runtime_root)
