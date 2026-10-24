"""Read-only adapter for the exact Owner-uploaded F05 code-only converter.

F05 source is copied byte-for-byte into vendor/f05. This module does not edit
or repair F05, approve the converter, or enable production Apply/export. A CII
manifest is emitted only after the COMPLETE F05 grammar validates and an exact
XML->CII round-trip matches the same input bytes (not independent assurance).
Independent byte-oracle and primary/real-target gates remain outstanding.
"""
import hashlib
import json
import sys
from decimal import Decimal
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
VENDOR = ROOT / 'vendor' / 'f05'
PACKET_SHA256 = 'e7901a79fdbd9dd992923303b33fb0d3e2d0d0550826a6ad363ea8a8847150cf'
PINNED = {
    'cii_to_richinputxml.py':'20db9559625818868effd668fe2cee6d995065974b2820094ebae231ef932fd8',
    'richcii_schema.py':'6c6ab7884b11d6e820a1fec8e1702e9289ab69b2989530fba4924368893fd80b',
    'richcii_validate.py':'d4f80164cd10c928827a34191e706d71aac1f53a15ce9e73aec785c1b02b0a0e',
    'richinputxml_to_cii2019.py':'277e22e7535b0c1499eacd7c92611262443868896b260a35b0327c6a6d64bb4b',
    'v11_lexical.py':'e5d19ba48d1ed7434e440c4fd1b7a24fbd78509904477f222de95fb7db9fdabd',
    'cii_to_xml.py':'db14b48193114a1007a20c2a07dd60c02fede2e6a427db62cfd2947ebaa70c11',
    'xml_to_cii.py':'4f828cc017dee56987ae12dd48f83b99aecc56a16ae0780bfbe924b0c7eded16',
    'validate_xml.py':'577c445ab9a9efc907bb8b4784a6efed0b58c694e67837bb729ba8a515bfb928',
}
CONVERTER_STATUS = 'F05_SOURCE_PINNED_READ_ONLY_EXPORT_DISABLED'
CANDIDATE_ON_HOLD_SHA256 = 'bd950291d1086e833a6d22a1f73f6a9a5b2fd3660dd7ef6a3f03f997986378c0'
REFERENCE_PACKET_SHA256 = '1700aec745d4528867d4ed02c8853c89d76ae1987c7c2f78bc1b0ab0f44c4253'

def verify_f05():
    for name, expected in PINNED.items():
        if hashlib.sha256((VENDOR / name).read_bytes()).hexdigest() != expected:
            raise ValueError('F05 CODE IDENTITY MISMATCH: '+name)
    return True

def engine_identity():
    verify_f05()
    return 'F05:'+PACKET_SHA256+':'+PINNED['richinputxml_to_cii2019.py']

def extract_manifest(cii_path):
    """Return checked, source-bound node manifest, never synthetic fields.

    All unit factors and labels are deliberately retained and compared as a
    whole: F05 supplies positional UNIT_FACTOR names, NOT an independently
    qualified displacement length-factor index. CONTROL/IZUP is carried by
    its exact numeric integer, without guessing Y/Z encoding.
    """
    verify_f05()
    if str(VENDOR) not in sys.path:sys.path.insert(0, str(VENDOR))
    from cii_to_richinputxml import make_richxml
    from richinputxml_to_cii2019 import render
    from richcii_schema import COUNTS
    from node_catalogue import digest
    from displacement_profile import profile_hash

    cii = Path(cii_path).resolve()
    raw = cii.read_bytes()
    root,audit=make_richxml(raw)
    regenerated=render(root)
    if regenerated != raw:raise ValueError('F05 no-op round-trip mismatch; extraction disallowed')
    sections={s.get('name'):s for s in root.findall('./PIPINGMODEL/SECTIONS/SECTION')}
    ctrl=[]
    for rec in sections['CONTROL']:
        ctrl.extend([f.get('value') for f in rec[0]])
    if len(ctrl)!=len(COUNTS):raise ValueError('CONTROL declaration mismatch')
    control=dict(zip(COUNTS,ctrl))

    def exact_int(s,where,nonzero=False):
        x=Decimal(s)
        if not x.is_finite() or x!=x.to_integral_value() or x<0 or (nonzero and x==0):
            raise ValueError('non-integral/invalid '+where)
        return int(x)

    names=[{'id':i,'from':rec[0].get('from'),'to':rec[0].get('to')}
           for i,rec in enumerate(sections['NODENAME'],1)]
    elements=[]
    for i,rec in enumerate(sections['ELEMENTS'],1):
        rows=list(rec)
        ptrfields=[f for row in rows[12:] for f in row]
        pointers={f.get('name'):exact_int(f.get('value'), 'pointer') for f in ptrfields}
        elements.append({'id':i,
            'from':exact_int(rows[0][0].get('value'),'FROM_NODE',True),
            'to':exact_int(rows[0][1].get('value'),'TO_NODE',True),
            'nodename_pointer':pointers['NODENAME'] or None,
            'displacement_pointers':([pointers['DISPLMNT']] if pointers['DISPLMNT'] else [])})
    disps=[]
    for i,rec in enumerate(sections['DISPLMNT'],1):
        starts=[entry['source_start'] for entry in audit['rows']
                if entry['section']=='DISPLMNT' and entry['record']==i]
        if len(starts)!=20:raise ValueError('F05 displacement record offsets incomplete')
        disps.append({'id':i,'line_starts':starts})
    urows=list(sections['UNITS'])
    factors=[f.get('value') for rec in urows[:4] for f in rec[0]]
    labels=[rec[0].get('value') for rec in urows[4:]]
    if len(factors)!=22 or len(labels)!=24:raise ValueError('UNITS factor/label cardinality unexpected')
    manifest={'schema':'ciifr-node-manifest/v1','complete_sections_attested':True,
      'cii_path':str(cii),'cii_sha256':digest(raw),'profile_sha256':profile_hash(),
      'parser_id':engine_identity(),'units':{
        'displacement':{'conversion':'UNITS_FULL_FACTOR_VECTOR:'+json.dumps(factors,separators=(',',':')),
                        'label':'UNITS_FULL_LABEL_VECTOR:'+json.dumps(labels,separators=(',',':'))},
        'izup':'CONTROL_IZUP:'+str(exact_int(control['IZUP'],'CONTROL IZUP')),
        'qualification':'ALL_UNIT_FACTORS_AND_LABELS_MUST_MATCH_NO_FACTOR_INDEX_INFERRED'},
      'elements':elements,'nodenames':names,'displacements':disps,
      'extraction_evidence':{'source_bytes':len(raw),'noop_roundtrip_sha256':digest(regenerated),
                             'converter_packet_sha256':PACKET_SHA256,
                             'independent_byte_oracle':'NOT_RUN_FOR_EXPORT'}}
    # A full read of every declared DISPLMNT component is required, including
    # unselected vectors and both nodes in all records.
    from node_catalogue import validate_model
    validate_model(dict(manifest))
    return manifest

def export_structured_xml(*args,**kwargs):
    raise RuntimeError('EXPORT_DISABLED: F05 pinned, but real source/target and independent XML byte-allowlist qualification not yet executed')

def trial_structured_transfer(source, target, mapping, plan, approval):
    """In-memory F05 writer preflight. Does NOT export or commit a CII file.

    Recompute current plan and approval, modify Field.value through the full
    structured XML tree, then compare F05 output to independent byte splices.
    The exact F05 writer must not be used to derive the byte expectation.
    """
    from transfer_plan import recheck_preview_against_inputs, validate_approval
    from export_audit import expected_bytes
    from node_catalogue import digest
    verify_f05()
    recheck_preview_against_inputs(plan, source, target, mapping)
    validate_approval(plan,approval)
    if source['parser_id']!=engine_identity() or target['parser_id']!=engine_identity():
        raise ValueError('structured trial requires both F05-extracted manifests')
    if str(VENDOR) not in sys.path:sys.path.insert(0,str(VENDOR))
    from cii_to_richinputxml import make_richxml
    from richinputxml_to_cii2019 import render

    old=target['_raw']
    expectation=expected_bytes(old,plan,approval)
    root,_=make_richxml(old)
    records=root.findall("./PIPINGMODEL/SECTIONS/SECTION[@name='DISPLMNT']/Record")
    for d in plan['decisions']:
        if d['status']!='CHANGE_REQUIRES_CELL_ACCEPTANCE':continue
        rec=records[d['target_record']-1]
        loc=d['target_locator']
        row=rec[loc['row']-1]
        cols=row.findall('Field')
        if row.tag!='Numeric' or loc['column']>len(cols):
            raise ValueError('F05 structured XML target field locator out of range')
        fld=cols[loc['column']-1]
        if fld.get('column')!=str(loc['column']):
            raise ValueError('F05 structured XML column mismatch')
        before=old[d['expected_span']['start']:d['expected_span']['end']]
        if fld.get('lex').encode('ascii')!=before:
            raise ValueError('F05 lexical metadata does not match target-before bytes')
        fld.set('value',d['proposed_value'])
    result=render(root)
    if result!=expectation:
        # Failure does not write a candidate; plan rejected for this target.
        raise ValueError('structured F05 output differs from independent exact-byte oracle; EXPORT_DISABLED')
    return {'status':'IN_MEMORY_F05_BYTE_ORACLE_PASS_EXPORT_DISABLED',
            'source_sha256':source['cii_sha256'],'target_sha256':target['cii_sha256'],
            'expected_output_sha256':digest(expectation),'f05_rendered_sha256':digest(result),
            'changed_cells':sum(d['status']=='CHANGE_REQUIRES_CELL_ACCEPTANCE' for d in plan['decisions']),
            'result_bytes':len(result),'engine_id':engine_identity(),
            'authority':'INDEPENDENT_BYTE_ORACLE_SYNTHETIC_UNLESS_REAL_TARGET_VERIFIED',
            'destination_written':False}
