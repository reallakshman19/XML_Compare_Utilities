#!/usr/bin/env python3
"""Structured RichInputXML-P1.v1.1 -> CII; no original file or raw-row replay.

Incremental fork of frozen `richinputxml_to_cii2019.py`, not the v1 reader.
All row/token metadata may preserve unchanged physical spelling, but Field.value,
Label.value and other typed XML values are the only model authorities.
"""
from __future__ import annotations
import argparse
from hashlib import sha256
import json
import os
from pathlib import Path
import tempfile
import xml.etree.ElementTree as ET
from richcii_schema import (SECTIONS,COUNTS,POINTERS,BLOCKS,LINE_ENDINGS,
    RichFormatError,expected_fields,expected_rows,SCHEMA)
from richcii_validate import validate_xml,ascii_line
from v11_lexical import render_numeric, ConversionError


def parse_and_validate(xml_path):
    root=ET.parse(xml_path).getroot()
    counts=validate_xml(root)
    return root,counts


def numeric_line(row,section,record_id,rownum,element_count):
    fields=row.findall('Field')
    names=expected_fields(section,rownum-1 if section not in
                          ('CONTROL','UNITS','MISCEL_1','COORDS') else record_id-1,
                          record_id,element_count)
    if len(fields)!=len(names):
        raise RichFormatError(f'{section}/record{record_id}/row{rownum}: exact field cardinality required')
    parts=[]
    for col,(name,f) in enumerate(zip(names,fields),1):
        where=f'{section}/record{record_id}/row{rownum}/column{col}'
        if f.get('name')!=name or f.get('column')!=str(col):
            raise RichFormatError(f'{where}: field name/column mismatch')
        try:
            parts.append(render_numeric(f.get('value'), f.get('lex'),
                        'int' if f.get('style')=='I' else 'real',where))
        except ConversionError as exc:
            raise RichFormatError(str(exc)) from exc
    return '  '+''.join(parts)


def string_line(child,section,rownum):
    where=f'{section}/row{rownum}/{child.tag}'
    if child.tag=='Dialect':
        if section!='VERSION' or rownum!=1:raise RichFormatError(f'{where}: misplaced Dialect')
        # All source bytes are typed values or qualified individual gap widths.
        return ((' ' * int(child.get('pad0'))) + child.get('revision') +
                (' ' * int(child.get('pad1'))) + child.get('version') +
                (' ' * int(child.get('pad2'))) + child.get('codepage') +
                (' ' * int(child.get('padEnd'))))
    if child.tag=='VersionMetadata':
        return ascii_line(child.get('value'),where).ljust(77)
    if child.tag=='NodeNames':
        return '  '+child.get('from').ljust(25)+' '+child.get('to').ljust(25)
    if child.tag=='Label':
        value=ascii_line(child.get('value'),where)
        return f'       {len(value):5d} {value}'
    if child.tag=='UnitLabel':
        return '  '+child.get('value').ljust(int(child.get('width'))-2)
    raise RichFormatError(f'{where}: unqualified row tag')


def render_record(record,section,index,element_count):
    need=expected_rows(section,index,element_count,0)
    if len(record)!=need:raise RichFormatError(f'{section}/record{index}: expected {need} rows')
    out=[]
    for number,child in enumerate(record,1):
        if child.tag=='Numeric':
            s=numeric_line(child,section,index,number,element_count)
        else:
            s=string_line(child,section,number)
        ascii_line(s,f'{section}/record{index}/row{number}')
        out.append((s,child.get('nl')))
    return out


def render(root,counts=None):
    counts=validate_xml(root)
    element_count=counts['ELEMENTS']
    data=bytearray()
    for section in root.findall('./PIPINGMODEL/SECTIONS/SECTION'):
        name=section.get('name')
        header='#$ '+name+' '*int(section.get('headerPad'))
        data.extend(header.encode('ascii')+LINE_ENDINGS[section.get('nl')])
        for index,record in enumerate(section,1):
            for value,nl in render_record(record,name,index,element_count):
                data.extend(value.encode('ascii')+LINE_ENDINGS[nl])
    return bytes(data)


def atomic_output(path,data):
    path=Path(path);path.parent.mkdir(parents=True,exist_ok=True)
    fd,tmp=tempfile.mkstemp(prefix='.v11-',suffix='.tmp',dir=path.parent)
    try:
        with os.fdopen(fd,'wb') as stream:
            stream.write(data);stream.flush();os.fsync(stream.fileno())
        os.replace(tmp,path)
    finally:
        if os.path.exists(tmp):os.unlink(tmp)


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--input',required=True,type=Path)
    p.add_argument('--output',required=True,type=Path)
    x=p.parse_args()
    if x.input.resolve()==x.output.resolve():p.error('Output must differ from XML input')
    try:
        root,counts=parse_and_validate(x.input)
        data=render(root,counts)
        atomic_output(x.output,data)
    except (RichFormatError,ConversionError,ET.ParseError,OSError,ValueError) as exc:
        p.exit(2,f'ERROR: {exc}\n')
    print(json.dumps({'elements':counts['ELEMENTS'],'output_bytes':len(data),'sha256':sha256(data).hexdigest()}))


if __name__=='__main__':main()
