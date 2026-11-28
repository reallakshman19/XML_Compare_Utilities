#!/usr/bin/env python3
"""Offline standalone: accepts XML model only, never original CII argument."""
import argparse,json,sys
from engine import CIIError,load_xml,write_cii,save_new,fingerprint

def main():
    p=argparse.ArgumentParser();p.add_argument('--input',required=True);p.add_argument('--output',required=True);a=p.parse_args()
    try:
        source=load_xml(a.input);b=write_cii(source);save_new(a.output,b,a.input)
        print(json.dumps({'PASS':True,'output':fingerprint(b)},sort_keys=True));return 0
    except (CIIError,OSError,ValueError) as e:print(f'FAIL: {e}',file=sys.stderr);return 1
if __name__=='__main__':sys.exit(main())
