"""CAESAR II v14 neutral DISPLMNT (N3,110), 2x(1 node + 9x6 DOF).
References: official V14 Users Guide auxiliary-data /1471418 and associated
337043.png diagram, with locator equation from Oracle's private brief.
No assertion that a specific XMLv1.1 converter is yet qualified.
"""
from dataclasses import dataclass, asdict
from decimal import Decimal, InvalidOperation
import hashlib, json, re

VERSION = 'displacement-profile-v1.0.0'
GUIDE = 'https://docs.hexagonppm.com/r/en-US/CAESAR-II-Users-Guide/Version-14/1471418'
FORMAT = '2X+6G13.6'
DOFS = ('DX', 'DY', 'DZ', 'RX', 'RY', 'RZ')
SENTINEL = Decimal('9999.99')
NUMERIC = re.compile(rb'[+-]?(?:(?:\d+(?:\.\d*)?)|(?:\.\d+))(?:[EeDd][+-]?\d+)?\Z')

@dataclass(frozen=True)
class Location:
    slot: int
    vector: int | None
    dof: str | None
    flat_field: int
    row: int
    column: int
    unit_kind: str
    def as_dict(self): return asdict(self)

def node_locator(slot):
    if slot not in (0, 1): raise ValueError('slot must be 0 or 1')
    return Location(slot, None, None, 55*slot+1, 10*slot+1, 1, 'node_id')

def component_locator(slot, vector, dof):
    if slot not in (0, 1) or type(vector) is not int or not 1 <= vector <= 9 or dof not in DOFS:
        raise ValueError('invalid displacement locator')
    d = DOFS.index(dof)
    return Location(slot, vector, dof, 55*slot + 2 + 6*(vector-1) + d,
                    10*slot+1+vector, d+1, 'displacement_length' if d<3 else 'rotation_angle')

def table():
    return [node_locator(s).as_dict() for s in (0,1)] + [component_locator(s,v,d).as_dict() for s in (0,1) for v in range(1,10) for d in DOFS]

def profile_hash():
    return hashlib.sha256(json.dumps({'version': VERSION,'guide':GUIDE,'format':FORMAT,'table':table()}, sort_keys=True, separators=(',', ':')).encode()).hexdigest()

def parse_value(token: bytes):
    stripped = token.strip()
    if not stripped or not NUMERIC.fullmatch(stripped): return ('unsupported', None)
    try: val = Decimal(stripped.decode('ascii').replace('D', 'E').replace('d','E'))
    except (InvalidOperation, UnicodeDecodeError): return ('unsupported', None)
    if not val.is_finite(): return ('unsupported', None)
    if val == SENTINEL: return ('sentinel', val)
    if val == 0: return ('signed_zero' if val.is_signed() else 'zero', val)
    return ('finite', val)

def parse_node(token: bytes):
    state, val = parse_value(token)
    if state == 'unsupported' or val is None or val != val.to_integral_value() or val < 0 or val >= 10**12:
        raise ValueError('invalid/inexact node ID')
    return int(val) if val != 0 else None

def scientific_text(value, digits, style):
    """Independent exact scientific spelling using the pinned writer convention."""
    exponent=value.copy_abs().adjusted() if value else 0
    mantissa=value.scaleb(-exponent)
    quantum=Decimal(1).scaleb(-digits)
    if mantissa.quantize(quantum)!=mantissa:raise ValueError('inexact scientific representation')
    exp_digits=len(style[1:].lstrip('+-'))
    exp_text=('+' if exponent>=0 else '-')+str(abs(exponent)).rjust(exp_digits,'0')
    return f'{mantissa:.{digits}f}'+style[0]+exp_text


def format_like(before: bytes, value: Decimal) -> bytes:
    """Conservative exact formatter. Inexact/overflow are errors, never rounded.
    Explicit zero policy: preserve target signedness when source is zero.
    """
    s = before.decode('ascii').strip()
    if not s: raise ValueError('missing target numeric lexeme')
    value = Decimal(value)
    if not value.is_finite() or value == SENTINEL: raise ValueError('invalid numeric proposal')
    old_state,old_value=parse_value(before)
    if old_state in ('unsupported','sentinel'):raise ValueError('unsupported/sentinel target value')
    # When both values are zero, preserve signed-zero spelling. A nonzero target
    # receiving zero is formatted using the target decimal precision below.
    if value == 0 and parse_value(before)[1] == 0: return before
    if value==old_value:return before
    m = re.fullmatch(r'([+-]?)(\d*)(?:\.(\d*))?([eEdD][+-]?\d+)?', s)
    if not m: raise ValueError('unsupported numeric target style')
    digits = len(m.group(3) or '')
    if m.group(4):
        # Match pinned F05 writer convention, using independent Decimal arithmetic.
        # Semantic no-ops above retain their original exponent/lexical bytes.
        rendered=scientific_text(value,digits,m.group(4))
    else:
        quantum = Decimal(1).scaleb(-digits)
        if value.quantize(quantum) != value: raise ValueError('inexact decimal representation')
        rendered = f'{value:.{digits}f}' if m.group(3) is not None else f'{value:.0f}'
    if m.group(1) == '+' and not rendered.startswith('-'): rendered = '+' + rendered
    if len(rendered) > len(before): raise ValueError('fixed-field overflow')
    recovered=Decimal(rendered.replace('D','E').replace('d','E'))
    if recovered!=value or (value==0 and recovered.is_signed()!=value.is_signed()):
        raise ValueError('scientific/fixed formatting changed authoritative value')
    return rendered.rjust(len(before)).encode('ascii')
