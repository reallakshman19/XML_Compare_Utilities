#!/usr/bin/env python3
import argparse,json,sys
from engine import CIIError,load_xml

def main():
    p=argparse.ArgumentParser();p.add_argument('--input',required=True);args=p.parse_args()
    try:
        root=load_xml(args.input)
        from engine import validate
        print(json.dumps({'PASS':True,'model':validate(root)},sort_keys=True));return 0
    except (CIIError,OSError,ValueError) as e:print(f'FAIL: {e}',file=sys.stderr);return 1
if __name__=='__main__':sys.exit(main())
