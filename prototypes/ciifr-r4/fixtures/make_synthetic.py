#!/usr/bin/env python3
"""Wholly invented V14 B001-like CII regression fixture; no private CII data copied."""
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).parents[1]/'baseline_r3'))
from profile import SECTIONS, COUNT_NAMES, UNIT_LABELS, UNIT_FACTORS, POINTER_SECTIONS

def numeric(values, integer=False):
    return '  '+''.join((f'{int(x):13d}' if integer else f'{float(x):13.6E}') for x in values)
def length(s):
    assert len(s)<=100
    return f'{len(s):12d} '+s

def fixture(num_elements=2):
    assert num_elements==2
    counts={key:0 for key in COUNT_NAMES}
    counts.update({'ELEMENTS':2,'BEND':1,'RIGID':1,'RESTRANT':1,'DISPLMNT':1,'NODENAME':1,'SIF&TEES':1})
    # Exactly 60 blank synthetic metadata lines plus version trio = 61
    records={'VERSION':['    5.00000      14.0000        1256']+[' '*77]*60,
             'CONTROL':[numeric([counts[k] for k in COUNT_NAMES][i:i+n],True) for i,n in [(0,6),(6,6),(12,6),(18,1)]]}
    elements=[]
    for index,(start,end) in enumerate(((10,20),(20,30)),1):
        v=[0.0]*53
        v[0:9]=[start,end,100 if index==1 else -40,0,0,114.3,6.02,0,0]
        v[9]=120;v[18]=1500;v[46]=9999.99;v[47]=9999.99;v[29]=1e-10
        elements += [numeric(v[i:i+n]) for i,n in [(0,6),(6,6),(12,6),(18,6),(24,6),(30,6),(36,6),(42,6),(48,5)]]
        elements += [length('SYNTH-EL-'+str(index)),length('SYNTH-LINE-A'),numeric([-1,-1],True)]
        ptr=[0]*15
        if index==1:
            for sec in ('BEND','RIGID','RESTRANT','DISPLMNT','SIF&TEES','NODENAME'):
                ptr[POINTER_SECTIONS.index(sec)]=1
        elements += [numeric(ptr[0:6],True),numeric(ptr[6:12],True),numeric(ptr[12:15],True)]
    records['ELEMENTS']=elements
    records['AUX_DATA']=[]
    records['NODENAME']=['  '+f'{"SYNTH-A":<25}'+' '+f'{"SYNTH-B":<25}']
    # Bend: positions are auxiliary node references (can differ from endpoints)
    bend=[228.6,0,45,19]+[0]*10
    records['BEND']=[numeric(bend[i:i+n]) for i,n in [(0,6),(6,6),(12,2)]]
    records['RIGID']=[numeric([12.5,1])]
    records['EXPJT']=[]
    restr=[]
    for n in range(6):
        vals=[20,14,0,0,0.3,99,0,0,0] if n==0 else [0]*9
        restr += [numeric(vals[:6]),numeric(vals[6:]),length(''),length('')]
    records['RESTRANT']=restr
    displacement=[99]+[9999.99]*54+[0]+[0]*54
    assert len(displacement)==110
    records['DISPLMNT']=[numeric(displacement[:1])]+[numeric(displacement[1+i:1+i+6]) for i in range(0,54,6)]+[numeric(displacement[55:56])]+[numeric(displacement[56+i:56+i+6]) for i in range(0,54,6)]
    for sec in ['FORCMNT','UNIFORM','WIND','OFFSETS','ALLOWBLS']:records[sec]=[]
    sif=[0]*84;sif[0]=20;sif[1]=1
    records['SIF&TEES']=[numeric(sif[i:i+6]) for i in range(0,84,6)]
    for sec in ['REDUCERS','FLANGES','EQUIPMNT']:records[sec]=[]
    # External material IDs 42 and 43 are synthetic arbitrary integers.
    records['MISCEL_1']=[numeric([42,43])]
    for kinds in [('i','i','i','i','r','i'),('i','i','r','r','i','i'),('i','i','i','i','r','i'),('i',)]:
        records['MISCEL_1'].append('  '+''.join((f'{0:13d}' if k=='i' else f'{0.0:13.6E}') for k in kinds))
    records['UNITS']=[numeric([1]*6)]*3+[numeric([1]*4)]+['  '+('mm' if x in ('CCVLEN','CCVDIA','CCVTHK') else 'unit') for x in UNIT_LABELS]
    records['COORDS']=[numeric([1],True), '  '+f'{10:13d}'+''.join(f'{0.0:13.6E}' for _ in range(3))]
    lines=[]
    for sec in SECTIONS:
        lines += ['#$ '+sec]+records[sec]
    return ('\r\n'.join(lines)+'\r\n').encode('ascii')

if __name__=='__main__':
    import hashlib
    p=Path(__file__).with_name('synthetic_two_span.cii');b=fixture();p.write_bytes(b)
    print('SYNTHETIC',p,len(b),hashlib.sha256(b).hexdigest())
