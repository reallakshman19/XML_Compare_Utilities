"""Source acquisition for one section; never reads or writes engineering meaning."""
from forcmnt_codec import integer, require, sha


def indexed_source(data):
    data.decode('ascii')
    require(data.endswith(b'\r\n') and data.count(b'\n') == data.count(b'\r\n'),
            'Source must have final and uniform CRLF')
    lines = data.splitlines(keepends=True)
    offsets, cursor = [], 0
    for line in lines:
        offsets.append(cursor)
        cursor += len(line)
    offsets.append(cursor)
    markers = [(i, line[3:].strip().decode('ascii')) for i, line in enumerate(lines)
               if line.startswith(b'#$ ')]
    require(len(markers) == 22 and len({name for _, name in markers}) == 22,
            'Expected distinct22 source sections')
    sections = {name: (line + 1, markers[j + 1][0] if j + 1 < len(markers) else len(lines))
                for j, (line, name) in enumerate(markers)}
    return lines, offsets, sections


def source_evidence(data):
    lines, offsets, sections = indexed_source(data)
    start, end = sections['FORCMNT']
    element_start, element_end = sections['ELEMENTS']
    control_start, control_end = sections['CONTROL']
    controls = []
    require(control_end - control_start == 4, 'CONTROL physical rows')
    for row, count in zip(lines[control_start:control_end], (6, 6, 6, 1)):
        require(len(row) == 4 + 13 * count and row[:2] == b'  ', 'CONTROL field layout')
        controls.extend(integer(row[2 + 13*i:15 + 13*i].decode()) for i in range(count))
    require(controls[11] > 0 and end - start == controls[11] * 20, 'FORCMNT logical count')
    require(element_end - element_start == controls[0] * 15, 'ELEMENTS logical count')
    pointers = []
    for ordinal in range(1, controls[0] + 1):
        line = element_start + (ordinal - 1) * 15 + 12
        raw = lines[line]
        require(len(raw) == 82 and raw[:2] == b'  ', 'First auxiliary pointer row')
        lexeme = raw[67:80].decode('ascii')
        target = integer(lexeme)
        require(0 <= target <= controls[11], 'FORCMNT pointer target bounds')
        pointers.append(dict(element=ordinal, target=target, line=line + 1,
                             start=offsets[line] + 67, end=offsets[line] + 80, lexeme=lexeme))
    meta = dict(source_sha256=sha(data), source_bytes=len(data), body_start=offsets[start],
                body_end=offsets[end], first_line=start + 1, record_count=controls[11],
                element_count=controls[0], element_first_line=element_start + 1,
                element_start=offsets[element_start], element_end=offsets[element_end])
    return data[offsets[start]:offsets[end]], meta, pointers
