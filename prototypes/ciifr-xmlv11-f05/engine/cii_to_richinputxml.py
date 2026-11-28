#!/usr/bin/env python3
"""CII v14 -> typed RichInputXML. No CII raw-row fields or benchmark replay."""
from __future__ import annotations
import argparse
from collections import Counter
from hashlib import sha256
import json
from pathlib import Path
import xml.etree.ElementTree as ET
from richcii_validate import validate_xml
from richinputxml_to_cii2019 import atomic_output
from richcii_schema import (BLOCKS,COUNTS,POINTERS,REL_NAMES,SECTIONS,
    RichFormatError,classify_row,decode_scalar,numbers_from_row,record_schema,section_map,
    expected_fields, EMPTY_ONLY, SCHEMA, version_parts)


def counted_blocks(section, name, expected, element_count):
    rows=section['rows']
    if name in EMPTY_ONLY and rows:
        raise RichFormatError(f'{name}: nonempty record grammar UNSUPPORTED in v1.1')
    if name=='MISCEL_1':
        needed=(element_count+5)//6
        if len(rows)<needed:raise RichFormatError('Not enough material ID rows')
        return [[row] for row in rows]
    if name=='VERSION':
        if len(rows)!=61:raise RichFormatError('Expected 61 VERSION records')
        return [[row] for row in rows]
    if name=='UNITS':
        if len(rows)!=28:raise RichFormatError('Expected 28 UNITS records')
        return [[row] for row in rows]
    if name=='CONTROL':
        if len(rows)!=4:raise RichFormatError('Expected 4 CONTROL records')
        return [[row] for row in rows]
    if name=='COORDS':return [[row] for row in rows]
    n=BLOCKS.get(name,1)
    if len(rows)%n:raise RichFormatError(f'{name}: {len(rows)} rows not divisible by {n}')
    records=[rows[k:k+n] for k in range(0,len(rows),n)]
    if name in expected and len(records)!=expected[name]:
        raise RichFormatError(f'{name}: CONTROL count {expected[name]} != {len(records)}')
    return records


def decode_length_label(s):
    if len(s)<13:raise RichFormatError('Truncated length-prefixed name')
    if s[:7] != '       ' or s[12] != ' ':
        raise RichFormatError('Label: unsupported 7X/I5/1X prefix or separator')
    try:n=int(s[7:12])
    except ValueError as exc:raise RichFormatError('Invalid I5 label length') from exc
    if n<0 or n>500 or s[7:12]!=f'{n:5d}':
        raise RichFormatError('Label: unsupported I5 length spelling (right-aligned decimal required)')
    if len(s)!=13+n:
        raise RichFormatError(f'Name record width disagrees with length {n}')
    return s[13:]


def append_record(parent, section, ordinal, rows, flat_index, elements, audit):
    rec=ET.SubElement(parent,'Record',{'index':str(ordinal)})
    if section=='ELEMENTS':
        rec.tag='PIPINGELEMENT'
        rec.set('index',str(ordinal))
    for sub,source in enumerate(rows):
        row_idx=flat_index+sub
        kind=classify_row(section,row_idx,sub)
        text=source['text']
        pos={'row':str(sub+1),'nl':source['nl']}
        if kind=='VERSION_NUMBER':
            ET.SubElement(rec,'Dialect',dict(pos,**version_parts(text)))
        elif kind=='VERSION_TEXT':
            if len(text)!=77:raise RichFormatError('VERSION metadata width != 77')
            ET.SubElement(rec,'VersionMetadata',dict(pos,value=text.rstrip(' '),width='77'))
        elif kind=='NODE_NAMES':
            if len(text)!=53 or text[:2]!='  ' or text[27]!=' ':
                raise RichFormatError('NODENAME: unsupported 2X/A25/1X/A25 prefix, separator or width 53')
            ET.SubElement(rec,'NodeNames',dict(pos,**{'from':text[2:27].rstrip(' '),'to':text[28:53].rstrip(' ')}))
        elif kind in ('ELEMENT_NAME','LINE_NAME','RESTRAINT_TAG','RESTRAINT_GUID'):
            value=decode_length_label(text)
            ET.SubElement(rec,'Label',dict(pos,role=kind,value=value))
        elif kind=='UNIT_LABEL':
            if len(text)<2 or text[:2]!='  ':raise RichFormatError('Malformed unit label')
            ET.SubElement(rec,'UnitLabel',dict(pos,value=text[2:].rstrip(' '),width=str(len(text))))
        else:
            vals=numbers_from_row(text)
            names=expected_fields(section,sub if section not in ('CONTROL','UNITS','MISCEL_1','COORDS') else row_idx,
                                  ordinal,elements)
            if len(names)!=len(vals):
                raise RichFormatError(f'{section} line {source["line"]}: expected {len(names)} numeric columns, got {len(vals)}')
            group=ET.SubElement(rec,'Numeric',dict(pos,role=section))
            for col,(name,(value,style,precision)) in enumerate(zip(names,vals),1):
                f=ET.SubElement(group,'Field',{'name':name,'value':value,'style':style,
                                         'precision':precision,'column':str(col),
                                         'lex':text[2+13*(col-1):2+13*col]})
                audit['fields'].append({'section':section,'record':ordinal,'row':sub+1,
                    'column':col,'name':name,'offset':source['start']+2+13*(col-1),'width':13})
        audit['rows'].append({'section':section,'record':ordinal,'row':sub+1,
            'source_line':source['line'],'source_start':source['start'],'source_end':source['end'],'kind':kind})
    return rec


def make_richxml(data):
    sections=section_map(data)
    if len(sections['CONTROL']['rows'])!=4:raise RichFormatError('CONTROL requires 4 rows')
    control=[]
    for row in sections['CONTROL']['rows']:
        control.extend(int(x[0]) for x in numbers_from_row(row['text']))
    if len(control)!=19:raise RichFormatError('CONTROL requires 19 counts')
    counts=dict(zip(COUNTS,control))
    if counts['ELEMENTS']<1 or any(x<0 for x in control):raise RichFormatError('Bad CONTROL counts')
    root=ET.Element('CAESARII',{'XML_TYPE':'RichInput','DIALECT':'CII-V14',
                               'SCHEMA':SCHEMA})
    model=ET.SubElement(root,'PIPINGMODEL',{'NUMELT':str(counts['ELEMENTS'])})
    sections_node=ET.SubElement(model,'SECTIONS')
    audit={'fields':[],'rows':[],'sections':{},'pointers':Counter(),'elements':counts['ELEMENTS']}
    for name in SECTIONS:
        sec=sections[name]
        blocks=counted_blocks(sec,name,counts,counts['ELEMENTS'])
        if name=='ELEMENTS' and len(blocks)!=counts['ELEMENTS']:
            raise RichFormatError('ELEMENTS/control disagreement')
        node=ET.SubElement(sections_node,'SECTION',{'name':name,'records':str(len(blocks)),
            'headerPad':str(len(sec['header']['text'])-3-len(name)),
            'nl':sec['header']['nl']})
        for i,rows in enumerate(blocks,1):
            append_record(node,name,i,rows,(i-1)*len(rows),counts['ELEMENTS'],audit)
        audit['sections'][name]={'records':len(blocks),'rows':len(sec['rows']),
            'start':sec['header']['start'],'end':sec['rows'][-1]['end'] if sec['rows'] else sec['header']['end']}
    validate_xml(root)
    return root,audit


def main():
    a=argparse.ArgumentParser(description=__doc__)
    a.add_argument('--input',required=True,type=Path)
    a.add_argument('--output',required=True,type=Path)
    a.add_argument('--trace',type=Path)
    args=a.parse_args()
    paths=[x.resolve() for x in (args.input,args.output,args.trace) if x is not None]
    if len(set(paths))!=len(paths):a.error('Input/output/trace paths must be distinct')
    try:
        data=args.input.read_bytes()
        root,audit=make_richxml(data)
    except (OSError,ValueError,ET.ParseError) as exc:
        a.exit(2,f'ERROR: {exc}\n')
    ET.indent(root)
    output=ET.tostring(root,encoding='utf-8',xml_declaration=True)+b'\n'
    atomic_output(args.output,output)
    if args.trace:
        audit['source_bytes']=len(data);audit['source_sha256']=sha256(data).hexdigest()
        audit['xml_bytes']=len(output);audit['xml_sha256']=sha256(output).hexdigest()
        atomic_output(args.trace,json.dumps(audit,indent=2).encode('utf-8'))
    print(json.dumps({'element_count':audit['elements'],'section_rows':
         {k:v['rows'] for k,v in audit['sections'].items()},'rich_xml_bytes':len(output)}))

if __name__=='__main__':main()
