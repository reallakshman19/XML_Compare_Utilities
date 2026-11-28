"""Independent byte-splice audit. NEVER exports/serializes CII.
Expected bytes are direct splices of original target from approved locators.
Candidate must originate from a separately qualified structured-XML converter.
"""
from pathlib import Path
from node_catalogue import file_digest, digest
from transfer_plan import validate_approval

class ExportDisabled(RuntimeError): pass

def expected_bytes(raw,plan,approval):
    validate_approval(plan,approval)
    if digest(raw)!=plan['target_sha256']: raise ValueError('stale original target bytes')
    if plan['status']!='PREVIEW_READY': raise ValueError('blocked transaction')
    patches=[]
    for dec in plan['decisions']:
        if dec['status']=='CHANGE_REQUIRES_CELL_ACCEPTANCE':
            s=dec['expected_span']; b=bytes.fromhex(s['before_hex']); a=bytes.fromhex(s['after_hex'])
            if s['end']-s['start']!=len(b) or len(a)!=len(b) or raw[s['start']:s['end']]!=b:
                raise ValueError('target-before mismatch / span corruption')
            patches.append((s['start'],s['end'],a))
        elif dec['status']!='NO_OP': raise ValueError('blocked/unknown decision')
    patches.sort()
    if any(left[1]>right[0] for left,right in zip(patches,patches[1:])):
        raise ValueError('overlapping changed cells')
    expected=bytearray(raw)
    for lo,hi,data in patches: expected[lo:hi]=data
    return bytes(expected)

def audit_candidate(target_path,candidate_path,plan,approval):
    old=Path(target_path).read_bytes(); candidate=Path(candidate_path).read_bytes()
    expected=expected_bytes(old,plan,approval)
    if candidate!=expected: raise ValueError('byte oracle violation: candidate differs outside exact approved token edits (or within them)')
    return {'status':'BYTE_AUDIT_PASS_NOT_NATIVE_ACCEPTANCE','original_sha256':digest(old),
            'candidate_sha256':digest(candidate),'expected_sha256':digest(expected),
            'changed_token_count':sum(d['status']=='CHANGE_REQUIRES_CELL_ACCEPTANCE' for d in plan['decisions']),
            'byte_length':len(candidate),'authority':'INDEPENDENT_BYTE_ORACLE'}

def apply_export_disabled(*_args,**_kwargs):
    raise ExportDisabled('EXPORT_DISABLED: F05 code is pinned and synthetic XML trial passed, but real-primary regression, target qualification, Owner engineering map and native acceptance are NOT_RUN. No destination was touched.')
