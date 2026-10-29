"""Bound XML file consumption before parsing; short reads are not EOF."""
from pathlib import Path

from .core import MAX_XML


def read_bounded_xml(path: Path, *, limit: int = MAX_XML) -> bytes:
    if limit < 0:
        raise ValueError('limit must be nonnegative')
    budget = limit + 1
    data = bytearray()
    with path.open('rb', buffering=0) as stream:
        while len(data) < budget:
            chunk = stream.read(min(64 * 1024, budget - len(data)))
            if chunk is None:
                raise OSError('XMLv3 input read would block')
            if chunk == b'':
                return bytes(data)
            data.extend(chunk)
    raise ValueError('XMLv3 input exceeds 150 MB')
