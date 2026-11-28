"""Fail-closed catalogue over a converter-provided, byte-verified manifest.
The manifest's completeness is NOT guaranteed until the real converter adapter is
qualified. It must describe every element, NODENAME, DISPLMNT, and owner pointer.
"""
from collections import defaultdict
import hashlib, json
from pathlib import Path
from displacement_profile import node_locator, component_locator, parse_node, parse_value, DOFS, profile_hash

SCHEMA = 'ciifr-node-manifest/v1'

def digest(data): return hashlib.sha256(data).hexdigest()
def canonical(obj): return json.dumps(obj, sort_keys=True, separators=(',', ':'), ensure_ascii=True).encode()
def file_digest(path): return digest(Path(path).read_bytes())

class InvalidModel(ValueError): pass

def load_model(manifest_path):
    m = json.loads(Path(manifest_path).read_text(encoding='utf-8'))
    return validate_model(m, manifest_path)

def validate_model(m, manifest_path=None):
    if m.get('schema') != SCHEMA or m.get('profile_sha256') != profile_hash():
        raise InvalidModel('manifest/profile mismatch')
    if not m.get('complete_sections_attested'):
        raise InvalidModel('missing explicit entire-supported-model completeness declaration')
    path = Path(m['cii_path']); raw=path.read_bytes()
    if digest(raw) != m.get('cii_sha256'): raise InvalidModel('stale model SHA')
    for field in ('conversion', 'label'):
        if not isinstance(m.get('units',{}).get('displacement',{}).get(field), str):
            raise InvalidModel('missing displacement units metadata')
    if not isinstance(m.get('units',{}).get('izup'),str) or not m['units']['izup']:
        raise InvalidModel('missing IZUP')
    names = {}
    for n in m['nodenames']:
        if type(n.get('id')) is not int or n['id'] in names or not isinstance(n.get('from'), str) or not isinstance(n.get('to'),str):
            raise InvalidModel('duplicate/bad NODENAME')
        names[n['id']]=n
    elements={}; owners=defaultdict(set); origins=defaultdict(list); aliases=defaultdict(set)
    for el in m['elements']:
        eid=el['id']
        if eid in elements: raise InvalidModel('duplicate element id')
        elements[eid]=el
        for k, namefield in (('from','from'),('to','to')):
            num=el[k]
            if type(num) is not int or num<=0: raise InvalidModel('bad element endpoint')
            origins[num].append({'kind':'endpoint','element':eid,'end':k})
            if el.get('nodename_pointer') is not None:
                ptr=el['nodename_pointer']
                if ptr not in names: raise InvalidModel('dangling NODENAME pointer')
                aliases[num].add(names[ptr][namefield])
        for ref in el.get('displacement_pointers', []): owners[ref].add(eid)
    records={}; occupied=[]
    for rec in m['displacements']:
        rid=rec['id']
        if rid in records: raise InvalidModel('duplicate displacement record')
        starts=rec['line_starts']
        if len(starts)!=20 or not all(type(x) is int and x>=0 for x in starts): raise InvalidModel('20 line offsets required')
        # Each row is precisely 2X+one 13-char value or 2X+six 13-char values;
        # line terminator must be LF or CRLF and never changed.
        for i, offset in enumerate(starts):
            width=15 if i%10==0 else 80
            if offset+width>len(raw) or raw[offset:offset+2]!=b'  ':
                raise InvalidModel('bad DISPLMNT row prefix/width')
            tail=raw[offset+width:offset+width+2]
            term=(b'\r\n' if tail.startswith(b'\r\n') else b'\n' if tail.startswith(b'\n') else
                  b'\r' if tail.startswith(b'\r') else b'' if offset+width==len(raw) else None)
            if term is None: raise InvalidModel('bad/unqualified line terminator')
            finish=offset+width+len(term)
            if i<19 and starts[i+1]!=finish: raise InvalidModel('non-contiguous displacement record')
            occupied.append((offset,finish,rid))
        slots=[]
        for s in (0,1):
            row=starts[s*10]; node=parse_node(raw[row+2:row+15]); slots.append(node)
            if node is not None: origins[node].append({'kind':'displacement_auxiliary','record':rid,'slot':s,'owners':sorted(owners.get(rid,[]))})
        records[rid]={'id':rid,'line_starts':starts,'slots':slots,'owners':sorted(owners.get(rid,[]))}
    occupied.sort()
    if any(a[1]>b[0] for a,b in zip(occupied,occupied[1:])): raise InvalidModel('overlapping DISPLMNT record spans')
    if set(owners) - set(records): raise InvalidModel('dangling displacement pointer')
    if set(records)-set(owners): raise InvalidModel('unowned displacement record: association not qualified')
    # Validate every numeric component, including both slots, not just selected vectors.
    for rec in records.values():
        for s in (0,1):
            for v in range(1,10):
                for d in DOFS:
                    loc=component_locator(s,v,d)
                    p=rec['line_starts'][loc.row-1]+2+(loc.column-1)*13
                    token=raw[p:p+13]
                    if parse_value(token)[0]=='unsupported': raise InvalidModel(f'unsupported displacement value {rec["id"]}/{s}/{v}/{d}')
    catalogue=[]
    for number in sorted(origins):
        a=sorted(aliases[number]); nonempty=sorted(set(x for x in a if x))
        catalogue.append({'node':number,'aliases':a,'name_conflict':len(nonempty)>1,
                          'auxiliary_only':not any(x['kind']=='endpoint' for x in origins[number]),
                          'occurrences':origins[number]})
    m['_records']=records; m['_elements']=elements; m['_catalogue']=catalogue; m['_raw']=raw; m['_manifest_path']=str(manifest_path)
    return m

def get_cell(model, record, slot, vector, dof):
    loc=component_locator(slot,vector,dof)
    start=record['line_starts'][loc.row-1]+2+(loc.column-1)*13
    token=model['_raw'][start:start+13]; state,val=parse_value(token)
    return {'start':start,'end':start+13,'raw':token.decode('ascii'),'state':state,'value':str(val) if val is not None else None,
            'locator':loc.as_dict()}

def conditions(model,node,vector,dof):
    out=[]
    for r in model['_records'].values():
        for s,n in enumerate(r['slots']):
            if n==node:
                out.append({'record':r['id'],'slot':s,'owners':r['owners'],'cell':get_cell(model,r,s,vector,dof)})
    return out

def public_catalogue(m):
    return {'cii_sha256':m['cii_sha256'],'manifest_parser_id':m['parser_id'],'profile_sha256':m['profile_sha256'],
            'node_count':len(m['_catalogue']),'element_count':len(m['elements']),
            'auxiliary_only_nodes': [n['node'] for n in m['_catalogue'] if n['auxiliary_only']],
            'nodes':m['_catalogue'], 'displacement_record_count':len(m['_records']), 'export':'EXPORT_DISABLED'}
