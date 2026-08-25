# CII Writer2 — CAESAR II V11 / V14 lossless bridge

## Decision

Do not implement an independent CAESAR II V14 neutral-format writer.

Reuse the existing CAESAR II V11 <-> V14 converter from `reallaksh19/3D_Converters` and keep its source implementation unchanged.

Pinned source:

```text
reallaksh19/3D_Converters
ca8d391ac5f829f53bebb3c37adf0547c34a67b4
```

The six Python engine/dependency files are vendored byte-identically under:

```text
converters/scripts/cii-v11-v14-upstream/
```

Exact repository blob custody is recorded in `UPSTREAM.md` and enforced by `tests/cii-workspace-v11-v14-frozen-source.test.js`.

## Authority split

The bridge does not promote V14 engineering semantics into the V11 Writer2 implementation.

```text
3D_Converters authority:
  V11 <-> V14 neutral-dialect conversion
  version-owned physical record shapes
  semantic SIF position mapping
  restraint stiffness sentinel mapping
  ALLOWBLS / REDUCER extension handling
  source and generated structural validation
  explicit lossy-event detection

XML_Compare_Utilities authority:
  existing qualified V11 comparison / Writer1 / Writer2 engineering mutations
  one-TARGET0 mutation planning
  original-coordinate claim arbitration
  independent V11 postimage validation
  V14 admission and exact byte-custody restrictions around the frozen converter
```

V11 CREATE blockers remain unchanged. The converter is not authority to invent SIF/HANGER/RESTRAINT CREATE payloads already blocked by V11 Writer2 policy.

## Upstream qualification boundary

The pinned upstream repository contains the paired benchmark:

```text
Benchmarks/v11-v14.zip
  SYS-0001-v11.cii
  SYS-0001-v14.CII
```

The pair represents the same 112-element model. Upstream qualification records establish the relevant record deltas and regression coverage, including semantic SIF mapping and independent generated-target validation.

Upstream explicitly records this final application gate as `NOT_RUN`:

```text
actual V14 source
-> repaired converter
-> generated V11
-> actual CAESAR V11 import/use
-> save/export from CAESAR
-> semantic/record comparison
```

That external CAESAR acceptance is not inherited as PASS by this bridge.

## Runtime frozen-source custody

Repository SHA identity alone is not sufficient for browser execution. Before any frozen Python is imported or run, the worker independently verifies the deployed bytes.

For each pinned source file:

```text
fetch exact bytes with cache:no-store
-> form Git object bytes: "blob " + byte_length + NUL + exact_bytes
-> WebCrypto SHA-1
-> require equality with pinned upstream Git blob SHA
-> write the same verified Uint8Array directly to Pyodide FS
```

The worker does not use `response.text()` for frozen Python. No decode/re-encode step is allowed between deployed-byte verification and Pyodide execution.

A missing cryptographic API, empty source file, SHA mismatch or fetch error fails closed before converter execution.

## Writer2 execution paths

### Native V11

```text
SOURCE V11 + TARGET V11
  -> original SHA custody
  -> existing CII Workspace intake/preview
  -> normalized/intake SHA equality check
  -> existing V11 Writer2
  -> existing V11 independent postimage validation
  -> V11 output
```

No converter call is required.

### V14 through the frozen converter

```text
SOURCE/TARGET V14
  -> independent original V14 SHA
  -> runtime-verified frozen 3D_Converters V14 -> V11, allow_lossy = false
  -> converter structural validation
  -> independent normalized V11 SHA
  -> exact untouched V14 -> V11 -> V14 byte equality gate
  -> workspace intake SHA must equal normalized V11 SHA
  -> existing V11 CII Workspace preview / Writer2 / validator
  -> authoritative Writer2 byteString -> exact V11 postimage bytes
  -> Writer2 postimage SHA cross-check
  -> runtime-verified frozen 3D_Converters V11 -> V14, allow_lossy = false
  -> converter structural validation
  -> exact modified V11 -> V14 -> V11 byte equality gate
  -> V14 output
```

A mixed V11/V14 SOURCE/TARGET pair is admissible only when every V14 side satisfies these lossless exact-roundtrip gates.

## Why the exact roundtrip gate is stricter than the converter

The upstream converter intentionally emits target-dialect formatting and does not claim arbitrary V14 -> V11 -> V14 byte identity. That is valid converter behavior but too broad for Writer2's unrelated-byte custody requirement.

Writer2 therefore admits V14 only when conversion of the untouched baseline is exactly reversible byte-for-byte. If dialect canonicalization changes unrelated physical bytes, the bridge blocks rather than treating those changes as Writer2 mutations.

This is an XML Writer2 restriction, not a modification of the upstream converter.

## Converter testimony is secondary

The JS client independently checks:

```text
physical source VERSION = exact integral major 11 or 14
physical target VERSION = requested target
SHA256(actual input) = audit.source_sha256
SHA256(actual output) = audit.target_sha256
actual input byte count = audit.source_bytes
actual output byte count = audit.target_bytes
audit.schema = cii-v11-v14-conversion-audit/v1
changed_sections / warnings / loss_events are arrays
```

The audit arrays are frozen before exposure. Missing `loss_events` is a malformed audit, not evidence of zero loss.

## Shared Pyodide runtime custody

The browser worker uses one Pyodide runtime. Python invocation mutates shared `sys.argv` and `cii_job_argv`, so conversion jobs are serialized through an explicit promise queue.

```text
one job at a time through shared runtime
failed job does not poison the queue
job files unlinked before job-directory removal
empty input rejected before filesystem allocation
worker error/messageerror rejects all pending jobs and resets worker
postMessage failure removes the pending request
worker cache key advances when worker runtime semantics change
```

Current worker cache identity:

```text
20260825-frozen-3d-converters-7
```

Frozen Python is never edited for these adapter controls.

## Cross-boundary provenance

Bridge evidence records, for each side:

```text
originalVersion
normalizedVersion = 11
originalSha256
normalizedSha256
exactBaselineRoundTrip
normalization audit
roundtrip audit
```

Inspection and preview require the workspace's independently calculated document SHA to equal the normalized V11 SHA before correspondence/planning can proceed.

At V14 apply time, a fresh downgrade must reproduce both the preview-bound original V14 SHA and normalized V11 SHA.

`preview.audit.versionBridge` contains the bridge evidence and the artifact bundle is regenerated, so exported audit JSON retains the complete V14 -> V11 custody chain.

## V11 postimage authority

The V14 restoration path must not use `v11Result.text` as physical mutation authority.

Required sequence:

```text
v11Result.byteString
-> reconstruct exact V11 bytes
-> cross-check v11Result.modifiedTargetSha256
-> frozen V11 -> V14
-> frozen V14 -> V11 proof
-> proof bytes must equal exact Writer2 V11 postimage bytes
```

## Fail-closed gates

```text
runtime frozen-source drift
  deployed Git blob SHA mismatch -> block before Python execution

unsupported/non-integral neutral version
  CII_VERSION_BRIDGE_UNSUPPORTED_VERSION

malformed converter audit
  CII_VERSION_BRIDGE_AUDIT_REQUIRED
  CII_VERSION_BRIDGE_AUDIT_SCHEMA_MISMATCH
  CII_VERSION_BRIDGE_AUDIT_ARRAY_REQUIRED
  CII_VERSION_BRIDGE_*_BYTE_COUNT_AUDIT_MISMATCH

converter SHA/version testimony disagreement
  CII_VERSION_BRIDGE_SOURCE_AUDIT_MISMATCH
  CII_VERSION_BRIDGE_TARGET_AUDIT_MISMATCH
  CII_VERSION_BRIDGE_TARGET_PHYSICAL_VERSION_MISMATCH
  CII_VERSION_BRIDGE_SOURCE_SHA256_AUDIT_MISMATCH
  CII_VERSION_BRIDGE_TARGET_SHA256_AUDIT_MISMATCH

lossy converter requirement
  frozen converter raises with allow_lossy=false
  CII_VERSION_BRIDGE_LOSS_NOT_ALLOWED remains a secondary guard

SOURCE/TARGET baseline not byte-exact through V11
  CII_VERSION_BRIDGE_SOURCE_BASELINE_ROUNDTRIP_NOT_EXACT
  CII_VERSION_BRIDGE_TARGET_BASELINE_ROUNDTRIP_NOT_EXACT

workspace intake differs from normalized V11 bytes
  CII_VERSION_BRIDGE_INSPECTION_*_NORMALIZED_HASH_MISMATCH
  CII_VERSION_BRIDGE_PREVIEW_*_NORMALIZED_HASH_MISMATCH

original/normalized TARGET changed after preview
  CII_WRITER_2_STALE_ORIGINAL_V14_TARGET_HASH
  CII_WRITER_2_STALE_NORMALIZED_V11_TARGET_HASH

V11 Writer2 physical postimage unavailable/mismatched
  CII_VERSION_BRIDGE_V11_POSTIMAGE_BYTES_REQUIRED
  CII_VERSION_BRIDGE_V11_POSTIMAGE_SHA_MISMATCH

modified V11 result not exactly recoverable after V14 serialization
  CII_VERSION_BRIDGE_MODIFIED_ROUNDTRIP_NOT_EXACT
```

## Product integration modules

```text
converters/cii-v11-v14-writer-worker.js
  adapted Pyodide transport only
  runtime-verifies and loads frozen Python from isolated directory

tabs/cii-workspace/cii-workspace-v11-v14-converter.js
  Worker client, physical version detection, independent SHA/audit custody,
  lossless conversion API and byte helpers

tabs/cii-workspace/cii-workspace-writer-version-bridge.js
  inspection/preview normalization, provenance binding,
  stale original/normalized TARGET custody,
  existing V11 Writer2 execution,
  V14 restoration and exact post-roundtrip proof
```

The existing `cii-workspace-core.js` V11 writer implementation is not modified by this bridge.

## Qualification state

Target-repository falsifiers:

```text
tests/cii-workspace-v11-v14-frozen-source.test.js
tests/cii-workspace-v11-v14-frozen-engine.test.py
```

Bounded extracted runtime now contains 12 falsifiers, including an independent check of the Git-blob hashing algorithm and serialized-job recovery. It remains `PASS_RUNTIME_EXACT_SOURCE_EXCERPT`, not full-module PASS.

Runtime truth:

```text
frozen source Git-blob custody           PASS_EXACT_BLOB_CUSTODY
runtime deployed-source blob gate        IMPLEMENTED_NOT_RUN_BROWSER
extracted source/adapter runtime         PASS_RUNTIME_EXACT_SOURCE_EXCERPT_12_FALSIFIERS
frozen-source authored JS test           NOT_RUN_EXACT_REPOSITORY_MODULE_GRAPH
frozen-engine authored Python test       NOT_RUN_EXACT_REPOSITORY_MODULE_GRAPH
real V14 baseline exact roundtrip        NOT_RUN
real V14 Writer2 modified roundtrip      NOT_RUN
browser/product V14 bridge               NOT_RUN
external CAESAR V11 import/re-export     NOT_RUN
```

GitHub Actions are not authorized for this workstream. No workflow result is qualification evidence.

Live V14 UI auto-routing remains disabled until the required bridge runtime gates pass.
