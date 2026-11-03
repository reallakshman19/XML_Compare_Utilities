"""CII v14 record grammar. Values are data, never opaque source-row replays."""
from __future__ import annotations
from collections import Counter
from decimal import Decimal, InvalidOperation
import re

SECTIONS = ('VERSION','CONTROL','ELEMENTS','AUX_DATA','NODENAME','BEND','RIGID',
            'EXPJT','RESTRANT','DISPLMNT','FORCMNT','UNIFORM','WIND','OFFSETS',
            'ALLOWBLS','SIF&TEES','REDUCERS','FLANGES','EQUIPMNT','MISCEL_1','UNITS','COORDS')
COUNTS = ('ELEMENTS','NOZZLES','HANGERS','NODENAME','REDUCERS','FLANGES',
          'BEND','RIGID','EXPJT','RESTRANT','DISPLMNT','FORCMNT',
          'UNIFORM','WIND','OFFSETS','ALLOWBLS','SIF&TEES','IZUP','EQUIPMNT')
POINTERS = ('BEND','RIGID','EXPJT','RESTRANT','DISPLMNT','FORCMNT','UNIFORM',
            'WIND','OFFSETS','ALLOWBLS','SIF&TEES','NODENAME','REDUCERS',
            'FLANGES','EQUIPMNT')
BLOCKS = {'ELEMENTS':15,'NODENAME':1,'BEND':3,'RIGID':1,'RESTRANT':24,
          'DISPLMNT':20,'ALLOWBLS':28,'SIF&TEES':14,'REDUCERS':2}
EXPLICIT_NAMES = ('FROM_NODE','TO_NODE','DELTA_X','DELTA_Y','DELTA_Z','DIAMETER',
    'WALL_THICK','INSUL_THICK','CORR_ALLOW',*(f'TEMP_EXP_C{i}' for i in range(1,10)),
    *(f'PRESSURE_C{i}' for i in range(1,10)))
REL_NAMES = tuple(EXPLICIT_NAMES[i] if i < len(EXPLICIT_NAMES) else f'REL_{i+1:02d}'
                  for i in range(53))
BEND_NAMES=('RADIUS','TYPE','ANGLE1','NODE1','ANGLE2','NODE2','ANGLE3','NODE3',
            'NUM_MITER','FITTINGTHICKNESS','KFACTOR')
RESTRAINT_NAMES=('NODE','TYPE','STIFFNESS','GAP','FRICTION','CNODE')
EXP = re.compile(r'^([+-]?\d+\.\d+)[EeDd]([+-]?\d+)$')
INTEGER = re.compile(r'^[+-]?\d+$')
FIXED = re.compile(r'^[+-]?(?:\d+\.\d*|\.\d+)$')

class RichFormatError(ValueError):
    pass

SCHEMA = 'RichInputXML-P1.v1.1'
DIALECT = 'CII-V14'
XML_TYPE = 'RichInput'
LINE_ENDINGS = {'CRLF': b'\r\n', 'LF': b'\n', 'CR': b'\r', 'NONE': b''}
EMPTY_ONLY = frozenset(('AUX_DATA','EXPJT','FORCMNT','UNIFORM','WIND',
                        'OFFSETS','FLANGES','EQUIPMNT'))
FIXED_BLOCKS = {'VERSION':61, 'CONTROL':4, 'UNITS':28}
# VERSION: separated unexponentiated decimal tokens and bounded ASCII spaces.
# Retain all layout gaps separately; the typed values remain authoritative.
VERSION_VALUE = r'[+-]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)'
VERSION_ROW = re.compile(
    rf'( *)(?P<revision>{VERSION_VALUE})( +)(?P<version>{VERSION_VALUE})'
    r'( +)(?P<codepage>[0-9]+)( *)\Z')


def version_parts(text):
    match = VERSION_ROW.fullmatch(text)
    if not match or len(text) > 128:
        raise RichFormatError('VERSION/row1: unsupported spelling or spacing (ASCII decimal + spaces only, max 128)')
    lead, revision, mid, version, sep, codepage, trail = match.groups()
    if any(len(gap) > 80 for gap in (lead, mid, sep, trail)):
        raise RichFormatError('VERSION/row1: unsupported gap width (>80 spaces)')
    return dict(revision=revision, version=version, codepage=codepage,
                pad0=str(len(lead)), pad1=str(len(mid)),
                pad2=str(len(sep)), padEnd=str(len(trail)))


def physical_lines(data):
    """Yield ASCII physical rows with exact terminators; no replacement decoding."""
    at = 0
    for n, part in enumerate(data.splitlines(keepends=True), 1):
        if part.endswith(b'\r\n'):
            end, code = b'\r\n', 'CRLF'
        elif part.endswith(b'\n'):
            end, code = b'\n', 'LF'
        elif part.endswith(b'\r'):
            end, code = b'\r', 'CR'
        else:
            end, code = b'', 'NONE'
        text = part[:-len(end)] if end else part
        if not text.isascii():
            raise RichFormatError(f'Non-ASCII data on physical line {n}')
        yield {'text': text.decode('ascii'), 'start': at,
               'end': at + len(part), 'line': n, 'nl': code}
        at += len(part)


def expected_fields(section, row, record, element_count):
    """Source-backed positional sequence, with exact fixed-width row cardinality."""
    if section == 'ELEMENTS':
        if row < 9:
            return list(REL_NAMES[row*6:min(53,(row+1)*6)])
        if row == 11:
            return ['ELEMENT_FLAG_1', 'ELEMENT_FLAG_2']
        if row >= 12:
            return list(POINTERS[(row-12)*6:(row-11)*6])
    if section == 'MISCEL_1':
        index = record - 1
        mat_rows = (element_count+5)//6
        if index < mat_rows:
            return [f'MATERIAL_{index*6+i+1}'
                    for i in range(min(6,element_count-index*6))]
        if index == mat_rows+3:
            return [f'MISC_OPTION_{(index-mat_rows)*6+1}']
        return record_schema(section,index,record,element_count)
    if section == 'BEND' and row == 2:
        return record_schema(section,row,record,element_count)[:2]
    if section == 'DISPLMNT' and row in (0,10):
        return record_schema(section,row,record,element_count)[:1]
    if section == 'ALLOWBLS' and row == 25:
        return record_schema(section,row,record,element_count)[:2]
    if section == 'CONTROL':
        return list(COUNTS[(record-1)*6:record*6])
    if section == 'UNITS':
        return record_schema(section,record-1,record,element_count)[:(4 if record == 4 else 6)]
    if section == 'COORDS':
        return record_schema(section,record-1,record,element_count)
    return record_schema(section,row,record,element_count)


def expected_rows(section, record, element_count, count):
    if section in FIXED_BLOCKS or section == 'MISCEL_1' or section == 'COORDS':
        return 1
    if section not in BLOCKS:
        raise RichFormatError(f'{section}: nonempty record grammar UNSUPPORTED')
    return BLOCKS[section]


def section_map(data):
    out={};current=None
    for row in physical_lines(data):
        text=row['text']
        if text.startswith('#$'):
            if not text.startswith('#$ '):
                raise RichFormatError(f'line {row["line"]}: malformed section header prefix')
            name=text[3:].rstrip(' ')
            if name not in SECTIONS:
                raise RichFormatError(f'line {row["line"]}: unsupported section header {name!r}')
            if len(text) - 3 - len(name) > 80:
                raise RichFormatError(f'line {row["line"]}: section header padding exceeds 80')
            if name in out:raise RichFormatError(f'Duplicate section {name}')
            out[name]={'header':row,'rows':[]};current=out[name]
        elif current is None:raise RichFormatError('Data before first section')
        else:current['rows'].append(row)
    if tuple(out)!=SECTIONS:raise RichFormatError('Unsupported section sequence/dialect')
    return out

def decode_scalar(token):
    """Accept supported G13 lexical variants, retaining numeric style/precision."""
    from v11_lexical import NUM, parse_decimal
    t=token.strip(' ')
    if not t or not NUM.fullmatch(t):
        raise RichFormatError(f'Invalid fixed-width numeric field: {t!r}')
    if 'E' in t.upper() or 'D' in t.upper():
        mant=re.split(r'[EeDd]',t,1)[0]
        style,precision='E',len(mant.split('.')[1]) if '.' in mant else 0
    elif INTEGER.fullmatch(t):style,precision='I',0
    else:style,precision='F',len(t.split('.')[1])
    d=parse_decimal(t)
    return str(d),style,str(precision)

def encode_scalar(v,style,precision):
    d=Decimal(v);p=int(precision)
    if not d.is_finite() or not 0<=p<=12:raise RichFormatError('Nonfinite or invalid precision')
    if style=='I':
        if d!=d.to_integral_value():raise RichFormatError('Noninteger I field')
        val=f'{d:.0f}'
    elif style=='F':val=f'{d:.{p}f}'
    elif style=='E':
        val=f'{d:.{p}E}'
        mant,exp=val.split('E')
        val=mant+'E'+('+' if int(exp)>=0 else '-')+f'{abs(int(exp)):02d}'
    else:raise RichFormatError(f'Unsupported numeric style {style}')
    if len(val)>13:raise RichFormatError(f'Numeric field exceeds G13: {val}')
    return val.rjust(13)

def numbers_from_row(text):
    if len(text)<15 or (len(text)-2)%13 or text[:2]!='  ':
        raise RichFormatError(f'Expected 2X/G13 numeric record, width {len(text)}')
    return [decode_scalar(text[i:i+13]) for i in range(2,len(text),13)]

def record_schema(section,row,record,element_count):
    if section=='ELEMENTS':
        if row<8:return ['REL_%02d'% (row*6+c+1) for c in range(6)]
        if row==8:return ['REL_%02d'% (49+c) for c in range(5)]
        if row==11:return ['ELEMENT_FLAG_1','ELEMENT_FLAG_2']
        if row>=12:return list(POINTERS[(row-12)*6:(row-11)*6])
    if section=='CONTROL':return list(COUNTS[row*6:(row+1)*6])
    if section=='BEND':return [BEND_NAMES[i] if i < len(BEND_NAMES) else f'BEND_FIELD_{i+1}' for i in range(row*6,(row+1)*6)]
    if section=='RIGID':return ['WEIGHT','RIGID_OPTION']
    if section=='RESTRANT':
        slot=row//4
        if row%4==0:return [f'SLOT_{slot+1}_{n}' for n in RESTRAINT_NAMES]
        if row%4==1:return [f'SLOT_{slot+1}_{axis}' for axis in ('XCOS','YCOS','ZCOS')]
    if section=='REDUCERS':
        return [f'REDUCER_{row*5+i+1}' for i in range(5)]
    if section=='SIF&TEES':return [f'SIF_{row*6+i+1}' for i in range(6)]
    if section=='ALLOWBLS':return [f'ALLOW_{row*6+i+1}' for i in range(6)]
    if section=='UNITS':return [f'UNIT_FACTOR_{row*6+i+1}' for i in range(6)]
    if section=='DISPLMNT':return [f'DISPL_{row*6+i+1}' for i in range(6)]
    if section=='MISCEL_1':
        if row < (element_count+5)//6:return [f'MATERIAL_{row*6+i+1}' for i in range(6)]
        return [f'MISC_OPTION_{(row-(element_count+5)//6)*6+i+1}' for i in range(6)]
    if section=='COORDS':return ['COORD_COUNT'] if row==0 else ['NODE','X','Y','Z']
    return []

def classify_row(section,row_index,record_row):
    if section=='VERSION':return 'VERSION_NUMBER' if row_index==0 else 'VERSION_TEXT'
    if section=='NODENAME':return 'NODE_NAMES'
    if section=='ELEMENTS' and record_row in (9,10):return 'ELEMENT_NAME' if record_row==9 else 'LINE_NAME'
    if section=='RESTRANT' and record_row%4 in (2,3):return 'RESTRAINT_TAG' if record_row%4==2 else 'RESTRAINT_GUID'
    if section=='UNITS' and row_index>=4:return 'UNIT_LABEL'
    return 'NUMERIC'
