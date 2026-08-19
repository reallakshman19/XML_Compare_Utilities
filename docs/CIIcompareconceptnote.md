# CII Compare Workspace — Concept Note and Implementation Roadmap

**Document:** `docs/CIIcompareconceptnote.md`  
**Repository:** `reallaksh19/XML_Compare_Utilities`  
**Authority direction:** `SOURCE CII -> TARGET CII`  
**Live-state rule:** GitHub `main`, PR state and repository work reports are authoritative for merge/execution state.  
**Engineering baseline:** Method A/B authority and multi-base orchestration introduced through PRs #994–#996; PRs #997–#999 connect that authority to the full-screen engineering review and human-readable transfer workflow; the current transfer-scope increment binds explicit APPLY/EXCLUDE custody before Writer readiness.  
**Primary objective:** establish defensible local correspondence across complex revised piping models, separate identity from engineering differences, preserve engineer approval, and permit only explicitly scoped, qualified TARGET mutation with full audit custody.

---

## 1. Purpose

CII Workspace compares CAESAR II neutral CII models when revisions can contain:

- node renumbering;
- several independent local geometry changes;
- inserted/deleted/rerouted piping regions;
- OD or wall changes;
- process-data changes;
- support/restraint changes;
- SIF/tee changes;
- rigid, hanger, weight and node-name changes.

The product must answer four independent engineering questions:

1. **Input qualification** — what was loaded and parsed, and what is unsupported or unresolved?
2. **Identity / correspondence** — what SOURCE object corresponds to what TARGET object, and which independent local evidence established that claim?
3. **Engineering difference / approval** — after identity is established, what changed and what has the engineer accepted/rejected/locked?
4. **Qualified TARGET mutation** — which approved deltas are explicitly selected to APPLY, which are EXCLUDED, and which selected values may actually be written without violating fixed-field, topology, pointer, cardinality or custody rules?

These questions must never be collapsed into one score.

---

# 2. Non-negotiable engineering principles

## 2.1 CII is fixed-field engineering data

Parsing and writing must respect fixed columns. For the qualified ELEMENT header row the canonical widths are:

```text
[15, 13, 13, 13, 13, 13]
```

with engineering order:

```text
FROM, TO, DX, DY, DZ, DIAMETER
```

Whitespace tokenisation is not authoritative. Adjacent fields such as:

```text
0.000000-0.488281E-03
```

are legal fixed-width output.

A missing/unparsed diameter must not silently become `OD = 0`.

The protected external writer:

```text
3D_Converters/converters/scripts/inputxml_to_cii2019.py
```

is a format authority and is not modified by CII Workspace.

## 2.2 Identity, engineering difference and mutation scope are separate

Authoritative pipeline:

```text
PARSE
  -> QUALIFY INPUT
  -> DISCOVER / ACCEPT LOCAL BASES
  -> ESTABLISH CORRESPONDENCE
  -> ARBITRATE CROSS-BASE CLAIMS
  -> REVIEW IDENTITY
  -> CALCULATE ENGINEERING DELTAS
  -> CLASSIFY TRANSFER OPERATIONS
  -> EXPLICITLY BIND APPLY / EXCLUDE SCOPE
  -> WRITER READINESS ON APPLY SET ONLY
  -> QUALIFIED WRITER
  -> REPARSE / NEGATIVE ASSURANCE
  -> EXPORT
```

Examples:

- restraint code may change while node identity remains HIGH;
- OD may change while topology identity remains valid;
- a local reroute may invalidate one spatial base while another distant base remains valid;
- Method B may establish the same network position even where geometry moved beyond a spatial registration tolerance;
- an identity may be approved while one of its engineering deltas is deliberately EXCLUDED from mutation;
- an unsupported delta may remain visible and auditable without blocking an unrelated qualified APPLY operation, provided the unsupported delta is explicitly EXCLUDED.

## 2.3 Node numbering is never identity authority

Never implement correspondence as:

```text
targetNode = sourceNode + constantOffset
```

The real benchmark pair `SOURCE 3.CII -> TARGET 3-1.CII` contains multiple valid local numbering regimes in the same model pair. Therefore a single global offset is mathematically invalid as identity authority.

Node numbers remain identities inside their own file and may be displayed as labels/hints only.

## 2.4 OD is a tolerance scale, not identity evidence

The common physical tolerance is:

```text
T = x * SOURCE_OD
```

Default:

```text
x = 2.0
```

`x` is configurable and dimensionless.

SOURCE OD authority at a node is:

```text
minimum positive incident SOURCE OD
```

TARGET OD does not alter tolerance.

Required invariance:

```text
same SOURCE geometry + same SOURCE OD
TARGET OD changed by revision
=> correspondence tolerance unchanged
```

If no qualified positive SOURCE OD exists where an OD-scaled method requires it:

```text
SOURCE_OD_TOLERANCE_UNAVAILABLE
=> REVIEW / UNAVAILABLE
```

There is no hidden fixed-mm fallback.

## 2.5 Several local geometry changes require independent local bases

A complex piping revision can contain several stable regions separated by changed geometry:

```text
stable local region A
      |
reroute / insertion / deletion
      |
stable local region B
      |
other local revision
      |
stable local region C
```

Therefore the architecture is not one global rigid registration.

It is:

```text
BASE A
  OR
BASE B
  OR
BASE C
```

Each local Method-A base may legitimately own a different rigid transform.

Do not require:

```text
T_A == T_B == T_C
```

and do not average them into one compromise transform.

## 2.6 Method A and Method B are independent OR evidence

At each local candidate/base region:

```text
METHOD A — Spatial
        OR
METHOD B — Network
```

If both independently qualify and identify the same pair, they corroborate.

If both independently qualify but identify different targets, the result is ambiguous.

Canonical rule:

```text
OR_WITH_CONFLICT_VETO
```

No majority vote. No first-loop winner. No score summation that overrides conflict.

## 2.7 One SOURCE / TARGET identity has unique custody

Fail closed when READY evidence claims:

```text
same SOURCE -> different TARGETS
```

or:

```text
different SOURCES -> same TARGET
```

These are identity custody conflicts and remain `AMBIGUOUS`.

## 2.8 Candidate evidence and identity approval are not Writer authority

Required order:

```text
candidate evidence
 -> canonical correspondence
 -> canonical engineering delta
 -> identity approval
 -> transfer classification
 -> explicit APPLY / EXCLUDE selection
 -> selected Writer operation set
 -> Writer readiness
 -> mutation
 -> reparse / negative assurance
```

Never route a raw candidate, an approved correspondence, or an unbound transfer proposal directly into Writer 1A/1B.

## 2.9 Transfer scope is exact custody, not a display filter

A transfer scope is bound to:

```text
SOURCE content SHA-256
TARGET content SHA-256
exact mutable candidate operation-ID set
one explicit decision per mutable operation:
  APPLY
  EXCLUDE
```

The scope is invalid if:

```text
SOURCE hash changed
OR TARGET hash changed
OR an expected operation is missing
OR a new operation appeared
OR an operation is duplicated
OR a decision is invalid
```

`EXCLUDE` means:

```text
retain operation in audit custody
remove operation from Writer operations[]
keep effective TARGET equal to current TARGET
```

It does **not** mean:

```text
convert unsupported mutation into KEEP
hide the operation from audit
weaken Writer readiness
```

A selected unsupported APPLY operation remains a Writer blocker.

If every mutable operation is EXCLUDED:

```text
TRANSFER_SCOPE_NO_APPLY_OPERATIONS
=> no mutation authority
```

---

# 3. Product information architecture

The CII Workspace has three permanent engineering tabs:

```text
1. Inputs & Match Basis
2. Compare Review
3. Transfer Preview
```

The application-level workspace is full viewport by default and does not depend on the browser Fullscreen API.

Required chrome:

```text
CII COMPARE WORKSPACE
SOURCE.CII  ->  TARGET.CII
readiness / authority state

Inputs & Match Basis | Compare Review | Transfer Preview
```

`Compact view` may restore a centered modal footprint, but the engineering workflow and authority must remain identical.

---

# 4. Tab 1 — Inputs & Match Basis

## 4.1 Input custody

SOURCE and TARGET are always shown explicitly side-by-side with:

- filename;
- hash/content identity;
- CII version when available;
- parse status;
- element/node count;
- branches, terminals, bends, rigids;
- parsed auxiliary families;
- unsupported/unresolved data.

`0`, `EMPTY`, `NOT_PARSED`, `UNSUPPORTED` and `PARSE_ERROR` must remain distinguishable states.

## 4.2 Candidate generation is structural search, not authority

The structural candidate score is currently based on:

```text
30 base
+ 20 incident component-kind similarity
+ 20 neighbour-degree similarity
+ 25 topology-neighbourhood similarity
+  5 shared robust landmark reasons
```

This score answers:

> Where is it worth evaluating Method A / Method B?

It does not answer:

> Is this identity proved?

Current default search/gating parameters:

```text
Method-B structural minimum score      65
Method-A broader search floor          55
base-anchor winner gap                  8
Method-A candidates/source              3
Method-A reverse rank limit             3
Method-A seed-pair pool                16
```

Method A may recover a structurally rank-2/3 candidate if spatial registration independently proves it.

## 4.3 Method-qualified Base Anchor suggestion contract

Each candidate exposes:

```text
sourceNodeId
targetNodeId
basisMethod:
  METHOD_A_SPATIAL
  METHOD_B_NETWORK
  METHOD_A_AND_B
  LANDMARK_ONLY

methodA
methodAWeight
methodB
methodBWeight
candidateGeneration
confidence
identityExclusions
reviewRequired
```

Primary card must show physical evidence, not raw JSON.

## 4.4 Accepted independent base set

The engineer may select several method-qualified Base Anchor cards.

Selection projects to explicit `baseLoops[]`.

### Method A card

Selecting Method A contributes the **entire validated local Method-A base**, not only the clicked pair:

```text
{
  method: METHOD_A_SPATIAL,
  baseId,
  anchorPairs: [all validated pairs belonging to that local base]
}
```

If the same local Method-A base appears through several suggestion cards, it is deduplicated by base identity.

### Method B card

Selecting Method B contributes:

```text
{
  method: METHOD_B_NETWORK,
  baseId,
  anchorPairs: [one accepted SOURCE <-> TARGET pair]
}
```

### A+B card

Selecting `METHOD_A_AND_B` contributes **two independent loops**:

```text
Method A loop
OR
Method B loop
```

It does not create one fused pseudo-method.

### Conflict preservation

If the engineer selects two B loops such as:

```text
S500 -> T1500
S500 -> T2500
```

the UI must pass both to the core. It must not deduplicate or vote them away. The core conflict veto then returns `AMBIGUOUS`.

## 4.5 Manual / landmark fallback is a separate mode

`LANDMARK_ONLY` does not silently become Method B just because local run math exists.

Manual anchors remain available for engineer-controlled fallback, but manual legacy mode and qualified `baseLoops[]` are not silently mixed.

Changing to manual anchors clears the selected qualified base set.

Changing the selected qualified base set clears manual anchor input.

---

# 5. Method A — local spatial registration

## 5.1 Minimum geometry

```text
1 anchor  -> UNDERDETERMINED / translation only
2 anchors -> UNDERDETERMINED / rotation about common axis unresolved
>=3 non-collinear pairs -> candidate rigid 3D basis
```

Do not replace this with coordinate averaging.

## 5.2 Local-basis hypothesis policy

For one accepted local Method-A base:

1. enumerate every unordered 3-anchor combination;
2. reject collinear/invalid bases;
3. derive rigid rotation and translation;
4. test that transform against **all anchors in that local base**;
5. retain only hypotheses satisfying OD-scaled residual limits;
6. compare admissible hypotheses against each other;
7. fail `AMBIGUOUS` if materially different admissible transforms remain;
8. otherwise select the deterministic best admissible hypothesis.

No averaging of incompatible transforms.

## 5.3 OD-scaled residual qualification

For anchor `i`:

```text
T_i = x * SOURCE_OD_i
```

and:

```text
e_i = residual_i / T_i
```

A rigid hypothesis is admissible only when:

```text
max(e_i) <= 1
```

The basis-agreement displacement tolerance is based on:

```text
x * minimum qualified SOURCE OD in that local base
```

## 5.4 Alternate-basis ambiguity

Two residual-qualified hypotheses are compared using:

- relative rotation;
- centroid displacement;
- rotational displacement bound over source-base radius;
- configured registration probes where present.

If material transform disagreement exceeds basis-agreement tolerance:

```text
METHOD_A_AMBIGUOUS_BASES
```

and automatic authority fails closed.

## 5.5 Method-A weight — 100 points

Production decomposition:

```text
Residual quality              35
Geometric conditioning        25
Spatial extent                20
Anchor redundancy             10
Basis consensus               10
                             ---
                             100
```

### Residual quality

```text
35 * (1 - clamp(max normalized residual, 0, 1))
```

### Conditioning

```text
25 * clamp(minimum sin(theta), 0, 1)
```

### Spatial extent

Let:

```text
spanRatio = maximum SOURCE anchor span / reference SOURCE OD
```

Full extent credit is reached at approximately `10 OD`:

```text
20 * clamp(spanRatio / 10, 0, 1)
```

### Redundancy

Current production rule:

```text
3 anchors -> 2/10
4 anchors -> 5/10
5 anchors -> 8/10
6+        -> 10/10
```

### Basis consensus

A non-ambiguous READY local basis receives `10/10`.

Ambiguity is a hard status veto; it is not compensated by points.

### Confidence

```text
HIGH    total >= 85
MEDIUM  total >= 70
REVIEW  otherwise
```

Automatic Method-A discovery additionally caps a 3-anchor base at `REVIEW` until at least a fourth pair validates the transform. Three pairs remain mathematically valid for registration but are not automatically promoted to HIGH/MEDIUM.

---

# 6. Method B — local pipe-run network basis

## 6.1 Hard minimum two-axis gate

Method B cannot produce qualified network authority unless SOURCE and TARGET each contain at least two independent non-truncated compatible PIPE runs around the candidate node.

Default independent-run angle threshold:

```text
15 degrees
```

One long straight run is still one axis regardless of element count.

## 6.2 Pipe-run extraction

Starting from the candidate node, walk each incident PIPE ray and merge collinear elements until a qualified stop such as:

- terminal;
- branch;
- component transition;
- direction change;
- configured traversal limit.

Opposite collinear rays are treated as one undirected run.

Axis labels X/Y/Z are presentation only; skew runs remain valid geometry.

## 6.3 OD-scaled run-length comparison

For mapped SOURCE/TARGET runs:

```text
length error = |L_SOURCE - L_TARGET|
```

Qualification uses:

```text
length error <= x * SOURCE_OD
```

not a global percentage of run length.

## 6.4 Angular mismatch converted to physical displacement

Angular disagreement is converted to an equivalent displacement over characteristic run length:

```text
d_angle = 2 * L_characteristic * sin(delta_theta / 2)
```

and compared with:

```text
d_angle <= x * SOURCE_OD
```

This avoids treating a 2-degree difference over 0.5 m and 15 m as physically identical.

## 6.5 Compatible 3D complexity

Extra 3D credit is earned only when additional SOURCE/TARGET runs are themselves cross-revision compatible.

Geometry-complexity component:

```text
<2 compatible independent runs             0 / 40
2 compatible independent runs             24 / 40
3+ compatible coplanar runs               32 / 40
3+ compatible non-coplanar runs           32 + 8*V
```

where:

```text
V = |u1 dot (u2 cross u3)|
```

For orthogonal compatible X/Y/Z:

```text
V = 1
geometry complexity = 40/40
```

If SOURCE and TARGET each look 3D but the third run is not compatible, the pair retains only the qualified lower-dimensional credit.

## 6.6 Method-B weight — 100 points

Production decomposition:

```text
Compatible geometry complexity          40
Run geometry compatibility              20
Terminator/topology fingerprint         15
Neighbourhood structural agreement      15
Mutual-best + winner-gap quality        10
                                        ---
                                        100
```

Method B authority additionally requires all hard gates:

```text
run basis READY
AND structural mutual-best
AND winner gap >= required gap
```

Current confidence policy:

```text
HIGH:
  all hard gates
  total >= 80
  winner gap >= max(required gap, 12)

MEDIUM:
  all hard gates
  total >= 65

otherwise REVIEW
```

A local run basis may therefore be mathematically `READY` while the overall Base Anchor remains `REVIEW` because mutual-best or winner-gap authority is missing.

## 6.7 Method-B identity exclusions

Do not earn Method-B identity weight from:

```text
node-number offset
OD equality
wall equality
process values
```

OD is used only for physical tolerance scaling.

---

# 7. Independent multi-base authority

The workspace input is conceptually:

```text
baseLoops = [
  A1,
  A2,
  B1,
  B2,
  ...
]
```

The authority engine evaluates each loop independently:

```text
A1 OR A2 OR B1 OR B2 ...
```

Every READY loop may generate local correspondence.

Cross-loop arbitration then applies:

```text
compatible duplicate identity
  -> canonical one-to-one correspondence
  -> preserve all provenance
  -> A+B agreement is corroboration

contradictory READY identity
  -> AMBIGUOUS

uncovered region
  -> REVIEW / UNRESOLVED
```

No global transform is published when several independent Method-A loops contribute.

Compatibility geometry then reports an explicit state such as:

```text
MULTI_BASE
INDEPENDENT_LOCAL_TRANSFORMS
NO_SINGLE_GLOBAL_TRANSFORM_ACROSS_INDEPENDENT_BASES
```

---

# 8. Downstream M1/M2 correspondence versus Base Anchor A/B

Do not confuse the two levels.

## Base Anchor methods

```text
Method A = qualified local rigid spatial registration
Method B = qualified local pipe-run/network basis
```

These establish accepted local registration/network authority loops.

## Downstream candidate evidence

Existing correspondence logic may expose row-level evidence labelled:

```text
M1 Spatial
M2 Network / Gang
```

Those operate inside/under the accepted base-loop context.

A raw/global M1 fallback must not recreate a rejected or ambiguous Method-A global registration in explicit multi-base mode.

---

# 9. Compare Review UX

## 9.1 Executive summary

Show:

- SOURCE/TARGET filenames;
- correspondence status;
- HIGH/MEDIUM/REVIEW/UNRESOLVED counts;
- engineering-change count/families;
- accepted/rejected/locked rows;
- multi-base provenance/ambiguity summary where relevant.

## 9.2 Correspondence grid

Primary human-readable grid:

```text
Decision | Kind | Confidence | SOURCE | TARGET |
M1 | M2 | OD | WT | Winner gap | Engineering changes | Evidence
```

`Accept all HIGH` and `Accept all MEDIUM` apply only to bound identities in those confidence bands.

`REVIEW` and `UNRESOLVED` are never swept into bulk acceptance.

## 9.3 Evidence inspector

Raw transform matrices, alternate candidates, run mappings and detailed payloads belong under structured expandable evidence.

Do not put `stableStringify()` object dumps into primary cells.

---

# 10. Engineering Delta Grid

Identity must be bound before engineering deltas are authoritative.

Primary human-readable grid:

```text
Approval
Identity
Category / property
SOURCE candidate
Current TARGET
Effective TARGET after apply
Engineering change
Evidence / authority
```

An approved correspondence is still not mutation scope.

Before transfer scope is bound:

```text
Effective TARGET after apply = Current TARGET
state = explicit scope required / preview rebuild as applicable
```

After scope is bound:

```text
APPLY + Writer READY -> Effective TARGET = selected proposed value
EXCLUDE               -> Effective TARGET = Current TARGET; state EXCLUDED
BLOCKED / PROTECTED   -> Effective TARGET = Current TARGET
```

Examples:

```text
130 <-> 20130 | RESTRAINT | Type code | SOURCE 15 | TARGET 9   | EXCLUDE -> TARGET stays 9
130 <-> 20130 | RESTRAINT | Friction  | SOURCE 0  | TARGET 0.3 | APPLY only if Writer-qualified
```

Raw SIF/restraint pairing payloads move to evidence/details.

Engineering deltas never feed back into identity unless explicitly classified as identity evidence.

---

# 11. Transfer Preview and explicit mutation scope

Transfer direction must be explicit:

```text
SOURCE candidate
Current TARGET
Effective TARGET after apply
```

For protected, blocked, unbound or excluded operations, `Effective TARGET after apply` must show the unchanged TARGET.

Do not display a SOURCE value under a misleading `Proposed target` heading when Writer authority cannot apply it.

## 11.1 Two separate approvals

Do not conflate:

```text
Correspondence decision:
  ACCEPT / LOCK / REJECT
```

with:

```text
Mutation-scope decision:
  APPLY / EXCLUDE
```

Correspondence approval establishes identity custody. APPLY/EXCLUDE establishes mutation custody.

## 11.2 Scope binding contract

For every mutable classified transfer candidate, the engineer must bind exactly one decision:

```text
operationId -> APPLY
operationId -> EXCLUDE
```

The bound scope records:

```text
schema = CIIWorkspaceTransferScope.v1
authority = USER_EXPLICIT_OPERATION_SCOPE
SOURCE SHA-256
TARGET SHA-256
candidateOperationIds[]
appliedOperationIds[]
excludedOperationIds[]
scopeId
```

The operation-ID set must match exactly when the scope is used. No implicit default APPLY is allowed for a newly appearing operation.

## 11.3 APPLY semantics

An APPLY operation remains in:

```text
transferPlan.operations[]
```

Writer readiness evaluates it without weakened policy.

If APPLY selects an unsupported, blocked or otherwise unqualified mutation:

```text
Writer readiness = BLOCKED
```

## 11.4 EXCLUDE semantics

An EXCLUDE operation moves to:

```text
transferPlan.excludedOperations[]
```

It remains in:

- scoped audit JSON;
- transfer-scope counts/IDs;
- explicit excluded-operation UI;
- engineering-delta presentation as `EXCLUDED`.

It is absent from Writer `operations[]` and therefore cannot mutate TARGET or poison unrelated qualified APPLY operations.

## 11.5 Stale-scope rules

Fail closed on:

```text
TRANSFER_SCOPE_SOURCE_HASH_MISMATCH
TRANSFER_SCOPE_TARGET_HASH_MISMATCH
TRANSFER_SCOPE_OPERATION_SET_MISMATCH
TRANSFER_SCOPE_DUPLICATE_OPERATION:<id>
TRANSFER_SCOPE_DECISION_INVALID
```

If all mutable operations are EXCLUDE:

```text
TRANSFER_SCOPE_NO_APPLY_OPERATIONS
```

and Writer mutation remains blocked.

## 11.6 Export custody

Before scope binding, ordinary audit export may represent the pre-scope reviewed preview.

After scope binding, product export controls must emit the **scoped** artifacts so there is no competing unscoped audit presented as the mutation authority.

The scoped audit retains both selected operations and excluded operations.

---

# 12. Writer authority roadmap

Writer phases are defined primarily by custody/cardinality impact.

## Writer 1A — existing-field/cardinality-preserving edits

Qualified examples include existing fixed fields such as:

- WT;
- P1/T1/T2 where qualified;
- existing rigid weight;
- deterministic existing restraint numeric fields.

Geometry, node numbering and connectivity remain protected.

## Writer 1B — extended cardinality-preserving authority

Includes qualified extensions such as:

- additional fixed process fields;
- conditional OD where topology/component semantics remain closed;
- qualified free-slot use inside an already-owned fixed-capacity restraint block;
- clearing a qualified existing restraint slot;
- other existing auxiliary-record edits only after exact ownership/field qualification.

OD mutation is not blanket PIPE_SIZE authority. It must remain topology-closed and round-trip qualified.

Explicit transfer scope does not extend Writer 1B's whitelist. It only determines which already-classified operations Writer 1B is asked to evaluate.

## Writer 2 — pointer/cardinality-aware auxiliary changes

Examples:

- create/delete SIF/TEE auxiliary blocks;
- create/delete auxiliary sections where pointers/counts require re-indexing;
- cardinality changes not representable inside an already-owned fixed slot.

## Writer 3 — model structure mutation

Examples:

- create/delete nodes;
- create/delete elements;
- connectivity changes;
- structural model rebuild.

Writer 3 requires a separate qualification programme.

---

# 13. Real benchmark authority

Primary current multi-base benchmark pair:

```text
Benchmark/CIICompare/SOURCE 3.CII
Benchmark/CIICompare/TARGET 3-1.CII
```

Observed model-level fact:

```text
SOURCE ELEMENT records = 219
TARGET ELEMENT records = 223
```

The pair contains several locally corresponding regions with different numbering relationships, demonstrating that one global node-number offset is invalid.

A real two-axis / spatial local qualification region is:

```text
SOURCE 60920 / 60930 / 60940
TARGET  7290 /  7300 /  7310
```

At SOURCE node `60930`:

```text
incoming run  : delta Z = -450 mm
outgoing run  : delta X = -152 mm
SOURCE OD     : 114.3 mm
x             : 2
T             : 228.6 mm
```

This provides both non-collinear Method-A geometry and genuine two-axis Method-B evidence.

---

# 14. Validation requirements

Engineering-critical changes require explicit evidence dimensions:

```text
STATUS:
  PASS | FAIL | NOT_RUN | NOT_APPLICABLE

OBSERVATION:
  LOCAL_EXECUTION | REMOTE_EXECUTION | SOURCE_INSPECTION |
  ARTIFACT_INSPECTION | USER_SUPPLIED | INFERRED | NOT_OBSERVED

ORACLE:
  NONE | IMPLEMENTATION_COUPLED | INDEPENDENT_REPRODUCTION |
  ANALYTICAL | AUTHORITATIVE_REFERENCE | CROSS_SOLVER | EXPERIMENTAL
```

Do not claim an authored test as PASS until it executes.

Required focused qualification includes:

- Method-A OD scaling;
- TARGET-OD invariance;
- Method-A alternate-basis ambiguity;
- several independent A transforms in one model pair;
- Method-B one-axis REVIEW;
- Method-B two-axis READY;
- planar versus full-3D compatible weighting;
- angular mismatch converted to physical displacement;
- A+B same-pair corroboration;
- A/B source/target conflict veto;
- multi-base UI selection projecting the whole Method-A base;
- A+B UI selection creating two independent loops;
- same-A-base card deduplication;
- contradictory B selections preserved to core arbitration;
- manual mode clearing explicit qualified-base selection;
- complete SOURCE 3 -> TARGET 3-1 workspace path;
- unbound transfer scope blocks product Writer readiness;
- APPLY-qualified + EXCLUDE-unsupported permits only the qualified mutation;
- selected unsupported APPLY remains blocked;
- all-EXCLUDE scope has no mutation authority;
- SOURCE/TARGET hash mismatch invalidates scope;
- missing/new/duplicate operation IDs invalidate scope;
- EXCLUDED delta remains visible with effective TARGET unchanged;
- scoped audit retains excluded operations while Writer operations exclude them;
- Writer round trip and negative assurance for every mutation class.

Tolerance, Writer policy and transfer classifications must never be loosened merely to make one benchmark or transfer-scope scenario pass.

---

# 15. Current implementation / roadmap

## Implemented authority foundation

```text
PR982  fixed-field parser foundation
PR983  input capability/oracle states
PR984  M1/M2 evidence
PR985  anchor-seeded propagation
PR986  Compare Review / engineering deltas
PR987  auxiliary custody qualification
PR988  transfer preview qualification
PR989  explicit Base Anchor / approval flow
PR991  Writer 1A
PR992  Writer 1B qualified slice
PR994  independent Method A/B core + x*SOURCE_OD policy
PR995  independent multi-base correspondence orchestration
PR996  automatic Method-A discovery + Method-A/Method-B fusion
PR997  full-viewport Method A/B evidence UI
PR998  multi-base UI selection -> explicit baseLoops[]
PR999  human-readable delta / effective TARGET transfer presentation
```

Current Issue #993 transfer-scope increment adds:

```text
classified reviewed operations
  -> explicit APPLY / EXCLUDE for every mutable operation
  -> exact SOURCE/TARGET hash + operation-set binding
  -> selected operations[] / audit-retained excludedOperations[]
  -> Writer readiness on selected APPLY set only
  -> scoped audit/export custody
```

The presentation layer must not become a second matching engine or a second Writer policy engine.

---

# 16. Non-goals / prohibited shortcuts

Do not:

- assume one global node-number offset;
- force all local Method-A transforms to agree globally;
- average incompatible bases;
- sum A and B weights to override disagreement;
- use TARGET OD to scale correspondence tolerance;
- use OD/WT equality as identity authority;
- treat long one-axis piping as two-axis Method B because it has many elements;
- grant 3D Method-B credit for an incompatible third run;
- let UI deduplicate a true conflicting source/target claim before core arbitration;
- silently mix manual legacy anchors with explicit method-qualified base loops;
- expose one local transform as a fake global transform;
- route a candidate directly to Writer;
- treat identity ACCEPT as implicit mutation APPLY;
- default a newly appearing transfer operation to APPLY under an old scope;
- implement EXCLUDE by converting an unsupported operation to KEEP;
- drop EXCLUDED operations from audit custody;
- weaken Writer 1B to make a selected unsupported operation appear ready;
- export an unscoped audit as the mutation authority after a scope is bound;
- represent NOT_RUN validation as PASS.

---

# 17. Governing summary

The CII Compare Workspace architecture is:

```text
structural candidate discovery
        ↓
local METHOD A spatial bases
        OR
local METHOD B network bases
        ↓
engineer selects one or more independent bases
        ↓
baseLoops[]
        ↓
OR_WITH_CONFLICT_VETO
        ↓
per-loop correspondence
        ↓
cross-loop canonical arbitration
        ↓
engineering deltas
        ↓
identity approval
        ↓
classified transfer candidates
        ↓
explicit APPLY / EXCLUDE scope
        ↓
Writer readiness on APPLY set only
        ↓
qualified Writer
        ↓
reparse + negative assurance + scoped audit export
```

For complex 3D piping revisions, **local identity independence and explicit mutation custody are requirements, not fallbacks**.
