"""Strict ordered RichInputXML v1.1 validator, independent of the CII writer.

Validation runs before section maps or successful output; XML Field.value alone
is authoritative. No speculative endpoint topology or inheritance assumptions.
"""
from __future__ import annotations
from decimal import Decimal
from richcii_schema import (SECTIONS, COUNTS, POINTERS, BLOCKS, EMPTY_ONLY,
    FIXED_BLOCKS, RichFormatError, SCHEMA, expected_fields, expected_rows,
    classify_row, LINE_ENDINGS, VERSION_ROW)
from v11_lexical import render_numeric, parse_decimal, same_number, ConversionError


def fail(where, message):
    raise RichFormatError(f'{where}: {message}')


def exact_attrs(node, expected, where):
    got=set(node.attrib)
    if got!=set(expected):
        fail(where,f'attribute identity mismatch missing={sorted(set(expected)-got)}, extra={sorted(got-set(expected))}')


def plain_children(node, allowed, where):
    if node.text and node.text.strip():fail(where,'unexpected text')
    for child in node:
        if child.tag not in allowed:fail(where,f'unexpected child {child.tag}')
        if child.tail and child.tail.strip():fail(where,'unexpected trailing text')


def ascii_line(value, where):
    if value is None:fail(where,'missing authoritative text value')
    if '\r' in value or '\n' in value:fail(where,'CR/LF inside physical row')
    if any(ord(c)<32 or ord(c)==127 for c in value):fail(where,'unsupported control character in physical row')
    try:value.encode('ascii','strict')
    except UnicodeEncodeError:fail(where,'unsupported non-ASCII repertoire (1256 not qualified)')
    return value


def number(value, where, integral=False):
    try:d=parse_decimal(ascii_line(value,where),where)
    except ConversionError as exc:fail(where,str(exc))
    if integral and d!=d.to_integral_value():fail(where,'expected integer')
    return d


def positive_index(value, expected, where):
    if value!=str(expected):fail(where,f'expected positional index {expected}, got {value!r}')


def field_check(field, name, column, where):
    exact_attrs(field,('name','value','style','precision','column','lex'),where)
    if len(field) or (field.text and field.text.strip()):fail(where,'nested content forbidden')
    if field.get('name')!=name:fail(where,f'wrong field name: expected {name!r}')
    positive_index(field.get('column'),column,where)
    value=ascii_line(field.get('value'),where)
    style=field.get('style')
    precision=field.get('precision')
    if style not in ('E','I','F') or precision is None or not precision.isdigit() or int(precision)>12:
        fail(where,'unsupported numeric style or precision')
    lex=field.get('lex')
    if lex is None or len(lex)!=13:fail(where,'missing 13-column lexical metadata')
    try:
        if style=='I' and number(value,where,True)!=number(value,where):
            fail(where,'noninteger I value')
        render_numeric(value,lex,'int' if style=='I' else 'real',where)
    except ConversionError as exc:fail(where,str(exc))
    return number(value,where)


def checked_row(row, section, record_id, row_id, element_count):
    where=f'{section}/record{record_id}/row{row_id}'
    positive_index(row.get('row'),row_id,where)
    if row.get('nl') not in LINE_ENDINGS:fail(where,'invalid physical-line terminator')
    plain_children(row,('Field',),where)
    kind=classify_row(section,record_id-1 if section in ('VERSION','UNITS','COORDS') else
                      (record_id-1 if section in ('CONTROL','MISCEL_1') else row_id-1),row_id-1)
    if kind in ('VERSION_NUMBER','VERSION_TEXT','NODE_NAMES'):
        expected={'VERSION_NUMBER':'Dialect','VERSION_TEXT':'VersionMetadata',
                  'NODE_NAMES':'NodeNames'}[kind]
    elif kind in ('ELEMENT_NAME','LINE_NAME','RESTRAINT_TAG','RESTRAINT_GUID'):
        expected='Label'
    elif kind=='UNIT_LABEL':expected='UnitLabel'
    else:expected='Numeric'
    if row.tag!=expected:fail(where,f'expected {expected}, got {row.tag}')
    if expected=='Dialect':
        exact_attrs(row,('row','nl','revision','version','codepage',
                         'pad0','pad1','pad2','padEnd'),where)
        gaps=[]
        for k in ('pad0','pad1','pad2','padEnd'):
            raw=row.get(k)
            if not raw.isascii() or not raw.isdigit() or raw!=str(int(raw)) or int(raw)>80:
                fail(where,f'unsupported VERSION gap {k}: {raw!r}')
            gaps.append(int(raw))
        if gaps[1]<1 or gaps[2]<1:fail(where,'VERSION tokens must be separated by spaces')
        revision,version,codepage=(row.get(k) for k in ('revision','version','codepage'))
        reconstructed=(' '*gaps[0]+revision+' '*gaps[1]+version+
                       ' '*gaps[2]+codepage+' '*gaps[3])
        if len(reconstructed)>128 or not VERSION_ROW.fullmatch(reconstructed):
            fail(where,'unsupported VERSION lexical layout')
        if [number(row.get(k),where,integral=(k=='codepage')) for k in ('revision','version','codepage')]!=[Decimal(5),Decimal(14),Decimal(1256)]:
            fail(where,'unsupported version/dialect/codepage (5/14/1256 required)')
        if codepage!='1256':fail(where,'unsupported codepage spelling (1256 required)')
    elif expected=='VersionMetadata':
        exact_attrs(row,('row','nl','value','width'),where)
        val=ascii_line(row.get('value'),where)
        if row.get('width')!='77' or len(val)>77:fail(where,'VERSION metadata width 77 exceeded')
    elif expected=='NodeNames':
        exact_attrs(row,('row','nl','from','to'),where)
        for key in ('from','to'):
            if len(ascii_line(row.get(key),where))>25:fail(where,f'A25 NODENAME {key} overflow')
    elif expected=='Label':
        exact_attrs(row,('row','nl','role','value'),where)
        if row.get('role')!=kind:fail(where,'incorrect label role')
        if len(ascii_line(row.get('value'),where))>500:fail(where,'A500 label overflow')
    elif expected=='UnitLabel':
        exact_attrs(row,('row','nl','value','width'),where)
        val=ascii_line(row.get('value'),where);w=row.get('width')
        if not w.isdigit() or not 2<=int(w)<=80 or len(val)>int(w)-2:fail(where,'invalid UnitLabel width (2..80)')
    else:
        exact_attrs(row,('row','nl','role'),where)
        if row.get('role')!=section:fail(where,'wrong Numeric role')
        names=expected_fields(section,row_id-1 if section not in ('CONTROL','UNITS','MISCEL_1','COORDS')
                              else record_id-1,record_id,element_count)
        if len(row)!=len(names):fail(where,f'exact numeric cardinality expected {len(names)} got {len(row)}')
        for i,(field,name) in enumerate(zip(row,names),1):
            field_check(field,name,i,where+f'/column{i}')
    if expected!='Numeric' and len(row):fail(where,'non-numeric row contains child fields')


def validate_xml(root):
    """Validate full v1.1 grammar and references; return CONTROL count mapping."""
    if root.tag!='CAESARII':fail('root','CAESARII required')
    exact_attrs(root,('XML_TYPE','DIALECT','SCHEMA'),'root')
    if (root.get('XML_TYPE'),root.get('DIALECT'),root.get('SCHEMA'))!=('RichInput','CII-V14',SCHEMA):
        fail('root',f'v1.1 schema/dialect required ({SCHEMA})')
    plain_children(root,('PIPINGMODEL',),'root')
    if len(root)!=1:fail('root','exactly one PIPINGMODEL')
    model=root[0];exact_attrs(model,('NUMELT',),'PIPINGMODEL')
    plain_children(model,('SECTIONS',),'PIPINGMODEL')
    if len(model)!=1:fail('PIPINGMODEL','exactly one SECTIONS')
    sn=model[0];exact_attrs(sn,(),'SECTIONS');plain_children(sn,('SECTION',),'SECTIONS')
    sections=list(sn);names=[s.get('name') for s in sections]
    if len(names)!=len(set(names)):fail('SECTIONS','duplicate section')
    if names!=list(SECTIONS):fail('SECTIONS','missing, extra or reordered section')
    elements=int(model.get('NUMELT')) if model.get('NUMELT','').isdigit() else -1
    if elements<1:fail('PIPINGMODEL','NUMELT must be positive integer')
    nl_order=[];records={}
    for sec in sections:
        name=sec.get('name');exact_attrs(sec,('name','records','headerPad','nl'),name)
        plain_children(sec,('Record','PIPINGELEMENT'),name)
        if sec.get('nl') not in LINE_ENDINGS:fail(name,'invalid header newline')
        nl_order.append((name+'/header',sec.get('nl')))
        pad=sec.get('headerPad')
        if not pad.isdigit() or int(pad)>80:fail(name,'invalid header padding')
        rr=list(sec);records[name]=rr
        if sec.get('records')!=str(len(rr)):fail(name,'SECTION.records mismatch')
        if name in EMPTY_ONLY and rr:fail(name,'nonempty grammar UNSUPPORTED in v1.1')
        if name in FIXED_BLOCKS and len(rr)!=FIXED_BLOCKS[name]:fail(name,'fixed record cardinality mismatch')
        if name=='MISCEL_1' and len(rr)!=(elements+5)//6+4:fail(name,'material/option record cardinality mismatch')
        if name=='COORDS' and len(rr)<1:fail(name,'COORDS count record missing')
        ids=[r.get('index') for r in rr]
        if len(ids)!=len(set(ids)):fail(name,'duplicate record index')
        if ids!=[str(i) for i in range(1,len(rr)+1)]:fail(name,'missing/reordered record identity')
        for ix,rec in enumerate(rr,1):
            where=f'{name}/record{ix}'
            if rec.tag!=('PIPINGELEMENT' if name=='ELEMENTS' else 'Record'):
                fail(where,'wrong record tag')
            exact_attrs(rec,('index',),where)
            plain_children(rec,('Numeric','Label','NodeNames','Dialect','VersionMetadata','UnitLabel'),where)
            rows=list(rec)
            expected=expected_rows(name,ix,elements,len(rr))
            if len(rows)!=expected:fail(where,f'row cardinality expected {expected} got {len(rows)}')
            for j,row in enumerate(rows,1):
                checked_row(row,name,ix,j,elements)
                nl_order.append((f'{where}/row{j}',row.get('nl')))
    if any(nl=='NONE' for where,nl in nl_order[:-1]):
        where=next(where for where,nl in nl_order[:-1] if nl=='NONE')
        fail(where,'NONE terminator only valid on final emitted physical line')
    ctrl=[]
    for rec in records['CONTROL']:
        ctrl.extend(int(number(f.get('value'),f'CONTROL/record{rec.get("index")}',True)) for f in rec[0])
    if len(ctrl)!=len(COUNTS) or any(v<0 or v>1_000_000 for v in ctrl):fail('CONTROL','19 nonnegative bounded counts required')
    counts=dict(zip(COUNTS,ctrl))
    if elements!=counts['ELEMENTS']:fail('PIPINGMODEL','NUMELT disagrees with CONTROL.ELEMENTS')
    for section in (*BLOCKS,'NODENAME','EXPJT','FORCMNT','UNIFORM','WIND','OFFSETS','FLANGES','EQUIPMNT'):
        if section in counts and len(records[section])!=counts[section]:
            fail('CONTROL/'+section,f'count {counts[section]} disagrees with {len(records[section])} records')
    for i,element in enumerate(records['ELEMENTS'],1):
        ptrs=[f for row in list(element)[12:] for f in row]
        if len(ptrs)!=15:fail(f'ELEMENTS/record{i}','exact 15 pointer positions required')
        for name,f in zip(POINTERS,ptrs):
            d=number(f.get('value'),f'ELEMENTS/record{i}/{name}',True)
            if d<0 or d>len(records[name]):
                fail(f'ELEMENTS/record{i}/{name}',f'pointer {d} outside actual {name} record range [0,{len(records[name])}]')
    coord=records['COORDS']; declared=int(number(coord[0][0][0].get('value'),'COORDS/COORD_COUNT',True))
    if len(coord)-1!=declared:fail('COORDS',f'COORD_COUNT {declared} disagrees with {len(coord)-1} rows')
    return counts


def main():
    import argparse
    import xml.etree.ElementTree as ET
    from pathlib import Path
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--input',type=Path,required=True)
    x=p.parse_args()
    try:
        counts=validate_xml(ET.parse(x.input).getroot())
    except (RichFormatError,ET.ParseError,OSError,ValueError) as exc:
        p.exit(2,f'ERROR: {exc}\n')
    print(f'VALID {SCHEMA}: {counts["ELEMENTS"]} elements')


if __name__=='__main__':main()
