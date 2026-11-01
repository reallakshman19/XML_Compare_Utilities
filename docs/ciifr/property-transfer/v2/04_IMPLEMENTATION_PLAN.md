# CIIFR — implementation plan to follow the reviewed design

**v2.0 · Draft plan, not coding authorization · 1 November 2026**

Prerequisites: [Concept](01_CONCEPT_NOTE.md) → [Architecture/framework](02_ARCHITECTURE_FRAMEWORK.md) → [WBS](03_WBS.md). The Owner paused coding. This document prepares future bounded candidates; it does not install archived experiments or activate a writer.

## 1. Planning decisions before the first code package

| Decision | Recommended direction | Required evidence/decision record |
|---|---|---|
| Existing XML representation | Reuse/extend the existing reversible typed-XML storage contract and reference views where fit is demonstrated | Identify the actual schema/parser/writer contract and gaps; avoid a new universal XML schema |
| Input profiles | Start with a small explicit matrix that includes the relevant real V14 and generated-input routes | Actual file/header/body/encoding/layout witnesses; profile-specific positive and contrary cases |
| First engineering delivery | Existing-record restraint edit/transfer, with qualified field/type/context set | WP05 operation matrix; do not assume every type shares stiffness/gap/friction meaning |
| Output policy | Preserve the input profile/fidelity contract by default; expose explicit conversion separately | No-op and edit expectations, version/bridge audit and original-versus-derived identity rules |
| Runtime integration | Reuse the existing provider/runtime and isolate long-running work as supported | Browser/worker/provider contract, cancellation, memory/size and deployment compatibility; no silent new server |
| Migration | Introduce XML-backed Property services first, protect existing tabs | Exact shared surfaces and regression expectations; later adoption by old tabs is a separate scope |
| Parked work | Asset-by-asset adoption from concept Appendix A | Archive identity, current-source comparison and retain/adapt/evidence-only/reject decision |

Unresolved high-impact choices return to concept/architecture review. Routine implementation details may be resolved within an accepted package; they must not covertly change the selected writer, data authority or fidelity contract.

**Owner priority clarification: RESTRANT is the first active engineering family.** Scope common intake, XML-reference and transaction work around the first restraint delivery. Other editing modules, including FORCMNT/PR246 integration, remain deferred. Preserve all untouched input data; strictly necessary preservation grammar is supporting conversion work, not another feature stream. Coding remains paused during the ordered design review.

## 2. WP01 — capability and fixture baseline

**Objective:** establish what can be reused and which gaps actually prevent the requested workflow.

Preparation:

1. Refresh current main, relevant conversion/field workstreams and active file/authority overlap. Preserve the completed R0 baseline.
2. Trace RESTRANT records, node/occurrence ownership and selected restraint fields through the existing CII parser, XML Storage/view reference, represented edit, existing writer and output. Retain the archived name probe as secondary plumbing evidence; do not create a new name-feature milestone. This is source/fixture qualification, not a new parser implementation.
3. Build a coverage table by input profile, physical record family and operation. Separate grammar/reconstruction support from field semantic eligibility and runtime integration.
4. Obtain the exact reported generated file privately when available; compare its declaration and actual record layout. Use the public generated V11 benchmark as a separate known case, not a substitute identity.
5. Define independent expected outcomes and fixture custody. Distinguish complete converter positives from minimal R0-indexing synthetics.
6. Verify and classify Appendix A assets. Preserve their historical results without promoting them to qualification of a different design or head.

**Output:** reuse/capability matrix, selected first-profile/operation set, fixture/expected-result register, adapter/runtime fit assessment and specific upstream gaps. Close WP01 only when the first implementation boundary can be stated without guessing.

## 3. WP02 — qualify the existing conversion route

**Objective:** a trustworthy CII→XML→existing-writer→CII foundation for the selected inputs.

Use the exact existing dependency interfaces identified in WP01. Exercise both unchanged reconstruction and an explicitly represented field edit with the writer receiving XML, without an original-file replay argument or a hidden raw-CII fallback. The existing XML reuse probe may be adapted as a checker.

Make RESTRANT record preservation, including inactive/reserved payload and exact occurrence ownership, the first physical qualification target. Any early literal field-edit check proves representation/causality only; engineering edit eligibility follows WP05. PR246 is not a replacement for this restraint-specific proof.

Where a profile is unsupported, resolve the gap in the existing converter/bridge ownership boundary: version/layout variant, populated family grammar, lexical/encoding/termination handling, count/reference validation or a qualified inverse conversion. Do not solve it inside a property module or by renaming a header.

Preserve original metadata and distinguish a derived representation's addresses and identity. Require original-byte no-op equality under the selected exact-fidelity contract. Changed formatting must be exactly representable or fail visibly; copying values through a different numerical formatter must not silently round them.

**Output:** admitted profile set with actual source pins, conversion/reconstruction checks, clear refusal paths, supported runtime/provider contract and remaining limitations. Unsupported profiles stay explicit; a subset PASS does not become broad CII support.

## 4. WP03 — XML-backed intake and reference catalogue

**Objective:** files load to a truthful usable state and the two navigation paths resolve canonical XML references.

Reuse/adapt Appendix A's progress, terminal status, raw-byte custody, request-generation and grouped-evidence ideas after the adapter contract is selected. Extend job identity through conversion and indexing, not only file read/hash. Qualify actual cancellation of long-running work where supported.

Build logical-node, oriented-element and restraint-occurrence catalogues from the existing XML Storage/reference graph. Extend the existing XML view builder for RESTRANT first; displacement/force attachment features belong to later WP08. Keep shared records as shared references; keep inactive payload out of the active-attachment list while retaining its data/evidence. Preserve other-family storage without enabling its editing UI.

The workspace offers TO/FROM/either-end discovery as a filter and lists every owner. It never silently selects the first matching element or attachment. Known coverage notes are grouped and expandable; selected-operation blockers and actual structural failures remain clear.

**Output:** target-only XML inspection with terminal states, independent file custody, exact occurrence/owner evidence and capability display. Browser flow includes selection failure, clear/cancel, stale completion and successful retry. No export is inferred from inspection readiness.

## 5. WP04 — selection and correspondence

**Objective:** explicit operation scope and accepted cross-model relationships.

For local editing, record the selected target owners/occurrences/fields. For transfer, accept node, element and attachment maps at the granularity the family needs. Preserve alternatives, provenance, cardinality, direction, connection and mapping revisions.

Use qualified existing correspondence evidence where applicable, but keep discovery separate from permission to transfer. Handle duplicate same-type restraints, shuffled slots, parallel elements, reversed endpoints and connecting nodes explicitly. Initial manual selection can deliver a useful bounded workflow without requiring a new global automatic matcher.

**Output:** accepted mapping/scope ledger and exact expected candidate/hold sets on contradictory fixtures. It must not mark the whole broader #230 correspondence roadmap complete merely because a selected manual pairing works.

## 6. WP05 — restraint semantic policy

**Objective:** a precise operation allowlist for the first engineering module.

Reuse qualified existing restraint catalogues, conversion mappings and engineering rules where they agree with actual source/format evidence. Assess type-dependent meaning, direction, CNode relationships, units, defaults/zeros/inactive state, tags/GUIDs and shared storage. Do not inherit a mapping merely because its function name sounds authoritative.

Distinguish:

- Scalar edits on a compatible existing restraint.
- Transfer between explicitly paired compatible occurrences.
- Coupled type/direction/connection changes with wider semantic impact.
- New/deleted attachments and other structural requests.

Select the first operation set from that evidence; document unsupported cases and the engineer's resolution route. The earlier X/Y/Z, ground-connected subset can be considered, but it is not presumed to meet the complete Owner need. A fixed physical field width does not make every change in that field a low-risk operation.

**Output:** field/type/context eligibility matrix and independent positive/negative expectations. At minimum challenge stiffness/default state, gap versus other type-dependent payload, friction versus force meaning, CNode mapping and direction/case compatibility.

## 7. WP06 — common XML transactions, writer reuse and output

**Objective:** controlled approved edits reach the existing writer and only those edits reach TARGET1.

Implement the reviewed contracts for proposals, atomic transaction membership and approval fingerprints. Bind them to original and current XML identities, accepted mapping/scope, relevant semantic context and implementation/profile identity.

Apply approved intent to a new TARGET XML model. Validate before values and exclusive field membership, reject conflicts and unauthorized XML differences, regenerate derived references through existing routines and preserve the complete affected-owner closure. SOURCE and TARGET0 stay immutable.

Invoke the one selected existing reconstruction writer. Validate the resulting CII independently against approved intent, untouched fields/records, references/counts/arrays and the chosen fidelity/profile contract. Build audit/export from that validated candidate; do not rebuild output from current UI cells at download time.

**Output:** usable Review → Validate → Apply to New Copy → Export TARGET1/audit flow. Reject stale approval, forged field references, partially approved atomic groups, unrepresentable values, hidden defaults and failed publication. No property-specific CII byte writer is added.

## 8. WP07 — first engineering end-to-end delivery

**Objective:** the engineer can complete a restraint task through the XML-based browser workflow.

Combine the accepted profile, XML reference catalogue, selected restraint operation set, local edit/transfer mode, review and common output services. Demonstrate an independently expected changed output and clear manual routes for unsupported/missing/ambiguous cases. A benchmark name edit may validate plumbing; it does not substitute for this restraint-first delivery.

Use actual served code and relevant real/local input under authorized custody. Include the file/profile problem reported by the Owner when its exact fixture becomes available. Qualify the UI independently of CLI/backend success and protect existing tab approvals and exports.

**Output:** bounded usable candidate, complete source/profile/operation scope, actual browser/native evidence and remaining limitations. Any wider type/profile support is a later scoped extension, not a label applied to a narrow PASS.

## 9. WP08–WP10 — expansion, structure and acceptance

WP08 adds property modules behind the same XML intent interface. Each family supplies its own ownership, state, units/basis/case and validation rules. Prioritize imposed displacements and applied forces/moments after the restraint delivery as directed; maintain the element-process/physical/material/rigid path without confusing it with node ownership.

WP09 handles explicitly approved structural operations. Reuse the existing converter's qualified dependency logic for counts, pointers, shared ownership, material vectors, array boundaries and text lengths. Cases such as record insertion, deletion, reordering or a missing target attachment require their own expected postimage and recovery boundaries.

WP10 obtains genuine non-author review and relevant native application/import/engineering evidence for the actual candidate. Report authorship/exposure, executed versus unexecuted checks and exact source identities. Owner decides integration, deployment and release; those decisions are not inherited from the old R0 merge.

## 10. Candidate boundaries when coding resumes

Before each candidate, state the one coherent work package, existing source/dependency versions, intended changed surfaces and protected invariants. Use the repository's applicable native backups and local module-wise patch ledger; preserve unique WIP/PR recovery reports. Do not revive withdrawn process exams or introduce a new project tracker.

Expected surfaces are the existing converter/schema ownership boundary, an adapter layer, XML reference/family services, isolated Property UI and appropriate tests. Exact source paths and entry points follow the reviewed architecture and capability inventory; this plan does not prescribe a new serializer filename.

Existing Normal/Nodal/Line+Node/Geometry/CIIFR_GEO/Config behavior stays protected. Shared-shell or deployment/runtime changes require an explicit justified boundary. Mirror served/source modules according to the selected existing delivery layout. Keep original and derived private files outside public source/artifacts.

## 11. Verification plan by claim

| Claim | Required independent challenge | Evidence class |
|---|---|---|
| Input admission follows real structure/profile | Legitimate generated profiles, header/layout disagreement, malformed counts/references and lexical variants | Actual input/format witnesses and converter results |
| No-op is lossless | Each accepted input compared with its own reconstructed output, including preserved inactive/reserved data | Bytes/length/digest under declared profile |
| XML controls edits | Writer consumes XML; change a represented field; independently predict affected output | Edit-causality and bystander proof |
| Ownership and scope are correct | Shared nodes, different element process values, multiple attachments, aliases/shared records | Exact expected owner/field sets |
| Context is compatible | Case/set mismatch, unit constants, basis/direction, zero/default and type-dependent payload | Analytical/format/engineering expectations |
| Mapping is explicit | Renumbered nodes, shuffled slots, duplicate/parallel elements, reused targets, reversed orientation | Accepted-map versus contradictory cases |
| Approval remains current | Pending read/conversion, file clear/reselection, XML/mapping/context edit and late completion | Actual backend and browser state results |
| Output is atomic | Unsupported value/grammar, failed validation/publication, stale export | No successful partial output or original overwrite |
| Old workflows stay protected | Existing affected regressions and real tab navigation/approval/export | Native tests and actual served UI |
| Engineering acceptance is bounded | Relevant import/input echo and engineering review for selected changes | Native application/independent review; NOT_RUN remains visible |

Run checks appropriate to actual changes and the repository baseline. Preserve failures and independent expectations; do not regenerate an oracle from the implementation merely to obtain green output. Use the archived experiments as evidence/scenario candidates, not as current-head qualification.

## 12. Detailed restraint-first implementation

This section elaborates concept §§14–15 into a concrete coding plan for M01–M13 and the existing WP01–WP07/WP10 packages. It adds no parallel WBS or serializer. All responsibilities and interfaces below are proposed; their existence in this document does not mean they are implemented.

### 12.1 First usable outcome and scope

The first delivery must let an engineer select an existing restraint occurrence, review qualified field changes, and obtain a validated TARGET1 through the existing XML reconstruction writer. Support target-only typed Find/Replace/edit and the explicitly qualified SOURCE→TARGET transfer scope chosen at design readiness. A new inspector, a benchmark name edit, or a FORCMNT demonstration is not the restraint delivery.

Start with existing populated restraint occurrences. The selected type/field operation set is established by WP05, not assumed from a shared numeric storage position. Changes to attachment nodes, type, direction, CNode, tags/GUIDs or other coupled identity/context fields require their own explicit operation policy. Adding/removing blocks or slots, reindexing, geometry/basis conversion and unit-system conversion remain separately scoped.

Preserve every untouched family and inactive/reserved field in an admitted whole input. Where the existing converter lacks grammar necessary for preservation, qualify a focused upstream extension or declare that profile unsupported. Do not drop unrelated records or start a second engineering-feature stream merely to pass a round trip.

### 12.2 Preparation and reuse contract

Before implementing the adapter, produce one restraint trace sheet for each first-profile fixture:

| Trace item | Required content |
|---|---|
| Original custody | Actual input identity, version declaration, measured structure/encoding/terminators and permitted private/public custody |
| Existing conversion | Exact parser/schema/writer versions, admitted physical profile, represented sections and known gaps |
| RESTRANT storage | Original typed reference, canonical record and occurrence, fields, inactive/reserved payload and all storage owners |
| XML view | References connecting the logical node and restraint occurrence to authoritative Storage, without duplicate writable values |
| Field intent | Qualified meaning, units/state/context and the exact proposed operation; physical preservation and semantic edit permission distinguished |
| Output expectation | Independent expected selected changes, retained identities/structure and protected bystanders |

Reuse the archived intake/status/cancellation/evidence scenarios after comparing them with the selected adapter contract. Keep their old V14-only assumptions out of the new profile selector. Reuse the existing converter's formatting, relationship validation and reconstruction. The PR246 ownership/provenance approach is reference evidence only; its force layout and benchmark pin do not supply restraint grammar or a SOURCE→TARGET matcher.

### 12.3 XML-derived catalogue and identity contracts

Build the catalogue from the existing XML model, not by reparsing CII in the restraint plugin. Use existing schema identities where available; field names below express responsibilities rather than a new XML schema.

| Record | Required identity and content | Rule |
|---|---|---|
| Document context | Original CII identity, current XML identity, original/derived profile, converter implementation, model-context evidence and job generation | Original provenance and current/output identity must remain distinct |
| Logical node reference | Document-scoped node identity, endpoint/attachment occurrences and connecting-node relationships | Same numeric ID in different documents is not a match; a connecting/attachment node need not be an ELEMENTS endpoint |
| Restraint occurrence | Document + canonical RESTRANT record + local slot/occurrence ID; attachment-node field; type/direction/connection fields; owners; active/inactive/unresolved state | Node+type alone is not a unique identity; slot and pointer numbers are local addresses |
| Restraint field reference | Canonical XML field key, stored typed value, original lexical/layout metadata, explicit/default/unspecified/unknown state and semantic policy | The property module changes represented values; the existing writer owns physical formatting |
| Accepted pair | Source and target occurrence refs, accepted node relation, any required CNode/basis relation, evidence/alternatives, decision and mapping revision | Mapping acceptance does not automatically authorize every field edit |
| Approved transaction | Target occurrence/field set, exact before/proposed values, source witnesses where used, affected-owner closure, policy/profile revisions and decision fingerprints | No unapproved or stale differences may enter the edited XML |

Keep all referenced owners. Shared and unreferenced records must not be silently cloned, deleted or counted only by used pointers. A shared selected field needs explicit approval of its complete impact, or a held outcome where that operation is not qualified.

Classify active, inactive-preserved and unresolved occurrences using the admitted profile's rules. A zero-node slot retaining direction values must not be promoted to an active restraint or cleared as cleanup. Its original data remains in Storage even if it is absent from the active-restraint picker.

### 12.4 Restraint correspondence algorithm

Target-only edits skip SOURCE correspondence and begin with an explicit selected target occurrence. Transfer mode follows this sequence:

1. **Freeze input contexts.** Require both current XML models and their original identities/profile evidence. Start a new mapping generation when either input changes.
2. **Resolve the node relation.** Use an accepted manual node pair or qualified existing correspondence evidence. Show competing candidates; never infer equivalence from equal numbers, labels or ordinal positions.
3. **Enumerate occurrences.** List every source/target restraint at those nodes with canonical record/slot, type, direction, connection and storage-owner evidence. Do not choose the first record or the same slot index.
4. **Assess identity context.** Check the relevant type/axis/direction/connection rules. For positive CNodes, require the appropriate accepted relationship or a qualified connection-state rule. Element orientation matters where the restraint's meaning depends on that owner; it is not a universal matching shortcut.
5. **Retain alternatives.** Keep zero, one or several compatible candidates and the reasons. A unique candidate can be proposed for acceptance; uniqueness alone does not grant transfer authority. Tags/GUIDs are evidence only where their identity meaning is qualified.
6. **Accept the occurrence pair explicitly.** The first transfer scope is one accepted source occurrence to one selected target occurrence. Target reuse, aggregation and fan-out require separate explicit policies; they do not arise from duplicate rows.
7. **Evaluate selected fields.** Apply WP05 semantics, units, basis/state and operation rules. Stiffness, gap or friction differences being transferred must not be mandatory identity-equality conditions: requiring equal values would defeat the intended change.
8. **Bind the decision.** Retain all pair/context witnesses and mapping revision in the proposal/approval. A later mapping or context change makes dependent proposals stale.

Keep candidate/accepted/ambiguous/incompatible/unmapped/stale mapping states separate from field eligibility and reviewer approval. A manually accepted pair must still fail if its selected field meaning or output cannot be established.

**Illustrative expected case, not executed evidence:** accept source node 500→target node 850 and source CNode 700→target CNode 970. Source occurrence slot 2 and target occurrence slot 5 are compatible under a qualified same-basis type policy. Only gap is selected, from target 1 mm to source 2 mm. The intended output changes that target gap only: target node 850, CNode 970, target pointer/slot, stiffness, friction, tags and every other occurrence remain unchanged. A second same-type target restraint without a resolved connection/occurrence relationship remains an alternative or hold. The source's node, pointer or slot integers are never copied as target identities.

### 12.5 Field policy and typed Find/Replace

WP05 must define the initial supported operation rows before they can become selectable editing controls:

| Field/context group | Read/compare requirement | Edit/transfer admission |
|---|---|---|
| Attachment node and storage owners | Resolve exact identity and complete owner impact | Preserve in initial scalar operations; changing attachment identity is a separately qualified operation |
| Type and direction | Decode actual profile/type semantics and relevant axis/owner conventions | Preserve unless a qualified coupled operation explicitly covers the change |
| CNode/connection state | Distinguish the qualified ground/connection/default cases and accepted cross-model relation | Do not copy a source CNode integer into the target; connection changes need explicit policy |
| Stiffness-position payload | Establish meaning/dimension for the selected type and distinguish explicit value from default/unspecified state | Transfer/edit only the qualified meaning, compatible context and exactly representable value |
| Gap-position payload | Establish distance, rotation or other type-dependent meaning and zero/default behavior | No generic numeric replacement across different meanings or dimensions |
| Friction-position payload | Establish friction versus another type-dependent quantity, units/state and permitted values | Do not label every value in this position Mu |
| Tags/GUIDs and text | Preserve payload/length/encoding and distinguish identification from an intended text change | No automatic identity copying; include only a separately qualified text operation |
| Inactive/reserved data | Retain exact storage and explain its classification | No activation, deletion or zeroing as an incidental edit |

For a target-only numeric Find/Replace rule, select the named field, eligible occurrences and typed match/replacement meaning. Do not run regex over numeric CII records. Preserve Decimal/exact-state distinctions; no arbitrary epsilon, binary-float underflow-to-zero, default coercion or silent rounding. A numerically equivalent lexeme is normally a no-op, subject to the field's signed-zero/state semantics; formatting-only changes require a separate visible intention.

Use qualified unit/basis conversion only if it is explicitly in the selected operation set and reuses an established converter. Otherwise hold incompatible contexts. A stored zero or blank must not acquire an invented physical meaning from a generic parser convenience.

### 12.6 Proposal, XML application and existing-writer contract

For each selected occurrence, construct a complete proposed transaction containing canonical target fields, exact before/proposed typed values, source refs where applicable, selected semantic operation, compatibility evidence, affected owners and the whole atomic membership. Unselected differences are observations, not automatic changes. Conflicting proposals over the same canonical target field require resolution; no last-writer-wins behavior.

At Apply, verify the current original/XML/mapping/profile/context identities and approval membership again. Compare XML Storage before/after against the permitted field set, including qualified derived-view/metadata updates. Reject forged references, unknown extra edits, mismatched before values and partially approved groups before invoking the writer.

Apply to a new TARGET XML model. Use the existing routines to regenerate reference views or dependencies; do not add a second authoritative value copy in the node view. The existing writer receives that validated XML and the selected profile. It must not obtain permission to replay a whole original CII while ignoring represented edits.

M12 then compares candidate CII with the approved expected result and original bystanders. Check retained node/type/direction/CNode identities where not selected for change, record/slot counts, pointers, text, units/model context and unrelated sections. Fixed existing numeric-field edits should preserve length/layout under the qualified profile; separately declared variable-length or structural operations need their own dependency/difference contract.

Internal XML integrity hashes detect consistency, not original-source authenticity. Bind source/owner witnesses to frozen original custody and approved intent; independently challenge resealed wrong-owner/shifted-provenance cases. Product services reuse the existing converter; independent validation fixtures/oracles must not simply reproduce its own answer.

Export only the already validated, still-current new-copy candidate and audit. An existing file is not overwritten. If validation or publication fails, retain originals and expose no successful partial output; scratch output existence is not proof of acceptance.

### 12.7 State, cancellation and UI behavior

Use a state model that distinguishes original loaded, XML ready, catalogue ready, scope/mapping ready, proposed, reviewed, validated, applied-to-new-copy and exportable. The exact runtime labels can follow the existing shell; each state must have defined prerequisites and revoked capabilities.

| Change/event | Required consequence |
|---|---|
| File selected, reading/conversion begins, file cleared or load fails | Revoke dependent plans/output immediately; show a terminal outcome when work ends; retain an unaffected document's valid custody |
| Source/target XML, selected occurrence/fields, accepted mapping or relevant context/policy changes | Recompute affected proposals and require fresh approval/validation |
| Older read/conversion/hash/validation completes | Ignore the stale result; it cannot restore old rules, decisions or export |
| Navigate between independent tabs | Preserve still-current owning state; do not reintroduce the R0 navigation-invalidation defect |
| Change a display filter | Do not silently approve, drop or change hidden selected transactions; show the full affected/approved scope |
| Backend Apply/export called directly | Enforce the same context, approval, field and postimage checks as the UI |

The restraint review screen needs node/occurrence/type/direction/CNode, before/proposed values, units/state and eligibility reason as primary information. Put storage owners, XML field refs, original/derived physical witnesses and raw lexical data behind evidence details. List alternatives and a concrete next action for ambiguity, missing context, unsupported operations and structural requests.

### 12.8 Implementation package sequence and allowed surfaces

These are internal delivery checkpoints within the existing WPs; they need not become separate agents, PRs or a new tracking system.

| Checkpoint | Work to prepare/implement after design readiness | Existing/new responsibility boundary | Exit artifact |
|---|---|---|---|
| I1 — evidence and contracts | WP01 restraint traces, capability matrix, first fixtures/operation set and Appendix A disposition | Read existing converter/schema/catalogue first | Reuse decision and independent expectations; no guessed profile/type rules |
| I2 — conversion foundation | WP02 qualified RESTRANT preservation and XML-controlled representation checks | Existing converter/bridge ownership; an adapter calls it | Exact no-op/edit-causality evidence and explicit profile gaps |
| I3 — intake/catalogue | WP03 terminal intake, immutable custody and XML restraint references | M01/M03/M04/M11; adapt parked patterns, no new CII reader | Actual reference/owner lists and stale/cancel behavior |
| I4 — mapping/eligibility | WP04 and WP05 occurrence pairing, field semantics and typed comparison | M05-R/M06 with reusable context/catalogue services | Exact accepted/ambiguous/held sets and field-operation policy |
| I5 — transaction/output | WP06 approved XML application, existing-writer gateway, postimage validation and audit | M07–M10/M12/M13 | Correct selected restraint output plus rejected forged/stale/partial cases |
| I6 — usable browser flow | WP07 integrate the selected restraint journey | Isolated Property workspace; shared shell only where necessary | Engineer completes the selected task and exports TARGET1/audit |
| I7 — qualification | WP10 non-author review, actual served browser and relevant native validation | Review/operator responsibility separate from implementation | Exact-candidate results and Owner integration/release decision |

Proposed source responsibilities are an XML adapter, restraint catalogue, restraint mapping/policy, proposal/session service, approved-XML change service and UI integration. Finalize actual filenames/language from the selected existing APIs. Do not create a restraint CII parser/formatter/writer in the property folder. Existing conversion extensions stay upstream; source/served parity follows the existing deployment contract. PR246 and other-family editing are outside these first-delivery checkpoints.

### 12.9 Acceptance scenarios and definition of done

| Case | Independent expected outcome |
|---|---|
| R01 — admitted restraint-bearing inputs | Each input's own unchanged CII→XML→CII is exact under its declared profile; inactive and unrelated data retained |
| R02 — renumbered nodes and reordered slots | Accepted node/occurrence relation selects the intended target; slot/pointer integers are not copied |
| R03 — same IDs or duplicate same-type occurrences | No automatic identity from equal numbers or first match; retain alternatives and require an explicit accepted decision |
| R04 — CNode/basis/type mismatch | Hold incompatible or unresolved selected operations; no guessed connection/vector transform |
| R05 — changed scalar values | Differing stiffness/gap/friction values do not by themselves prevent identifying the intended occurrence; only selected qualified fields change |
| R06 — shared/nonincident/unreferenced storage | Preserve the qualified record/owner relationships; show full selected impact, do not clone/drop records or invent endpoint-only attachment rules |
| R07 — dormant payload | Zero-node inactive slots with retained direction/payload remain unchanged and are not active target choices |
| R08 — default/zero/type-dependent meaning | Distinguish explicit/default/free/unspecified states; reject unsupported interpretation instead of coercing to zero or generic Mu/gap |
| R09 — precision/lexical boundary | Exact representability or a clear failure; no rounding, truncation, underflow or unnoticed format change |
| R10 — selected gap-only example | Only independently specified target gap changes; target identities, CNode, stiffness, friction, other occurrences and other families are unchanged |
| R11 — forged XML/provenance or competing claims | Backend rejects inconsistent/unauthorized fields and resealed false source/owner witnesses against trusted custody/intent |
| R12 — partial approval or stale work | No half-applied atomic transaction, old async result, stale preview or stale export |
| R13 — failure and old-tab protection | No overwritten original/existing destination or accepted partial output; independent legacy tab approvals still behave correctly |
| R14 — native and independent review | Relevant imported/input-echo restraint values and retained context match the expected candidate; unmet tests remain NOT_RUN |

Use representative real/private and public synthetic cases with explicit independent expectations. A valid minimal indexing fixture is not automatically a complete XML/native profile. Keep the original inputs private and immutable; publish permitted sanitized evidence with actual candidate/source identities.

**Done for the selected first scope** means a usable restraint workflow produces the independently expected TARGET1 and trace, supports its declared profiles/operations, preserves protected data/old workflows, rejects contrary cases and has the relevant independent/browser/native evidence. It does not mean all 62 restraint types, structural edits or all other families are qualified. Coding and release still require the corresponding accepted scope and Owner decision.

## 13. Current disposition and next action

The concept, architecture, WBS and plan are **draft design artifacts**. Current product code remains unchanged by this package. Existing experiments are frozen reference material with an explicit Appendix A reuse/adoption plan.

Review the concept and Appendix A first. Resolve changes there, then reconcile the architecture, WBS and work-package plan in sequence. Coding resumes only within the resulting accepted scope; the next engineering work is not another unplanned loader patch or a newly invented writer.
