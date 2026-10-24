#!/usr/bin/env python3
"""Convert a private CII into independently structured RichInputXMLv2."""
import argparse, json, sys
from pathlib import Path
from engine import CIIError, fingerprint, make_xml, save_new, xml_bytes, validate

def main():
    a=argparse.ArgumentParser();a.add_argument('--input',required=True);a.add_argument('--output',required=True)
    args=a.parse_args()
    try:
        src=Path(args.input).read_bytes();root=make_xml(src)
        stats=validate(root);save_new(args.output,xml_bytes(root),args.input)
        print(json.dumps({'PASS':True,'input':fingerprint(src),'model':stats},sort_keys=True))
    except (CIIError, OSError, ValueError) as ex:print(f'FAIL: {ex}',file=sys.stderr);return 1
    return 0
if __name__=='__main__':sys.exit(main())
