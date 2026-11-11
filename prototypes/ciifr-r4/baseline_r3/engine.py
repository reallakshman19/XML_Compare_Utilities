"""Independent XMLv2 byte lexer, structural model, validator and standalone writer.

No legacy engine imports, network, source files, sidecars, or writer-time parser traces.
Each field is an individually addressable authoritative value with a source lexeme.
"""
from __future__ import annotations
import hashlib
import re
import xml.etree.ElementTree as ET
from collections import Counter
from decimal import Decimal, InvalidOperation
from pathlib import Path
from profile import (VERSION, PROFILE, SECTIONS, COUNT_NAMES, CONTROL_INDEX,
                     POINTER_SECTIONS, NUMERIC_ROWS, POPULATED_SUPPORTED,
                     UNOBSERVED_UNSUPPORTED, ELEMENT_ROWS, REST_ROWS, FIELD_NAMES, UNIT_FACTORS, UNIT_LABELS, AUX_FIELD_LABELS, RESTRAINT_FIELDS,
                     CIIError, fail)

DEC_RE = re.compile(r'[+-]?(?:(?:\d+(?:\.\d*)?|\.\d+)(?:[EeDd][+-]?\d+)?|\d+)\Z')
I_RE = re.compile(r'[+-]?\d+\Z')
ASCII = 'ascii'
MAX_CII = 80_000_000

def dec(raw, where):
    s = raw.strip()
    if not s or not DEC_RE.fullmatch(s): fail(where, f'invalid numeric token {raw!r}')
    try: v = Decimal(s.replace('D','E').replace('d','e'))
    except InvalidOperation: fail(where, f'invalid decimal {raw!r}')
    if not v.is_finite(): fail(where, 'nonfinite number')
    return v

def normalized(raw, kind, where):
    if kind == 'integer':
        s = raw.strip()
        if not I_RE.fullmatch(s): fail(where, f'invalid integer {raw!r}')
        # Integer sign on zero is lexical, not a distinct typed integer value.
        # The unedited writer keeps raw I13 spelling (0, +0, -0) unchanged.
        return str(int(s))
    if kind == 'real':
        # Representation is *not* serialized from floating point.
        return str(dec(raw, where))
    return raw

def text_field(row, name, kind, lexeme, width=None, **meta):
    attrs = {'name':name,'kind':kind,'value':normalized(lexeme,kind,name),
             'lexeme':lexeme,'width':str(width if width is not None else len(lexeme)),
             'coverage':'qualified' if kind in ('real','integer','string') else 'lexical-only'}
    attrs.update({k:str(v) for k,v in meta.items()})
    return ET.SubElement(row,'Field',attrs)

def add_row(rec, raw, line_no, spec, key, field_counter=0):
    if len(raw)>8192: fail(f'line {line_no}', 'row exceeds 8192 bytes')
    row=ET.SubElement(rec,'Row',{'line':str(line_no),'key':key,'eol':'CRLF'})
    try: s=raw.decode(ASCII)
    except UnicodeDecodeError: fail(f'line {line_no}', 'non-ASCII encoding outside supported profile')
    if isinstance(spec,int) or isinstance(spec,list):
        kinds = ['real']*spec if isinstance(spec,int) else spec
        if len(s)!=2+13*len(kinds): fail(f'line {line_no}',f'expected {2+13*len(kinds)} bytes, got {len(s)}')
        row.set('prefix',s[:2]); row.set('suffix','')
        for ix,kind in enumerate(kinds):
            token=s[2+13*ix:2+13*(ix+1)]
            name=f'{key}_{field_counter+ix+1:03d}'
            if key=='real' and field_counter+ix+1 in FIELD_NAMES: name=FIELD_NAMES[field_counter+ix+1]
            elif key=='pointer': name='pointer_'+POINTER_SECTIONS[field_counter+ix].lower().replace('&','_')
            elif key=='control': name=COUNT_NAMES[field_counter+ix].lower().replace('&','_')
            elif key=='material': name=('line_color','line_visibility')[ix]
            elif key=='material_id': name=f'material_id_{field_counter+ix+1:06d}'
            elif key=='unit_factor': name=UNIT_FACTORS[field_counter+ix]
            elif key in AUX_FIELD_LABELS:
                name=AUX_FIELD_LABELS[key].get(field_counter+ix+1, f'{key}_field_{field_counter+ix+1:03d}')
            elif key.startswith('dof_') and '_values_' in key:
                dof=key.split('_')[1]
                offset=(6 if key.endswith('_2') else 0)+ix
                name=f'dof_{dof}_{RESTRAINT_FIELDS[offset]}'
            text_field(row,name,kind,token,13,ordinal=field_counter+ix+1,
                       unit='source' if kind=='real' else 'none')
    elif spec=='length':
        if len(s)<13: fail(f'line {line_no}','short length-prefix row')
        row.set('prefix',''); row.set('suffix','')
        # Observed (I12, 1X, A<length>); unlike native A100, trailing char preserved.
        ln=s[:12]; v=normalized(ln,'integer',f'line {line_no}')
        if s[12]!=' ': fail(f'line {line_no}','length-prefix separator must be space')
        n=int(v)
        if n<0 or n>100 or len(s)!=13+n: fail(f'line {line_no}',f'length prefix {n} disagrees with payload of {len(s)-13} bytes')
        text_field(row,key+'_length','integer',ln,12)
        text_field(row,key,'string',s[13:],n)
        row.set('separator',' ')
    elif spec=='nodename':
        if len(s)!=53: fail(f'line {line_no}',f'NODENAME requires 53 bytes, got {len(s)}')
        row.set('prefix',s[:2]); row.set('separator',s[27:28]);row.set('suffix','')
        text_field(row,'from_node_name','string',s[2:27],25)
        text_field(row,'to_node_name','string',s[28:53],25)
    elif spec=='text':
        row.set('prefix','');row.set('suffix','')
        text_field(row,key,'text',s,len(s))
    elif spec=='unit-label':
        if not s.startswith('  '): fail(f'line {line_no}','unit label missing two-space prefix')
        row.set('prefix','  ');row.set('suffix','')
        text_field(row,key,'string',s[2:],len(s)-2)
    else: fail(f'line {line_no}',f'unknown row grammar {spec}')
    return row

def make_xml(data:bytes)->ET.Element:
    if len(data)>MAX_CII: fail('input','exceeds size limit')
    if not data or not data.endswith(b'\r\n') or data.count(b'\r\n') != data.count(b'\n'):
        fail('input','only CRLF with final CRLF is qualified for this profile')
    try: data.decode(ASCII)
    except UnicodeDecodeError: fail('input','unknown/non-ASCII codepage')
    lines=data.split(b'\r\n')[:-1]
    heads=[(i,l.decode(ASCII)[3:].strip()) for i,l in enumerate(lines) if l.startswith(b'#$ ')]
    if [n for _,n in heads]!=SECTIONS: fail('sections',f'exact 22-section sequence required; got {[n for _,n in heads]}')
    root=ET.Element('RichInputXMLv2',{'schema':VERSION,'profile':PROFILE,'encoding':'ASCII',
                  'line-endings':'CRLF','final-eol':'yes','source-sha256':hashlib.sha256(data).hexdigest(),
                  'source-bytes':str(len(data))})
    sections=ET.SubElement(root,'Sections')
    for j,(start,name) in enumerate(heads):
        stop=heads[j+1][0] if j+1<len(heads) else len(lines)
        sec=ET.SubElement(sections,'Section',{'name':name,'position':str(j+1),'header':lines[start].decode(),
                      'status':'qualified' if name in POPULATED_SUPPORTED or name in ('VERSION','CONTROL','ELEMENTS','AUX_DATA','MISCEL_1','UNITS','COORDS') else 'empty-only',
                      'line':str(start+1)})
        rows=lines[start+1:stop]
        if name=='ELEMENTS':
            if len(rows)%15: fail(name,f'expected 15 lines per element, observed {len(rows)}')
            for rid in range(len(rows)//15):
                rec=ET.SubElement(sec,'Record',{'id':f'element-{rid+1:06d}','index':str(rid+1),'kind':'element'})
                for k,spec in enumerate(ELEMENT_ROWS):
                    l=start+1+rid*15+k+1
                    if isinstance(spec,int):add_row(rec,rows[rid*15+k],l,spec,'real',6*k)
                    elif spec=='string_a':add_row(rec,rows[rid*15+k],l,'length','component_label')
                    elif spec=='string_b':add_row(rec,rows[rid*15+k],l,'length','line_label')
                    elif spec=='material':add_row(rec,rows[rid*15+k],l,['integer','integer'],'material')
                    else:add_row(rec,rows[rid*15+k],l,['integer']*(6 if spec=='pointers_6' else 3),'pointer',sum(6 for t in ELEMENT_ROWS[11:k] if t=='pointers_6'))
        elif name=='VERSION':
            if len(rows)!=61: fail(name,f'expected 61 rows, got {len(rows)}')
            rec=ET.SubElement(sec,'Record',{'id':'version-000001','index':'1','kind':'version'})
            for k,b in enumerate(rows):
                # VERSION numeric row has a different legacy column convention; tokenize the three numbers,
                # preserving exact gap bytes, separately below.
                if k==0:
                    s=b.decode('ascii'); m=list(re.finditer(r'\S+',s))
                    if len(m)!=3 or [dec(x.group(),name) for x in m] != [Decimal('5'),Decimal('14'),Decimal('1256')]:
                        fail(name,'unsupported VERSION trio')
                    row=ET.SubElement(rec,'Row',{'line':str(start+2),'key':'version','prefix':s[:m[0].start()],
                            'suffix':s[m[-1].end():],'eol':'CRLF'})
                    for ki,x in enumerate(m):
                        if ki: row.set(f'gap{ki}',s[m[ki-1].end():x.start()])
                        text_field(row,('neutral','caesar','codepage')[ki],'integer' if ki==2 else 'real',x.group(),len(x.group()))
                else:add_row(rec,b,start+2+k,'text',f'version_text_{k:02d}')
        elif name=='CONTROL':
            if len(rows)!=4: fail(name,'requires four rows')
            rec=ET.SubElement(sec,'Record',{'id':'control-000001','index':'1','kind':'control'})
            start_idx=0
            for k,n in enumerate(NUMERIC_ROWS[name]):
                add_row(rec,rows[k],start+2+k,['integer']*n,'control',start_idx);start_idx+=n
        elif name=='AUX_DATA':
            if rows: fail(name,'AUX_DATA is a structural delimiter with zero rows')
        elif name=='NODENAME':
            for r,b in enumerate(rows):
                rec=ET.SubElement(sec,'Record',{'id':f'nodename-{r+1:06d}','index':str(r+1),'kind':'node-name'})
                add_row(rec,b,start+2+r,'nodename','node_name')
        elif name=='RESTRANT':
            if len(rows)%24: fail(name,'requires 24 rows per record')
            for rid in range(len(rows)//24):
                rec=ET.SubElement(sec,'Record',{'id':f'restrant-{rid+1:06d}','index':str(rid+1),'kind':'restraint-block'})
                for k,spec in enumerate(REST_ROWS):
                    b=rows[rid*24+k];l=start+2+rid*24+k
                    add_row(rec,b,l,'length' if spec=='string' else spec,
                            f'dof_{k//4+1}_{"tag" if k%4==2 else "guid" if k%4==3 else "values_"+str(k%4+1)}',0)
        elif name=='FLANGES':
            if rows:fail(name,'populated FLANGES grammar not qualified')
        elif name in NUMERIC_ROWS:
            spec=NUMERIC_ROWS[name]
            if name in UNOBSERVED_UNSUPPORTED and rows:fail(name,'populated grammar not qualified for current dialect')
            if len(rows)%len(spec):fail(name,f'expect multiple of {len(spec)} rows, got {len(rows)}')
            for rid in range(len(rows)//len(spec)):
                rec=ET.SubElement(sec,'Record',{'id':f'{name.lower().replace("&","_")}-{rid+1:06d}',
                        'index':str(rid+1),'kind':name.lower()})
                c=0
                for k,n in enumerate(spec):
                    add_row(rec,rows[rid*len(spec)+k],start+2+rid*len(spec)+k,n,name.lower().replace('&','_'),c); c+=n
        elif name=='MISCEL_1':
            nel=int(fields(get_section(root,'CONTROL').find('Record'))[0].get('value'))
            mats=(nel+5)//6
            if len(rows)!=mats+4:fail(name,f'expected {mats} material rows and 4 execution-option rows, got {len(rows)}')
            rec=ET.SubElement(sec,'Record',{'id':'miscel-000001','index':'1','kind':'material-ids-and-execution-options'})
            for k,b in enumerate(rows):
                if k<mats:
                    n=min(6,nel-k*6)
                    add_row(rec,b,start+2+k,n,'material_id',k*6)
                else:
                    if len(b)<2 or (len(b)-2)%13:fail(name,f'unsupported MISCEL_1 row {k+1}')
                    # Source-evidenced mixed integer/real execution-option rows.
                    v=b.decode('ascii'); kinds=['real' if ('.' in v[2+i*13:15+i*13] or 'E' in v[2+i*13:15+i*13].upper()) else 'integer' for i in range((len(b)-2)//13)]
                    add_row(rec,b,start+2+k,kinds,'misc_switch',(k-mats)*6)
        elif name=='UNITS':
            if len(rows)!=28:fail(name,'requires four conversion rows and 24 unit labels')
            rec=ET.SubElement(sec,'Record',{'id':'units-000001','index':'1','kind':'units'})
            for k,b in enumerate(rows):
                if k<4:add_row(rec,b,start+2+k,6 if k<3 else 4,'unit_factor',k*6)
                else:add_row(rec,b,start+2+k,'unit-label',UNIT_LABELS[k-4])
        elif name=='COORDS':
            if not rows:fail(name,'coordinate count row required')
            rec=ET.SubElement(sec,'Record',{'id':'coords-000001','index':'1','kind':'coordinate-table'})
            add_row(rec,rows[0],start+2,['integer'],'coordinate_count')
            for k,b in enumerate(rows[1:]):
                add_row(rec,b,start+3+k,['integer','real','real','real'],'coordinate',4*k)
        else:fail(name,'unknown section grammar')
    establish_links(root)
    validate(root)
    return root

def fields(rec):
    return [f for row in rec.findall('Row') for f in row.findall('Field')]

def count_map(root):
    control=root.find("./Sections/Section[@name='CONTROL']/Record")
    return {name:int(f.attrib['value']) for name,f in zip(COUNT_NAMES,fields(control))}

def get_section(root,name):
    return next((s for s in root.findall('./Sections/Section') if s.get('name')==name),None)

def integer_of(field, where):
    v=dec(field.get('value',''),where)
    if v!=v.to_integral_value():fail(where,'reference must be exact integer')
    return int(v)

def establish_links(root):
    links=ET.SubElement(root,'Relationships')
    elements=get_section(root,'ELEMENTS').findall('Record')
    nodes=set()
    for rec in elements:
        fs=fields(rec)
        for ix,side in ((0,'from'),(1,'to')):
            f=fs[ix]; n=integer_of(f,rec.get('id')+' endpoint')
            nodes.add(n)
            ET.SubElement(links,'Link',{'type':'element-endpoint','from':rec.get('id'),'field':f.get('name'),
                 'to':f'node-{n}','node-number':str(n),'role':side})
        for ix,sect in enumerate(POINTER_SECTIONS):
            f=next(f for f in fs if f.get('name')=='pointer_'+sect.lower().replace('&','_'))
            n=integer_of(f,rec.get('id')+' pointer')
            if n>0:
                ET.SubElement(links,'Link',{'type':'element-auxiliary','from':rec.get('id'),
                     'field':f.get('name'),'to':f'{sect.lower().replace("&","_")}-{n:06d}',
                     'target-section':sect,'storage-index':str(n)})
    for n in sorted(nodes):ET.SubElement(links,'Node',{'id':f'node-{n}','number':str(n)})
    miscel=get_section(root,'MISCEL_1')
    material_fields=[f for f in fields(miscel.find('Record')) if f.get('name','').startswith('material_id_')]
    if len(material_fields)!=len(elements):fail('MISCEL_1','material assignment count != element count')
    for index,f in enumerate(material_fields):
        mid=integer_of(f,'MISCEL_1 material assignment')
        if mid<1 or mid>699:fail('MISCEL_1',f'invalid material ID at element storage {index+1}')
        ET.SubElement(links,'Link',{'type':'element-material','from':elements[index].get('id'),
            'field':f.get('name'),'to':f'material-{mid}','material-number':str(mid),
            'resolution':'external-catalog-unloaded'})
    for mid in sorted({integer_of(f,'MISCEL_1 material') for f in material_fields}):
        ET.SubElement(links,'Material',{'id':f'material-{mid}','number':str(mid),
            'resolution':'external-catalog-unloaded'})
    coords=get_section(root,'COORDS')
    for rec in coords.findall('Record'):
        for row in rec.findall('Row')[1:]:
            f=row.find('Field')
            n=integer_of(f,'COORDS coordinate node')
            ET.SubElement(links,'Link',{'type':'coordinate-node','from':rec.get('id'),
                 'field':f.get('name'),'to':f'node-{n}','node-number':str(n),
                 'resolution':'known-node' if n in nodes else 'unresolved'})
    # Auxiliary to node references: restraint DOF association is field-specific, not record index.
    for sec in root.findall('./Sections/Section'):
        name=sec.get('name')
        if name not in ('RESTRANT','BEND','SIF&TEES','DISPLMNT','EQUIPMNT'):continue
        for rec in sec.findall('Record'):
            ff=fields(rec)
            slots=[]
            if name=='RESTRANT': slots=[(g*13, 'restraint-node') for g in range(6)]+[(g*13+5,'connecting-node') for g in range(6)]
            elif name=='BEND':slots=[(i-1,'bend-position-node') for i in (4,6,8)]
            elif name=='SIF&TEES':slots=[(i-1,'intersection-node') for i in (1,43)]
            elif name=='DISPLMNT':slots=[(i-1,'displacement-node') for i in (1,56)]
            elif name=='EQUIPMNT':slots=[(i-1,'equipment-node') for i in (1,18)]
            for ix,role in slots:
                if ix>=len(ff):continue
                f=ff[ix]
                # Invalid nonintegral required node slots are fatal, even if links are rebuilt.
                n=integer_of(f,rec.get('id')+' '+f.get('name','?')+' '+role)
                if n:
                    ET.SubElement(links,'Link',{'type':'auxiliary-node','from':rec.get('id'),
                          'field':f.get('name'),'field-index':str(ix+1),'to':f'node-{n}',
                          'node-number':str(n),'role':role,'resolution':'known-node' if n in nodes else 'unresolved'})

def _physical_token(value, where):
    # This B001 dialect admits printable ASCII inside one physical line only.
    # Reject CR/LF, tabs, NUL, DEL and non-ASCII *before* constructing bytes.
    if value is None or any(ord(c) < 32 or ord(c) > 126 for c in value):
        fail(where, 'non-printable/control or non-ASCII physical-line content')


def _numeric_name(key, index):
    if key == 'real': return FIELD_NAMES[index]
    if key == 'control': return COUNT_NAMES[index-1].lower().replace('&','_')
    if key == 'pointer': return 'pointer_'+POINTER_SECTIONS[index-1].lower().replace('&','_')
    if key == 'material': return ('line_color','line_visibility')[index-1]
    if key == 'material_id': return f'material_id_{index:06d}'
    if key == 'unit_factor': return UNIT_FACTORS[index-1]
    if key in AUX_FIELD_LABELS:
        return AUX_FIELD_LABELS[key].get(index, f'{key}_field_{index:03d}')
    return f'{key}_{index:03d}'


def _numeric_contract(key, count, base, kinds=None):
    kinds = kinds if kinds is not None else ['real'] * count
    return [(_numeric_name(key,base+i+1), kind,13) for i,kind in enumerate(kinds)]


def _row_contract(section, i, element_count):
    # Version-14 B001-evidenced layouts. No type/name/width is trusted from XML.
    # Returns (row-key, expected fields [(name,kind,width)], layout).
    if section == 'VERSION':
        if i == 0:return 'version', [('neutral','real',7),('caesar','real',7),('codepage','integer',4)], 'version'
        return f'version_text_{i:02d}', [(f'version_text_{i:02d}','text',77)], 'text'
    if section == 'CONTROL':
        return 'control',_numeric_contract('control',(6,6,6,1)[i],(0,6,12,18)[i],['integer']*(6,6,6,1)[i]),'numeric'
    if section == 'ELEMENTS':
        if i <= 8:return 'real',_numeric_contract('real',6 if i<8 else 5,6*i),'numeric'
        if i in (9,10):
            k='component_label' if i==9 else 'line_label'
            return k,[(k+'_length','integer',12),(k,'string',None)],'length'
        if i==11:return 'material',_numeric_contract('material',2,0,['integer']*2),'numeric'
        return 'pointer',_numeric_contract('pointer',6 if i<14 else 3,6*(i-12),['integer']*(6 if i<14 else 3)),'numeric'
    if section == 'NODENAME':
        return 'node_name',[('from_node_name','string',25),('to_node_name','string',25)],'nodename'
    if section == 'RESTRANT':
        g=i//4+1; part=i%4
        if part<2:
            start=0 if part==0 else 6; length=6 if part==0 else 3
            return f'dof_{g}_values_{part+1}',[(f'dof_{g}_{RESTRAINT_FIELDS[j]}','real',13) for j in range(start,start+length)],'numeric'
        k=f'dof_{g}_{"tag" if part==2 else "guid"}'
        return k,[(k+'_length','integer',12),(k,'string',None)],'length'
    if section == 'MISCEL_1':
        matrows=(element_count+5)//6
        if i<matrows:return 'material_id',_numeric_contract('material_id',min(6,element_count-i*6),i*6),'numeric'
        # The mixed control-option positions are explicit for the evidenced dialect;
        # do not infer types from user-supplied lexemes on XML intake.
        kinds=(('integer','integer','integer','integer','real','integer'),
               ('integer','integer','real','real','integer','integer'),
               ('integer','integer','integer','integer','real','integer'),
               ('integer',))[i-matrows]
        return 'misc_switch',_numeric_contract('misc_switch',len(kinds),(i-matrows)*6,kinds),'numeric'
    if section == 'UNITS':
        if i<4:return 'unit_factor',_numeric_contract('unit_factor',6 if i<3 else 4,6*i),'numeric'
        name=UNIT_LABELS[i-4]
        return name,[(name,'string',None)],'unit-label'
    if section == 'COORDS':
        if i==0:return 'coordinate_count',[('coordinate_count_001','integer',13)],'numeric'
        # Parser records an ordered table: row 2 begins at ordinal 005, not 001.
        # This is the existing canonical sequence, not a node-number namespace.
        return 'coordinate',[(f'coordinate_{4*(i-1)+j:03d}',kind,13)
                             for j,kind in enumerate(('integer','real','real','real'),1)],'numeric'
    key=section.lower().replace('&','_')
    spec=NUMERIC_ROWS[section];begin=sum(spec[:i]);n=spec[i]
    return key,_numeric_contract(key,n,begin),'numeric'


def _check_row_contract(section, i, row, element_count, where):
    key, expected, layout = _row_contract(section,i,element_count)
    if row.get('key')!=key:fail(where,f'row key {row.get("key")!r} != profile {key!r}')
    fs=list(row)
    if len(fs)!=len(expected):fail(where,'field cardinality != profile')
    for j,(f,(name,kind,width)) in enumerate(zip(fs,expected),1):
        if f.tag!='Field':fail(where,f'child {j} is not a Field')
        if f.get('name')!=name or f.get('kind')!=kind:
            fail(where,f'field {j}: expected {name}/{kind}, got {f.get("name")}/{f.get("kind")}')
        try:actual=int(f.get('width','-1'))
        except ValueError:fail(where+'/'+name,'noninteger width')
        if width is not None and actual!=width:
            fail(where+'/'+name,f'width {actual} != profile {width}')
        upper = 100 if layout == 'length' else 77
        if width is None and not (0 <= actual <= upper):
            fail(where+'/'+name,'unsupported variable string width')
        if f.get('edited') not in (None,'true','false'):
            fail(where+'/'+name,'invalid edited marker')
    for attr in ('prefix','separator','suffix','gap1','gap2'):
        if attr in row.attrib:_physical_token(row.get(attr), where+'/'+attr)
    if layout=='numeric':
        if row.get('prefix')!='  ' or row.get('separator') is not None or row.get('suffix')!='':
            fail(where,'numeric prefix/separator/suffix != profile')
    elif layout=='version':
        if (row.get('prefix'),row.get('gap1'),row.get('gap2'),row.get('suffix'))!=('    ','      ','        ','') or row.get('separator') is not None:
            fail(where,'VERSION row whitespace grammar mismatch')
        actual=[dec(f.get('value',''),where) for f in fs]
        if actual!=[Decimal(5),Decimal(14),Decimal(1256)]:fail(where,'unsupported VERSION trio 5/14/1256 required')
        lexical=[dec(f.get('lexeme',''),where) for f in fs]
        if lexical!=[Decimal(5),Decimal(14),Decimal(1256)]:fail(where,'VERSION lexeme profile mismatch')
    elif layout=='nodename':
        if (row.get('prefix'),row.get('separator'),row.get('suffix'))!=('  ',' ',''):
            fail(where,'NODENAME physical layout mismatch')
    elif layout=='length':
        if (row.get('prefix'),row.get('separator'),row.get('suffix'))!=('',' ',''):
            fail(where,'length-prefixed physical layout mismatch')
        rawlen=int(fs[0].get('value','-1'))
        if rawlen<0 or rawlen>100:fail(where,'invalid length-prefix value')
        if len(fs[1].get('lexeme',''))!=rawlen:fail(where,'length-prefix vs original payload mismatch')
    elif layout=='text':
        if (row.get('prefix'),row.get('suffix'))!=('','') or row.get('separator') is not None:
            fail(where,'VERSION text row layout mismatch')
    elif layout=='unit-label':
        if (row.get('prefix'),row.get('suffix'))!=('  ','') or row.get('separator') is not None:
            fail(where,'UNITS label layout mismatch')


def _serialize_field(f,row,where):
    kind=f.get('kind');raw=f.get('lexeme');val=f.get('value');width=int(f.get('width','-1'))
    if kind not in ('real','integer','string','text'):fail(where,'invalid field kind')
    if raw is None or val is None or len(raw)!=width:fail(where,'missing/wrong-width lexeme')
    _physical_token(raw,where+'/lexeme')
    _physical_token(val,where+'/value')
    edited=f.get('edited')=='true'
    if kind in ('real','integer'):
        old=normalized(raw,kind,where)
        new=normalized(val,kind,where)
        if not edited:
            if kind == 'integer':
                # A signed integer zero denotes exactly zero; -0 and +0 have no
                # distinct integer meaning. Only edited integer values are
                # re-rendered canonically; untouched I13 bytes stay intact.
                conflict = old != new
            else:
                # Real signed zero IS authoritative: changing its sign needs
                # edited=true, including when Decimal compares +0 == -0.
                original = dec(raw, where)
                authoritative = dec(val, where)
                conflict = (Decimal(old) != Decimal(new) or
                            (original.is_zero() and authoritative.is_zero() and
                             original.as_tuple().sign != authoritative.as_tuple().sign))
            if conflict:
                fail(where,'conflicting authoritative numeric value/sign and lexeme; set edited=true')
            return raw
        d=dec(val,where)
        if kind=='integer':
            # Edits canonicalize integer spelling (including signed zero) but
            # never round or relax pointer/count/reference bounds.
            result=str(int(d)).rjust(width)
        else:
            match=re.search(r'([EeDd])([+-])(\d+)\Z',raw.strip())
            if match:
                oldnum=raw.strip(); frac=len(oldnum.split('.')[1].split(match.group(1))[0]) if '.' in oldnum else 6
                exponent_width=len(match.group(3)); letter=match.group(1)
                if d.is_zero():
                    # Decimal('0') with precision formatting can report E+6
                    # for six fractional digits. Zero has no physical exponent;
                    # preserve the source lexeme's exponent instead. This also
                    # keeps the literal edited sign confined to its A13 span.
                    mant=f'{d:.{frac}f}'
                    ex=int(match.group(2)+match.group(3))
                else:
                    num=f'{d:.{frac}E}'
                    mant,exp=num.split('E');ex=int(exp)
                result=(mant+letter+('+' if ex>=0 else '-')+str(abs(ex)).zfill(exponent_width)).rjust(width)
            else:result=format(d,'f').rjust(width)
        if len(result)!=width:fail(where,'edited numeric overflow')
        if Decimal(normalized(result,kind,where)) != Decimal(new):
            fail(where, 'edited numeric value is not exactly representable in source field')
        if kind=='real' and d.is_zero() and dec(result,where).as_tuple().sign != d.as_tuple().sign:
            fail(where, 'edited numeric signed zero is not exactly representable')
        return result
    if not edited and raw != val:fail(where,'conflicting authoritative string and lexeme; set edited=true')
    result=val if edited else raw
    # A separator does not imply a variable-length field: NODENAME is
    # (2X,A25,1X,A25), while only the length-prefixed payload is variable.
    # The row contract independently fixes both A25 field widths.
    if (row.get('key')=='node_name' or row.get('separator') is None) and len(result)!=width:
        fail(where,'edited fixed-width string must preserve width')
    _physical_token(result,where+'/serialized')
    return result

def _row_bytes(row):
    key=row.get('key');fs=row.findall('Field');where=f'line {row.get("line")} ({key})'
    if not fs:fail(where,'missing fields')
    toks=[_serialize_field(f,row,where+'/'+f.get('name','?')) for f in fs]
    if key=='version':
        return row.get('prefix','')+''.join((row.get(f'gap{i}','') if i else '')+v for i,v in enumerate(toks))+row.get('suffix','')
    if key=='node_name':
        line=row.get('prefix','')+toks[0]+row.get('separator','')+toks[1]+row.get('suffix','')
        if len(toks[0])!=25 or len(toks[1])!=25 or len(line)!=53:
            fail(where,'NODENAME requires two A25 fields and exactly 53 row bytes')
        return line
    if row.get('separator') is not None:
        # Edited labels may have different length. The prefix is recalculated from payload.
        v=toks[1]
        if len(v)>100:fail(where,'string length exceeds 100')
        n=int(toks[0].strip())
        if n!=len(v):
            if fs[1].get('edited')!='true':fail(where,'length prefix disagrees with label')
            toks[0]=str(len(v)).rjust(12)
        return toks[0]+row.get('separator')+v
    return row.get('prefix','')+''.join(toks)+row.get('suffix','')

def expected_field_counts(name, total_elements, row_count):
    if name=='ELEMENTS':return [6]*8+[5,2,2,2,6,6,3]
    if name=='VERSION':return [3]+[1]*60
    if name=='CONTROL':return [6,6,6,1]
    if name=='NODENAME':return [2]
    if name=='RESTRANT':return [6,3,2,2]*6
    if name=='MISCEL_1':
        matrows=([6]*(total_elements//6))+([total_elements%6] if total_elements%6 else [])
        return matrows+[6,6,6,1]
    if name=='UNITS':return [6,6,6,4]+[1]*24
    if name=='COORDS':return [1]+[4]*(row_count-1)
    return NUMERIC_ROWS.get(name,[])


def expected_record_id(name, index):
    special={'VERSION':'version-000001','CONTROL':'control-000001',
             'MISCEL_1':'miscel-000001','UNITS':'units-000001','COORDS':'coords-000001'}
    if name in special:return special[name]
    return f'{name.lower().replace("&","_")}-{index:06d}' if name!='ELEMENTS' else f'element-{index:06d}'

def validate(root:ET.Element):
    if root.tag!='RichInputXMLv2' or root.get('schema')!=VERSION or root.get('profile')!=PROFILE:
        fail('XML','unsupported schema/version/profile')
    if root.get('encoding')!='ASCII' or root.get('line-endings')!='CRLF' or root.get('final-eol')!='yes':
        fail('XML','unsupported physical byte policy')
    if list(child.tag for child in root)!=['Sections','Relationships']:fail('XML','invalid root children')
    secparent=root.find('Sections');ss=list(secparent)
    if len(ss)!=len(SECTIONS) or [s.get('name') for s in ss]!=SECTIONS:
        fail('sections','duplicate, missing or reordered section')
    seen_ids=set()
    ctrl=get_section(root,'CONTROL')
    if ctrl is None or not ctrl.find('Record'):fail('CONTROL','missing counts')
    elem_total=integer_of(fields(ctrl.find('Record'))[0],'CONTROL element count')
    physical_line=1
    for ix,s in enumerate(ss):
        name=s.get('name')
        if s.tag!='Section' or s.get('position')!=str(ix+1):fail(name,'section header/ordinal mismatch')
        header=s.get('header','')
        _physical_token(header,name+'/header')
        if re.fullmatch(re.escape('#$ '+name)+r' *',header) is None:
            fail(name,'section header must be exact profile spelling with optional trailing spaces')
        if s.get('line')!=str(physical_line):fail(name,'section physical line sequence mismatch')
        physical_line+=1
        recs=list(s)
        if name in UNOBSERVED_UNSUPPORTED and recs:fail(name,'populated grammar not qualified')
        if name=='AUX_DATA' and recs:fail(name,'no records allowed')
        for ri,rec in enumerate(recs):
            rid=rec.get('id')
            if rec.tag!='Record' or not rid or rid in seen_ids or rec.get('index')!=str(ri+1):fail(name,'duplicate/invalid record ID or ordinal')
            if rid!=expected_record_id(name,ri+1):fail(name,'record identity not canonical')
            seen_ids.add(rid)
            rows=list(rec)
            expected={ 'ELEMENTS':15,'VERSION':61,'CONTROL':4,'NODENAME':1,'RESTRANT':24,
                        'MISCEL_1':None,'UNITS':28,'COORDS':None}.get(name,len(NUMERIC_ROWS.get(name,[])))
            if expected is not None and len(rows)!=expected:fail(rid,f'expected {expected} rows, got {len(rows)}')
            field_counts=expected_field_counts(name,elem_total,len(rows))
            if len(rows)!=len(field_counts):fail(rid,'invalid record row schema')
            seen_names=set()
            for row_index,row in enumerate(rows):
                if row.tag!='Row' or row.get('eol')!='CRLF':fail(rid,'invalid physical row')
                if row.get('line')!=str(physical_line):fail(rid,'physical row misordered/missing line')
                physical_line+=1
                _check_row_contract(name,row_index,row,elem_total,rid+f'/row-{row_index+1}')
                fs_in_row=row.findall('Field')
                if len(fs_in_row)!=field_counts[row_index]:fail(rid,f'row {row_index+1}: expected {field_counts[row_index]} fields, got {len(fs_in_row)}')
                if name in NUMERIC_ROWS or name in ('ELEMENTS','CONTROL'):
                    if len(fs_in_row)>=3 and row.get('separator') is None and row.get('prefix')!='  ':fail(rid,'invalid numeric prefix')
                for f in row:
                    if f.tag!='Field' or not f.get('name'):fail(rid,'unexpected child / missing field name')
                    if f.get('name') in seen_names:fail(rid,'duplicate field name '+f.get('name'))
                    seen_names.add(f.get('name'))
                _row_bytes(row)
            if name=='ELEMENTS':
                ff=fields(rec)
                if len(ff)!=53+4+2+15:fail(rid,'missing fields including final EQUIPMNT pointer')
                expected_names=[FIELD_NAMES[i] for i in range(1,54)] + [
                    'component_label_length','component_label','line_label_length','line_label',
                    'line_color','line_visibility'] + ['pointer_'+p.lower().replace('&','_') for p in POINTER_SECTIONS]
                if [f.get('name') for f in ff]!=expected_names:fail(rid,'element field order/names inconsistent with v2 schema')
                pointers=ff[-15:]
                if [f.get('name') for f in pointers]!=['pointer_'+p.lower().replace('&','_') for p in POINTER_SECTIONS]:fail(rid,'wrong pointer schema')
            if name=='CONTROL' and len(fields(rec))!=19:fail(name,'CONTROL needs 19 exact fields')
    counts=count_map(root)
    for name in COUNT_NAMES:
        n=counts[name]
        if n<0:fail('CONTROL',name+' negative')
        if name in SECTIONS and name not in ('NOZZLES','HANGERS','IZUP'):
            actual=len(get_section(root,name).findall('Record'))
            if actual!=n:fail('CONTROL',f'{name}: declared {n}, actual {actual}')
    if any(counts[x] for x in ('NOZZLES','HANGERS','IZUP')):fail('CONTROL','unsupported nonzero special counts')
    if len(get_section(root,'VERSION').findall('Record'))!=1:fail('VERSION','exactly one version record')
    if len(get_section(root,'CONTROL').findall('Record'))!=1:fail('CONTROL','exactly one control record')
    er=get_section(root,'ELEMENTS').findall('Record')
    for rec in er:
        ff=fields(rec)
        for f in ff[:2]:integer_of(f,rec.get('id')+' '+f.get('name'))
        for f,sec in zip(ff[-15:],POINTER_SECTIONS):
            n=integer_of(f,rec.get('id')+' '+f.get('name'))
            if n<0 or n>counts.get(sec,0):fail(rec.get('id')+'/'+f.get('name'),f'dangling/wrong-range {sec} pointer {n}')
    mr=get_section(root,'MISCEL_1').find('Record')
    if mr is None or len(mr.findall('Row'))!=(len(er)+5)//6+4:
        fail('MISCEL_1','material rows/options inconsistent with element count')
    cr=get_section(root,'COORDS').find('Record')
    cf=fields(cr)
    if not cf or int(cf[0].get('value'))!=(len(cf)-1)//4 or (len(cf)-1)%4:fail('COORDS','coordinate count mismatch')
    # Rebuild authoritative relationships without trusting user-editable link identities.
    tmp=ET.Element('RichInputXMLv2',root.attrib)
    # Read-only shared source tree: do not materialize a second 10-MB XML tree.
    tmp.append(secparent)
    establish_links(tmp)
    a=sorted((tuple(sorted(x.attrib.items())) for x in root.find('Relationships')))
    b=sorted((tuple(sorted(x.attrib.items())) for x in tmp.find('Relationships')))
    if a!=b:fail('Relationships','stale, dangling, duplicate or wrong-type graph: rebuild through documented parser')
    return {'sections':len(ss),'elements':len(er),'links':len(root.find('Relationships')),
            'nodes':len(root.find('Relationships').findall('Node')),'counts':counts}

def write_cii(root):
    validate(root)
    result=[]
    for s in root.find('Sections'):
        result.append(s.get('header').encode(ASCII)+b'\r\n')
        for rec in s:
            for row in rec:
                try: result.append(_row_bytes(row).encode(ASCII)+b'\r\n')
                except UnicodeEncodeError:fail(row.get('line'),'invalid ASCII output')
    return b''.join(result)

def xml_bytes(root):
    ET.indent(root,space='  ')
    return ET.tostring(root,encoding='utf-8',xml_declaration=True)

def load_xml(path):
    data=Path(path).read_bytes()
    if len(data)>150_000_000:fail('XML','input exceeds 150 MB')
    # ASCII markup has NUL padding in UTF-16/32; screen before parsing entities.
    if re.search(rb'<!\s*(?:DOCTYPE|ENTITY)',data.replace(b'\x00',b''),re.I):fail('XML','DTD/entities prohibited')
    try:root=ET.fromstring(data)
    except ET.ParseError as e:fail('XML',f'malformed: {e}')
    validate(root)
    return root

def save_new(path, data, source=None):
    dest=Path(path).resolve()
    if source is not None and Path(source).resolve()==dest:fail('CLI','output path must differ from input')
    if dest.exists():fail('CLI','refusing to overwrite existing output; use fresh disposable path')
    dest.parent.mkdir(parents=True,exist_ok=True)
    with dest.open('xb') as h:h.write(data)

def fingerprint(b):
    return {'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}

def first_difference(a,b):
    n=min(len(a),len(b))
    i=next((i for i in range(n) if a[i]!=b[i]),n)
    return None if a==b else {'offset_zero_based':i,'expected_hex':a[i:i+12].hex(),
                 'actual_hex':b[i:i+12].hex(),'expected_size':len(a),'actual_size':len(b)}
