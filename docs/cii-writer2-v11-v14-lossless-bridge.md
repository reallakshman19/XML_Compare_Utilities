# CII Writer2 — CAESAR II v11 / v14 lossless bridge

## Decision

Do not implement an independent new CAESAR II v14 neutral-format writer.

Reuse the existing CAESAR II v11 <-> v14 converter from `reallaksh19/3D_Converters` and keep its source implementation unchanged.

Pinned source:

```text
reallaksh19/3D_Converters
ca8d391ac5f829f53bebb3c37adf0547c34a67b4
```

The six Python engine/dependency files are vendored byte-identically under:

```text
converters/scripts/cii-v11-v14-upstream/
```

Exact blob custody is recorded in `UPSTREAM.md` and enforced by `tests/cii-workspace-v11-v14-frozen-source.test.js`.

## Authority split

The bridge does not promote v14 engineering semantics into the V11 Writer2 implementation.

```text
3D_Converters authority:
  v11 <-> v14 neutral-dialect conversion
  version-owned physical record shapes
  SIF semantic position mapping
  restraint stiffness sentinel mapping
  ALLOWBLS / REDUCER extension handling
  source and generated structural validation
  explicit lossy-event detection

XML_Compare_Utilities authority:
  existing qualified V11 comparison / Writer1 / Writer2 engineering mutations
  one-TARGET0 mutation planning
  original-coordinate claim arbitration
  independent V11 postimage validation
```

V11 CREATE blockers remain unchanged. The converter is not authority to invent a SIF/HANGER/RESTRAINT CREATE payload that the V11 Writer2 policy already blocks.

## Writer2 execution paths

### Native V11

```text
SOURCE V11 + TARGET V11
  -> existing CII Workspace intake/preview
  -> existing V11 Writer2
  -> existing V11 independent postimage validation
  -> V11 output
```

No converter call is required.

### V14 through the frozen converter

```text
SOURCE/TARGET V14
  -> frozen 3D_Converters v14 -> v11, allow_lossy = false
  -> frozen converter structural validation
  -> exact untouched v14 -> v11 -> v14 byte equality gate
  -> existing V11 CII Workspace preview / Writer2 / validator
  -> frozen 3D_Converters v11 -> v14, allow_lossy = false
  -> frozen converter structural validation
  -> exact modified v11 -> v14 -> v11 byte equality gate
  -> V14 output
```

The same normalization permits a mixed V11/V14 SOURCE/TARGET pair only when every V14 side is losslessly and exactly roundtrippable through the pinned converter.

## Why the exact roundtrip gate is stricter than the converter

The upstream converter intentionally normalizes version-owned formatting and does not claim arbitrary cross-version byte identity. That behavior is valid for a converter but is too broad for Writer2 byte custody.

Writer2 therefore admits V14 only when conversion of the untouched baseline is exactly reversible byte-for-byte. If canonicalization would change unrelated bytes, the bridge blocks rather than exporting a broad rewrite.

This is an XML Writer2 restriction, not a modification of the upstream converter.

## Fail-closed gates

```text
unsupported neutral version
  CII_VERSION_BRIDGE_UNSUPPORTED_VERSION

lossy converter requirement
  converter raises with allow_lossy=false
  CII_VERSION_BRIDGE_LOSS_NOT_ALLOWED is retained as a secondary audit guard

SOURCE/TARGET baseline not byte-exact through v11
  CII_VERSION_BRIDGE_SOURCE_BASELINE_ROUNDTRIP_NOT_EXACT
  CII_VERSION_BRIDGE_TARGET_BASELINE_ROUNDTRIP_NOT_EXACT

original V14 TARGET changed after preview
  CII_WRITER_2_STALE_ORIGINAL_V14_TARGET_HASH

modified V11 result not exactly recoverable after v14 serialization
  CII_VERSION_BRIDGE_MODIFIED_ROUNDTRIP_NOT_EXACT
```

## Product integration modules

```text
converters/cii-v11-v14-writer-worker.js
  adapted Pyodide transport only
  loads frozen Python from isolated directory

tabs/cii-workspace/cii-workspace-v11-v14-converter.js
  Worker client, version detection, lossless conversion API

tabs/cii-workspace/cii-workspace-writer-version-bridge.js
  inspection/preview normalization
  stale V14 TARGET custody
  existing V11 Writer2 execution
  V14 restoration and exact post-roundtrip proof
```

The existing `cii-workspace-core.js` V11 writer implementation is not modified by this bridge.

## Qualification

Upstream engine qualification remains traceable to the pinned `3D_Converters` source and its benchmark/tests. Target-repository additions provide independent custody/bridge falsifiers:

```text
tests/cii-workspace-v11-v14-frozen-source.test.js
tests/cii-workspace-v11-v14-frozen-engine.test.py
.github/workflows/cii-writer-v11-v14-bridge.yml
```

Runtime verdict remains `NOT_RUN` until those tests execute on an exact target checkout. Source identity is not runtime qualification.
