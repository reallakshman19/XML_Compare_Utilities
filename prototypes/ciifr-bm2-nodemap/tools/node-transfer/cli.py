"""Checkpoint A CLI. JSON artifacts are PRIVATE; don't publish node identifiers.
Commands: catalogue, inspect, propose, accept-map, preview, approve, audit,
apply (gated). A manifest is a converter extraction, not a replacement CII.
"""
import argparse, json, sys
from pathlib import Path
from node_catalogue import load_model, public_catalogue, conditions, digest
from node_mapping import propose,accept
from transfer_plan import make_plan,approve,validate_plan_digest,recheck_preview_against_inputs
from export_audit import audit_candidate,apply_export_disabled
from displacement_profile import DOFS
from converter_adapter import extract_manifest, engine_identity, trial_structured_transfer


def emit(obj,path=None):
    s=json.dumps(obj,indent=2,ensure_ascii=True,sort_keys=True)+'\n'
    if path:
        p=Path(path)
        if p.exists(): raise ValueError('refusing to overwrite existing artifact')
        p.write_text(s,encoding='utf-8')
        print(json.dumps({'written':str(p),'sha256':digest(p.read_bytes()),'status':obj.get('status','CREATED')}))
    else: print(s,end='')

def main(argv=None):
    p=argparse.ArgumentParser(description='CIIFR R3 node-mapped displacement F05 intake; EXPORT_DISABLED')
    sub=p.add_subparsers(dest='cmd',required=True)
    def arg(q,*spec,**opts): q.add_argument(*spec,**opts)
    ex=sub.add_parser('extract');arg(ex,'cii',help='entire supported CII source');arg(ex,'--out',required=True,help='private validated node manifest')
    c=sub.add_parser('catalogue');arg(c,'manifest');arg(c,'--out')
    ins=sub.add_parser('inspect');arg(ins,'manifest');arg(ins,'--node',required=True,type=int);arg(ins,'--vector',required=True,type=int);arg(ins,'--out')
    pr=sub.add_parser('propose');arg(pr,'source');arg(pr,'target');arg(pr,'--mode',choices=['NUMBER','NAME','BOTH','EITHER'],required=True);arg(pr,'--out')
    ac=sub.add_parser('accept-map');arg(ac,'source');arg(ac,'target');arg(ac,'--pairs',required=True,help='e.g. 20:120,30:240');arg(ac,'--mode',choices=['NUMBER','NAME','BOTH','EITHER','MANUAL'],required=True);arg(ac,'--owner-acceptance',required=True);arg(ac,'--aliases',help='private alias selection JSON path');arg(ac,'--out',required=True)
    pv=sub.add_parser('preview');arg(pv,'source');arg(pv,'target');arg(pv,'--map',required=True);arg(pv,'--source-vector',required=True,type=int);arg(pv,'--target-vector',required=True,type=int);arg(pv,'--components',required=True);arg(pv,'--basis-ack',required=True);arg(pv,'--vector-ack',required=True);arg(pv,'--out',required=True)
    av=sub.add_parser('approve');arg(av,'plan');arg(av,'--source',required=True);arg(av,'--target',required=True);arg(av,'--map',required=True);arg(av,'--cells',default='',help='comma-separated exact decision IDs; all changed cells');arg(av,'--owner-acceptance',required=True);arg(av,'--out',required=True)
    tr=sub.add_parser('trial');arg(tr,'--source',required=True);arg(tr,'--target',required=True);arg(tr,'--map',required=True);arg(tr,'--plan',required=True);arg(tr,'--approval',required=True);arg(tr,'--out')
    au=sub.add_parser('audit');arg(au,'--target',required=True);arg(au,'--candidate',required=True);arg(au,'--plan',required=True);arg(au,'--approval',required=True);arg(au,'--out')
    ap=sub.add_parser('apply');arg(ap,'--plan',required=True);arg(ap,'--approval',required=True);arg(ap,'--source',required=True);arg(ap,'--target',required=True);arg(ap,'--destination',required=True)
    args=p.parse_args(argv)
    try:
        if args.cmd=='extract': emit(extract_manifest(args.cii),args.out)
        elif args.cmd=='catalogue': emit(public_catalogue(load_model(args.manifest)),args.out)
        elif args.cmd=='inspect':
            m=load_model(args.manifest)
            emit({'model_sha256':m['cii_sha256'],'node':args.node,'vector':args.vector,
                  'components':{d:conditions(m,args.node,args.vector,d) for d in DOFS},
                  'export':'EXPORT_DISABLED'},args.out)
        elif args.cmd=='propose':
            a=load_model(args.source);b=load_model(args.target)
            emit({'source_sha256':a['cii_sha256'],'target_sha256':b['cii_sha256'],
                  'mode':args.mode,'candidates':propose(a,b,args.mode),'status':'PROPOSED_NOT_ACCEPTED'},args.out)
        elif args.cmd=='accept-map':
            a=load_model(args.source);b=load_model(args.target)
            pairs=[]
            for part in args.pairs.split(','):
                x,y=part.split(':');pairs.append((int(x),int(y)))
            aliases=json.loads(Path(args.aliases).read_text()) if args.aliases else None
            emit(accept(a,b,pairs,args.owner_acceptance,args.mode,aliases),args.out)
        elif args.cmd=='preview':
            a=load_model(args.source);b=load_model(args.target)
            mp=json.loads(Path(args.map).read_text())
            emit(make_plan(a,b,mp,args.source_vector,args.target_vector,
                           args.components.split(','),args.basis_ack,args.vector_ack),args.out)
        elif args.cmd=='approve':
            plan=json.loads(Path(args.plan).read_text())
            recheck_preview_against_inputs(plan,load_model(args.source),load_model(args.target),json.loads(Path(args.map).read_text()))
            emit(approve(plan,args.owner_acceptance,[x for x in args.cells.split(',') if x]),args.out)
        elif args.cmd=='trial':
            source=load_model(args.source);target=load_model(args.target)
            mapping=json.loads(Path(args.map).read_text());plan=json.loads(Path(args.plan).read_text())
            approval=json.loads(Path(args.approval).read_text())
            emit(trial_structured_transfer(source,target,mapping,plan,approval),args.out)
        elif args.cmd=='audit':
            plan=json.loads(Path(args.plan).read_text()); approval=json.loads(Path(args.approval).read_text())
            emit(audit_candidate(args.target,args.candidate,plan,approval),args.out)
        elif args.cmd=='apply':
            # Reject before doing anything, and do not create/modify destination.
            apply_export_disabled(args.plan,args.approval,args.source,args.target,args.destination)
        return 0
    except (OSError,KeyError,ValueError,RuntimeError,TypeError,ArithmeticError) as exc:
        print('BLOCKED: '+str(exc),file=sys.stderr);return 2

if __name__=='__main__': sys.exit(main())
