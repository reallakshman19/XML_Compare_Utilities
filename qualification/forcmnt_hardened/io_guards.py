"""New-only publication and scoped Python file-open restriction; no OS sandbox claim."""
import os
from pathlib import Path
import sys
import tempfile


def require(condition, message):
    if not condition:
        raise ValueError(message)


def limited_read(path, limit):
    with path.open('rb') as stream:
        data = stream.read(limit + 1)
    require(len(data) <= limit, 'Qualification input size limit')
    return data


def new_destination(path):
    require(not os.path.lexists(path), 'Destination already exists')
    path = path.resolve()
    require(path.parent.is_dir(), 'Destination parent must exist')
    return path


def publish_new(path, data):
    require(not os.path.lexists(path), 'Destination already exists')
    fd, name = tempfile.mkstemp(prefix='.forcmnt-hardened-', dir=path.parent)
    temporary = Path(name)
    try:
        with os.fdopen(fd, 'wb') as stream:
            stream.write(data)
            stream.flush()
            os.fsync(stream.fileno())
        if os.name == 'nt':
            os.rename(temporary, path)
        else:
            os.link(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


def restrict_writer_open(xml, output, runtime_root):
    resources = {p.resolve() for p in runtime_root.glob('*.py')}
    resources.add((runtime_root / 'CANDIDATE.json').resolve())

    def audit(event, args):
        if event != 'open' or isinstance(args[0], int):
            return
        path = Path(os.fsdecode(args[0])).resolve()
        writes = args[2] & (os.O_WRONLY | os.O_RDWR | os.O_CREAT | os.O_TRUNC | os.O_APPEND)
        temporary = path.parent == output.parent and path.name.startswith('.forcmnt-hardened-')
        if temporary or (not writes and path in resources | {xml}):
            return
        raise PermissionError('XML-only payload audit denied unrelated file access')

    sys.addaudithook(audit)
    try:
        (runtime_root.parent.parent / 'Benchmark/T.CII').read_bytes()
    except PermissionError:
        return
    raise ValueError('Writer audit did not deny original-source read')
