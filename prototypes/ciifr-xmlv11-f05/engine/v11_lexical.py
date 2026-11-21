"""Strict ASCII fixed-column codec; numeric values are authoritative, lexemes advisory.

An unchanged field reuses its original lexical *spelling* only if its Decimal
value and signed-zero identity agree. Editing `value` forces deterministic
regeneration. Preserve D/E/e, exponent width and mantissa precision when it fits.
"""
import re
from decimal import Decimal, InvalidOperation, ROUND_HALF_EVEN

NUM = re.compile(r'[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[EeDd][+-]?\d+)?\Z')
INT = re.compile(r'[+-]?\d+\Z')
SCI = re.compile(r'([+-]?)(\d*\.?\d+|\d+\.?)([EeDd])([+-]?)(\d+)\Z')

class ConversionError(ValueError): pass

def parse_decimal(value, context='number'):
    if not NUM.fullmatch(value):
        raise ConversionError(f'{context}: unsupported numeric token {value!r}')
    try:
        d=Decimal(value.replace('d','E').replace('D','E'))
    except InvalidOperation as e:
        raise ConversionError(f'{context}: invalid Decimal {value!r}') from e
    if not d.is_finite():raise ConversionError(f'{context}: non-finite value')
    return d

def same_number(a,b):
    # negative zero is *not* equivalent to positive zero for lexical reuse.
    return a==b and (not a.is_zero() or a.is_signed()==b.is_signed())

def parse_fixed_token(token,kind,context):
    if not token or token != token.strip(' ') and '\t' in token:
        raise ConversionError(f'{context}: unsupported field whitespace')
    s=token.strip(' ')
    if kind in ('int','pointer') and not INT.fullmatch(s):
        raise ConversionError(f'{context}: expected base-10 integer, found {s!r}')
    d=parse_decimal(s,context)
    if kind in ('int','pointer') and d!=d.to_integral_value():
        raise ConversionError(f'{context}: non-integer')
    return s, d

def render_numeric(value,lex,kind,context,width=13):
    # Reject unacceptable user edits, even if a stale lexical spelling could fit.
    if kind in ('int','pointer') and not INT.fullmatch(value):
        raise ConversionError(f'{context}: expected integer value')
    d=parse_decimal(value,context)
    if kind in ('int','pointer') and d!=d.to_integral_value():
        raise ConversionError(f'{context}: invalid integer value')
    if lex is not None:
        if len(lex)!=width or '\t' in lex or '\n' in lex or '\r' in lex:
            raise ConversionError(f'{context}: invalid lexical metadata width')
        original, old=parse_fixed_token(lex,kind,context)
        if same_number(d,old):return lex
    # When an edit is numerically different (including sign of zero), regenerate.
    original = (lex or '').strip()
    sci = SCI.fullmatch(original)
    if kind in ('int','pointer'):
        new=str(int(d))
        # Maintain optional explicit plus and leading zero count only on edited ints.
        if original.startswith('+') and not new.startswith('-'):new='+'+new
    elif sci:
        sign,mant,letter,exp_sign,exp_digits=sci.groups()
        precision=len(mant.split('.')[1]) if '.' in mant else 0
        # Decimal's E formatting can use precision as the zero exponent;
        # build scientific mantissa/exponent explicitly for stable signed zero.
        eint=d.copy_abs().adjusted() if not d.is_zero() else 0
        m=d.scaleb(-eint)
        quantum=Decimal(1).scaleb(-precision)
        m=m.quantize(quantum, rounding=ROUND_HALF_EVEN)
        if m.copy_abs()>=Decimal(10):
            m=m/Decimal(10);eint+=1
        mantissa=f'{m:.{precision}f}'
        exponent=('+' if eint>=0 else '-')+str(abs(eint)).rjust(len(exp_digits),'0')
        new=mantissa+letter+exponent
        if sign=='+' and not new.startswith('-'):new='+'+new
        if not sign and d.is_zero() and d.is_signed() and not new.startswith('-'):new='-'+new
    else:
        # General non-scientific numeric spelling: preserve decimal precision.
        precision=len(original.split('.')[1]) if '.' in original else 0
        if '.' in original:new=f'{d:.{precision}f}'
        else:new=format(d,'f')
        if original.startswith('+') and not new.startswith('-'):new='+'+new
        if original.startswith('.') and new.startswith('0.'):new=new[1:]
        if original.startswith('-.') and new.startswith('-0.'):new='-'+new[2:]
    # Reject silently rounded/quantized edits. A token must reparse to exactly
    # the authoritative Decimal including signed zero, irrespective of width.
    try:
        chosen=parse_decimal(new, context)
    except ConversionError as e:
        raise ConversionError(f'{context}: unrepresentable edited Decimal') from e
    if not same_number(d,chosen):
        raise ConversionError(f'{context}: edited value {value!r} is not exactly representable as {new!r}')
    if len(new)>width:
        raise ConversionError(f'{context}: numeric overflow, {new!r} exceeds {width} columns')
    return new.rjust(width)

def decode_ascii(data):
    try:return data.decode('ascii','strict')
    except UnicodeDecodeError as e:raise ConversionError('unsupported non-ASCII byte; codepage 1256 is not qualified') from e

def encode_ascii(value,context):
    try:return value.encode('ascii','strict')
    except UnicodeEncodeError as e:raise ConversionError(f'{context}: unsupported non-ASCII text') from e
