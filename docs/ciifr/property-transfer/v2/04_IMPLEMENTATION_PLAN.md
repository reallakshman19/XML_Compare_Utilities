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

## 12. Current disposition and next action

The concept, architecture, WBS and plan are **draft design artifacts**. Current product code remains unchanged by this package. Existing experiments are frozen reference material with an explicit Appendix A reuse/adoption plan.

Review the concept and Appendix A first. Resolve changes there, then reconcile the architecture, WBS and work-package plan in sequence. Coding resumes only within the resulting accepted scope; the next engineering work is not another unplanned loader patch or a newly invented writer.
