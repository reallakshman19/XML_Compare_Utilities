"""Explicit, private hash-bound node mapping; modes propose, never accept."""
from collections import defaultdict
from node_catalogue import canonical, digest

MODES=('NUMBER','NAME','BOTH','EITHER','MANUAL')

def propose(source, target, mode):
    if mode not in MODES[:-1]: raise ValueError('invalid proposal mode')
    src={x['node']:x for x in source['_catalogue']}; dst={x['node']:x for x in target['_catalogue']}
    s_names=defaultdict(set); t_names=defaultdict(set)
    for nodes,index in ((src,s_names),(dst,t_names)):
        for n,item in nodes.items():
            # Conflicted nodes still count: excluding them fabricates uniqueness.
            for a in item['aliases']:
                if a: index[a].add(n)
    out=[]
    for sn,sitem in src.items():
        number={sn} if sn in dst else set()
        name=set()
        for a in sitem['aliases']:
            if a and not sitem['name_conflict'] and s_names[a]=={sn} and len(t_names[a])==1:
                tn=next(iter(t_names[a]))
                if not dst[tn]['name_conflict']: name.add(tn)
        if mode=='NUMBER': cand=number
        elif mode=='NAME': cand=name
        elif mode=='BOTH': cand=number & name
        else: cand=number | name
        for tn in sorted(cand):
            reasons=[]
            if tn in number: reasons.append('NUMBER_EQUAL')
            if tn in name: reasons.append('EXACT_UNIQUE_NAME')
            disagreement=bool(number and name and number!=name)
            out.append({'source_node':sn,'target_node':tn,'reasons':reasons,'disagreement':disagreement,
                        'source_aliases':sitem['aliases'],'target_aliases':dst[tn]['aliases'],
                        'source_name_conflict':sitem['name_conflict'],'target_name_conflict':dst[tn]['name_conflict'],
                        'status':'PROPOSED_NOT_ACCEPTED'})
    return out

def accept(source,target,pairs,actor,provenance='MANUAL',display_aliases=None):
    if not actor or provenance not in MODES: raise ValueError('owner acceptance actor/provenance required')
    src={x['node']:x for x in source['_catalogue']}; dst={x['node']:x for x in target['_catalogue']}
    used_s=set();used_t=set();selected=[]; all_prop=propose(source,target,provenance) if provenance!='MANUAL' else []
    for sn,tn in pairs:
        if sn not in src or tn not in dst: raise ValueError(f'absent mapping node {sn}->{tn}')
        if sn in used_s: raise ValueError(f'one-to-many source node {sn}')
        if tn in used_t: raise ValueError(f'many-to-one target node {tn}')
        used_s.add(sn); used_t.add(tn)
        suggested=[p for p in all_prop if p['source_node']==sn and p['target_node']==tn]
        if provenance!='MANUAL' and not suggested: raise ValueError('pair is not proposed by selected mode; use MANUAL with approval')
        alias=(display_aliases or {}).get(str(sn),{})
        if alias.get('source') not in (None, *src[sn]['aliases']) or alias.get('target') not in (None,*dst[tn]['aliases']):
            raise ValueError('display alias not present in catalogue')
        selected.append({'source_node':sn,'target_node':tn,'source_alias':alias.get('source'),
                         'target_alias':alias.get('target'),'provenance':provenance,
                         'proposal_reasons':suggested[0]['reasons'] if suggested else ['EXPLICIT_MANUAL'],
                         'name_or_mode_disagreement':suggested[0]['disagreement'] if suggested else None,
                         'accepted_by_claim':actor,'acceptance_kind':'EXPLICIT_OWNER_CLAIM_NOT_AUTHENTICATED'})
    payload={'schema':'ciifr-node-map/v1','source_sha256':source['cii_sha256'],
             'target_sha256':target['cii_sha256'],'pairs':sorted(selected,key=lambda x:x['source_node'])}
    return {**payload,'mapping_digest':digest(canonical(payload))}

def verify(mapping,source,target):
    if mapping['source_sha256']!=source['cii_sha256'] or mapping['target_sha256']!=target['cii_sha256']:
        raise ValueError('stale mapping model hash')
    payload={k:v for k,v in mapping.items() if k!='mapping_digest'}
    if digest(canonical(payload))!=mapping.get('mapping_digest'): raise ValueError('mapping digest changed')
    # Validate map against actual present nodes, and one-to-one. Use accepted pair
    # details as-is; no silent new proposal or refreshed acceptance.
    ss=set();tt=set();src={n['node'] for n in source['_catalogue']};dst={n['node'] for n in target['_catalogue']}
    for x in mapping['pairs']:
        sn=x['source_node'];tn=x['target_node']
        if sn in ss or tn in tt or sn not in src or tn not in dst:
            raise ValueError('mapping cardinality/membership violation')
        ss.add(sn);tt.add(tn)
    return True
