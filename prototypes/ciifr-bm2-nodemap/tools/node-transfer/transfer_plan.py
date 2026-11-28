"""Deterministic, immutable read-only plan with byte-span predictions.
No export path in this module: an independently repaired converter is mandatory.
"""
from decimal import Decimal
from pathlib import Path
import hashlib
from displacement_profile import DOFS, VERSION, profile_hash, format_like
from node_catalogue import canonical, digest, conditions
from node_mapping import verify

PLAN_SCHEMA='ciifr-node-transfer-plan/v1'
ENGINE_STATUS='EXPORT_DISABLED:F05_PINNED_REAL_TARGET_AND_BYTE_QUALIFICATION_NOT_RUN'

def implementation_code_hash():
    root=Path(__file__).resolve().parent
    modules=('displacement_profile.py','node_catalogue.py','node_mapping.py',
             'transfer_plan.py','export_audit.py','converter_adapter.py','cli.py')
    h=hashlib.sha256()
    for name in modules:
        content=(root/name).read_bytes()
        h.update(name.encode('ascii')+b'\0'+len(content).to_bytes(8,'big')+content)
    return h.hexdigest()

def _decision(source,target,src_node,dst_node,sv,tv,dof):
    key=f'{src_node}->{dst_node}:V{sv}->V{tv}:{dof}'
    x=conditions(source,src_node,sv,dof);y=conditions(target,dst_node,tv,dof)
    r={'decision_id':key,'source_node':src_node,'target_node':dst_node,'source_vector':sv,
       'target_vector':tv,'dof':dof,'source_candidates':x,'target_candidates':y,
       'status':'BLOCKED','reasons':[],'expected_span':None,'proposed_lexeme':None}
    if len(x)!=1: r['reasons'].append('MISSING_SOURCE_PRESCRIPTION' if not x else 'MULTIPLE_SOURCE_PRESCRIPTIONS')
    if len(y)!=1: r['reasons'].append('MISSING_TARGET_PRESCRIPTION' if not y else 'MULTIPLE_TARGET_PRESCRIPTIONS')
    if r['reasons']: return r
    sx=x[0]['cell'];ty=y[0]['cell']
    for prefix,item in (('SOURCE',x[0]),('TARGET',y[0])):
        if len(item['owners'])!=1: r['reasons'].append('UNSUPPORTED_SHARED_OWNERSHIP_'+prefix)
    s_state=sx['state']; t_state=ty['state']
    if s_state=='unsupported' or t_state=='unsupported': r['reasons'].append('UNSUPPORTED_VALUE')
    if (s_state=='sentinel') != (t_state=='sentinel'): r['reasons'].append('SENTINEL_STATE_TRANSITION_FORBIDDEN')
    r['source_value']=sx['value'];r['target_before']=ty['value'];r['proposed_value']=sx['value']
    r['source_state']=s_state;r['target_state']=t_state;r['proposed_state']=s_state
    r['target_before_lexeme']=ty['raw']
    r['target_record']=y[0]['record'];r['target_slot']=y[0]['slot'];r['target_owners']=y[0]['owners'];r['target_locator']=ty['locator']
    if r['reasons']: return r
    if s_state=='sentinel' and t_state=='sentinel':
        r['status']='NO_OP';return r
    try:
        replacement=format_like(ty['raw'].encode('ascii'),Decimal(sx['value']))
    except (ValueError,ArithmeticError) as e:
        r['reasons'].append('INEXACT_OR_OVERFLOW: '+str(e));return r
    if replacement==ty['raw'].encode('ascii'):
        r['status']='NO_OP';return r
    r['status']='CHANGE_REQUIRES_CELL_ACCEPTANCE';r['proposed_lexeme']=replacement.decode('ascii')
    r['expected_span']={'start':ty['start'],'end':ty['end'],'before_hex':ty['raw'].encode('ascii').hex(),'after_hex':replacement.hex()}
    return r

def make_plan(source,target,mapping,sv,tv,components,basis_ack,vector_ack,engine_id=None):
    from converter_adapter import engine_identity, PINNED
    actual_engine=engine_identity()
    if engine_id is not None and engine_id != actual_engine:
        raise ValueError('stale/mismatched converter code identity')
    engine_id=actual_engine
    verify(mapping,source,target)
    if type(sv) is not int or type(tv) is not int or not 1<=sv<=9 or not 1<=tv<=9:
        raise ValueError('vector 1..9 required')
    if not components or len(set(components))!=len(components) or not set(components)<={'DX','DY','DZ'}:
        raise ValueError('must select distinct translation DOFs only')
    if basis_ack!='GLOBAL_BASES_ALIGNED_OWNER_CONFIRMED' or vector_ack!='VECTOR_CORRESPONDENCE_OWNER_CONFIRMED':
        raise ValueError('explicit Owner basis and vector meaning acceptance missing')
    su=source['units'];tu=target['units']
    if su['displacement']!=tu['displacement'] or su['izup']!=tu['izup']:
        raise ValueError('units or IZUP incompatible, no conversion available')
    decisions=[_decision(source,target,p['source_node'],p['target_node'],sv,tv,d)
               for p in mapping['pairs'] for d in DOFS if d in components]
    status='BLOCKED' if any(x['status']=='BLOCKED' for x in decisions) else 'PREVIEW_READY'
    # All nine vectors and six DOFs included for contextual inspection; never changed.
    context=[]
    for p in mapping['pairs']:
        tn=p['target_node'];slots=[]
        for rid,r in target['_records'].items():
            for slot,n in enumerate(r['slots']):
                if n==tn:
                    slots.append({'record':rid,'slot':slot,'owners':r['owners'],'vectors':[
                        {'vector':v,'dofs':{d:conditions(target,tn,v,d) for d in DOFS}} for v in range(1,10)]})
        context.append({'target_node':tn,'target_prescriptions':slots})
    spans=[d['expected_span'] for d in decisions if d['expected_span']]
    starts=[(x['start'],x['end']) for x in spans]
    if len(starts)!=len(set(starts)): raise ValueError('same target cell requested twice')
    body={'schema':PLAN_SCHEMA,'source_sha256':source['cii_sha256'],'target_sha256':target['cii_sha256'],
          'mapping_digest':mapping['mapping_digest'],'source_manifest_digest':digest(canonical({k:v for k,v in source.items() if not k.startswith('_')})),
          'target_manifest_digest':digest(canonical({k:v for k,v in target.items() if not k.startswith('_')})),
          'source_vector':sv,'target_vector':tv,'components':sorted(components),
          'basis_ack':basis_ack,'vector_ack':vector_ack,'units':{'source':su,'target':tu},
          'parser_ids':{'source':source['parser_id'],'target':target['parser_id']},
          'writer_id':PINNED['richinputxml_to_cii2019.py'],'engine_id':engine_id,'implementation_code_sha256':implementation_code_hash(),
          'profile_version':VERSION,'profile_sha256':profile_hash(),
          'decisions':decisions,'read_only_target_context':context,'status':status,
          'export_gate':ENGINE_STATUS}
    return {**body,'plan_digest':digest(canonical(body))}

def approve(plan,actor,accepted_ids):
    validate_plan_digest(plan)
    if plan['status']!='PREVIEW_READY': raise ValueError('blocked plan: remove operations and preview again')
    if not actor: raise ValueError('Owner acceptance required')
    needed={d['decision_id'] for d in plan['decisions'] if d['status']=='CHANGE_REQUIRES_CELL_ACCEPTANCE'}
    ids=set(accepted_ids)
    if len(ids)!=len(accepted_ids) or ids!=needed: raise ValueError('every and only changed cell needs explicit acceptance')
    body={'schema':'ciifr-node-transfer-approval/v1','plan_digest':plan['plan_digest'],
          'approved_cell_ids':sorted(ids),'accepted_by_claim':actor,
          'acceptance_kind':'EXPLICIT_OWNER_CLAIM_NOT_AUTHENTICATED'}
    return {**body,'approval_digest':digest(canonical(body))}

def validate_plan_digest(plan):
    if digest(canonical({k:v for k,v in plan.items() if k!='plan_digest'}))!=plan.get('plan_digest'):
        raise ValueError('stale/modified plan')

def validate_approval(plan,approval):
    validate_plan_digest(plan)
    if approval['plan_digest']!=plan['plan_digest']: raise ValueError('wrong approval plan')
    if digest(canonical({k:v for k,v in approval.items() if k!='approval_digest'}))!=approval.get('approval_digest'):
        raise ValueError('modified approval')
    if set(approval['approved_cell_ids'])!={x['decision_id'] for x in plan['decisions'] if x['status']=='CHANGE_REQUIRES_CELL_ACCEPTANCE'}:
        raise ValueError('incomplete per-cell approvals')


def recheck_preview_against_inputs(plan, source, target, mapping):
    """Require fresh bytes/metadata/map prior to human approval.
    Apply must perform this recheck again in its eventual qualified adapter.
    """
    validate_plan_digest(plan)
    current=make_plan(source,target,mapping,plan['source_vector'],plan['target_vector'],
                      plan['components'],plan['basis_ack'],plan['vector_ack'],plan['engine_id'])
    if current['plan_digest']!=plan['plan_digest']:
        raise ValueError('stale plan: parsed inputs, map, units, choices or engine changed')
    return True
