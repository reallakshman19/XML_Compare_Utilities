# CIIFR VNext — Engineering Property Mapping & Transfer

**Full Concept Note and Functional Specification**  
**Two governed paths:** Node → Element → Data Transfer | Node → Data Transfer  
**Document ID:** CIIFR-PROPERTY-MAP-CN-01  
**Revision:** 1.0 — Design candidate, 28 October 2026  
**Status:** CONCEPT / REQUIREMENTS BASELINE; **NOT** an approval to mutate CII engineering data or release an exported model.

## Executive decision

Build **one auditable SOURCE→TARGET correspondence and transaction framework** with **two different property-resolution paths**, not a universal node-based replace function:

1. **Node → Element → Data:** Identify an *oriented piping element* through its exact `FROM` and `TO` numeric node IDs, then resolve that element's process, geometry, material, insulation, rigid and element-attached auxiliary properties. A shared endpoint node is a navigation aid, **not** an instruction to change every incident element.
2. **Node → Data:** Identify a *logical node* through its numeric ID, then resolve its name aliases and individual node-attached records: restraints, imposed displacements, applied forces/moments, spring/equipment connections and connecting-node relationships. A node can have several distinct property occurrences and owners; it is **not** one universal property row.

Both paths use immutable SOURCE and TARGET0 files, a version-qualified field catalog, explicit correspondence evidence, typed proposal records, reviewed decisions, independent byte-level postimage validation, and a new TARGET1 copy. The common mapping machinery is reusable; each property family's physical reader, semantics, validation and writer authority remains separately qualified.

**Priority:** a common read-only index and two parallel P1 panels (**Restraints** and **Process Conditions**), followed by tightly bounded existing-slot edits. New/deleted auxiliary blocks and element insertions are later structural transactions. No application revamp, no bypass of current writer authority, and no automatic promotion of low-confidence matches.

## 1. Owner intent, scope and non-goals

### 1.1 Owner intent

- Extend the existing CII Find & Replace VNext standalone application from numeric node-name transfer to **auditable engineering property comparison, transfer and repair**.
- Support both **element-owned** properties accessed via `FROM → TO` and **node-specific** properties accessed via a numeric node.
- Make Restraints the first node-specific priority; make Process Conditions a parallel first element-property priority. Include rigids, displacements, forces/moments, material, geometry and remaining typed auxiliaries in a complete expandable catalog.
- Provide an **actionable outcome**, not merely a list of findings. Every resolvable finding should show a qualified proposed change, and every non-automatic case must give a specific manual-review route, with refreshed validation after any manual decision.
- Maintain immutable original input and exact-file evidence. Correct CONTROL, ELEMENTS, AUX_DATA, MISCEL_1, UNITS and COORDS relationships as one transaction when changes require it.
- Reuse existing Geometry A/B/C correspondence evidence, Node Name transfer, Element workstream and native parsers where qualified; avoid parallel writers, redesigns and duplicate test oracles.

### 1.2 Included

- Version-specific neutral-file physical indexing; actual owner/type identification; SOURCE→TARGET node, element and auxiliary-occurrence mapping.
- Exact typed field comparison, units and case qualification, audit-only versus edit-eligible findings, single and bulk proposals, approval, export as new copy.
- Existing record field edits where independently qualified; later element/auxiliary insert-delete and dependent COUNT/MISC updates.
- Manual mapping corrections, conflict resolution, explicit hold codes, independent postimage/re-import checks.

### 1.3 Excluded without separately approved work packs

- Automatic inference of engineering equivalence from identical node names, node numbers, element ordinals or geometry alone.
- Global or uncontrolled string replacement of CII numeric fields; direct overwrite of TARGET0; silent editing of a production tile.
- Treating input FORCMNT as computed reaction loads or CII source input as proof of stress-analysis results.
- Replacing existing Geometry, Material or RIGID workstreams; self-approval; claiming a byte-valid file is engineering-valid.
- Automatic changing of material databases, design code, load cases, coordinates/axis conventions or equipment load limits as a side effect of a local property transfer.

## 2. Terminology and identity rules

| Term | Exact meaning | Important consequence |
|---|---|---|
| Numeric node | An integer node identifier **within one specific CII** | Same number in different models does not prove same physical node. |
| FROM / TO | Stored oriented endpoints of one ELEMENTS record | Defines element orientation, **not necessarily actual fluid-flow direction**. |
| Element | One record comprising version-specific physical REAL, text and integer/pointer cards | `FROM,TO` may be repeated; element occurrence/discriminator is needed. |
| Occurrence | One physical appearance of a field or attachment with byte address | Several occurrences may represent a single logical node or engineering attachment. |
| Auxiliary pointer | ELEMENTS-local one-based index into a **typed** auxiliary record family; `0` means no associated record | A pointer number is neither a global node number nor transferable unchanged across models. |
| Node-attached property | Property whose engineering referent is a node, even if its physical storage is reached through an element pointer | Must resolve node identity **and** attachment/record identity. |
| Element-owned property | Property belonging to one exact piping element, not to every incident node | Requires qualified element correspondence and case/field selection. |
| SOURCE | Read-only source of proposed engineering values and correspondence evidence | No writes to SOURCE. |
| TARGET0 | Byte-immutable target file that will be changed only via new-copy proposal | Every plan and validation bound to SHA-256. |
| TARGET1 | New CII output from approved and independently validated transaction | Never considered qualified by an in-app parse alone. |
| Stored / effective | Raw neutral-file lexeme/value versus value interpreted using model settings/material/load-case context | An exact numeric match can still have different engineering meaning. |
| Qualified match | Independently supported SOURCE→TARGET identity proof, not a resemblance score | Only qualified identity may pass to write eligibility. |

### 2.1 Minimal identity keys

**Node:** `(fileSHA, numericNode)`.

**Element:** `(fileSHA, elementOrdinal, FROM, TO, orientation, physicalRecordWitness)`; the ordinal is a **local address**, never a cross-file match by itself.

**Typed auxiliary occurrence:** `(fileSHA, ownerElementOrdinal, auxiliaryFamily, pointerValue, blockIndex, slotOrDOF, nodeOrEndRef, fieldAddress)`.

**Process field:** `(fileSHA, elementOrdinal, propertyCode, operatingSetIndex, physicalFieldAddress, unitsContext)`.

**Material map:** `(sourceMaterialDefinition, targetMaterialDefinition, code/edition/temperature basis, element identity)`; copying numeric RRMAT IDs alone is not sufficient.

## 3. Two transfer paths: essential differences

| Dimension | A. Node → Element → Data | B. Node → Data |
|---|---|---|
| Entry | Select a `FROM → TO` pair or click a node and then choose an incident element | Select numeric node and all qualified node-specific occurrences |
| Primary owner | **Element** | **Logical node + physical occurrence** |
| Typical fields | T1–T9, P1–P9, OD, WT, CA, geometry, fluid density, material, insulation; rigid element properties | NodeName, restraints, imposed displacement, applied force/moment, applicable node attachments |
| Cross-file identity | Directed endpoint mapping + element/topology discriminator | Node mapping + exact owning element/aux pointer/slot association |
| Source/TARGET cardinality | One-to-one, one-to-many subdivision, many-to-one consolidation possible | One node can have many aliases/attachments; each occurrence needs identity |
| Direction concern | Reversed orientation may swap endpoint-specific fields and invert directional vectors | DOF, direction cosine, connecting node, coordinate axes and load-set alignment |
| Direct write | Typed existing ELEMENTS field if qualified | Typed node-name/auxiliary field **only** if its writer family is authorized |
| Typical HOLD | Ambiguous parallel element, different line/case/units, unproven material | Shared pointer, missing attachment, conflicting DOF, unknown CNode, duplicate name |

### 3.1 Correct oriented example (illustrative only)

```text
SOURCE                              TARGET0
E12: FROM 400 ----> TO 500         E29: FROM 840 ----> TO 850
     T1 = 200 C                          T1 = 80 C
     P1 = 30 bar                         P1 = 10 bar

Qualified node map: 400 -> 840; 500 -> 850
Qualified element map: SOURCE E12 -> TARGET E29
Permitted proposal: TARGET E29.P1 := SOURCE E12.P1 (after unit/case checks).
NOT permitted: propagate P1 to every other element incident to node 850.
```

A separate target `850 → 840` is potentially the **same physical element in reversed stored orientation**, but scalar and end-dependent/vector properties need different transfer rules. Reversal is a reviewed transformation, not an automatic match.

### 3.2 Node-specific example (illustrative only)

```text
SOURCE node 500                 TARGET node 850
  Owner E12, RESTRANT ptr 3      Owner E29, RESTRANT ptr 9
  Slot/DOF 2: CNode 700         Slot/DOF 4: CNode 970

Verified node map includes 500 -> 850 and 700 -> 970;
verified attachment/DOF map is required before copying stiffness/gap/type.
Pointer 3 is NOT copied as pointer 9. Either pointer is a local index.
```

## 4. SOURCE→TARGET correspondence algorithm

### 4.1 Phased graph and occurrence mapping

1. **SOURCE and TARGET0 intake.** Verify byte SHA-256, embedded CII version, legal section markers, card widths, counts, content limits, units, IZUP, model/options and required ancillary sections. Record source custody. Build independent immutable indexes.
2. **Candidate numeric-node correspondence.** Start with explicitly reviewed mapping, qualified Geometry A/B/C outcomes, or independent geometry/topology evidence. Track both direction and evidence; do not infer equivalence from an existing name alone.
3. **Element correspondence.** For each source element, resolve the source FROM/TO through the accepted node map and locate TARGET element(s). Check orientation, geometry, OD/WT/line/branch witness and component classification. Distinguish duplicate parallel segments and subdivisions. Do not choose by first match or ordinal.
4. **Attachment correspondence.** Follow each source and target element's **typed** pointer to candidate records, then qualify node, slot/DOF, attachment type, tag/GUID (when reliable) and connecting references. Flag many-to-many/competing ownership.
5. **Field correspondence.** Match exact property code (e.g., `ELEMENTS.PRESSURE_1`, `RESTRANT.GAP`), case index, semantics and dimensional units, plus compatible target physical span.
6. **Confidence and decision.** Distinguish `QUALIFIED`, `AMBIGUOUS`, `NO_MATCH`, `INCOMPATIBLE`, `UNKNOWN`; only `QUALIFIED` may become `AUTO_ELIGIBLE`, and only after field-specific semantics prove safe.
7. **Freeze and audit.** Bind complete plan to SOURCE/TARGET0 SHA, mapping revision, model policy revision and field catalog edition; any of these changes revokes decisions.

### 4.2 Cardinality rules

- **1:1 element:** eligible for typed field proposal if identity/case/units all pass.
- **1:N element subdivision:** default `MANUAL_REQUIRED`; spreading one source process value to N targets is not automatic until explicit line/segment policy and all target elements are proven intended owners. End-dependent properties require per-segment mapping.
- **N:1 consolidation:** default `HELD` if source values or attachment locations disagree; never select an arbitrary source value.
- **Parallel/repeated FROM–TO:** require an additional element discriminator (geometry, branch label, physical orientation, component type, accepted anchor); identical endpoint pair is insufficient.
- **Disconnected/reused numeric IDs:** fail cross-file identity unless mapped and physically consistent.
- **Unmapped connecting nodes:** restraint or hanger link remains held even if primary restraint node maps.

### 4.3 Match ledger

Every mapping row shall retain `sourceRef`, `targetRef`, `method`, `evidence`, `confidence`, `candidateAlternatives`, `conflictGroup`, `reviewerDecision`, `generation`, `SHA`, `catalogVersion` and `status`. Do not erase rejected candidates; export them in a complete separate review ledger.

## 5. Version-qualified CII data model

### 5.1 Neutral-file sections and access

| Section | Function | Proposed handling |
|---|---|---|
| VERSION / metadata | Embedded neutral-file version and flags | Mandatory field catalog selection; no automatic migration. |
| CONTROL | NUMELT, NUMNOZ, NOHGRS, NONAM, NORED, NUMFLG and auxiliary counts/IZUP | **Recalculate from complete proposed postimage**; fail if inconsistent. |
| ELEMENTS | 53 REAL entries, labels and 15 currently used typed auxiliary pointers per element (version-qualified) | Treat as oriented element records and pointer ownership table. |
| AUX_DATA families | NODENAME, BEND, RIGID, RESTRANT, DISPLMNT, FORCMNT, EXPJT, SIF/tees, etc. | Typed per-family cardinality, parser, recorder and pointer resolver. |
| MISCEL_1 | RRMAT per ELEMENT, nozzle/hanger arrays and execution options | Maintain index alignment and preserve unrelated context. |
| UNITS | Conversion constants, labels and temperature offset | Establish typed dimensional conversion; never compare raw numbers across different units. |
| COORDS | Optional starting coordinates of discontinuous segments | Validate mapped global frame/positions where supplied; preserve unless explicitly in scope. |

Hexagon states `#$` is in **columns 1–2**, and the section identifier controls sequencing. Version-specific layouts/mandatory sections must be checked against the actual edition. The common parser may be more permissive for read-only diagnostics; **writer admission fails closed** on unrecognized/malformed forms. [S1][S2]

### 5.2 ELEMENTS and pointers

The neutral-file basic-element definition contains 53 REAL inputs and fifteen used integer pointers (a larger internal array exists). Key REAL entries include FROM, TO, DELTA XYZ, OD, thickness, insulation, CA, T/expansion entries, pressure entries, density, moduli and other properties. Text cards include name and line number. Every record must be re-parsed using the exact supported physical version; do not transplant field offsets from an incompatible edition. [S3]

**Typed pointer slots:** bend (1), rigid (2), expansion joint (3), restraint (4), displacement (5), force/moment (6), uniform load (7), wind/wave (8), offset (9), allowable (10), intersection/SIF (11), node name (12), reducer (13), flange (14), nozzle/equipment check (15). `0` = absent family reference, not an address. Each positive pointer is checked only in its own family. [S3]

### 5.3 Actual V14 specimen evidence / limitations

The existing CIIFR read-only evidence register reports an Owner-supplied `GLRD-SYS-20-10.CII` with SHA-256 `5715c23f250d683a6c29ba84c2db9f01aae25788791317b99064c845bc2cdd57`, 803,776 bytes, 521 elements (15 cards each), 511 distinct endpoint nodes, 177 NODENAME blocks, 156 RIGID, 122 RESTRANT, 6 DISPLMNT and 0 FORCMNT. A node-property prototype identified 331 populated restraint slots, but these are **previously reported physical-custody findings, not new independent verification in this note**. [P1]

In this same reported physical file, MISCEL_1 has 87 material-array rows for 521 elements and four additional rows. Those four rows **must not be edited or assumed to be a fully decoded execution-option set** without source-backed position/meaning verification. No positive actual FORCMNT case exists in this specimen; qualified force/moment transfer requires a separate positive fixture.

## 6. Complete property catalog and ownership

| Family | Example property fields | Primary owner / entry path | Initial writer gate |
|---|---|---|---|
| Node identity/name | NodeName FROM/TO, blank aliases | Node → every incidence and NODENAME pointer | Existing merged Nodal writer is a pattern only; exact-head external acceptance pending. |
| Restraints (P1) | Type, restraint node, stiffness, gap, friction, CNode, direction cosines, support tag/GUID | Node → owning ELEMENT → RESTRANT pointer → specific DOF | Read-only first; existing-slot numeric edit separately qualified; type/CNode/tag structural changes held. |
| Process (P1) | T1–T9 or expansion entries; P1–P9; fluid density; hydrotest pressure | Oriented FROM→TO element → indexed REAL field/case | T1 semantics HOLD; P1/density source-trace PARTIAL; unit/case qualification required. |
| Geometry | DELTA XYZ, actual OD, WT, CA, element orientation | FROM→TO element | Position/units/topology orientation must be qualified. |
| Material | RRMAT material ID, E, ν, densities, alpha, allowable stresses | Element + MISCEL_1 position + material definition | No copying of raw material IDs without code/material equivalence. |
| Insulation/cladding | Thickness, density, weight/length, refractory | Element | Qualified field width + weight semantics. |
| Rigids | Weight, rigid type | FROM→TO element → RIGID pointer | Reuse Element WBS4; type/zero semantics currently held. |
| Displacements | Imposed translational/rotational components, sets | Node + DISPLMNT pointer + specification/case | `9999.99` means free/unspecified; not zero. |
| Forces/moments | Applied FX/FY/FZ, MX/MY/MZ, sets | Node + FORCMNT pointer + specification/case | Actual GLRD lacks positive FORCMNT; new original-positive test required. |
| Hangers/springs | Hanger node/CNode, rate, cold/hot loads, travel, tags/GUID | Node attachment plus MISCEL_1 hanger arrays | Cross-record array and load-case mapping; structural change separate. |
| Nozzles/equipment | Flexible nozzle nodes, vessel geometry, stiffness, limitations | Node/equipment identity + MISCEL_1 or EQUIPMNT | Coordinate and model-level equipment identity qualification. |
| Bends / SIFs / tees | Bend radius, intermediate nodes, tees, intensification/flexibility | Oriented element + typed auxiliary + intersection node | Topology and orientation-aware. |
| Reducers / expansion joints | End diameters/thicknesses, taper; bellows stiffness | Oriented element + typed auxiliary | End swapping and units/type compatibility. |
| Offsets / uniform / wind / wave | Endpoint offsets, uniform-load vectors, wind parameters | Element + auxiliary + case/frame | Direction/orientation transformation and load-case proof. |
| Flanges / allowables | Flange and stress check data | Element + aux + global code | Code edition and limit-context authority. |
| Global/cases | IZUP, UNITS, options, density multipliers, analysis load-case definitions | Whole model | Independent model-wide change transaction; never implicit in local patch. |

**Critical category distinction:** Restraint *input* and FORCMNT *input* are not output reactions; an analysis solver's computed restraints, stresses and displacement results need an entirely different results provenance.

## 7. Path A specification — Node → Element → Data

### 7.1 User workflows

- **Mode A1 (direct edge):** Enter or select `FROM,TO`, then select a uniquely qualified element occurrence. Allow `FROM,TO,ElementWitness` CSV; show duplicates as options.
- **Mode A2 (node navigation):** Enter a node, inspect **all incident elements** labeled `FROM` or `TO` end, choose target element(s), then choose the property group and case.
- **Mode A3 (accepted correspondence):** Use an independently approved SOURCE→TARGET element map from the Geometry A/B/C workbench; allow only mapped elements to be proposed.

### 7.2 Resolution and proposal

For each candidate source element and its corresponding TARGET element:

1. Confirm correct SOURCE/TARGET files and hashes, node-map generation and element correspondence.
2. Determine orientation (`SAME`, `REVERSED`, `UNKNOWN`) and cardinality (`ONE_TO_ONE`, `SUBDIVIDED`, `CONSOLIDATED`, `AMBIGUOUS`).
3. Resolve exact target field catalog entry and physical span; identify operating set, material reference and dimensional unit.
4. Decide whether data is scalar, vector, end-dependent or contextual. For `REVERSED`, scalar process values may be possible after independent proof; end-dependent or directional values are held until correct transform.
5. Compare stored and qualified effective SOURCE/TARGET values; preserve raw lexemes.
6. Emit typed proposal with exact byte span and semantic checks; if no actual change, emit `NO_OP`.
7. Present approval at per-element/per-field level; bulk approval allowed **only** for a complete mutually compatible, conflict-free selected set.

### 7.3 Process-specific rules

- T1–T9 may be temperature or thermal expansion entries; field number alone does **not** establish use. Preserve material expansion and load-case meaning.
- P1–P9 must be associated with the correct operating set and dimensional units; do not equate P1 automatically with design or hydrotest pressure.
- Fluid density can have effective-case multipliers; present raw and effective values separately. No implicit update of model-level multipliers.
- Material ID in ELEMENTS/MISC must resolve target material definition and code. A numeric ID such as `3` is local and not sufficient.
- OD/WT/CA and geometry edits have downstream mass/stiffness/stress implications. Product may show a qualified lexical patch candidate but shall not call it engineering-equivalent without solver evidence.

### 7.4 Element transfer acceptance

- 1:1 SOURCE/TARGET element mapping proven; endpoint relation and orientation supported; no hidden duplicate edge.
- Field name/version/type supported; exact span and width proven; numeric formatting fits with no unauthorized rounding.
- Units/case semantics and pressure/temperature distinction qualified.
- No other target element changed unless explicitly selected and independently qualified; sibling incident elements remain untouched.

## 8. Path B specification — Node → Data

### 8.1 Node data is not a single physical table

A numeric node may be mentioned in many ELEMENTS FROM/TO cards and auxiliary records. NodeName itself is stored as per-element paired names through NODENAME pointers; restraints include an explicit restraint-node field and may reference a distinct connecting node. Other record families may contain multiple node references or sit in MISCEL_1. The UI's Node view must group logical node occurrences **without flattening their distinct engineering ownership**.

### 8.2 NodeName

- Use exact valid positive TARGET0 node ID; inspect all FROM/TO incidences and resolved NODENAME fields; accept optional informational `Find` only for audit.
- Partial alias changes, shared unsupported pointers and name conflicts remain held. Existing merged PR203 is a code baseline, but separate engineering acceptance and writer exception under issue #139 are outstanding.

### 8.3 Restraints (first priority)

- Resolve `ELEMENTS` restraint pointer #4 → RESTRANT block → six DOF slots. Each V14 restraint block has **24 physical lines**: 6 × (two numeric + Tag + GUID). Explicit fields include restraint node, type (vendor listed 1–62), stiffness, gap, friction, CNode and X/Y/Z direction cosines. [S4]
- Qualify source/target **restraint node**, owning element, slot identity, restraint type and geometric DOF. Do not equate source slot 2 with target slot 2 by address; slot order is local.
- Treat CNode as a second node that needs its own qualified mapping. Disallow transfer if it is missing, self-looping unexpectedly, ambiguous or points outside the target model.
- Direction cosines require coordinate-frame compatibility, not just same numeric values. Tag/GUID can be identity evidence, not absolute proof.
- Classify existing-slot scalar edits separately from type/constraint/structural edits; nonlinear support behavior is critical. No insertion of new slot/block until structural writer and vendor import are separately accepted.

### 8.4 Imposed displacements and applied force/moment

- DISPLMNT and FORCMNT each use **two possible specifications and 20 lines per auxiliary block** according to vendor documentation; per-specification load/case indexing must be established. [S5]
- `9999.99` in displacement denotes unspecified/free, **not a zero displacement**; preserve its sentinel meaning per relevant field/version.
- Forces/moments input is a prescribed load, not an output reaction. Translations versus rotations/force versus moment require dimensional checks and coordinate frame alignment.
- No positive FORCMNT in the current private specimen. A separate canonical original-positive fixture and adversarial tests are mandatory before enabling edits.

### 8.5 Hangers, nozzles and equipment

- Node navigation may discover these attachments, but the actual physical arrays can reside in MISCEL_1 or EQUIPMNT rather than a common node-field block.
- Hanger node lists, CNode, hardware load, spring rate, tag/GUID, short-spring flags and execution options must be resolved together; arrays can be positional.
- Flexible nozzles require nozzle/vessel node identity, vessel geometry and equipment context. A local node correspondence does not prove equipment design equivalence. [S6]

### 8.6 Node transfer acceptance

- Every relevant incidence and auxiliary attachment accounted for, with no unexplained orphan or shared pointer.
- Distinguish `SAME_NODE_DIFFERENT_ATTACHMENT` from `SAME_ATTACHMENT_MULTIPLE_SLOTS`.
- Only exact approved occurrences changed; unrelated attachments at the same node remain identical.
- No unqualified slot reordering, silent DOF overwriting or connecting-node substitution.

## 9. CONTROL, ELEMENTS, AUX_DATA and MISCEL_1 atomic transaction

### 9.1 Two writer classes

**W1: Existing-slot patch.** Can patch an independently qualified exact field of fixed width while keeping record counts, pointers and material-array shape unchanged. Example: an approved existing `ELEMENTS.PRESSURE_1` or `RESTRANT.GAP` numerical value. Material replacement is an exception because the RRMAT value (not merely ELEMENTS) may be the owned field.

**W2: Structural change.** Creates/removes/reorders ELEMENTS or auxiliary blocks, allocates pointers, rewrites dependent CONTROL counts, packs/reindexes MISCEL_1 arrays, and reserializes changed regions. This is a **separate higher-risk authority**; W1 qualification does not authorize W2.

### 9.2 Change-impact matrix

| Operation | CONTROL | ELEMENTS | AUX_DATA | MISCEL_1 | UNITS / COORDS |
|---|---|---|---|---|---|
| Existing P1/T1 numeric | No count change | Exact field change | No change | Preserve | Verify context, preserve |
| Existing restraint stiffness | No count change | Pointer preserved | Exact slot change | Preserve | Verify units/frame, preserve |
| Existing RIGID weight | No count change | Pointer preserved | Exact RIGID field | Preserve | Verify units, preserve |
| Existing material-ID replacement | No count change | Element identity preserved | Usually unchanged | Exact RRMAT position and material meaning | Verify target material/system |
| New NodeName record | Increment NONAM | Update owned pointer | Insert NODENAME block | Preserve | Preserve |
| New RESTRANT block | Increment restraint auxiliary count | Allocate selected restraint pointer | Insert complete 24-line block | Preserve unless separate dependency | Preserve |
| Fill vacant RESTRANT slot | Usually no count change | Pointer unchanged | Write one qualified vacant slot | Preserve | Check frame/units |
| New ELEMENTS record | Increment NUMELT; other affected counts if needed | Insert complete element; adjust dependent references | May add/reindex owned auxiliaries | Repack positional RRMAT and any dependent arrays | Reconcile COORDS if topology changes |
| New hanger/nozzle | Increment NOHGRS/NUMNOZ | Validate ownership links | Typed new records as applicable | **Update hanger/nozzle arrays in their correct layout** | Context validation |
| Change global axis/units | Separate model-level proposal | May require re-interpretation or transformation | Verify all directional properties | Verify execution settings | Explicit global transaction |

### 9.3 CONTROL details

The first six CONTROL counts are `NUMELT`, `NUMNOZ`, `NOHGRS`, `NONAM`, `NORED`, and `NUMFLG`. The auxiliary-count list includes bend, rigid, expansion joint, restraint, displacement, force/moment, uniform, wind, offset, allowable, intersection, **IZUP vertical-axis flag** and equipment checks. IZUP is not an auxiliary record count. Build counts from the finalized arrays, not from a hand-entered delta; verify overflow/card widths before serialization. [S2]

### 9.4 MISCEL_1 and RRMAT

`MISCEL_1` contains one RRMAT material ID per element, packed up to **six entries per physical row**, plus nozzle/hanger structures and execution options. Material IDs are defined as 1–699 in the cited format; the valid target material **meaning** still requires independent equivalence. [S6]

For `NUMELT=521`, `ceil(521/6)=87` material rows. An append at element 522 fills the last row, still 87; adding element 523 requires 88 rows. Inserting/deleting an element at **any non-terminal ordinal** requires preserving the material-to-element ordinal association through the shifted array. Other MISCEL_1 data must remain intact and be re-parsed against the new offsets.

**Never treat the remaining unqualified MISCEL_1 records as ignorable padding.** A new writer that cannot decode and preserve its dependent arrays is blocked from structural changes.

### 9.5 Writer transaction ordering

1. Freeze immutable SOURCE/TARGET0 and accepted mapping; derive required typed updates and dependency closure.
2. Simulate a full TARGET1 record graph (including CONTROL/MISCEL_1), not a sequence of independent string replacements.
3. Allocate/reindex only qualified typed records. Preserve one-based pointer semantics and zero-absent semantics.
4. Recalculate CONTROL/aux counts, ELEMENTS pointer table, positional RRMAT/hanger/nozzle arrays and necessary metadata; preserve unrelated order and raw lexemes where possible.
5. Serialize in supported CII version's card format and section ordering; reject unsupported sentinel changes, format overflow and modified unrelated bytes.
6. Independently reparse the complete result and verify all cross-section invariants, including any recalculated byte-span movement caused by inserted cards.
7. Recompute TARGET1 SHA-256; compare against approval-bound plan; authorize download only on all structural gates PASS.
8. Perform external licensed CAESAR II import and engineering comparison before treating data as accepted for engineering use.

## 10. User interface and decision workflow

### 10.1 Recommended VNext addition

Add a **Property Mapping & Transfer** workspace as an independent VNext tab, leaving Node-Based Name Transfer, NORMAL, LINE_NODE, GEOMETRY, CIIFR_GEO and CONFIG intact. Within the workspace use:

1. **Mapping & topology:** SOURCE/TARGET node map, FROM→TO element maps, orientation, duplicates/subdivisions, confidence and evidence.
2. **Process & element:** case-aligned temperature, pressure, density, geometry, material, insulation and adjacent RIGID fields.
3. **Node properties:** NodeName, restraints, imposed displacements, force/moment and equipment/hanger attachments.
4. **Auxiliary details:** typed record view with element owner, pointer, block, slot, field spans, Tag/GUID and CNode links.
5. **Conflicts / manual resolution:** A/B independent picks and consolidated C selection where appropriate; no default silent adoption of ambiguous candidates.
6. **Review & export:** ready/held counts, typed approvals, transaction diff, CONTROL/MISCEL change ledger, final TARGET1 hash and independent engineering-check status.

### 10.2 Table columns / required evidence

`SourceNode | TargetNode | SourceFrom→To | TargetFrom→To | SourceElement | TargetElement | Orientation | PropertyFamily | PropertyCode | CaseOrDOF | SourceRaw | SourceEffective | TargetRaw | TargetEffective | Unit | AuxPointer/Slot | ByteSpan | IdentityEvidence | Status/Reason | Proposal | Approval`.

A node-only view may hide irrelevant element columns but must retain them in the downloadable evidence. A read-only finding is never indistinguishable from an edit-ready proposal.

### 10.3 Decisions and manual review

- **AUTO_ELIGIBLE:** unique, qualified correspondence; exact typed field/units/case; valid non-conflicting mutation; no unresolved semantic gates. Still requires explicit approval.
- **MANUAL_REQUIRED:** alternative element/slot/line selection, subdivision/reversal decision, CNode mapping, multiple source values, unit or material verification. Show the exact action needed and record reviewer decision as new evidence.
- **HELD:** unknown source-version layout, missing model/context, invalid pointer, unqualified semantics, incompatible DOF, unsupported structural edit, ambiguous map without an admissible choice or stale files.
- **NO_OP:** target already agrees with source at a qualified semantic level, not simply equal formatted lexemes.

After any manual resolution, reset the affected plan generation, recompute conflict closure and revalidate **before** approving. If a manual action alters geometry/node correspondence, re-run dependent node and element mapping plus property checks; no stale review survives.

## 11. Data contracts (conceptual)

### 11.1 Field map / occurrence schema

```json
{
  "schema": "CIIFR.PropertyOccurrence.v1",
  "fileSha256": "<64-hex>",
  "versionProfile": "CII-V14-qualified",
  "owner": {
    "kind": "ELEMENT|NODE_ATTACHMENT|GLOBAL",
    "elementOrdinal": 29,
    "from": 840,
    "to": 850,
    "node": 850
  },
  "auxiliary": {
    "family": "RESTRANT",
    "pointer": 9,
    "slot": 4
  },
  "field": {
    "code": "RESTRANT.GAP",
    "byteStart": 0,
    "byteEnd": 0,
    "rawLexeme": "<value>",
    "parsedValue": null,
    "effectiveValue": null,
    "unitsId": "<units-context>",
    "semanticStatus": "UNQUALIFIED"
  }
}
```

Addresses and values above are illustrative placeholders, not actual spans or materialized CII data.

### 11.2 Transfer proposal schema

```json
{
  "schema": "CIIFR.PropertyTransferProposal.v1",
  "sourceSha256": "<64-hex>",
  "target0Sha256": "<64-hex>",
  "mappingGeneration": "<identifier>",
  "versionProfile": "CII-V14-qualified",
  "path": "NODE_ELEMENT_DATA|NODE_DATA",
  "sourceOccurrenceId": "<source-identity>",
  "targetOccurrenceId": "<target-identity>",
  "orientation": "SAME|REVERSED|UNKNOWN",
  "propertyCode": "ELEMENTS.PRESSURE_1",
  "valueKind": "SCALAR|VECTOR|ENUM|TEXT|REFERENCE",
  "semanticProof": ["units", "case", "owner", "format"],
  "impact": ["ELEMENTS"],
  "status": "AUTO_ELIGIBLE|MANUAL_REQUIRED|HELD|NO_OP",
  "reasonCodes": [],
  "proposedValue": "<value>",
  "approvedBy": null,
  "validationDigest": null
}
```

### 11.3 Structural transaction manifest

Mandatory fields: `target0Sha256`, `sourceSha256`, `planSha256`, `mappingGeneration`, `fieldCatalogDigest`, `approvedProposalIds`, `originalSectionCounts`, `postSectionCounts`, `pointerRemap`, `elementOrdinalMap`, `RRMATOrdinalMap`, `changedSpanLedger`, `insertionLedger`, `droppedOrHeldRows`, `independentOracleEvidence`, `target1Sha256`, `vendorImportDisposition`, `releaseDisposition`.

**Security:** audit exports must not silently include proprietary full node/element names or raw source bytes. Support local protected mode with public-safe sanitized receipts.

## 12. Acceptance gates and negative qualification

### 12.1 Baseline gates

| Gate | Required proof | Blocking examples |
|---|---|---|
| G0 — Provenance | Hash/size/encoding/version; private source custody; supported parser | Unknown edition, stale SHA, wrong SOURCE/TARGET file |
| G1 — Structure | CONTROL counts, 15-card ELEMENTS cardinality, typed pointer bounds/ownership, RRMAT positions | Missing/duplicate section, shared/orphan/out-of-range pointer |
| G2 — Correspondence | Node and element graph identity, orientation, auxiliary occurrence match | Parallel elements, 1:N subdivision, reversed end mismatch |
| G3 — Semantics | Units, operating-set/case, code/material identity, sentinel and nonlinear behavior | T vs alpha; P1 vs hydrotest; density multiplier; CNode ambiguity |
| G4 — Proposal integrity | Exact field span, allowed byte width, no overlap/conflict, approval completeness | Silent rounding/overflow, partial alias, unsupported pointer edit |
| G5 — Postimage | Reparse, counts, cross-section dependencies, exact allowlisted changes | MISC material shift, wrong CONTROL, unrelated byte change |
| G6 — External engineering | Licensed importer, native model comparison, calculated effects where required | Import failure, changed stresses/reactions outside approved scope |
| G7 — Independent review | Different reviewer/account, exact reviewed head, independent oracle, Owner release decision | Self-review, unknown review identity, NOT_RUN treated as PASS |

### 12.2 Mandatory falsifiers

1. SOURCE node 500 matches multiple TARGET nodes by name but only one is topologically proven; reject name-only choice.
2. Two parallel elements have identical FROM/TO and different pressure; do not choose first.
3. Source segment `400→500` vs TARGET `850→840` reversed; hold end-dependent offset/reducer mapping absent transform.
4. One SOURCE element maps to two TARGET segments; do not blindly fan out P1/T1.
5. SOURCE/TARGET node numbers coincide but models are independently renumbered; no automatic identity.
6. One logical node has multiple NODENAME aliases or shared pointer; no partial write.
7. RESTRANT block pointer zero versus a present block with zero stiffness; do not conflate absence and value zero.
8. Two restraints at one node have different DOF/CNode; never select arbitrary slot.
9. Unknown connecting node or global IZUP axis mismatch; directional restraint transfer held.
10. DISPLMNT `9999.99` must remain free/unspecified; zero means constrained zero displacement in its applicable semantics.
11. A valid raw `PRESSURE_1` number but mismatched units/case fails engineering equality.
12. Temperature REAL #10 contains expansion coefficient meaning; fail transfer as temperature.
13. Material RRMAT entry number matches but actual material definitions differ; reject.
14. A new element inserted at ordinal 2 shifts RRMAT; ensure every later material remains assigned to the correct element.
15. 521→522 elements stays 87 RRMAT rows; 522→523 expands to 88; both cases preserve trailing MISC records.
16. A new restraint block increments appropriate CONTROL aux count and creates a valid exact 24-card record; failure to do all steps prevents export.
17. Malformed `  #$ control`, lowercase marker, duplicate/missing section, wrong record length; fail closed at writer boundary.
18. Approve-All never includes HELD, ambiguous, conflicting or stale records; manual changes invalidate prior approvals.
19. Source file changes while browser is open; all validation/export references must be revoked.
20. Byte-valid but licensed CAESAR II importer rejects the model; engineering verdict FAIL, not PASS.
21. FORCMNT=0 in GLRD cannot be used as positive-force-transfer evidence; a separate independent positive fixture is mandatory.
22. A source/tag/GUID duplicate points to different physical attachments; identity remains ambiguous despite matching text.

### 12.3 Original V14 test obligation

An independent native reviewer with authorized private-source access must verify the exact specimen SHA and use it for read-only inventory, representative real Element/Process/Restraint traces and controlled synthetic/in-memory mutations. For a future writer acceptance, use a separately Owner-approved `Node,Replace` or typed property plan and a changed-byte allowlist; no fabricated production rename or public original file publication. Vendor CAESAR II input/re-export is a distinct required gate.

## 13. Delivery architecture and bounded work packages

| Phase | Product deliverable | Code changes authorized at phase? | Exit gate |
|---|---|---|---|
| P0 — Authority/source ledger | Unified field catalog; original V14 CONTROL/ELEMENTS/AUX/MISC semantic index; E1 source trace | READ_ONLY | Independently qualified field and pointer evidence; known UNKNOWNs explicit |
| P1 — Mapping inspector | SOURCE/TARGET graph, node/element/aux correspondence and Node Properties UI | Read-only isolated module, after task assignment | Browser and exact-head non-author mapping review |
| P2 — Parallel process + restraint previews | T/P/density & restraint DOF compare; typed proposal/hold/manual reasons | READ_ONLY proposals, no new writer | Source semantic proof, independent negative tests, UI acceptance |
| P3 — Existing-slot W1 | One field family at a time: qualified P1 or restraint scalar, no structural creation | Narrow explicitly granted typed writer | Exact changed-byte oracle, CAESAR importer, independent review |
| P4 — Additional typed families | Displacement, force/moment, rigid, geometry/material and attachments | Separate field-specific qualifications | Original-positive fixtures and semantic proof |
| P5 — Structural W2 | New/delete elements, restraints, hanger/nozzle arrays; CONTROL/MISC rebuild | Separate engineering-critical authority | Complete structural transaction oracle + licensed import |
| P6 — Broader release | Optional production tile integration after standalone acceptance | Owner-gated | Reviewed full standalone and protected-source regression suite |

### 13.1 Reuse and ownership boundaries

- **PR203**: merged standalone NODAL NodeName tab and numeric-node name writer; *reference implementation*, not automatic writer authority for process/restraints.
- **Issue #139**: common writer and independent tab contracts; any exception requires explicit Owner decision.
- **Issue #167**: ELEMENTS/Process/Material/RIGID field transfer authority and roadmap; this proposal **consumes**, does not replace it.
- **Issue #178**: real five-field semantic authority: reported T1 HOLD, P1 PARTIAL, fluid density PARTIAL, RIGID weight PARTIAL, RIGID type HOLD. Do not label them qualified just because field addresses exist.
- **Issue #224**: node-property read-only source/slot index and restraint-first path; combine with process P1 in shared catalog.
- **Issue #204**: independent original V14/Nodal merge qualification still an open engineering gate; independent assessment not proven by merged code.
- **Geometry A/B/C**: supply accepted correspondence evidence with provenance; never silently let Geometry's tentative proposals become write permissions.

No new PR, branch, merger, deployment or work-package writer is authorized by this concept note itself.

## 14. Decision register / questions needing Owner or reviewer acceptance

| Decision | Proposed default | Why unresolved |
|---|---|---|
| D1. Shared schema or independent modules? | One correspondence schema; typed property modules and separate writer qualification | Avoid duplicate oracle and semantic coupling |
| D2. Node-only selector for element process? | Node is navigation; require explicit element and case | Shared endpoint does not mean shared process condition |
| D3. Direction reversal? | Auto-match may be proposed; directional writes HELD until transform proven | End swaps and vector signs matter |
| D4. 1:N element correspondences? | MANUAL_REQUIRED by default | Avoid unbounded fanout |
| D5. Existing numeric slot auto-eligible? | Only after field-specific source qualification and external vendor proof | Physical byte fit does not prove engineering meaning |
| D6. Material transfer? | Target material definition mapping mandatory | ID numbers are local references |
| D7. New restraint insertion? | Defer to W2; existing-slot preview first | CONTROL/pointer and 24-card group semantics |
| D8. Confidence policy? | Never choose alternatives automatically based on score alone | Safety of topology/property transfer |
| D9. Writer exception under #139? | Preserve HOLD until explicit accepted bounded scope | Current Nodal exception not a universal transfer contract |
| D10. Output scope and confidentiality? | Local-only private full audit; public-safe aggregate receipt | Proprietary node/material/model data |

## 15. Explicit acceptance criteria

**AC-01** Given one selected `FROM→TO` element with one-to-one qualified mapping, the app exposes its T1–T9, P1–P9, geometry, material and RIGID facts with physical address and case; sibling elements at the shared node are not implicitly selected.

**AC-02** Given a numeric node, the app lists all actual node-name and restraint incidences by owning element/typed pointer/slot, and separates truly node-owned facts from incident element properties.

**AC-03** Given ambiguous duplicate edges, reverse orientation, unqualified source case/material, or unsupported pointer sharing, all affected proposals are `MANUAL_REQUIRED` or `HELD` with actionable reason and alternatives, never a fabricated deterministic choice.

**AC-04** Given a qualified existing-field patch, the new TARGET1 changes exactly the approved physical fields and nothing else; counts/pointers/RRMAT remain valid and original TARGET0 SHA remains unchanged.

**AC-05** Given a structural edit, postimage CONTROL counts, complete auxiliary record sizes, pointer indices, element ordinal table and MISCEL_1 RRMAT/hanger/nozzle arrays are recalculated **together** before export.

**AC-06** Any changed SOURCE/TARGET, field catalog, accepted mapping, plan or review decision revokes stale approval and export.

**AC-07** Vendor CAESAR II importer acceptance, exact-head independent review and Owner release permission are separately recorded; native parser PASS alone cannot close the engineering gate.

**AC-08** No duplicate engine writer, no unrelated tab regression, no Geometry semantic regression, no protected private CII publication.

## 16. Source and project references

### Authoritative vendor reference pages

- **[S1]** Hexagon, *CAESAR II Neutral File* — section markers and version caveats: https://docs.hexagonppm.com/r/ru-RU/CAESAR-II-Users-Guide/Version-12/337037?contentId=yxaRI7tc58SE9uG42hggOQ
- **[S2]** Hexagon, *Control Information* — primary counts, auxiliary counts and IZUP: https://docs.hexagonppm.com/r/en-US/CAESAR-II-Users-Guide/15/337039
- **[S3]** Hexagon, *Basic Element Data* — 53 REAL fields, text/line, 15 typed pointers: https://docs.hexagonppm.com/r/en-US/CAESAR-II-Users-Guide/Version-12/1281861?contentId=HJpDoSl_i_7bfTs6m_Z59w
- **[S4]** Hexagon, *Auxiliary Element Data* — RESTRANT and RIGID formats: https://docs.hexagonppm.com/r/en-US/CAESAR-II-Users-Guide/15/337041
- **[S5]** Hexagon, *Auxiliary Element Data, Version 14* — DISPLMNT/FORCMNT and sentinel: https://docs.hexagonppm.com/r/en-US/CAESAR-II-Users-Guide/Version-14/1471418?contentId=xcQneu2SDluXPQOwi7pmDQ
- **[S6]** Hexagon, *Miscellaneous Data Group #1* — RRMAT/nozzles/hangers/options: https://docs.hexagonppm.com/r/en-US/CAESAR-II-Users-Guide/15/337059
- **[S7]** Hexagon, *Units Conversion Data*: https://docs.hexagonppm.com/r/en-US/CAESAR-II-Users-Guide/Version-12/1281868?contentId=0xkfWcOvrQzu~okVwmFCVw
- **[S8]** Hexagon, *Nodal Coordinate Data*: https://docs.hexagonppm.com/r/en-US/CAESAR-II-Users-Guide/Version-14/337061

### Current CIIFR project grounding (live checked 28 October 2026)

- **[P1]** Node Properties evidence and restraint-first scope: https://github.com/reallakshman19/XML_Compare_Utilities/issues/224
- **[P2]** Element and Process workstream: https://github.com/reallakshman19/XML_Compare_Utilities/issues/167
- **[P3]** Five-field source semantics: https://github.com/reallakshman19/XML_Compare_Utilities/issues/178
- **[P4]** Standalone / writer contract: https://github.com/reallakshman19/XML_Compare_Utilities/issues/139
- **[P5]** Numeric NodeName integrated implementation: https://github.com/reallakshman19/XML_Compare_Utilities/pull/203 (merged, exact source head `22c2bac4b4606971a5860a766cb0ae791fb43d17`; merge commit `e97bef94f05e387e32888db77e6ec925251402b7`)
- **[P6]** Independent original V14 qualification: https://github.com/reallakshman19/XML_Compare_Utilities/issues/204
- **[P7]** Parent NodeName original contract: https://github.com/reallakshman19/XML_Compare_Utilities/issues/189

**Evidence policy:** Vendor pages cited above mix documentation editions (12, 14 and 15). They establish the conceptual data families but are **not** by themselves an exact-byte certification for the Owner's V14 profile. Version-specific real-original and independent native traces override extrapolation. Original protected CII bytes are not reproduced in this note.

## 17. Owner review and implementation handoff

**This is the requested full concept specification, not a coding instruction or completed engineering acceptance.** The immediate project decision is whether to authorize a **read-only shared mapping/index implementation** that consumes the existing Element and Node Property evidence. The independent coding and review lanes must be assigned explicitly before product mutation.

| Review item | Suggested disposition | Next required receipt |
|---|---|---|
| Common SOURCE→TARGET node/element/auxiliary identity model | APPROVE FOR DESIGN | One version-qualified cross-family identity schema and independent falsifiers |
| P1-A: Node → Data, restraint inspector | GO FOR READ-ONLY CANDIDATE | Actual V14 122-block/DOF source-address ledger and browser preview |
| P1-B: Node → Element → Data, process inspector | GO FOR READ-ONLY CANDIDATE | Exact original V14 T/P/density field semantics and units/case readback |
| Shared correspondence reuse | REUSE ONLY VERIFIED RESULTS | Geometry A/B/C accepted-map provenance with conflict identities |
| W1 existing numeric property edits | HOLD | Separate scoped writer grant, changed-byte oracle and CAESAR import |
| W2 structural edits, CONTROL/MISC rebuild | HOLD | Full dependency graph, reserialization tests and independent engineering acceptance |
| Release / production replacement | HOLD | Standalone native/browser, private original and independent Owner release review |

**Handoff package for first implementation work pack:** field-catalog contract; sample source/target hash and version receipts; selected node/element/aux relationship fixtures; signed expected source-to-target identity cases; explicit negative controls; a read-only UI acceptance script; and a compact WIP report with current code/branch and one exact next action. Private original CII stays in authorized custody; public work records carry hashes and sanitized counts only.

**Success for the first release means visibility and correct engineering ownership, not a working property writer.** The inspector must show why each datum belongs to an element, node attachment or global context, how it was located, what is different in TARGET0, and precisely what must be reviewed before any possible transfer.

---

**Proposed disposition:** `CONCEPT_READY_FOR_OWNER_REVIEW`; `P0/P1_READ_ONLY=RECOMMENDED`; `PROCESS_FIELD_WRITE=HOLD`; `RESTRAINT_FIELD_WRITE=HOLD`; `STRUCTURAL_W2=HOLD`; `NATIVE_CAESAR_ACCEPTANCE=NOT_RUN` for this proposed property-transfer architecture.