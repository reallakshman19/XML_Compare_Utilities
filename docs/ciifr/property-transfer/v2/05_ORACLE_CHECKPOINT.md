# CIIFR — Oracle project checkpoint, starting from CII fundamentals

**Checkpoint ID:** CIIFR-ORACLE-CHECKPOINT-20261101 · **Snapshot:** 1 November 2026, Asia/Dubai · **Prepared by:** current assisting session `/root`, GPT-6.1-Sol; external chat ID UNKNOWN.

This is a recovery and learning guide for an incoming Oracle, including an agent who has never seen CII. It carries the whole project frontier, not just a coding assignment. It is not an independent engineering review, an adopted schema or permission to resume coding. Refresh mutable sources before acting.

## 1. Start here: outcome, current truth and authority

The engineer wants to load a piping stress model, find a particular restraint by its node, inspect its actual properties, edit selected properties or transfer them from another model, review the changes and obtain a validated **new CII file** with an audit trail. **Restraints are first.** The larger design also covers process, geometry/material, displacement, force/moment and other properties later.

The Owner rejected further development of a separate engineering property byte writer and selected this route:

**CII → reuse existing CII-to-XML conversion → select exact node/restraint occurrence → typed Find/Replace or accepted SOURCE→TARGET transfer → approved XML changes → reuse existing XML-to-CII writer → independently validated TARGET1.**

The Owner also explicitly required **concept → architecture/framework/modules → WBS → implementation plan → code**. The first four documents are prepared as drafts. **Coding remains paused.** A request for a checkpoint does not lift that pause.

| Question | Answer at this snapshot |
|---|---|
| Where is the implementation? | `reallakshman19/XML_Compare_Utilities` (XCU). CIIFR-Node is a workstream/project name; do not invent a separate code repository. |
| What can users do now? | Use the merged R0 Property Transfer tab for bounded read-only V14 inspection. Existing name-edit/export tabs have their own qualified scope. |
| Can the Property tab write restraint changes? | No. The XML-backed restraint catalogue, semantic edit policy, mapping, transactions and TARGET1 workflow are not implemented. |
| Is there existing XML conversion to reuse? | Yes, but representations and qualification differ. PR206 is a limited draft reversible typed-XML candidate; it is not a ready general browser adapter. |
| Is PR246 the mapper or writer we need? | No. It is a limited FORCMNT section qualifier. Useful techniques are references; force editing/integration is deferred. |
| What is authorized now? | Source-grounded checkpoint, planning and read-only reconciliation. No product implementation, new writer, merge, deployment or engineering release follows from this document. |
| What happens first after takeover? | Review the restraint correspondence/field contracts and produce a bounded existing-converter capability assessment (I1/WP01), preserving unresolved decisions. Do not jump to code. |

## 2. CII explained without assuming domain knowledge

### 2.1 The engineering model

CAESAR II is used for piping stress analysis. Its input describes the piping geometry, physical properties, supports, operating conditions and imposed loads/motions. Changing an input may change stiffness, thermal movement, weight, load paths or calculated stresses. Successfully parsing a file is different from proving the model is physically appropriate.

A **node** is a numeric logical location/reference in one model. An **element** is a directed input record with a FROM node and a TO node, plus element-owned data. Several elements can share a node. Two records can even share the same FROM–TO pair, so that pair is useful evidence but is not always a unique element key. Record orientation is not a claim about fluid flow direction.

A **restraint** is an input support/constraint occurrence attached to a node, possibly related to a connecting node. Multiple restraint occurrences can exist at one node. Their type, direction, stiffness, gap, friction and connection context may matter together. A restrained node and the element that stores the restraint pointer are different concepts.

### 2.2 What is physically in CII?

CII is CAESAR II neutral/interchange input. In the inspected profiles it is a text format with named sections, fixed-width numeric fields and structured records; it is not CSV, generic XML or a list of node objects. Physical rows are often called **cards**. A **lexeme** is the exact spelling of a field, including spaces and exponent notation.

Markers such as `#$ VERSION`, `#$ CONTROL`, `#$ ELEMENTS`, `#$ RESTRANT` and `#$ MISCEL_1` delimit sections in the observed profile. Do not infer one universal grammar from these names or from a file extension. Declared version, actual structure, encoding, separators, row boundaries, counts and references must agree with a supported profile.

| Section/concept | What it does | Why the Oracle must care |
|---|---|---|
| VERSION | Declares a format version/profile clue | V14-only reader support does not prove all CII files are V14 or invalid otherwise. |
| CONTROL | Stores element and auxiliary counts plus other controls | Counts must reconcile with actual records; some values are flags rather than record counts. |
| ELEMENTS | Stores oriented elements, physical/process fields and typed auxiliary references | Shared nodes do not make every incident element's pressure or temperature identical. |
| Auxiliary sections | Store records such as RESTRANT, RIGID, DISPLMNT and FORCMNT | A pointer selects a record of a specific family, not a logical node or a record in every family. |
| MISCEL_1 | Contains material assignments and other profile-dependent arrays | In R0 the element/material alignment is inspected; this is not complete structural-write qualification. |
| UNITS / coordinates | Carry unit/profile and geometric context | Equal numbers can represent different dimensions, units or coordinate bases. |
| NODENAME | Stores names/labels associated with model references | A name is not automatically a globally unique physical identity. |

The merged R0 **observes a specific V14 layout**: 15 cards per element; 24 cards per restraint block; six restraint slots per block; four cards per slot. A slot contains two numeric cards and length-coded text cards for Tag/GUID-related data. The source extracts node/type/CNode and preserves physical evidence; it does not qualify all payload meanings. Six slots are six storage opportunities, **not six proven global X/Y/Z/RX/RY/RZ constraints**. Never use a slot number as a direction.

In this layout, RIGID has one card per block; DISPLMNT and FORCMNT each have 20 cards per block, with two stored node specifications. These are **profile observations**, not rules to transplant to every version. The format-specific parser/writer owns the grammar; property modules should not duplicate these offsets.

### 2.3 The three identities that are easily confused

Consider a deliberately invented example, not data from a private model:

| Layer | SOURCE example | Meaning |
|---|---|---|
| Logical node | 500 | A node in SOURCE only |
| Element storage owner | Element ordinal 23, FROM 400 → TO 500 | Local input record that holds an auxiliary reference |
| Typed pointer | RESTRANT pointer 7 | Selects restraint block 7 in SOURCE's RESTRANT section |
| Attachment occurrence | Block 7, slot 2, restraint node 500 | One particular restraint, among possible siblings |
| Connection context | CNode 700, if applicable | Another local node relation requiring its own meaning/mapping |
| Canonical XML field | That occurrence's qualified gap field | The specific represented engineering value intended for editing |

None of `23`, `7`, `2` and `500` can substitute for another. Also, SOURCE pointer 7 says nothing about TARGET pointer 7. The pointer is a storage address, not a cross-model identity.

### 2.4 Stored values, effective meaning and representation

Keep four things separate: the original token, its typed value, its effective engineering interpretation, and its edit eligibility. `0`, an absent value, an unspecified/default state and a prescribed zero are not generally interchangeable. Type-specific sentinels must be established before treating a token as a physical value.

For a supported exact reconstruction, an untouched field must retain the representation needed by the existing writer. For an edit, the new value must be representable without unapproved rounding/truncation. Use the converter's qualified numeric handling; JavaScript floating-point display or substring matching is not a format contract. `30` must not match `130` merely because it appears inside the string.

### 2.5 Vocabulary for the rest of this checkpoint

| Term | Meaning here |
|---|---|
| SOURCE | Immutable model supplying a proposed value in transfer mode |
| TARGET0 | Immutable original model to be edited |
| TARGET1 | A validated new output copy; never an in-place overwrite of TARGET0 |
| CNode | Connecting-node field; its zero/nonzero and type-dependent meanings must be qualified |
| Ownership | Who the field belongs to physically and semantically; these may differ |
| Incidence | Elements touching a logical node; not permission to edit all of them |
| Occurrence | A particular record/slot/specification, including its owner/context |
| Profile | Supported combination of version, grammar, lexical conventions and relevant features |
| Canonical field | Single authoritative represented storage value; views point to it |
| Engineering view | Derived node/element/attachment lookup; not an independent competing copy of the value |
| Correspondence | Accepted relationship between separately identified SOURCE and TARGET entities |
| Eligibility | Proof that this selected operation has compatible meaning and supported representation |
| Approval | Explicit decision to apply a particular current proposal; distinct from eligibility |
| Fidelity | Stated preservation contract, such as byte-exact no-op or bounded approved changes |
| Provenance | Evidence linking a represented value/owner to the actual original input |
| Digest/hash | Identity/integrity check on bytes; not proof of engineering truth or authenticity |
| UNKNOWN / NOT_QUALIFIED | Coverage/meaning is unresolved; not automatically evidence of a corrupt model |
| NOT_RUN | The named execution was not performed; never a substitute for PASS |

## 3. Scope and ownership: what comes later

The two navigation paths remain part of one framework:

| Path | Correct selection | Property examples | Main mapping difference |
|---|---|---|---|
| Node → element → data | Enumerate incident or TO-matching elements, then choose the exact oriented record | T/P operating fields, OD, thickness, corrosion, material, insulation, fluid density, rigid properties | Requires element correspondence plus relevant end/case/material context; node identity alone is insufficient. |
| Node → attachment occurrence → data | Enumerate the chosen node's attachments and choose an exact occurrence | Restraints first; later imposed displacement, applied force/moment and other attachments | Requires node relation plus occurrence/type/direction/connection context; slot equality is insufficient. |

Rigid data is element-owned even when discovered from an adjacent node. Applied FORCMNT data is input load, not a calculated restraint reaction. Pressure/temperature are element/process data, not global properties of a shared node.

The first release slice is **existing populated restraint records with explicitly supported fields/types/context**. Missing target restraints, record creation/deletion, node renumbering, type/basis/unit-system transformations and general structural transactions are not implicitly admitted. A later approved scope may support such operations, using separately qualified dependency rules.

## 4. Exact project frontier and history that must not be replayed

Live GitHub metadata was inspected for the following snapshot. These commit IDs describe the state **before publishing this checkpoint**; the checkpoint's own commit is supplied by its PR/readback receipt to avoid a self-referential hash.

| Source | Exact identity at inspection | Status and significance |
|---|---|---|
| XCU main | `3051ea171f966ac611f232982e0b1cc0774ba368` | Current main; includes the merged R0 inspector. Other workstreams also use this repository. |
| [PR226](https://github.com/reallakshman19/XML_Compare_Utilities/pull/226) | Approved head `917c21a91a6f5cc02f42d323ebdbe60559e8ae2b`; merge `f7ada348f51017f9ca335281c35c4e90fc79b74d` | MERGED. Bounded read-only Property inspector; no engineering property writer. |
| [PR232](https://github.com/reallakshman19/XML_Compare_Utilities/pull/232) | `d3fbd4041ef4434b4cf5b3c22459f06167be2729` | MERGED into the R0 line. Fixed navigation, endpoint/pointer evidence and stale-input issues. Old draft/HOLD statements are historical. |
| [PR238](https://github.com/reallakshman19/XML_Compare_Utilities/pull/238) | `fa6e948eb0f71ba93fe8bab01625e3146d1df3a0`; merge `d82ae599913ff7cd39d9e64a0da8d553b7df1535` | MERGED. Corrected the independently diagnosed branch-scope assertion. The old full-suite 123/1 report is not the final integrated result. |
| [PR243](https://github.com/reallakshman19/XML_Compare_Utilities/pull/243) | `1110fb387ff0540be73c30783ed5c8052475269b`; merge `917fab3778afe2607fece30d45f88372cd3ca0dd` | MERGED scope/field-contract documentation. It did not deliver a restraint writer. The Owner later chose XML-mediated editing and paused coding. |
| [PR245](https://github.com/reallakshman19/XML_Compare_Utilities/pull/245) | Input head `9a181e579011ea22d313a23196db8797ead0b675`; branch `docs/ciifr-xml-property-design-v2-20261101` | OPEN / DRAFT / UNMERGED. Active design and this checkpoint. Concept/framework/WBS/implementation details are drafts, not adopted product capability. |
| [PR206](https://github.com/reallakshman19/XML_Compare_Utilities/pull/206) | `c2452deb96b402f0dda52f63748bc795049b46bc` | OPEN / DRAFT / UNMERGED. Limited Python reversible typed-XML candidate; its support/holds remain independent. |
| [PR246](https://github.com/reallakshman19/XML_Compare_Utilities/pull/246) | `e29ef4679b0f06f1a2864e075afb046a26965671` | OPEN / DRAFT / UNMERGED. Hardened FORCMNT section qualifier with scoped inherited review evidence; no general model mapper. |

| Native issue | Meaning and present disposition |
|---|---|
| [#224](https://github.com/reallakshman19/XML_Compare_Utilities/issues/224) | Open property workstream; restraint-first intent. Older status paragraphs are not more current than merged PR evidence. |
| [#227](https://github.com/reallakshman19/XML_Compare_Utilities/issues/227) | Open canonical P0–P6 program/WBS. Keep lineage; do not create a replacement program. Its historical tables include older candidate/HOLD descriptions. |
| [#228](https://github.com/reallakshman19/XML_Compare_Utilities/issues/228), [#229](https://github.com/reallakshman19/XML_Compare_Utilities/issues/229), [#231](https://github.com/reallakshman19/XML_Compare_Utilities/issues/231) | Closed bounded R0 review, fixture and repair tasks. Their original-file blockers and old failures are retained history, not fresh requests to repeat that work. |
| [#230](https://github.com/reallakshman19/XML_Compare_Utilities/issues/230) | Open broader read-only correspondence/TO-only work; historical recipient UNASSIGNED/NOT_DISPATCHED. A narrow manual restraint pairing seam does not complete every P2 requirement. |

**Evidence lineage:** root/source inspection and author tests, non-author source-exposed reviews, local Windows executor returns, receiver byte reconciliation, and Owner acceptance were separate stages. The current checkpoint author participated in earlier work and is **not an independent reviewer** of it. Historical executor `01429edb` and PR246 integration contact `01a1746f` are references, not proof of present availability or new writer custody. Incoming Oracle identity/appointment must be recorded from reality; no handoff message has been sent to a successor by this checkpoint.

## 5. Existing code and the three different XML routes

Start with actual code, not a claim that every module called XML is interchangeable:

| Asset | Where to read | Reuse boundary |
|---|---|---|
| R0 physical/index lookup | [`physical.js`](https://github.com/reallakshman19/XML_Compare_Utilities/blob/3051ea171f966ac611f232982e0b1cc0774ba368/tabs/cii-workspace/cii-fnr-vnext/ui/physical.js), [`cii-index.js`](https://github.com/reallakshman19/XML_Compare_Utilities/blob/3051ea171f966ac611f232982e0b1cc0774ba368/tabs/cii-workspace/cii-fnr-vnext/ui/property-transfer/cii-index.js), sibling `panel.js` | Read-only physical evidence; no XML restraint transaction service. Source under `tabs/` has served counterparts under `docs/tabs/`; verify actual deployment paths before changes. |
| Existing production XML-to-CII generation | `converters/scripts/inputxml_to_cii2019.py`, related `converters/scripts/xml_to_cii2019*.py`, `converters/xml-cii2019-core/` and their actual browser callers | Engineering generation from InputXML is not automatically lossless reconstruction of an arbitrary original CII. Assess exact callers and preservation contract before selecting a reuse path. |
| Reversible typed XML candidate | [PR206 README](https://github.com/reallakshman19/XML_Compare_Utilities/blob/c2452deb96b402f0dda52f63748bc795049b46bc/prototypes/ciifr-xmlv3/README.md), `prototypes/ciifr-xmlv3/xmlv3/{baseline,core,views,guards,dependencies,intake}.py` | RichInputXMLv3 wraps a pinned existing storage engine and derived reference views. Draft Python prototype; no general browser bridge or full profile acceptance is established. |
| Topology UXML hub | Existing XCU `uxml/` modules and consumer workstreams | A topology projection is not a full editable CII storage model. Reuse a qualified view where useful; do not create a competing hub or assume topology round-trip proves engineering-field retention. |
| FORCMNT qualifier | [PR246 README](https://github.com/reallakshman19/XML_Compare_Utilities/blob/e29ef4679b0f06f1a2864e075afb046a26965671/qualification/forcmnt_hardened/README.md) and qualification status | Reconstructs a pinned 9,060-byte section body from XML, not a complete CII. Its 20-row/110-field shape and benchmark pin are not RESTRANT grammar. |

PR206's core uses `from_cii`, `validate` and `to_cii` around the pinned engine. Its root contains **Storage** and derived **EngineeringViews**; it validates the views against storage and guards structural/lexical contracts. An edit must affect represented storage and regenerate/validate views through qualified routines. Editing a display/view and leaving storage untouched does not make a valid writer operation. Self-consistent hashes can be recomputed over false provenance, so internal seals are not original-source authentication.

A prior bounded local probe reported byte-exact no-op and an XML-controlled logical-node name edit on an authorized V14 original. That is useful plumbing evidence, **not restraint editing, broad V11 support or browser acceptance**. The inspected generated public V11 benchmark was rejected by this candidate. Do not silently switch to a different generator to make that case pass.

The reuse decision still has to identify the actual existing engine/schema and the browser/runtime adapter. Calling it the existing writer is an architectural requirement to reuse qualified work, not a claim that all required capability is already complete.

## 6. Restraint mapping: exact proposed logic

### 6.1 Mapping and approval are different

The system must distinguish **candidate discovery → accepted correspondence → field eligibility → change approval**. A unique candidate is not engineering approval. Accepted node correspondence alone does not pair every restraint at that node.

For target-only editing, select the exact TARGET occurrence and fields; no SOURCE map is needed. For transfer, use this sequence:

1. Freeze original/XML identities, converter/schema/profile, units, basis and current job/mapping revisions for both documents.
2. Accept the intended SOURCE-node ↔ TARGET-node relation. Equal numbers/names are evidence only; preserve duplicates/conflicts and target reuse rules.
3. Enumerate **all** restraint occurrences at each chosen node, retaining typed record/pointer/slot references, storage owners, inactive payload and relevant connecting-node context. Do not reduce them to one row per node or one row per type.
4. Compare type, direction/basis, CNode relation and other context that is actually required by the chosen operation. Keep ambiguous alternatives visible. Resolve a connecting-node map separately when needed; never copy SOURCE's node integer into TARGET as a shortcut.
5. Accept an exact one-to-one occurrence pair for this bounded slice. Shared storage requires complete affected-owner disclosure; a missing target record is a structural request, not a scalar transfer.
6. Evaluate each selected field's meaning/state/units/representability. A pair may be accepted while a particular field remains ineligible.
7. Propose exact target-before and target-after values, show consequences and review them. Bind approval to the current pair, field set, context and input/XML identities.

**Do not require equality of the values being transferred to identify the restraint.** A gap, stiffness or friction difference may be the very reason for the transfer. Use appropriate identity/context witnesses without filtering away the intended change.

### 6.2 Worked change, with an independently stated expected result

Illustration only: SOURCE node 500, restraint block 7/slot 2, CNode 700 is explicitly paired with TARGET node 850, block 4/slot 5, CNode 970. The selected supported field is gap, in an independently established compatible type/direction/unit/state context. TARGET gap is 1 mm and SOURCE gap is 2 mm.

The intended output is **TARGET's chosen gap = 2 mm**. TARGET node 850, its CNode 970, block reference 4, slot 5, stiffness, friction and all other records remain unchanged. SOURCE remains unchanged. If CNode/type/basis compatibility is unresolved, the operation is held. If the target slot is absent, creating it is outside this existing-record operation.

These are invented numbers, not qualified field offsets or a ready production test. Before implementation, name the actual XML field, original physical witness, formatter rule and independent expected output for a supported fixture. Use a literal known field change or separately derived expectation; never have the writer under test generate its own oracle.

### 6.3 First field-policy questions

For every proposed type/field operation establish: what the field means for that type; unit/dimension and basis; default/absent/zero/sentinel rules; valid exact representation; connections and affected owners; allowed value change and independent output expectation. TYPE, direction and CNode edits can alter coupled meaning and are not silently treated as interchangeable scalar changes. Unknown values remain preserved and held rather than zeroed or guessed.

## 7. Proposed framework and WBS: where each part stands

The diagrams and full contracts are in [concept §§14–15](01_CONCEPT_NOTE.md), [architecture](02_ARCHITECTURE_FRAMEWORK.md), [WBS](03_WBS.md) and [implementation plan §12](04_IMPLEMENTATION_PLAN.md#12-detailed-restraint-first-implementation). Module identifiers are design responsibilities, not installed services.

| Module | Responsibility | Actual frontier / next requirement |
|---|---|---|
| M01 | Intake/custody | R0 exists; XML intake and real cancellation/terminal states planned. Parked fixes are references. |
| M02 | Existing CII→XML | Limited candidate exists; qualify selected restraint-bearing profiles and adapter. |
| M03 | Profiles/capabilities | Partial physical evidence exists; distinguish valid/preserved/editable/unsupported. |
| M04 | Canonical XML references | Prototype endpoint/name views exist; complete restraint occurrence/owner catalogue missing. |
| M05-R | Restraint meaning/operations | First family; type/field/context policy and editing not built. Other M05 families deferred. |
| M06 | Scope/correspondence | R0 lookup is not accepted mapping; node/occurrence alternatives and decisions planned. |
| M07 | Comparison/proposals | Exact before/proposed fields, compatibility and conflict records planned. |
| M08 | Review/session | Current owning-state approvals and invalidation for XML property work planned. |
| M09 | Approved XML application | Exclusive atomic represented-field changes and derived-reference updates planned. |
| M10 | Existing XML→CII | Candidate dependency exists; Property workflow invocation/qualification missing. |
| M11 | Workspace/UI | Existing Property tab is read-only; usable restraint selection/review/output planned. |
| M12 | Validation | Historical R0/probe evidence exists; independent restraint/no-op/bystander/stale-output checks needed. |
| M13 | Audit/export | New XML property TARGET1/audit workflow not implemented. |

| Plan checkpoint | Existing work-package lineage | Deliverable before moving on |
|---|---|---|
| I1 | WP01 / P0 | Actual capability/fixture/reuse assessment and first-operation decisions; independent expected changes. |
| I2 | WP02 / P1–P3 foundation | Qualified existing conversion, restraint preservation, no-op fidelity and represented-edit causality. |
| I3 | WP03 / new P1 extension | Responsive XML-backed intake and full restraint occurrence catalogue. |
| I4 | WP04 + WP05 / P2–P3 | Accepted correspondence and qualified field eligibility join; neither substitutes for the other. |
| I5 | WP06 / P4 foundation | Atomic reviewed XML transactions, existing writer, validation and new-copy output controls. |
| I6 | WP07 / first P4 delivery | An engineer completes a supported restraint case end to end, with actionable held/manual cases. |
| I7 | WP10 / scoped P6 | Exact-candidate non-author qualification, relevant native/import evidence and Owner integration/release decision. |

WP08 adds later editing families; WP09 adds structural operations. Neither is automatically required before a correctly bounded restraint delivery. However, an admitted whole file must preserve its unedited populated families; required preservation work belongs in WP02, not a hidden general force/material editing project. No checkpoint row has activated a new assignment or lease.

## 8. Failures, parked experiments and unresolved decisions

### 8.1 Reported loading and diagnostic problems

The Owner reported a generated CII staying at **Loading** indefinitely and another model producing many UNKNOWN notices. The exact reported generated input has not been qualified by the parked changes. The complaint is real evidence of the user journey; a guessed version/header diagnosis is not proof of its root cause.

| Symptom | Correct interpretation and next investigation |
|---|---|
| Loading never terminates | Trace file read → adapter/conversion → index → UI status; establish which boundary remains pending. A timeout Promise cannot interrupt synchronous work. Error/cancel/clear/reselection must revoke stale output and reach a truthful terminal state. |
| V14-only restriction | Actual R0 calls the existing parser and then enforces V14 plus strict structural rules. Inspect declared version and body; do not accept/reject only by filename/header and do not simply disable the gate. |
| `PROPERTY_AUX_CONTENT_UNQUALIFIED` | R0 bounded the typed pointer but did not qualify that family's content/cardinality/ownership. This is a coverage notice, not automatic proof of invalid engineering data. |
| `PROPERTY_RESTRAINT_DORMANT_RESIDUE` | Zero node/type/CNode with other nonzero slot payload was retained and surfaced as UNKNOWN. Preserve it. Do not infer vendor illegality or clear it to make the screen clean. |
| `PROPERTY_POINTER_RANGE_*`, cardinality/count/field failures | A structural/profile inconsistency requiring specific evidence; do not hide it as a generic coverage note. |

The planned UI groups repeated evidence, keeps details reachable and exposes one actionable summary. It must not suppress actual errors or promote unsupported data to editable.

### 8.2 Appendix A preservation

[Concept Appendix A](01_CONCEPT_NOTE.md#appendix-a--reuse-plan-for-parked-experiments) records intake status/stale-read guards, diagnostic grouping, test/probe work and XML exploration. The frozen reference archive is [PARKED_EXPERIMENTS_20261101.zip](reference/PARKED_EXPERIMENTS_20261101.zip), **25,694 bytes**, SHA-256 `d6c696d8db81ff47b205ca09045cd73b4125f7eac2843e51dca543e117e43b04`; Git blob `6e6d05c6b451dc03f11e495d090899674184236c`. Its register is [EXPERIMENT_REGISTER.json](reference/EXPERIMENT_REGISTER.json).

This is inert reuse evidence, not installed code. Inspect assumptions against the chosen design; adopt the smallest qualified part only after coding resumes. The earlier remote repair branch `fix/ciifr-property-load-xml-route-20261101` was left at its original main base with no implementation commit at the design pause; refresh it before any later use. Local experiments are not a current writer lease. The checkpoint does not require access to the outgoing session's scratch directory.

### 8.3 Open design decisions

| Decision | Recommended assessment / unresolved boundary |
|---|---|
| Existing schema and engine | Assess PR206's actual typed storage/view contract and production generation path; select qualified existing reconstruction rather than inventing another property writer. |
| First input profiles | State exact version/structure/features and fidelity. A V14 success cannot admit all generated V11/V14 files. Obtain a needed new real file through authorized custody only. |
| First restraint operation set | Choose evidence-supported existing-record types/fields; do not silently promise all 62 R0-accepted type codes or all scalar payloads. Target-only editing can validate plumbing; it does not replace accepted transfer mapping when transfer is in scope. |
| Runtime/browser integration | Existing prototype is Python; actual adapter/runtime, worker/cancellation, dependencies and memory limits are unresolved. Do not quietly move private files to a server or switch the runtime. |
| Output preservation | Exact no-op versus approved canonicalization must be explicit per profile; scoped edits must preserve every protected bystander and applicable structure. |
| Broader workstream overlap | Reconcile #230, existing converter ownership, PR206/246 and shared UI paths before assigning coding. An earlier role or open PR is not a current exclusive lease. |

## 9. Evidence, fixtures and acceptance limits

This checkpoint performed source/metadata inspection and documentation integrity checks only. **No new CII conversion, native test suite, browser trial, private model inspection or licensed CAESAR execution was performed for it.** Historical results stay bound to their original candidate/input/actor.

| Evidence | What is established / what is not |
|---|---|
| Final R0 integration | Reported native VNext125/125 and Geometry9/9 PASS on the approved integration; protected assets/mirror parity retained. This is not new XML restraint validation. |
| Public Windows R3 | Local executor `01429edb` reported six cases per Edge/Chrome; receiver reconciled actual returned bytes/harness/exact guards. Not a fresh run by this checkpoint author or a blind/distinct-human claim. |
| Original V14 trial | Authorized original custody and bounded executor PASS/receiver reconciliation were resolved for R0. Do not restore the stale ORIGINAL_NOT_RECEIVED blocker. That original is not automatically accessible in a successor's environment. |
| Original inventory | Historical sanitized aggregate: 521 elements, 122 restraint blocks, 156 rigids, six displacement blocks, zero force blocks; 87 material-assignment rows. Different endpoint/view-node counts use different populations; do not conflate them. No positive original FORCMNT case follows from zero blocks. |
| PR206 / parked XML probe | Limited conversion/name-edit evidence; supported restraint edit and general browser/runtime profile remain unestablished. |
| PR246 | Bounded section/profile evidence; no general correspondence, force meanings/units qualification or whole-file/native acceptance. |

Public synthetic SOURCE/TARGET0 fixtures are in [Common at pinned commit 56dbc3a0](https://github.com/reallakshman19/Common/tree/56dbc3a0af137c433ffb5fec48316fa2022d075c/relay/AGENT_WORK/CIIFR-Node/CIIFR-NODE-WBS-P0-20261028/payload). Each is 8,276 bytes, CRLF. SOURCE SHA-256: `c8de516c54767c7cf7d5239d404810be891ed3d56ec2111db3dc4c2b07dcdb0b`; TARGET0: `0bbc3b0a8b7b1e73d655d0a0ffc267e6a698dec5ff66763c468cdc835cc19661`. Download raw bytes and rehash; rendered text/copy-paste or line-ending normalization is not byte verification.

Useful historical receipts, not new execution claims:

- [R0 merge/completion](https://github.com/reallakshman19/Common/blob/18653c3022550321cee02cb1d443b59dc300e584/relay/AGENT_WORK/CIIFR-Node/CIIFR-NODE-WBS-P0-20261028/returns/R0-OWNER-MERGE-COMPLETE-20261031/receipt.md).
- [Controlled integration](https://github.com/reallakshman19/Common/blob/c856e17ff05b036ed192a199a0d08fbf242acf82/relay/AGENT_WORK/CIIFR-Node/CIIFR-NODE-WBS-P0-20261028/returns/P1-CONTROLLED-INTEGRATION-20261031/receipt.md).
- [Windows R3 receiver reconciliation](https://github.com/reallakshman19/Common/blob/7300882ba4694480a8ee18f7fdddd9d655970504/relay/AGENT_WORK/CIIFR-Node/CIIFR-NODE-WBS-P0-20261028/returns/P1-WINDOWS-R3-RECONCILED-20261029/receipt.md).
- [Original Windows receiver reconciliation](https://github.com/reallakshman19/Common/blob/2d8a239192de335e713356a809d789380b054283/relay/AGENT_WORK/CIIFR-Node/CIIFR-NODE-WBS-P0-20261028/returns/P1-ORIGINAL-V14-QUALIFICATION-20261030/windows-execution-20261030/execution-addendum-20261030/receiver-reconciliation/receipt.md).

The [14 restraint acceptance scenarios R01–R14](04_IMPLEMENTATION_PLAN.md#129-acceptance-scenarios-and-definition-of-done) are **planned expectations**, not 14 passing tests. They cover no-op preservation, changed numbering/slot order, duplicate identities/types, CNode/basis mismatch, changed scalar values, shared/unreferenced records, dormant payload, state/defaults, precision, exact selected-field output, forged provenance/conflicts, stale/partial approvals, failures/old tabs and independent native review.

The Owner-supplied [Hexagon V14 reference](https://docs.hexagonppm.com/r/en-US/CAESAR-II-Users-Guide/Version-14/337037) returned HTTP404 in this checkpoint's direct retrieval. Its current contents were **not newly verified**. Do not cite this retrieval as authority for restraint field/type semantics; obtain the actual applicable vendor documentation when qualifying those operations. The physical primer above is grounded in inspected R0 source and explicitly scoped prior evidence.

## 10. Operating rules for the incoming Oracle

Use [Common START_HERE](https://github.com/reallakshman19/Common/blob/main/skills/agent-work/START_HERE.md) and actual [XCU AGENTS.md](https://github.com/reallakshman19/XML_Compare_Utilities/blob/3051ea171f966ac611f232982e0b1cc0774ba368/AGENTS.md) with current Owner instructions taking precedence. **Engineering PR Delivery/A1–A5 was withdrawn by the Owner on 26 October 2026. Do not resurrect its exam/score/cycle requirements from stale AGENTS text or archived handoffs.** Keep substantive source grounding, backups, local patch/undo ledger, accurate validation and real writer custody. This document does not introduce a new onboarding exam or tracker.

The new Oracle's job is to own the aim, understand architecture and evidence, reconcile incoming work, choose the next useful bounded action and preserve the design order/authority. It may do authorized read-only planning itself. It is not automatically a product implementer, independent reviewer of its own work or PR246's integration owner. No OTM/hub/Cycle service, timer or agent roster is activated by takeover.

**Protection:** preserve Normal/NodeName, Nodal, Line+Node, Geometry, CIIFR_GEO and Config behavior and their owning approvals. Navigation alone must not invalidate another tab. Real changes to an owning input/rule must invalidate dependent output. Property output must enforce current approvals in backend operations as well as UI state.

**Private custody:** no protected CII, derived private XML, original digests, raw node/field ledgers, customer paths/screenshots or credentials in public GitHub/checkpoint archives. A historical authorized path is not access in a new environment. Do not search unrelated chats/Library or guess private links. Request a private locator only when the next actual task needs unavailable input; continue useful public/design work meanwhile.

**Handoff route:** historical records under `Common/relay/AGENT_WORK` remain read-only references. Current Common policy forbids new legacy relay writes. Use the [current one-ZIP artifact route](https://github.com/reallakshman19/Common/blob/67873c171498f6b1f5189180dbf2f1aa07b7e53f/local-agent-handoffs/README.md): actual project slug, fresh artifact-only branch, exactly one public-safe ZIP in an OPEN/DRAFT PR. Publication/readback is not successor retrieval, engineering acceptance or Owner approval. The present archive is an outgoing checkpoint, not a dispatched assignment. Owner alone controls merge/release unless a later explicit scoped authorization says otherwise.

## 11. Takeover runbook: first useful session

These are suggested timeboxes, not a gate or a requirement to rerun unchanged engineering tests.

| Order | Read/do | Observable result |
|---|---|---|
| 1 — orient | This checkpoint §§1–4; record actual session/model/role and source access | State what the engineer can do now, what is missing and why restraints/XML come first. |
| 2 — ground | Refresh main, PR245/206/246, #227/#230, relevant changed comments/claims | Record exact current refs and changed facts. Do not reuse this snapshot as live truth. |
| 3 — understand | Concept, Appendix A and §§14–15; architecture; WBS; plan §12 | Explain the design and challenge an unresolved choice; do not treat draft labels as accepted contracts. |
| 4 — trace | Open actual R0 `cii-index.js`, selected converter core/baseline/views, and one permitted public fixture or literal witness | Trace element → typed pointer → block → slot/node → proposed XML ref; classify code observation versus unexecuted design. |
| 5 — reconcile | Check #230 and converter/PR206/246 overlap, existing author/reviewer history, current custody | Choose the next executor/scope without inventing availability or inheriting an old lease. |
| 6 — return | Produce a compact I1/WP01 assessment linked to PR245/#227 | Supported/missing converter capabilities, open restraint contracts, independent falsifiers and one next bounded action; coding remains paused. |

If `gh` and local network are available, these are **read-only orientation examples**, not commands this checkpoint claims to have run:

```bash
gh api repos/reallakshman19/XML_Compare_Utilities/commits/main --jq .sha
gh pr view 245 --repo reallakshman19/XML_Compare_Utilities --json state,isDraft,headRefOid,baseRefOid,files
gh pr view 206 --repo reallakshman19/XML_Compare_Utilities --json state,isDraft,headRefOid,baseRefOid
gh pr view 246 --repo reallakshman19/XML_Compare_Utilities --json state,isDraft,headRefOid,baseRefOid
gh issue view 227 --repo reallakshman19/XML_Compare_Utilities --comments
gh issue view 230 --repo reallakshman19/XML_Compare_Utilities --comments
```

The GitHub plugin can obtain the same original sources when cloning/DNS is unavailable. Label a verified bounded source snapshot accurately; it is not a full checkout. A clone failure is not a product test failure. Before any later authorized edit, inspect overlaps, use native backup tooling and maintain the history-independent patch ledger. Do not overwrite an active author's branch or normalize a received fixture's line endings.

### The first bounded assessment

**Task:** assess the design's restraint correspondence/eligibility contracts against actual existing conversion support. **Inputs:** PR245 plan §12; PR206 pinned storage/views; R0 source; public fixture evidence; relevant native issues. **Output:** one source-linked table of existing capability / missing contract / independent wrong case / next consumer. Include node versus occurrence identity, CNode mapping, shared storage, dormant payload, numeric/state handling and runtime gap. Do not write a replacement parser, issue an implementation assignment or reopen closed R0 work. Return on PR245 / master #227 under actual posting authority. Ask the Owner only about genuinely missing intent or protected authority, not facts recoverable from those sources.

## 12. Where state lives and how to recover safely

Canonical design files are the four numbered documents linked below; `agents/PR245_workreport.md` carries the PR recovery record. This checkpoint and [copy-ready takeover prompt](06_ORACLE_TAKEOVER_PROMPT.md) are additional navigation, not a second source of mutable work status.

1. [01_CONCEPT_NOTE.md](01_CONCEPT_NOTE.md): WHY, ownership, boundaries, process map, usage and Appendix A reuse.
2. [02_ARCHITECTURE_FRAMEWORK.md](02_ARCHITECTURE_FRAMEWORK.md): M01–M13 and XML/storage/transaction responsibilities.
3. [03_WBS.md](03_WBS.md): WP01–WP10 mapped to existing P0–P6; no fresh program or activation.
4. [04_IMPLEMENTATION_PLAN.md](04_IMPLEMENTATION_PLAN.md): package preparation and detailed restraint implementation/acceptance.
5. [PR245_workreport.md](../../../../agents/PR245_workreport.md): change/recovery history and exact next action.

The outgoing local preparation directory is a bounded snapshot, not a required successor mount. Local `.agent-worklogs/20261101_oracle_checkpoint/` contains module patches/checksums and undo notes; native concept/report backups are #9/#10. They are deliberately uncommitted. For any correction, verify current bytes and later ownership; reverse only this task's recorded changes or restore matching preimages, never discard unrelated work or reset history. The durable Git documents/PR and Common archive remain sufficient to understand the mission if scratch disappears.

**Unfinished acceptance:** adopted conversion/schema/runtime contract; selected restraint profiles/types/fields; responsive XML intake; exact occurrence catalogue and correspondence; typed semantic policy; approval-bound atomic edits; existing-writer integration; independent no-op/changed-output/bystander evidence; end-to-end browser/native/import evidence appropriate to claims; Owner-controlled integration/release. Nothing in checkpoint publication closes these criteria.

**EXACT_NEXT_ACTION:** incoming Owner-appointed Oracle reads this checkpoint and actual changed sources, then returns the bounded I1/WP01 restraint capability/contract assessment above. Expected result is a concrete source-backed design decision/recommendation and falsifier list, not product code. Incoming actor/chat identity, retrieval/hash verification and acceptance remain NOT_CONFIRMED until that actor actually reports them.
