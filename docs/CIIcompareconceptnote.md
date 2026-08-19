# CII Compare Workspace — Concept Note and Implementation Roadmap

**Document:** `docs/CIIcompareconceptnote.md`  
**Repository:** `reallaksh19/XML_Compare_Utilities`  
**Baseline refreshed after:** PR #989 / merge `13e7c0e653e6d61ef2f2217068e1010bd5a53bf6`  
**Status:** Active product and implementation roadmap  
**Direction of authority:** `SOURCE CII -> TARGET CII`  
**Primary objective:** establish defensible correspondence, engineering revision evidence, engineer approval, qualified target mutation and auditable modified-CII export.

---

## 1. Purpose

CII Workspace compares two CAESAR II neutral CII models when node numbers, local geometry, pipe size, wall thickness, process data, support data, SIF/tee data, node names, weights, hangers, loads or other engineering attributes may differ between revisions.

The product must answer four separate engineering questions:

1. **Input qualification:** What models were loaded, were they parsed correctly, and what evidence/configuration will be used to establish correspondence?
2. **Compare review:** What SOURCE item corresponds to what TARGET item, how was that identity established, how confident is the result, and what engineering properties changed after identity was established?
3. **Approval and transfer preview:** Which correspondence and engineering deltas have the engineer approved, and exactly what SOURCE values are proposed for the TARGET?
4. **Qualified target writer:** Which approved operations can be applied without violating fixed-field format, record custody, section cardinality, pointer integrity or explicitly protected model structure?

These questions must not be mixed. A property difference is not automatically an identity failure, and high identity confidence does not imply that the revisions are engineering-equivalent.

---

## 2. Non-negotiable engineering principles

### 2.1 CII is a fixed-field engineering format

CII parsing and writing must respect the fixed-column format emitted by the protected CII writer.

For ELEMENT header rows, the canonical field widths are:

```text
[15, 13, 13, 13, 13, 13]
```

with engineering order:

```text
FROM, TO, DX, DY, DZ, DIAMETER
```

Whitespace tokenisation is not authoritative because adjacent fields such as:

```text
0.000000-0.488281E-03
```

are legal fixed-width output and are not separated by whitespace.

A parser failure must remain a parser failure. It must never silently become an engineering value such as `OD = 0`.

The protected reference writer in `3D_Converters/converters/scripts/inputxml_to_cii2019.py` is an external format authority and is **not to be modified** by this work.

### 2.2 Identity, engineering difference, approval and mutation are separate stages

The authoritative flow is:

```text
PARSE
  -> QUALIFY INPUT
  -> ESTABLISH IDENTITY
  -> REVIEW CORRESPONDENCE
  -> COMPARE ENGINEERING PROPERTIES
  -> APPROVE
  -> TRANSFER PREVIEW
  -> QUALIFIED MUTATION
  -> REPARSE / VERIFY
  -> EXPORT
```

Examples:

- A restraint code can change while correspondence remains HIGH.
- A hanger can be removed while the supporting node correspondence remains valid.
- OD and wall thickness can change materially while network identity remains defensible.
- A node can move beyond the spatial tolerance while the network/topology method still establishes it as the same network position.

### 2.3 Node numbering is not identity authority

Correspondence must not be implemented as:

```text
targetNode = sourceNode + constantOffset
```

Numbering offsets may be displayed only as supporting evidence/hints.

TARGET2 exists specifically to demonstrate that a hard-coded TARGET1 numbering family is not a valid correspondence method.

### 2.4 Base Anchor suggestions are paired evidence, not independent landmark lists

The UI must distinguish:

```text
Landmark evidence (unpaired)
```

from:

```text
Base Anchor suggestions
SOURCE <-> TARGET | Basis | Confidence | Review | Action
70     <-> 20070  | ...   | HIGH       | REQUIRED | Accept base anchor
```

Base-anchor pairing must be topology-led and must not derive identity from:

```text
node-number offset
OD
wall thickness
```

Every suggested pair remains evidence-only until an engineer accepts it and the Compare operation creates locked anchor authority.

### 2.5 One target has one source custody unless explicitly qualified otherwise

Correspondence must preserve one-to-one target custody. Two unrelated SOURCE identities must not silently claim the same TARGET identity.

Ambiguity must remain visible and block automatic propagation or transfer.

### 2.6 Method disagreement is evidence, not a score to average away

Spatial and network methods run independently. If they point to different TARGET candidates, the result is `REVIEW`, not an averaged score.

### 2.7 Mutation phase is defined by custody/cardinality impact, not by property importance

The mutation roadmap shall **not** use a blanket rule such as “WT, OD or process data are model-defining and therefore permanently protected.”

The primary writer boundary is:

```text
Can the approved edit be performed while preserving:
  - node/element identity;
  - section cardinality;
  - auxiliary-record ownership;
  - pointer values;
  - record ordering;
  - unrelated bytes/fields?
```

If yes, the edit belongs to the cardinality-preserving writer programme once its exact field authority is qualified.

If the edit requires creating/deleting auxiliary blocks, re-indexing pointers, changing CONTROL counts or rebuilding network structure, it belongs to a later writer phase.

---

## 3. Product information architecture

CII Workspace has three permanent top-level tabs:

```text
1. Inputs & Match Basis
2. Compare Review
3. Transfer Preview
```

Expected state presentation:

```text
[1 Inputs & Match Basis  READY]
[2 Compare Review        37 HIGH · 4 MED · 1 REVIEW]
[3 Transfer Preview      PREVIEW_READY / BLOCKED]
```

Target mutation authority must be displayed separately from preview-plan readiness.

Until a writer phase is qualified, the mutation banner remains:

```text
TRANSFER PREVIEW · BLOCKED
Preview only. Target mutation is not implemented.
```

Once a writer slice is qualified, Stage 06 must enable only for operations explicitly included in that writer's supported-operation whitelist. Unsupported selected operations must block Apply; they must never be silently skipped.

---

# 4. Tab 1 — Inputs & Match Basis

## 4.1 Purpose

Tab 1 answers:

> Do I trust the SOURCE and TARGET inputs, and what matching basis will be used?

It contains no target mutation controls.

## 4.2 SOURCE and TARGET intake

Present SOURCE and TARGET side-by-side with explicit direction:

```text
SOURCE CII                         TARGET CII
BM_CII_SOURCE.CII       ->         BM_CII_TARGET1.CII
READY                              READY
```

Each side should show:

- file name;
- content SHA/hash;
- detected CII version, when available;
- parse status;
- parser warnings/errors;
- unsupported/unparsed section warnings.

`0`, `EMPTY`, `NOT_PARSED`, `UNSUPPORTED` and `PARSE_ERROR` must remain distinguishable.

## 4.3 Model overview

### A. Topology

- nodes;
- elements;
- connected components;
- terminal nodes;
- branch nodes;
- bends;
- rigid elements/components.

### B. Mechanical data

- restraint nodes and records;
- hangers;
- SIF/tee records;
- weight/rigid data;
- named nodes.

### C. Pipe/process data

- unique ODs and OD range;
- unique wall values and wall range;
- pressure/process sets;
- temperature/process sets;
- insulation/corrosion data when qualified;
- line numbers and count when qualified.

### D. Parse/quality data

- malformed fixed-field rows;
- unsupported sections;
- unresolved numeric fields;
- duplicate/custody warnings;
- disconnected-network warnings.

## 4.4 Base Anchor suggestions

Show an explicit paired suggestion frame:

```text
Base Anchor suggestions
SOURCE <-> TARGET | Basis | Confidence | Review | Action
```

Each suggestion must expose the evidence basis and `Accept base anchor`.

Independent per-model landmarks may remain visible only as:

```text
Landmark evidence (unpaired)
```

They are not base anchors.

## 4.5 Numbering offset hint

A separate optional control may show:

```text
Numbering offset hint: +20000
```

This must never create identity.

## 4.6 Matching configuration

```text
AUTO — Spatial + Network
M1   — Spatial / Coordinate
M2   — Network / Gang
```

Qualification baseline:

```text
Spatial tolerance       ±100 mm
Pipe OD tolerance       ±10 %
Wall tolerance          ±10 %
Winner gap              8
```

OD/WT are supporting evidence and engineering-delta properties; they must not create identity alone.

---

# 5. Correspondence methods

## 5.1 M1 — Spatial / Coordinate correspondence

For SOURCE position `S` and TARGET candidate `T`:

```text
distance = sqrt((Tx-Sx)^2 + (Ty-Sy)^2 + (Tz-Sz)^2)
```

M1 passes only when its geometry/registration basis is itself qualified and:

```text
distance <= spatialTolerance
```

OD and wall are separate supporting dimensions.

## 5.2 M2 — Network / Gang correspondence

M2 establishes structural/network identity using dimension-free topology evidence such as:

- node degree;
- branch/terminal relationship;
- ordered structural component sequence;
- neighbour degree patterns;
- anchored relative network position;
- path/gang structure;
- qualified path-length evidence where applicable.

OD and wall must not be embedded in M2 identity tokens.

## 5.3 M1/M2 fusion

| M1 Spatial | M2 Network | Interpretation | Final identity state |
|---|---|---|---|
| PASS | PASS | strong independent agreement | HIGH candidate |
| PASS | FAIL | spatially plausible but network conflict | REVIEW |
| FAIL | PASS | same network identity but geometry moved | MEDIUM candidate |
| FAIL | FAIL | identity not established | UNRESOLVED |
| A -> X | B -> Y | methods disagree on TARGET | REVIEW |

Dimension changes remain explicit engineering deltas after identity binding.

---

# 6. Tab 2 — Compare Review

## 6.1 Executive Summary

Display:

- SOURCE/TARGET filenames;
- node and element totals;
- HIGH/MEDIUM/REVIEW/UNRESOLVED counts;
- matched/missing/inserted identities;
- engineering-change count by family;
- accepted/rejected/locked correspondence counts.

## 6.2 Correspondence Review

Primary grid:

```text
Decision | Kind | Confidence | Source | Target |
M1 | M2 | OD | WT | Winner gap | Engineering Changes | Evidence
```

The review frame shall provide:

```text
Accept all HIGH
Accept all MEDIUM
```

Bulk acceptance is permitted only for bound identities in the requested confidence band. REVIEW and UNRESOLVED must never be swept into bulk acceptance.

Individual controls remain available:

```text
Lock
Accept
Reject
```

## 6.3 Engineering Delta Grid

After identity is bound, calculate revision deltas.

Required leading column:

```text
Approval
```

Approval is a projection of the parent correspondence decision:

```text
ACCEPTED -> APPROVED
LOCKED   -> LOCKED
REJECTED -> REJECTED
otherwise -> PENDING
```

It is not a second independent engineering authority.

Suggested columns:

```text
Approval | Source | Target | Identity confidence | Category | Property |
Source value | Target value | Delta / semantic change | Evidence status
```

Engineering deltas must never feed back into identity unless the property is explicitly classified as identity evidence.

---

# 7. Tab 3 — Transfer Preview and writer authority

## 7.1 Purpose

Tab 3 answers:

> Given accepted/locked correspondence and approved engineering deltas, exactly what would be written into TARGET, and is that operation currently qualified for mutation?

Only accepted/locked correspondence may produce transfer rows.

## 7.2 Transfer operation contract

The preview distinguishes intended engineering action from execution status:

```text
Action: COPY / CREATE / DELETE / KEEP
Status: PREVIEW_READY / BLOCKED / PROTECTED
```

Examples:

```text
CREATE · BLOCKED
COPY   · PREVIEW_READY
KEEP   · PROTECTED
```

`BLOCKED` is not an engineering action.

## 7.3 Mutation-class principle

### Class A — cardinality-preserving modification

No auxiliary record is added or deleted; existing ownership/pointers remain unchanged.

This is the primary Writer 1 programme.

### Class B — cardinality-preserving slot use

A semantically new item can still belong to Writer 1 when an already-owned fixed-capacity block contains a qualified unused slot.

Primary example:

```text
existing 24-row RESTRANT block
6 fixed restraint slots
unused slot available
-> add restraint in free slot
-> pointer unchanged
-> section cardinality unchanged
```

### Class C — pointer/cardinality-aware auxiliary creation/deletion

Requires section rebuild, pointer re-indexing or count updates. This belongs to Writer 2.

### Class D — model structure mutation

New/deleted nodes/elements or connectivity changes. This belongs to Writer 3.

---

# 8. Target Writer roadmap

## 8.1 Writer 1A — existing-field modification

Writer 1A shall target high-value properties that can be modified in existing records without changing record cardinality or pointer ownership.

| Family | Property / operation | Intended Writer 1A state |
|---|---|---|
| ELEMENT | Wall thickness / WT | MODIFY after approved correspondence |
| ELEMENT | P1 | MODIFY after exact field qualification |
| ELEMENT | T1 | MODIFY after exact field qualification |
| ELEMENT | T2 | MODIFY after exact field qualification |
| ELEMENT | Insulation thickness | MODIFY after exact field qualification |
| ELEMENT | Corrosion allowance | MODIFY after exact field qualification |
| NODE NAME | Existing/blank node name | COPY subject to overwrite policy |
| RIGID | Existing rigid weight | MODIFY through qualified pointer custody |
| RESTRANT | Existing restraint code/type | MODIFY |
| RESTRANT | Existing restraint stiffness | MODIFY |
| RESTRANT | Existing restraint gap | MODIFY |
| RESTRANT | Existing restraint friction | MODIFY |
| RESTRANT | Existing connecting node | MODIFY after qualified semantic mapping |
| RESTRANT | Existing direction cosines | MODIFY after qualified semantic mapping |
| RESTRANT | Existing tag/GUID | MODIFY only after metadata policy qualification |

Writer 1A must not modify `FROM`, `TO`, `DX`, `DY`, `DZ` or connectivity.

## 8.2 Writer 1B — extended cardinality-preserving modification

Writer 1B expands the same principle to additional fixed fields and existing auxiliary records once their exact parser/writer semantics are qualified.

Planned families:

### ELEMENT extended process/weight properties

The protected writer exposes a broader element model including:

```text
T1 ... T9
P1 ... P9
insulation thickness
corrosion allowance
insulation density
fluid density
hydro pressure
```

Current Compare parsing does not yet qualify all of these fields. Writer support must follow parser/source qualification; unsupported values must not be invented.

### Conditional OD modification

OD is not permanently protected.

OD may be modified in Writer 1 when all of the following hold:

- element correspondence is approved;
- the exact OD field is qualified;
- the change does not create/remove/change reducer semantics or another auxiliary relationship;
- no pointer/cardinality change is required;
- round-trip validation proves no unrelated field changed.

If changing OD changes reducer/component semantics, defer to a later pointer-aware phase.

### New restraint in an existing owned block

A restraint block contains six fixed slots. Therefore a new restraint may be Writer 1B when:

- the TARGET node already owns the qualified RESTRANT block;
- an unused slot is available;
- the SOURCE restraint can be mapped exactly into that slot;
- the element restraint pointer is unchanged;
- the RESTRANT section row count is unchanged;
- no later pointer is re-indexed.

### Remove restraint by clearing an existing slot

This may also be Writer 1B if the authoritative empty-slot encoding is qualified and the owning block is retained.

### Existing SIF/TEE record modification

Modify an already-owned SIF/TEE record in place after full 10-row field mapping is qualified.

The following distinction is mandatory:

```text
existing record -> modify fields      Writer 1B
new SIF/TEE record                    Writer 2
delete SIF/TEE record/block           Writer 2
```

### Existing BEND record modification

Candidate properties include:

```text
bend radius
type code
bend angles/nodes
number of miters
fitting thickness
K-factor
```

The present approximate bend parser is not writer authority. Exact fixed-field mapping must be qualified first.

### Existing force/moment record modification

For an existing qualified FORCMNT record:

```text
FX FY FZ MX MY MZ
```

may be modified in place after fixed-field qualification. Creating a new record belongs to Writer 2.

### Existing displacement and other fixed auxiliary records

Potential Writer 1B families after exact section qualification include:

```text
DISPLMNT
UNIFORM
WIND
OFFSETS
ALLOWBLS
```

The presence of a section name is not sufficient authority; each field layout and ownership rule must be qualified before mutation.

## 8.3 Writer 2 — pointer/cardinality-aware auxiliary mutation

Writer 2 covers operations that change auxiliary section cardinality or require pointer/count maintenance.

Planned scope:

- create a new RESTRANT block when the target element/node has no owned block or all six slots are occupied;
- delete a RESTRANT block when block removal is required;
- create/delete SIF/TEE records;
- create/delete RIGID records;
- create/delete hanger records;
- create new FORCMNT or DISPLMNT records;
- create/delete BEND records;
- create/delete REDUCER records;
- update CONTROL/MISCEL counts where required;
- re-index every affected 1-based auxiliary pointer deterministically.

Required proof:

```text
all unaffected pointer targets before mutation
==
all unaffected pointer targets after mutation
```

A parseable file with shifted pointer ownership is a failure.

## 8.4 Writer 3 — model-structure mutation

Writer 3 is a separate qualification programme for:

```text
new node
delete node
new element
delete element
change FROM/TO connectivity
split element
merge elements
change network topology
```

These operations must not be implicitly enabled by Writer 1 or Writer 2.

---

# 9. Target Writer execution contract

The writer must never mutate a TARGET directly from a raw difference.

Required chain:

```text
SOURCE
  -> qualified correspondence
  -> engineer Decision = ACCEPT / LOCK
  -> approved Engineering Delta
  -> qualified transfer classification
  -> supported writer operation
  -> patch TARGET copy
  -> reparse modified TARGET
  -> semantic before/after proof
  -> export Modified_TARGET.CII
```

## 9.1 Apply gate

Stage 06 may be enabled only when:

- the transfer plan is preview-ready under the current plan schema;
- every selected mutation is supported by the active writer version;
- no selected operation is `BLOCKED` or unqualified;
- required correspondence is accepted/locked;
- TARGET source hash still matches the reviewed document;
- the patch can be represented without fixed-field overflow.

The status contract must be internally consistent: the apply gate must accept the actual transfer-plan ready state used by production; it must not require an unreachable status token.

## 9.2 Byte/field preservation

Writer 1 shall patch only the qualified fixed fields/rows needed for approved operations.

For every untouched field/record:

```text
before == after
```

where byte-level preservation is feasible. Where normalized rewriting is required, semantic equality must be proven and the normalization reason retained in the audit.

## 9.3 Fixed-width overflow

Before writing any numeric/string field:

- calculate formatted representation;
- verify it fits the authoritative field width;
- reject overflow;
- do not truncate engineering values;
- do not silently change precision to force a fit unless an explicit writer format rule authorizes that representation.

## 9.4 Reparse and round-trip proof

Every modified CII must be reparsed before export is considered authoritative.

For Writer 1, prove at minimum:

```text
node count        unchanged
element count     unchanged
node numbers      unchanged
connectivity      unchanged
geometry          unchanged unless explicitly included in a later qualified scope
pointer ownership unchanged
unexpected semantic delta count = 0
```

The audit must compare:

```text
expected approved delta set
vs
actual reparsed delta set
```

Any unexpected delta blocks export.

---

# 10. Parser and normalized engineering-data requirements

For every parsed family retain:

- normalized engineering fields;
- raw fixed-field row(s);
- section/record location;
- pointer/owner identity where applicable;
- parse status;
- unsupported/unresolved fields.

Known qualified custody principles already established by the programme include:

```text
RESTRANT pointer  = 1-based 24-row block index
SIF&TEES pointer  = 1-based 10-row block index
RIGID pointer     = 1-based record index
```

A future parser/writer must not collapse these into raw row-number assumptions.

---

# 11. Topology propagation requirement

A locked anchor is a seed, not merely a local comparison pair.

One-anchor correspondence must propagate through the connected graph while preserving:

1. unmatched incident frontier construction;
2. M1/M2 independent evidence;
3. one-to-one candidate assignment;
4. winner-gap acceptance;
5. edge and node custody;
6. stop-on-ambiguity behavior;
7. bounded propagation;
8. complete reachable-component reporting.

No mutation operation may repair or override an unresolved identity.

---

# 12. Benchmark qualification strategy

## 12.1 Oracle validation

Benchmark expectations must reference identities that actually exist. The benchmark runner must fail closed on invalid SOURCE/TARGET identities.

## 12.2 TARGET1 — development/qualification set

TARGET1 is used to develop/qualify the policy and writer operations.

Representative revision cases include:

- node-name changes;
- WT/OD changes;
- process-property changes;
- restraint code/gap/friction changes;
- hanger presence changes;
- SIF/tee changes;
- rigid-weight evidence;
- local geometry movement beyond M1 tolerance while M2 survives.

## 12.3 TARGET2 — blind generalization set

Once a matching/writer policy is frozen, TARGET2 is run without retuning.

TARGET2 must demonstrate that identity does not rely on:

- TARGET1 node-number offset;
- nearest-coordinate-only matching;
- OD within ±10 % as a hard identity blocker;
- WT within ±10 % as a hard identity blocker;
- identical internal edge lengths;
- every internal node remaining within ±100 mm.

## 12.4 Writer benchmarks

Writer qualification must include exact before/after cases for each supported mutation family.

At minimum, Writer 1 shall include:

- one existing restraint modification;
- one WT modification;
- one P/T modification;
- one rigid-weight modification when a real changed benchmark exists;
- one unchanged field proving no-op/KEEP behavior;
- one field-width overflow rejection;
- one stale TARGET hash rejection;
- one unsupported operation that keeps Apply blocked;
- one round-trip case with `unexpected semantic delta count = 0`.

Writer 1B shall add:

- one free-slot restraint creation;
- one restraint slot clear/remove;
- one existing SIF/TEE record modification;
- one conditional OD modification that does not alter reducer semantics.

Writer 2 shall add explicit pointer-reindexing benchmarks.

---

# 13. Required failure states

The system must prefer explicit failure over silent misclassification or partial mutation.

Required concepts include:

```text
CII_PARSE_BLOCKED
CII_FIXED_FIELD_DECODE_FAILED
CII_UNSUPPORTED_RECORD
ANCHOR_NODE_NOT_FOUND
ANCHOR_TOPOLOGY_INVALID
M1_SPATIAL_OUTSIDE_TOLERANCE
M2_GANG_INCOMPATIBLE
METHOD_A_B_DISAGREE
TARGET_CUSTODY_CONFLICT
WINNER_GAP_INSUFFICIENT
CORRESPONDENCE_UNRESOLVED
BENCHMARK_ORACLE_INVALID
TRANSFER_BLOCKED_UNRESOLVED_IDENTITY
TRANSFER_OPERATION_NOT_QUALIFIED
TARGET_DOCUMENT_STALE
CII_FIELD_WIDTH_OVERFLOW
CII_POINTER_CUSTODY_CHANGED
CII_ROUNDTRIP_REPARSE_FAILED
CII_UNEXPECTED_SEMANTIC_DELTA
```

A diagnostic must distinguish parser/format failure, correspondence failure, approval failure and writer/mutation failure.

---

# 14. Source-level architecture direction

The implementation should evolve the existing CII Workspace modules rather than replace the engine.

Expected ownership:

```text
parser/sections/elements.js
  fixed-field ELEMENT parsing qualification

parser/sections/*.js
  normalized engineering record families

tabs/cii-workspace/cii-workspace-intake.js
  qualified intake / parse-status custody

tabs/cii-workspace/cii-workspace-anchor-suggestions.js
  paired dimension-free base-anchor suggestions

tabs/cii-workspace/cii-workspace-topology-adapter.js
  canonical graph / topology identity
tabs/cii-workspace/cii-workspace-geometry.js
  spatial/registration evidence

tabs/cii-workspace/cii-workspace-evidence.js
  independent M1/M2/dimension evidence

tabs/cii-workspace/cii-workspace-candidates.js
  ranking, winner gap, ambiguity and target custody

tabs/cii-workspace/cii-workspace-propagation.js
  anchor-seeded bounded propagation

tabs/cii-workspace/cii-workspace-review.js
  engineer decisions / approval ledger

tabs/cii-workspace/cii-workspace-engineering-delta.js
  downstream engineering differences only

tabs/cii-workspace/cii-workspace-transfer-policy.js
  classify intended mutation and qualification blockers

tabs/cii-workspace/cii-workspace-transfer-plan.js
  approval-gated transfer plan

tabs/cii-workspace/cii-workspace-target-writer*.js
  future fixed-field mutation / round-trip authority

tabs/cii-workspace/cii-workspace-shell.js
  three-tab user workflow
```

The protected external writer remains a format/reference authority; the CII Workspace target writer is a separate mutation implementation and must not alter that protected source.

---

# 15. Definition of done

## 15.1 Correspondence/Compare definition of done

1. Fixed-field benchmark rows parse without geometry/OD corruption.
2. SOURCE/TARGET summaries distinguish zero from unparsed/unsupported data.
3. Base Anchor suggestions are explicit SOURCE/TARGET pairs and remain engineer-reviewed evidence.
4. Node-number offsets are not identity authority.
5. M1 Spatial and M2 Network are independently calculated and displayed.
6. OD and wall do not create identity without M1 or M2 support.
7. M1/M2 disagreement results in REVIEW.
8. One-to-one TARGET custody is enforced.
9. Ambiguous propagation stops rather than guessing.
10. Engineering deltas are generated only after identity binding.
11. Delta Approval is derived from the correspondence decision.
12. Frozen policy generalizes to TARGET2 without retuning.
13. Correspondence CSV/audit JSON retain enough evidence to explain every accepted mapping.

## 15.2 Writer 1 definition of done

1. Apply uses the actual production transfer-plan ready state.
2. Only accepted/locked and approved deltas can become writer operations.
3. Writer capability is controlled by an explicit supported-operation whitelist.
4. WT and qualified P/T fields are modifiable when record custody is preserved.
5. Existing restraint fields can be modified without pointer changes.
6. Unsupported CREATE/DELETE operations block Apply; they are not silently skipped.
7. Fixed-field overflow is rejected.
8. TARGET document hash/staleness is checked immediately before mutation.
9. Modified file reparses successfully.
10. Node count, element count, numbering, connectivity and pointer ownership remain unchanged for Writer 1.
11. Actual reparsed engineering deltas equal the approved expected delta set.
12. Unexpected semantic delta count equals zero.
13. Modified-target export is enabled only after all selected operations pass the writer gate.

## 15.3 Later-phase definition of done

Writer 2 requires independent proof of pointer/count maintenance for creation/deletion.

Writer 3 requires a separate structural-model qualification programme.

---

# 16. Product principle

For every correspondence and every proposed mutation, the engineer must be able to answer:

> **Why does the software believe these are the same piping identity, which independent method established that identity, what competing candidates existed, what engineering data changed after identity was established, who approved that correspondence, exactly which TARGET fields will change, and what round-trip evidence proves that nothing else changed?**

If the software cannot answer those questions from retained evidence, the operation is not ready for authoritative transfer.
