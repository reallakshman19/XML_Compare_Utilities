"""Exclusive complete-file publication; existing destinations are protected."""
import os
import tempfile
from pathlib import Path


def publish_new(destination, data, source=None):
    dest = Path(destination).absolute()
    if source is not None and dest.resolve() == Path(source).resolve():
        raise ValueError('XMLv3 output must differ from input')
    if dest.exists() or dest.is_symlink():
        raise ValueError('XMLv3 refuses to overwrite an existing destination')
    if not dest.parent.is_dir():
        raise ValueError('XMLv3 output parent must already exist')
    fd, temporary = tempfile.mkstemp(prefix='.xmlv3-', suffix='.tmp', dir=dest.parent)
    temp = Path(temporary)
    try:
        with os.fdopen(fd, 'wb') as handle:
            handle.write(data)
            handle.flush()
            os.fsync(handle.fileno())
        # Windows rename refuses an existing destination; POSIX rename would replace it.
        if os.name == 'nt':
            os.rename(temp, dest)
        else:
            os.link(temp, dest)
    finally:
        temp.unlink(missing_ok=True)
