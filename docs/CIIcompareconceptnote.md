# CII Compare Workspace — Concept Note

**Document:** `docs/CIIcompareconceptnote.md`  
**Repository:** `reallaksh19/XML_Compare_Utilities`  
**Status:** Concept and implementation baseline  
**Direction of authority:** `SOURCE CII -> TARGET CII`  
**Primary objective:** establish defensible CII correspondence and engineering revision evidence before any target-file mutation is permitted.

---

## 1. Purpose

CII Workspace is intended to compare two CAESAR II neutral CII models when node numbers, local geometry, pipe size, wall thickness, support data, SIF/tee data, node names, weights, hangers, or other engineering attributes may differ between revisions.

The product must answer three separate engineering questions:

1. **Input qualification:** What models were loaded, were they parsed correctly, and what evidence/configuration will be used to establish correspondence?
2. **Compare review:** What SOURCE item corresponds to what TARGET item, how was that identity established, how confident is the result, and what engineering properties changed after identity was established?
3. **Transfer preview:** Given approved correspondence, what SOURCE engineering data would be proposed for transfer to TARGET, what TARGET data is protected, and what operations remain blocked?

These questions must not be mixed. A property difference is not automatically an identity failure, and a high identity confidence does not imply the revisions are engineering-equivalent.

---

## 2. Non-negotiable engineering principles

### 2.1 CII is a fixed-field engineering format

CII parsing must respect the fixed-column format emitted by the protected CII writer. For ELEMENT header rows, the canonical field widths are:

```text
[15, 13, 13, 13, 13, 13]
```

with the engineering order:

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

### 2.2 Identity and engineering difference are separate stages

The engine shall operate in this order:

```text
PARSE -> QUALIFY INPUT -> ESTABLISH IDENTITY -> REVIEW CORRESPONDENCE
      -> COMPARE ENGINEERING PROPERTIES -> APPROVE -> TRANSFER PREVIEW
```

Examples:

- A restraint code can change while correspondence remains HIGH.
- A hanger can be deleted while the supporting node correspondence remains HIGH.
- OD and wall thickness can change materially while a gang/topology identity remains defensible.
- A node can move more than the spatial tolerance while the network/topology method still establishes it as the same network location.

### 2.3 Node numbering is not identity authority

Node numbering offsets may be useful hints, but correspondence must not be implemented as:

```text
targetNode = sourceNode + constantOffset
```

The UI shall distinguish:

```text
Engineer-locked anchor: 10 -> 20010
Numbering offset hint:   +20000
```

The offset is supporting evidence only. TARGET2 exists specifically to demonstrate that a hard-coded TARGET1 numbering family is not a valid correspondence method.

### 2.4 One target has one source custody unless explicitly qualified otherwise

Correspondence must preserve one-to-one target custody. Two unrelated SOURCE identities must not silently claim the same TARGET identity.

Ambiguity must remain visible and block automatic propagation or transfer.

### 2.5 Method disagreement is evidence, not a score to average away

Spatial and network methods run independently. If they point to different TARGET candidates, the result is `REVIEW`, not the numeric average of two scores.

---

## 3. Product information architecture

CII Workspace will have **three permanent top-level tabs**.

```text
1. Inputs & Match Basis
2. Compare Review
3. Transfer Preview
```

The top-level state should remain visible at all times, for example:

```text
[1 Inputs & Match Basis  READY]
[2 Compare Review        37 HIGH · 4 MED · 1 REVIEW]
[3 Transfer Preview      BLOCKED]
```

The visual language should take cues from the existing XML Compare / Revision Compare experience rather than create a separate design system.

---

# 4. Tab 1 — Inputs & Match Basis

## 4.1 Purpose

Tab 1 answers:

> Do I trust the SOURCE and TARGET inputs, and what matching basis will be used?

It must contain no target mutation controls.

## 4.2 SOURCE and TARGET intake

Present SOURCE and TARGET side-by-side with explicit direction:

```text
SOURCE CII                         TARGET CII
BM_CII_SOURCE.CII       ->         BM_CII_TARGET1.CII
READY                              READY
```

Each side should show:

- file name;
- content hash / SHA-256;
- detected CII version, when available;
- parse status;
- parser warnings/errors;
- unsupported/unparsed section warnings.

`0` and `NOT PARSED` must not be conflated. For example, if hanger parsing has not been implemented, display `NOT PARSED`, not `0 hangers`.

## 4.3 Model overview

Provide a SOURCE/TARGET/delta summary grouped by engineering meaning.

### A. Topology

- nodes;
- elements;
- connected components;
- terminal nodes;
- branch nodes;
- bends;
- rigid elements/components.

### B. Mechanical data

- restraint nodes;
- restraint records;
- hangers;
- SIF/tee records;
- weight/rigid data;
- named nodes.

### C. Pipe/process data

- unique ODs and OD range;
- unique wall values and wall range;
- parsed pressure/process sets;
- parsed temperature/process sets;
- line numbers and count.

### D. Parse/quality data

- malformed fixed-field rows;
- unsupported sections;
- unresolved numeric fields;
- duplicate/custody warnings;
- disconnected-network warnings.

For high-cardinality properties such as line number, OD, and process sets, display a count and a `View`/drawer instead of expanding all values on the landing page.

## 4.4 Base anchor

Anchor input shall use explicit SOURCE/TARGET pairs:

```text
SOURCE node 10  -> TARGET node 20010
```

The system must validate:

- SOURCE node exists;
- TARGET node exists;
- both have graph/topology records;
- any proposed anchor is distinguishable from a numbering-offset hint.

Suggested landmarks remain evidence only until an engineer locks them.

## 4.5 Numbering offset hint

A separate optional control may show or accept a detected numbering offset:

```text
Numbering offset hint: +20000
```

This may help rank or explain candidates but must never create identity on its own.

## 4.6 Matching configuration

Expose the matching mode explicitly:

```text
AUTO — Spatial + Network
M1   — Spatial / Coordinate
M2   — Network / Gang
```

Default policy baseline:

```text
Spatial tolerance       ±100 mm      weight 50
Pipe OD tolerance       ±10 %        weight 30
Wall tolerance          ±10 %        weight 30
Winner gap              8
```

Weights are evidence weights, not permission to create identity from OD/wall alone.

Advanced safeguards:

- one TARGET identity per SOURCE custody;
- stop propagation on ambiguous correspondence;
- require M1 or M2 identity evidence before dimension evidence can support a match;
- flag M1/M2 disagreement;
- retain raw SOURCE/TARGET evidence;
- expose alternative candidates and winner gap.

Primary action:

```text
Compare models ->
```

---

# 5. Correspondence methods

## 5.1 M1 — Spatial / Coordinate correspondence

M1 asks:

> Is the SOURCE identity still physically at approximately the same spatial location in TARGET?

Primary identity evidence is 3D spatial distance, not independent per-axis windows.

For SOURCE position `S` and TARGET candidate `T`:

```text
distance = sqrt((Tx-Sx)^2 + (Ty-Sy)^2 + (Tz-Sz)^2)
```

M1 identity passes only when the registered/unregistered spatial policy being used is itself qualified and:

```text
distance <= spatialTolerance
```

OD and wall are secondary identifying dimensions:

```text
OD relative delta   <= configured tolerance
WT relative delta   <= configured tolerance
```

OD/WT alone shall never create M1 identity.

## 5.2 M2 — Network / Gang correspondence

M2 asks:

> Does this SOURCE item occupy the same structural position in the connected piping network, even if intermediate local geometry changed?

The gang signature is topology-led. It may include:

- ordered node-degree sequence;
- branch/terminal relationship;
- ordered structural component sequence;
- edge count;
- connected span between structural landmarks;
- total path length;
- end-to-end vector where applicable;
- neighbouring gang signatures;
- anchored relative position in the network.

OD and wall thickness must **not** be embedded in the gang identity token when they are separately scored as OD/WT evidence. Otherwise size changes are double-counted as topology changes.

Internal element lengths/node stations may be secondary evidence, but must not defeat a gang whose total network identity is conserved after local redistribution.

## 5.3 M1/M2 fusion

The methods are independent and their agreement is itself evidence.

| M1 Spatial | M2 Network | Interpretation | Final identity state |
|---|---|---|---|
| PASS | PASS | strong independent agreement | HIGH candidate |
| PASS | FAIL | spatially plausible but network identity conflicts | REVIEW |
| FAIL | PASS | same network identity but geometry moved | MEDIUM candidate |
| FAIL | FAIL | identity not established | UNRESOLVED |
| A -> X | B -> Y | methods disagree on TARGET | REVIEW |

Dimension changes may lower confidence from HIGH to MEDIUM under the approved policy, but they are also retained as explicit engineering deltas.

## 5.4 Evidence scoring

The requested evidence baseline is:

```text
Identity evidence (spatial or gang)  50
OD compatibility                     30
Wall compatibility                   30
Total                                110
```

A normalized score may be displayed, but score cannot override hard logic gates.

Example normalized evidence score:

```text
score = 100 * earnedWeight / totalWeight
```

Recommended baseline thresholds for qualification:

```text
HIGH    >= 82, identity supported, no M1/M2 contradiction
MEDIUM  >= 45, identity supported, no custody contradiction
REVIEW  method disagreement, insufficient winner gap, or custody ambiguity
UNRESOLVED no qualified identity method
```

The exact thresholds are policy and require benchmark qualification; they are not format truths.

---

# 6. Tab 2 — Compare Review

## 6.1 Purpose

Tab 2 answers:

> What corresponds to what, why, how certain is it, and what changed after correspondence was established?

The tab borrows the review philosophy of XML Compare Candidate Review and Revision Compare Executive Summary but remains a single CII compare workspace rather than adding another nested three-tab product.

## 6.2 Section 1 — Executive Summary

Display at minimum:

- SOURCE/TARGET filenames;
- source/target node and element totals;
- HIGH/MEDIUM/REVIEW/UNRESOLVED counts;
- matched, missing, inserted and unresolved identities;
- engineering-change count by family;
- accepted/rejected/locked correspondence counts.

Example engineering families:

- geometry/location;
- OD;
- wall thickness;
- restraint type/code;
- restraint gap/friction;
- hanger;
- SIF/tee;
- node name / to-name;
- weight/rigid data;
- line/process data where qualified.

## 6.3 Section 2 — Correspondence Review

Primary grid columns:

```text
Status | Source | Target | M1 Spatial | M2 Gang | OD | WT |
Confidence | Engineering Changes | Decision
```

Filters:

- All / HIGH / MEDIUM / REVIEW / UNRESOLVED;
- changed only;
- engineer action required;
- line number;
- change family;
- identity kind (node/element/gang/component).

Search must support node, element, gang, and line identifiers.

## 6.4 Evidence inspector

Selecting a row opens detailed evidence:

### Correspondence

- final confidence;
- selected SOURCE/TARGET;
- M1 result, distance and tolerance;
- M2 result and topology/gang evidence;
- OD evidence;
- wall evidence;
- winner gap;
- alternative candidates;
- target-custody result.

### Engineering changes

Show SOURCE, TARGET and delta/semantic change for every qualified property family.

### Decision

- Accept;
- Reject;
- Lock correspondence;
- leave in Review.

A reviewer must be able to distinguish:

```text
Identity confidence = HIGH
Engineering change  = restraint code changed
```

from:

```text
Identity confidence = MEDIUM
Engineering change  = location shifted 200 mm
```

## 6.5 Engineering Delta Grid

After identity is bound, calculate revision deltas. Suggested columns:

```text
Source | Target | Category | Property | Source value | Target value |
Delta / semantic change | Evidence status
```

Engineering delta logic must not mutate correspondence identity after the fact unless the property is explicitly classified as an identity feature under the matching policy.

---

# 7. Tab 3 — Transfer Preview

## 7.1 Purpose

Tab 3 answers:

> Given approved correspondence, exactly what would be written into TARGET?

Initial implementation is a placeholder/preview only.

Current architecture intentionally blocks authoritative modified-target export. This safety boundary must remain until transfer logic has its own qualification programme.

## 7.2 Transfer family selection

Future selectable transfer groups may include:

- restraints / gaps / friction;
- hangers;
- SIF / tee data;
- node names;
- weight / rigid data;
- selected qualified process metadata.

Geometry, OD, wall thickness and other model-defining TARGET properties should remain protected by default unless a future transfer specification explicitly authorizes them.

## 7.3 Preview grid

```text
Action | Source | Target | Property | Target before |
Proposed target | Status / blocker
```

Possible actions:

- `COPY`;
- `CREATE`;
- `DELETE`;
- `KEEP`;
- `BLOCKED`.

The UI should show:

- planned operation count;
- protected difference count;
- blocked operation count;
- unresolved correspondence blockers;
- exportable transfer-preview evidence.

`Apply to target CII` remains disabled until mutation authority is separately implemented and qualified.

---

# 8. Parser and normalized engineering-data requirements

## 8.1 Fixed-field parser qualification

The immediate P0 parser requirement is to decode fixed-width ELEMENT rows using writer-authoritative field widths.

Example row:

```text
    255.000      260.000         0.000000-0.488281E-03 -271.602         60.30000
```

must decode to:

```text
FROM = 255
TO   = 260
DX   = 0
DY   = -0.000488281
DZ   = -271.602
OD   = 60.3
```

A whitespace-split parser that reads OD as zero is invalid for this format.

## 8.2 Normalized engineering record custody

For every parsed CII family, retain:

- normalized engineering fields;
- raw fixed-field row(s);
- source section/record location where practical;
- parse status;
- unsupported/unresolved fields.

For restraint records, preserve the exact numeric restraint code until an authoritative CAESAR mapping for each code is implemented and qualified. Do not infer unsupported semantics from incomplete code maps.

Example normalized restraint evidence:

```text
node
restraintCode
stiffness
gap
friction
rawFields
rawRow
```

---

# 9. Topology propagation requirement

A locked anchor is a seed, not merely a local comparison pair.

For one-anchor workflows, correspondence must be able to propagate through the connected graph while preserving safeguards:

1. start at a locked SOURCE/TARGET pair;
2. enumerate unmatched incident candidates;
3. score M1 and M2 independently;
4. solve one-to-one candidate assignment;
5. require identity support;
6. require winner-gap/custody acceptance;
7. stop at ambiguous correspondence;
8. enqueue only accepted neighbour pairs;
9. continue across the connected network.

The current one-anchor local incident comparison is insufficient to identify remote benchmark locations such as the 205 or 250-270 regions without additional locked anchors.

---

# 10. Benchmark qualification strategy

## 10.1 Benchmark oracle must be validated first

Before tuning the engine, benchmark expectations must reference identities that actually exist in the benchmark files.

Known items requiring explicit oracle cleanup/confirmation include:

- `10 -> 20000` must be treated as an offset concept if `20000` is not an actual TARGET node; the corresponding anchor would be `10 -> 20010` where applicable;
- the restraint benchmark described as `30 -> 20130` must be checked against the actual network; current model evidence indicates `130 -> 20130` is the likely intended pair;
- any expected `50 -> 20050` identity must be validated because the current benchmark may not contain those literal nodes.

The benchmark runner shall fail fast with `BENCHMARK_ORACLE_INVALID` if an expected SOURCE or TARGET identity does not exist.

## 10.2 TARGET1 — development/qualification set

TARGET1 is used to implement and tune the policy.

Expected behaviour includes cases such as:

- exact/near-exact spatial correspondence with engineering property changes;
- node-name/to-name changes without identity loss;
- OD and wall changes where network identity remains defensible;
- node 205 region where local position changes beyond ±100 mm but gang identity remains;
- restraint/hanger changes after identity;
- weight changes after identity.

## 10.3 TARGET2 — blind generalization set

Once TARGET1 policy is frozen, TARGET2 is run without retuning.

TARGET2 must demonstrate that the implementation does not rely on:

- TARGET1 node-number offset;
- nearest-coordinate-only matching;
- OD being within ±10 % as a hard identity blocker;
- wall being within ±10 % as a hard identity blocker;
- every internal edge retaining the same length;
- every internal node remaining within ±100 mm.

A critical gang case is the 250-255-260-270 region where internal leg lengths can redistribute while total span/topology remains consistent. M2 should retain network identity when supported by the full gang evidence.

---

# 11. Required failure states

The system must prefer explicit failure over silent misclassification.

Required states/codes should include the following concepts:

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
TRANSFER_MUTATION_NOT_IMPLEMENTED
```

A diagnostic must distinguish format/parser failure from engineering mismatch.

---

# 12. Source-level architecture direction

The current CII Workspace orchestration already has useful separations for intake, topology adaptation, geometry qualification, path audit, candidate scoring, custody gating, component correspondence, identity binding, review, transfer preview and evidence export.

The implementation should evolve these modules rather than replace the entire engine.

Expected source ownership:

```text
parser/sections/elements.js
  fixed-field ELEMENT parsing qualification

parser/sections/*.js
  normalized engineering record families

tabs/cii-workspace/cii-workspace-intake.js
  qualified intake / parse-status custody

tabs/cii-workspace/cii-workspace-topology-adapter.js
  canonical network graph, topology-only gang tokens

tabs/cii-workspace/cii-workspace-geometry.js
  spatial/registration evidence

tabs/cii-workspace/cii-workspace-evidence.js
  independent M1/M2/dimension evidence

tabs/cii-workspace/cii-workspace-candidates.js
  ranking, winner gap, ambiguity and target custody

tabs/cii-workspace/cii-workspace-topology.js
  gang/path comparison and anchor-seeded propagation

tabs/cii-workspace/cii-workspace-review.js
  engineer decisions / review ledger

tabs/cii-workspace/cii-workspace-transfer-plan.js
  preview only until transfer qualification

tabs/cii-workspace/cii-workspace-shell.js
  replace current long-form shell with the three-tab UI
```

The existing audit boundary that reports modified TARGET CII export as blocked is retained until a later transfer implementation phase.

---

# 13. Definition of done for CII Compare

CII Compare correspondence is considered qualified only when all of the following are true:

1. Fixed-field benchmark CII rows parse without geometry/OD corruption.
2. SOURCE and TARGET summaries distinguish zero from unparsed/unsupported data.
3. Anchor input and numbering-offset hints are separate concepts.
4. M1 Spatial and M2 Network are independently calculated and displayed.
5. OD and wall do not create identity without M1 or M2 support.
6. M1/M2 disagreement results in REVIEW.
7. One-to-one TARGET custody is enforced.
8. Ambiguous propagation stops rather than guessing.
9. Engineering deltas are generated only after identity binding.
10. TARGET1 regression expectations pass after benchmark-oracle validation.
11. The frozen policy generalizes to TARGET2 without retuning.
12. Tab 1, Tab 2 and Tab 3 each expose their own custody state.
13. Transfer remains preview-only until a separately approved mutation phase is qualified.
14. Correspondence CSV and audit JSON preserve the evidence required to explain every accepted mapping.

---

# 14. Product principle

The CII Workspace should make the engineer able to answer, for every correspondence:

> **Why does the software believe these are the same piping identity, which independent method established that identity, what competing candidates existed, and what engineering data changed after the identity was established?**

If the software cannot answer that question from retained evidence, the correspondence is not ready for authoritative transfer.
