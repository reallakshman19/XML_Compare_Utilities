# PR1112 — CII Writer2 retained benchmark repair work report

## Mission control
- Mission: repair Utilities → **CII Writer 2 — V11 / V14** for frozen `S1.CII` + `S2.CII` + `S3.CII` applied to untouched `T.CII`.
- Issue: #1111; parent programme: #1083.
- PR: #1112 — **DRAFT / OPEN / UNMERGED**.
- Branch: `fix/cii-writer2-benchmark-exact-wp006`.
- Pinned base/main: `96b09485b90f6bf92cc0716e2da0142d8cfd91c4` (live main rechecked 2026-09-06; no drift).
- Browser-gate implementation checkpoint before this report refresh: `a2bf7f84ef7933e89bc7d9c0299cd41cc2fc467f`.
- Takeover disposition: `SALVAGE_PARTIAL`.
- Current qualification state: `FOCUSED_PASS_RETAINED_BROWSER_GATE_AUTHORED_NOT_RUN`.
- Retained end-to-end verdict: **NOT_RUN**.
- Merge authority: **OWNER_ONLY / NOT GRANTED**.

## Current authority boundary — PB-0002
The retained expected file is intentionally partial and is **not raw NODENAME payload authority** for Writer2.

Final authority is split as follows:

1. **TEXPECTED structural authority only**
   - CONTROL.NONAM consequence;
   - ELEMENT NODENAME pointer placement;
   - physical NODENAME row cardinality/order consequence;
   - Writer2 structural CREATE/DELETE action + target placement;
   - no TEXPECTED NODENAME payload/name is used as final writable identity.
2. **Exact writable raw-name authority**
   - exact raw NODENAME present in the selected S1/S2/S3 source member;
   - if that exact source alias occurs in BM-001, the exact BM source-alias ↔ target-name row is required;
   - if the exact source alias is absent from BM-001 entirely, source-only CREATE is allowed and recorded diagnostically;
   - canonical/family matching may never choose a sibling or become emitted text.
3. **Target-preservation authority**
   - original `T.CII` remains exact authority outside Writer2 NODENAME consequences;
   - pre-existing target NODENAME payloads outside selected physical target IDs must remain byte-semantically unchanged.
4. **Owner checkpoints**
   - `8870→9040`, `10350→10190`, `1005→925` are diagnostic evidence only;
   - no production branch uses those IDs;
   - they do not generate acceptance keys.

Retained T→TEXPECTED structural observation:
- CONTROL.NONAM / physical NODENAME rows: `1265 → 1266`;
- observed NODENAME semantic deltas: `36`;
- Writer2 structural CREATE: `1` target `10330`;
- DELETE: `0`;
- same-cardinality REPLACE: `35` and explicitly outside Writer2 cardinality authority.

The retained selected CREATE is expected to be sourced from exact S2 raw identity `SL-115A.4` at target `10330`. That alias is absent from BM-001, so it is a valid source-only CREATE under the authority rule above; BM must not invent a pairing.

## Frozen retained inputs
| Role | Path | Git blob | Size |
|---|---|---|---:|
| S1 | `Benchmark/S1.CII` | `73c49165b9d33a8c776ef76f480efec3a90e0c93` | 108330 |
| S2 | `Benchmark/S2.CII` | `a04622553720cb41a6fc2a4b85d8290eac7a3b0a` | 90961 |
| S3 | `Benchmark/S3.CII` | `a20b1ab87dd4e854cf2f453f8fd206be4b566b42` | 90942 |
| TARGET0 | `Benchmark/T.CII` | `96b4a4b12bf66bcb0264c56e7767a857c4cc11e6` | 2866002 |
| PARTIAL EXPECTED | `Benchmark/TEXPECTED-PARTIALLLYDONE.CII` | `b7d0913a3827deb184d65c880594ca0667562167` | 2866022 |

Benchmark/source files remain unchanged in PR #1112.

## Implemented production repairs
### P1 — compact correspondence identity
`cii-workspace-identity.js` uses compact synchronous `correspondence-v1:<sha256>` IDs.

### P2 — topology-only Auto Anchor
Physical Method-A candidates require unique incident componentKind@length topology evidence. Review/name discovery cannot become base authority; ties remain fail-closed.

### P3 — review ledger custody
Multi-source review state preserves source/member review metadata rather than rebuilding bare decision objects at the qualification boundary.

### P4 — BM observed-evidence semantics
`cii-workspace-multisource-bm001-correspondence.js` retains the frozen 329-row authority table but treats unobserved rows as informational custody metadata.
- `READY` means every **observed** BM claim is exact and valid.
- `matchedRowCount` is observed exact evidence, not a 329-row completion requirement.
- `observationStatus` reports `PARTIAL` or `COMPLETE`.
- missing frozen rows are never synthesized into operation evidence.

### P5 — partial TEXPECTED oracle split
`tests/cii-workspace-multisource-partial-texpected-oracle.js`:
- structural Writer2 identity is only `action|target` for CREATE/DELETE;
- compares CONTROL count, ELEMENT NODENAME pointers, physical NODENAME row count/encoding and occupancy;
- does not compare TEXPECTED NODENAME payload names;
- verifies exact selected source raw identity;
- requires exact BM target pairing only when the exact alias exists in BM;
- verifies final exact raw emission;
- verifies unselected target NODENAME payload preservation.

### P6 — mixed physical NODENAME CREATE
`cii-workspace-writer2-nodename-relocation.js` supports the qualified mixed case where:
- a true zero-pointer owner proves cardinality append;
- redundant existing spans for the target node are blank and non-foreign;
- redundant blank fields are filled with the exact CREATE name;
- one actual NODENAME row is appended for the zero-pointer owner;
- nonblank existing fields remain Writer1C/fail-closed.

### P7 — source-set and dual target custody
Composite Writer2 and independent validation support:
- `SOURCE_SET` source authority via exact source-set SHA;
- original V14 target parent authority;
- normalized V11 execution target hash separately;
- legacy DOCUMENT custody compatibility.

### P8 — NODENAME I13 validation
Independent composite validation requires integer lexical encoding for NODENAME ELEMENT pointer fields; SIF pointer fields retain generic numeric/G13.6 rules.

### P9 — duplicate NODENAME V14 projection
Stable duplicate multiplicity is occurrence-qualified instead of blocked merely because duplicate unit keys exist. Multiplicity change and reorder remain fail-closed.

### P10 — inherited frozen-source sentinel repair
`tests/cii-workspace-v11-v14-frozen-source.test.js` was stale after commit `06a6f9c...`: production correctly compares `conversionInput` during exact round-trip validation. Only the sentinel regex was corrected; production was not rolled back.

## Focused validation — owner-side Windows checkout
Two execution checkpoints were used because the falsifier fixture correction was test-only.

At `51a7d75ca9f909b42bb18d30d4dc35582ddff33b`:
- `tests/cii-workspace-v11-v14-frozen-source.test.js` — **PASS**
- `tests/cii-workspace-multisource-bm001-exact-alias.test.js` — **PASS**
- `tests/cii-workspace-multisource-partial-texpected-oracle.test.js` — **PASS**
- `tests/cii-workspace-multisource-texpected-benchmark.test.js` — **PASS**

The first run of `cii-workspace-writer2-nodename-relocation-falsifiers.test.js` failed because its synthetic NODENAME fixture row was entirely spaces and therefore was correctly omitted by physical-row parsing. Production remained fail-closed. The fixture was repaired only.

At `ebb1c342b42b28add476be6272aa63c5eea9fa75`:
- `tests/cii-workspace-writer2-nodename-relocation-falsifiers.test.js` — **PASS**
- `tests/cii-workspace-writer2-source-set-composite-custody.test.js` — **PASS**
- `tests/cii-workspace-v14-change-projection.test.js` — **PASS**
- `tests/cii-workspace-v14-duplicate-nodename-projection.test.js` — **PASS**

The commits after `ebb1c342...` in this stage add browser-test infrastructure only; they do not modify those production/focused-test surfaces.

## Retained Node gate runtime result
Command:
```text
node tests/cii-workspace-multisource-retained-auto-anchor-benchmark.test.js
```
Result on owner-side Node.js v26.3.0:
```text
ReferenceError: Worker is not defined
```
Boundary:
`cii-workspace-v11-v14-converter.js -> ensureWorker()` before retained product qualification executes.

Classification:
- retained product verdict: **NOT_RUN**;
- Node host compatibility: **FAIL_RUNTIME_HOST**;
- this is not evidence of a Writer2 product defect;
- no Node Worker shim/polyfill was added because repository policy forbids shims and the converter worker is browser/Pyodide runtime code.

## Dedicated retained browser hard gate
Added new files only:
- `tests/browser/cii-writer2-static-server.mjs`
- `playwright.cii-writer2-retained.config.mjs`
- `tests/browser/cii-writer2-multisource-retained-benchmark.spec.mjs`

Purpose:
- execute the same retained S1/S2/S3 → T qualification inside Chromium;
- use the real browser `Worker` and frozen Pyodide converter;
- fetch the frozen retained CII artifacts from the repository-local HTTP server;
- avoid modifying the existing Writer2 Playwright config;
- avoid Python/`python3` launcher differences on Windows by using a small Node static server;
- print transfer/BM/postimage/checkpoint diagnostics on success.

The browser spec independently derives the structural Transfer key set from T→TEXPECTED. It does not regenerate expected data from product output.

Published browser-gate checkpoint:
```text
a2bf7f84ef7933e89bc7d9c0299cd41cc2fc467f
```

Validation in connector execution environment:
- `node --check tests/browser/cii-writer2-static-server.mjs` equivalent draft — **PASS**
- `node --check playwright.cii-writer2-retained.config.mjs` equivalent draft — **PASS**
- `node --check tests/browser/cii-writer2-multisource-retained-benchmark.spec.mjs` equivalent draft — **PASS**
- actual Chromium/Pyodide retained execution — **NOT_RUN_ENVIRONMENT** because this execution sandbox cannot access the required external Pyodide CDN.

## Validation ledger
| Gate | Status | Observation / oracle |
|---|---|---|
| live main/base grounding | PASS | main remains pinned `96b09485...` |
| active multisource PR overlap | PASS | only open matching multisource PR is #1112 |
| frozen benchmark files unchanged | PASS | PR path inventory / retained blobs |
| T→TEXPECTED structural census | PASS | independent retained-file oracle |
| focused BM observed-evidence semantics | PASS | owner-side Node execution |
| partial TEXPECTED structural/raw identity oracle | PASS | owner-side Node execution |
| retained TEXPECTED benchmark census | PASS | owner-side Node execution: CREATE 1 / DELETE 0 / REPLACE 35 |
| mixed NODENAME CREATE falsifiers | PASS | owner-side Node execution after fixture-only correction |
| source-set composite custody + I13 | PASS | owner-side Node execution |
| V14 change projection | PASS | owner-side Node execution |
| duplicate NODENAME projection | PASS | owner-side Node execution |
| retained Node end-to-end | NOT_RUN | browser Worker unavailable in Node; failed before retained product logic |
| retained Chromium end-to-end | NOT_RUN | dedicated gate authored; sandbox CDN access unavailable |
| BM frozen authority custody | PASS | authority table remains 329 rows |
| retained **observed** BM exact evidence | NOT_RUN_END_TO_END | expected to be partial observation; zero invalid required |
| final retained Writer2 structural postimage | NOT_RUN | requires Chromium retained gate |
| final exact raw source emission | NOT_RUN | requires Chromium retained gate |
| owner checkpoint diagnostics | NOT_RUN | emitted by Chromium retained gate |
| merge | NOT_APPLICABLE | Owner authorization not granted |

## Changed-file ledger — latest browser stage
New files:
- `tests/browser/cii-writer2-static-server.mjs`
- `playwright.cii-writer2-retained.config.mjs`
- `tests/browser/cii-writer2-multisource-retained-benchmark.spec.mjs`

No production file, existing Playwright config, benchmark file, or workflow file was modified in this stage.

## Repository-local backup / patch ledger status
The connected GitHub execution surface still does not expose a writable repository checkout, so `utils/backup.cjs` and Git-ignored `.agent-worklogs/` cannot be truthfully executed here. This limitation is explicit rather than fabricated.

For the latest browser stage all three implementation files are new, so no pre-existing file backup exists or is required for those files; undo is deletion of those exact new files after verifying no later change touched them. This report update itself is connector-authored durable handover state.

## Highest remaining risk
The first real Chromium retained run may expose a product boundary after Worker/Pyodide initialization. If it fails:
1. capture the first product-level assertion/error;
2. repair only that demonstrated boundary;
3. preserve the authority split above;
4. do not weaken structural/raw-name/preservation checks;
5. do not enable UI Auto Anchor merely to obtain a pass.

## Anti-gaming invariants
- no benchmark CII file modified;
- no production branch on owner checkpoint IDs;
- no production read/import of TEXPECTED;
- no TEXPECTED NODENAME payload used as writable identity;
- no expected-data regeneration from actual output;
- no tolerance accepting a wrong dotted sibling;
- no canonical-family fallback as writable identity;
- no synthesis of missing BM rows into operation evidence;
- no requirement that all 329 BM rows be observed in this retained source set;
- no Node Worker shim/polyfill;
- no workflow-file change;
- no merge without separate explicit Owner authorization.

## EXACT_NEXT_ACTION
From a current checkout of `fix/cii-writer2-benchmark-exact-wp006` with normal network access:

```text
git pull --ff-only
npm ci
npx playwright install chromium
npx playwright test --config=playwright.cii-writer2-retained.config.mjs
```

The dedicated config starts its own repository-local Node HTTP server; no separate Python server is required.

On success, record exactly:
- Auto Anchor choices for S1/S2/S3;
- correspondence READY/conflict count;
- structural Transfer keys/count;
- selected exact raw operation values;
- BM `matchedRowCount`, `missingRowNumbers`, `invalidOperationIds`, `observationStatus`;
- source-only CREATE operation IDs;
- `versionBridgeValidation.status`;
- structural encoding/semantic difference counts;
- unrelated target and unselected NODENAME preservation differences;
- exact raw emission status;
- the three owner checkpoint diagnostics.

Keep PR #1112 draft and unmerged until Owner review/authorization.
