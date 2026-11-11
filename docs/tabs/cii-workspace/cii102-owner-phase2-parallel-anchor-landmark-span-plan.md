# CII #102 — Owner Phase 2 correction: parallel AUTO/MANUAL tracks and 100 mm landmark spans

**Status:** Owner requirements recorded; source-grounded implementation specification. This document is NOT evidence that behavior is implemented or Writer2 released.

**Owner statement (verbatim technical intent):**
1. "Auto anchor + Manual anchor: one seems to block other, need to plan for parallel tracks (with duplicate elimination)"
2. "we need to build dimensional tolerances which is missing between Souce vs Target length comparison."
3. "while comparing we should ignore node blocks without restraint or components i.e, 10(Rest)-2000mm-20-2000mm-30(Rest) =5010(Rest)-4050mm-5015(Rest) (with dimensional tolerance of 100mm)"

## Baseline / scope

- Working independent draft: [PR #105](https://github.com/reallakshman19/XML_Compare_Utilities/pull/105), original pre-plan head `f6911740eca173232870d82d06845d74dd89b777`. Preserve source PR [#103](https://github.com/reallakshman19/XML_Compare_Utilities/pull/103) unchanged.
- Immutable physical corpus: `Benchmark/S1.CII`, `S2.CII`, `S3.CII`, `T.CII`. Original Owner 428-row PS→SL text: `tests/qualification/owner-phase2-20261015-original-verbatim.txt`, 15,633 bytes, SHA-256 `2f69af17ee306b0222f8ef9c205aafa1f3ddba1b6b1026d23b87140b7be918d4`. Its values are **post-search oracle**, never candidate input.
- Exact-head read-only product replay: 33/33 directly addressable Owner pairs correctly AUTO BOUND; controlled manual-active replay 0/33 correctly BOUND (32 not bound, one wrong). This measures the 33 testable subset, not full 428 recall or physical Writer certification. Source test: `tests/cii102-owner-phase2-source-level-product-comparison.test.mjs`.
- The 36-change `TEXPECTED-PARTIALLLYDONE.CII` lower-bound example produces abbreviated SL labels; do not silently equate with Owner suffix-bearing `SL-*.*` names. No change to original fixture names/digests.

## Source-level diagnosis

| Module | Actual behavior | Gap |
|---|---|---|
| `cii-workspace-multisource-anchor-mode.js:16-76` | Per member chooses `AUTO` **or** `MANUAL`; `simultaneousAuthorityDispatch:false` | One ledger is inactive to operational preview |
| `cii-workspace-multisource-writer2-ui.js:433-440,509-511` | Adding manual pair selects MANUAL; active plan dispatches only chosen lane | Unrelated automatic claims disappear for member |
| `cii-workspace-multisource-review-ui.js:250+` | Builds non-writing AUTO alternative visibility | Displays correct AUTO candidates but does not restore operational resolution |
| `cii-workspace-correspondence-arbitration.js:30-118` | Contains basic same-pair canonicalization and cross-loop conflict detection for participating READY loops | No integrated cross-AUTO/MANUAL global physical occupancy resolution |
| `cii-workspace-propagation.js:102-160` | One-hop frontier assignment, stops on ambiguity/cardinality and reserves target edge/node | 2 SOURCE PIPE elements vs 1 TARGET PIPE element not represented |
| `cii-workspace-topology.js:91-117,183-215` | Subdivision special-case is **1 SOURCE → N TARGET**; default path tolerance `25` | Missing symmetric `N SOURCE → M TARGET` landmark span abstraction |
| `scripts/cii-architecture-a2-physical-path-constraints.mjs:25-28,117-147` | Local witness gate default `pathLengthToleranceMm:25`; source edge vs target route | A 50 mm legitimate delta is blocked; comparisons are edge-oriented |
| `cii-workspace-match-methods.js:6-8,112-127` | `spatialToleranceMm:100`, `networkLocalLengthToleranceMm` score default 250 | Coordinate M1 tolerance and network score are not a 100 mm path-length qualification |
| `cii-workspace-topology-adapter.js:173-193` | Graph has physical edges/nodes, degree, component kind; no per-node `RESTRANT` evidence attached | Cannot prove internal node is attachment-free |
| `cii-workspace-auxiliary.js:104-150,192-205` | Already parses original `RESTRANT` pointer blocks into `restraints.byNode`, with element-linked rigid and SIF/TEE data | Reuse this source authority; do **not** infer feature absence from graph degree alone |

## Correct physical semantics — no destructive CII node deletion

### Canonical feature/landmark index

Build a **read-only, SHA-bound `CiiNodeFeatureIndex.v1`** from the original physical graph plus retained auxiliary records. Every original node remains addressable; a landmark is a comparison boundary, not a mutation. Nodes must remain landmarks when **any** of these apply:

- Has any restraint/support, boundary condition, displacement/force, spring/hanger, attached component or rigid mass, SIF/TEE, reducer, bend transition, or load/feature recorded at the node; unknown or unavailable feature custody **is not** proof of absence.
- Graph degree ≠2 (terminal, tee/branch, disconnected/special), size/material or engineering-property transition where preserving boundary is necessary, or explicitly reviewed/locked anchor.
- An internal node cannot be passed through safely because its incident edges are not PIPE, are non-collinear / bent, have incompatible orientations, or graph topology/feature information is incomplete.

A degree-2 node may be ignored **only for identity partitioning** if authoritative feature inventory says `PLAIN_TRANSIT` and the physical path is qualified. Original NODE/ELEMENT blocks must never be removed, renumbered, or silently made Transfer candidates. A plain intermediate SOURCE node has status `TRANSIT_NOT_REQUIRED_TO_HAVE_TARGET_NODE`, not `MISSED_IDENTITY`.

### N↔M landmark span comparison

New `CiiLandmarkSpan.v1` has original member SHA, endpoint physical NODE refs, ordered original constituent element IDs, internal physical nodes, individual lengths/vectors/kinds, attachment proof, total length, net displacement, path straightness and provenance. It supports source 1/N elements ↔ target 1/M elements, either direction, with no greedy first-winner.

For a proposed span pair, compare:

- Exact or orientation-reversed **semantic landmarks** (e.g. restraint ↔ restraint), component/branch sequence, topology, ordered physical path, unique endpoint/custody constraints.
- `sourceSpanLengthMm = Σ length(source edges)`, `targetSpanLengthMm = Σ length(target edges)`.
- `absoluteLengthDeltaMm = |sourceSpanLengthMm - targetSpanLengthMm|`.
- **Owner acceptance for this feature: `absoluteLengthDeltaMm <= 100 mm` inclusive.** Unit mm, absolute total **per complete landmark span**, not ±100 mm per individual edge. Optional future relative policy is a separate Owner decision; do not silently stack absolute and percentage allowances.
- Keep registration/coordinate tolerance separate from dimensional tolerance, and require compatible straightness/orientation (or explicitly matching bend/turn sequence where qualified). Equal total lengths of a bent route and a straight route must not automatically pass.
- OD/wall/process revision evidence retained and independently disclosed; genuine engineering revision is not automatically an identity error, but it must not be silently overwritten or certified without review.

**Owner positive A-01:**

```
SOURCE:  10 [RESTRAINT] --2000 mm-- 20 [PLAIN] --2000 mm-- 30 [RESTRAINT]
TARGET:  5010 [RESTRAINT] --------4050 mm-------- 5015 [RESTRAINT]
SOURCE span 10→30 = 4000 mm; TARGET span 5010→5015 = 4050 mm
|Δ| = 50 mm ≤ configured 100 mm → LENGTH PASS (conditional on topology/features/physical global evidence)
SOURCE node 20: retained in CII, omitted from required physical identity map; not a DELETE/CREATE or transfer.
```

**Negative controls:** Δ=100 PASS / Δ=100.001 FAIL, internal node 20 carries restraint FAIL compression, 20 is a branch/tee FAIL compression, bend-versus-straight FAIL, unequal component paths FAIL, unknown restraint parse/custody FAIL CLOSED, false shared TARGET/competing ambiguous spans retained REVIEW, loops/cycles have bounded search with explicit incomplete state, wrong manual anchor must not displace unrelated true AUTO claims, orientation-reversed positive must work.

### Parallel source claim architecture

Two **independently generated** tracks, same original SHA/source set and policy snapshot:

```
original immutable CII + source-authoritative feature index
   ├── AUTO qualified base + physical path candidates
   └── MANUAL reviewed locks + independent propagation hypotheses
                 ↓
   deterministic occurrence/physical identity claim ledger
                 ↓
   exact duplicate collapse + global NODE/ELEMENT/TARGET custody + alternatives
                 ↓
   landmark-span physical checks + length policy + global consistent assignment
                 ↓
   qualified / REVIEW / CONFLICT / UNRESOLVED → Compare Review (non-writing first)
                 ↓
   later separate review & Writer2 scope gate, only after independent qualification
```

- Claim key: `(sourceMember, originalSourceSha, originalSourcePhysicalNodeOrSpanID, originalTargetSha, targetPhysicalNodeOrSpanID)`; labels and raw confidence are **not** uniqueness keys.
- Same physical pair from AUTO and MANUAL → exactly **one** claim with both provenance records (2 evidence sources, 1 physical identity, 1 potential Write).
- One SOURCE key→different TARGET or distinct SOURCE keys→same TARGET physical identity/element → independent ambiguous alternatives, **never** greedy overwrite, no duplicate Writer operation. For deliberate subdivisions, internal transit nodes are *not* independent claimed landmark identities; retained original target physical element custody must still not be reused by unrelated paths.
- Wrong/manual-locked pair remains an Owner assertion and regional conflict, not automatic truth. Quarantine only graph region where occupancy is disputed; unrelated AUTO evidence remains qualified.
- Search exhaustion is `SEARCH_INCOMPLETE`, not a unique match. Confidence/HIGH scoring applies **after** admissible structural identity; cannot rescue length/topology failure.

### Proposed named interfaces / receipt

`CiiNodeFeatureIndex.v1`: physical node key, original source SHA, feature types/record pointers, `PLAIN_TRANSIT|LANDMARK|UNKNOWN`, reason codes.

`CiiLandmarkSpan.v1`: endpoints, original constituent nodes/edges, arc sum, displacement, straightness, feature-index digest, physical span ID, source/target SHA.

`CiiDimensionalTolerancePolicy.v1`: `pathSpanAbsoluteToleranceMm:100`, `spatialCoordinateToleranceMm` separate, max graph search and segment limits, policy checksum.

`CiiJointPhysicalClaimLedger.v1`: candidates from both lanes, raw provenance, dedup groups, conflicting assignments, feasible paths, assignment exhaustiveness, decision reasons.

`CiiPhase2CoverageReceipt.v1`: per original Owner row `TARGET current PS | desired SOURCE SL`, physical addressability, predicted source/target physical IDs, independent geometry, AUTO status, MANUAL status, joint status, uncertainty; no pre-search injection. Full 428 denominator and qualified recall only once interpretation and release gate is independently accepted.

## Implementation workpacks and parallelism

1. **WP0 — exact-head baselines and red tests (prerequisite)**: freeze 33/33 original AUTO versus 0/33 manual-active real product replay, all original digests, original 428, original 36 TEXPECTED lower bound. Add positive/negative A-01 landmark span and duplicate-claim specification, incl. one-manual-wrong but unaffected AUTO remains. Writer and original CII unchanged.
2. **WP1 — feature/landmark index (can run parallel with WP2)**: combine topology adapter with `auxiliaryEvidence.restraints.byNode` and other original record families. Do not assume a missing index proves node plain. Generate immutable original-node inventory, proper non-destructive traversability, feature authority blockers. Independently test attachment, branch, bend and unknown.
3. **WP2 — dimensional tolerance policy (parallel WP1)**: one validated 100 mm span-length policy (independent from M1 coordinate settings), exact/negative boundary tests, cache/session policy-digest invalidation. Do not globally raise all 25 mm legacy gates without proving safety.
4. **WP3 — N:M landmark span matcher (depends WP1+WP2)**: source and target path enumerators, direction/custody/geometry, 2→1 Owner A-01, 1→2 control, symmetric multi↔multi, explicit search bound incompleteness and review reason codes.
5. **WP4 — simultaneous AUTO+MANUAL claim generator, deduplicator and global solver (WP3 interface contract; independent parallel implementation after contract stabilized)**: preserve each lane's observations, dedup same physical pair, veto true conflicts, preserve unrelated AUTO identity; compare to current 33 physically addressable Owner rows. Do **not** merge back into legacy operational writer by changing branch mode alone.
6. **WP5 — existing Compare Review wiring / rollout (WP3+WP4)**: show grouped same-pair corroboration, accepted alternatives, local conflicts, dimensional residual + tolerances, physical path route and intermediate plain NODE reason. Maintain exactly one source-backed evidence receipt and no user-unreviewed writes. Real Chromium; manual/scope stale invalidation on source, tolerance or anchor change.
7. **WP6 — owner 428-row qualification and independent review (after WP5)**: report correct/wrong/unresolved/missing on actual physical cases; release only after cross-source target reuse, true global physical certificates, reviewed change scope, full oracle adjudication and required CI. Old TEXPECTED names and Owner suffix semantics remain separate until reconciled.

### Workstream ownership / no parallel writer collision

- One owner per source file: **feature index** (topology + auxiliary adapter), **length policy/span engine** (new module + tests), **AUTO/MANUAL arbitration** (new joint ledger + controller), **UI/independent qualification** (only after interfaces). Keep file-level ownership exclusive.
- WP1 and WP2 can run concurrently; WP4 may prototype synthetic claim ledger independent of WP3 once schemas freeze. WP5 after both; independent negative reviewer checks all three objectives.
- Prefer few small reviewable PRs based on main; avoid stacking old PR #103 into #105. #105 retains independent tests and read-only groundwork; no Writer or production merge authorization follows from planning.

## Acceptance exit conditions

- Example A-01 shows `SOURCE: 10→20→30, TARGET: 5010→5015, source=4000,target=4050,delta=50,tolerance=100,LENGTH_PASS`; node 20 labelled `PLAIN_TRANSIT_NOT_A_PHYSICAL_IDENTITY_REQUIRED`, CII original bytes unchanged.
- AUTO and MANUAL generated together, same pair deduplicated exactly once, conflicting pair remains REVIEW/CONFLICT without deleting unrelated AUTO claims.
- Real original 33/33 direct addressable AUTO pairs remain correct under an independent shadow, and manual conflicts do not cause loss of unrelated correct candidates (measured as joint-candidate presence; Writer remains gated).
- Dimensional settings change effective candidate result and invalidate stale compare reports and scoped Writer; no silent mutation after setting edit.
- Fail-closed adverse cases and bounded-search states, real Chromium, original hash/byte Writer invariance. Full Owner 428/≥70% **not inferred** from synthetic or 33-row subset.
