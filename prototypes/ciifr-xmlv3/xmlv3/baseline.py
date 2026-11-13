"""Load the exact held dependency without changing files or global imports."""
import builtins
import hashlib
import types
from pathlib import Path


SOURCE_HEAD = 'a67487023bcafc13d68b62dbfc9bb74c61b3c64c'
ENGINE_SHA = 'b2bb8ed87440e46f72833424cacd82e6605c47f372f146deec749ad2bb0ee264'
PROFILE_SHA = '8d2c2123bce98a387d00a3aeca69c8e5dea6b3831e29f65e7760f6a5694204b2'
DIRECTORY = Path(__file__).resolve().parents[2] / 'ciifr-xmlv2-r3' / 'engine'


def verified_bytes(path, expected):
    data = path.read_bytes()
    if hashlib.sha256(data).hexdigest() != expected:
        raise ValueError(f'XMLv3 dependency changed: {path.name}; expected SHA256 {expected}')
    return data


def load_engine():
    profile_data = verified_bytes(DIRECTORY / 'profile.py', PROFILE_SHA)
    engine_data = verified_bytes(DIRECTORY / 'engine.py', ENGINE_SHA)
    profile = types.ModuleType('xmlv3._pinned_profile')
    exec(compile(profile_data, str(DIRECTORY / 'profile.py'), 'exec'), profile.__dict__)

    def pinned_import(name, globals=None, locals=None, fromlist=(), level=0):
        if name == 'profile' and level == 0:
            return profile
        return builtins.__import__(name, globals, locals, fromlist, level)

    engine = types.ModuleType('xmlv3._pinned_engine')
    engine.__dict__['__builtins__'] = dict(vars(builtins), __import__=pinned_import)
    exec(compile(engine_data, str(DIRECTORY / 'engine.py'), 'exec'), engine.__dict__)
    return engine


# Verify once at process/module startup, before any conversion or output.
ENGINE = load_engine()
