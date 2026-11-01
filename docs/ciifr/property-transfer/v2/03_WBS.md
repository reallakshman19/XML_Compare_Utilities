# CIIFR — WBS derived from the XML concept and framework

**v2.0 · Draft planning baseline · 1 November 2026**

Order: [01 Concept](01_CONCEPT_NOTE.md) → [02 Architecture](02_ARCHITECTURE_FRAMEWORK.md) → this WBS → [04 Implementation plan](04_IMPLEMENTATION_PLAN.md) → code. Dependencies below are proposed work packages, not dispatched issues, assignments or coding authority.

## 1. Preserve the existing program

[Master issue #227](https://github.com/reallakshman19/XML_Compare_Utilities/issues/227) remains the canonical P0–P6 program. Existing R0 inspection was merged and its bounded qualification tasks closed. This proposal retains those facts and adds a design rebaseline and future XML-backed capability; it does not reopen the completed inspector or claim that it already supplies a writer.

| Canonical phase | Retained meaning | XML-route refinement |
|---|---|---|
| P0 | Intent, architecture, requirements and fixture custody | Establish these four ordered design documents; assess existing conversion capabilities and representative input profiles |
| P1 | Read-only intake and two-path inspection | Existing R0 is complete within scope. A new extension would obtain XML-backed intake, capability display and reference catalogues |
| P2 | Accepted node/element/auxiliary correspondence and discovery | Explicit XML-reference mapping; TO-only navigation enumerates owners; no automatic identity from IDs or slots |
| P3 | Typed semantic readers/comparison | Restraints first, with field-specific units/state/type context; wider families and process remain modular |
| P4 | Qualified reviewed existing-record changes | Apply approved XML changes and reuse the existing XML reconstruction writer; no new property byte writer |
| P5 | Structural transactions | Separately qualify record creation/deletion, dependent counts, pointer/index and MISC/array updates in the existing conversion boundary |
| P6 | Independent validation and Owner release | Exact-candidate browser/native/import/engineering evidence appropriate to claims, then explicit Owner release decision |

## 2. Design sequence before coding

| Step | Deliverable | Dependency | Current state | Review exit |
|---|---|---|---|---|
| D1 | Concept note, complete property/ownership scope, reuse policy and Appendix A | Owner direction | Draft prepared | Intended behavior, boundaries and fidelity contract understood |
| D2 | Framework/modules, XML authority, interfaces and migration boundaries | D1 | Provisional draft | Responsibilities and existing-module reuse choices resolved sufficiently for planning |
| D3 | WBS, dependency order, roles, deliverables and acceptance | D2 | This draft | No missing work between UI, conversion, engineering meaning and output |
| D4 | Implementation plan, inputs, candidate boundaries and verification | D3 | Draft prepared | First work package can be implemented without guessing the architecture or engineering scope |
| Code | Bounded implementation candidates | Reviewed D1–D4 and applicable Owner scope | **Paused** | No implementation starts from a document's existence alone |

Changes discovered in D2–D4 that alter the concept return to D1 explicitly. They must not be buried in a patch. No new cycle protocol, agent launch, exam or parallel project tracker is introduced.

## 3. Dependency-ordered work packages

| WP | Phase | Deliverable | Main modules | Depends on | Evidence needed for completion |
|---|---|---|---|---|---|
| **WP01** Existing capability and fixture baseline | P0 | Reuse inventory; input profile and operation coverage; fixture/independent-expectation plan; exact reported-file custody when provided | M01–M03, M12 | D1–D4 | Existing versus missing grammar/semantics/runtime coverage explicit; no broad qualification from a narrow specimen |
| **WP02** Qualified existing conversion route | P1/P3 foundation | CII→existing XML→existing writer→CII for the selected profile set; focused upstream extensions only if needed | M02, M03, M10, M12 | WP01 | No-op fidelity and represented-edit causality; unsupported profiles fail specifically; pinned dependencies and runtime/provider fit |
| **WP03** XML-backed intake and catalogue | New P1 extension | Terminal/responsive intake, capability UI, XML node/element/attachment views and original custody | M01–M04, M11 | WP02; approved reuse from Appendix A | Actual file-selection/clear/cancel/race cases; complete occurrence/owner references; grouped retained evidence |
| **WP04** Scope and correspondence | P2 | Target-only selection, explicit node/element/attachment maps, competing candidates and TO-only discovery | M04, M06, M11 | WP03 | Different numbering/order/slots, repeated FROM–TO and conflicting targets produce expected selections/holds |
| **WP05** Restraint semantics and field policy | P3 | Type/field/state/unit/basis/connection capability matrix; independently expected allowed and held operations | M03, M05-R, M12 | WP01/WP02; uses WP03 references | Stored/default/inactive distinctions and type-dependent meanings demonstrated; initial operation set explicit |
| **WP06** Common XML transaction and output controls | P4 foundation | Proposal/review session, exclusive approved XML application, existing writer invocation, validation and new-copy audit/export | M07–M10, M12, M13 | WP02, WP04, WP05 | Forged/stale/unapproved edits rejected; atomicity, protected bystanders and originals demonstrated |
| **WP07** First usable restraint delivery | P4 | End-to-end target-only edit and/or SOURCE→TARGET existing-record restraint transfer under the selected scope | M05-R plus common framework/M11 | WP03–WP06 | Engineer can resolve a selected case and obtain validated TARGET1; unsupported cases have actionable manual routes |
| **WP08** Further property modules | P3/P4 expansion | Names/labels, process, displacement, forces/moments, physical/material/rigid and other typed families | M05-N/P/D/F/E/A, common services | Stable WP06; family-specific evidence | Separate supported operation sets, independent expectations and no duplicated CII grammar/writer |
| **WP09** Structural operations | P5 | Explicit additions/deletions/reindexing with qualified dependency closure | Existing conversion ownership + M09/M12 | Relevant earlier modules; separate accepted scope | Boundary cases for counts/pointers/material vectors/text lengths; no stale references or hidden record loss |
| **WP10** Independent qualification and release | P6 | Exact-candidate review, served-browser tests, relevant native import/engineering checks and recovery/release artifacts | M11–M13 and independent reviewer | Relevant completed delivery WPs | Separate source/byte/browser/import/engineering results; Owner-controlled integration and release |

WP08 and WP09 are capability tracks, not prerequisites to shipping a correctly bounded WP07. Conversely, a successful name-edit plumbing check does not replace the restraint-first engineering delivery.

## 4. Roles and ownership

| Responsibility | Required performer role | Boundary |
|---|---|---|
| Intent and scope | Owner, informed by design review | Decides architecture direction, significant scope and release |
| Existing conversion/schema ownership | Maintainer of selected existing converter/bridge | One upstream grammar/serialization implementation; no family-specific clone |
| Framework integration | Assigned bounded implementer after design readiness | Custody, reference, mapping, transactions, UI and output contracts |
| Property semantics | Family implementer with engineering evidence/review | Defines supported operations; does not self-certify broad engineering legality |
| Independent expectations and review | Genuinely non-author reviewer where required | Actual candidate, authorship/exposure and evidence limits disclosed |
| Authorized real-file/native trial | Owner or authorized local operator | Private custody, actual runtime/application evidence and sanitized return |

These are responsibility definitions. No person/agent is assigned, invoked or newly granted writer custody by this table. Existing open work such as #230 correspondence, Element workstreams and PR206 conversion must be reconciled before a coding assignment.

## 5. Requirement trace

| Concept requirement | Delivery WPs | Key acceptance question |
|---|---|---|
| C01–C02 | WP01/02/03/06 | Is XML authoritative, and is exactly one existing reconstruction writer used? |
| C03 | WP01/02/03 | Are actual input structure and profile checked, and does every load finish/cancel visibly? |
| C04–C06 | WP03/04/07 | Is the intended owner/occurrence selected, with an explicit mapping where needed? |
| C07 | WP02/05/07/08 | Are units, state, case, basis and field meaning sufficient for this exact edit? |
| C08 | WP04/06/07 | Can the engineer get a qualified proposal or a clear resolution route? |
| C09 | WP06/07/10 | Can stale, conflicting or partially approved work reach output? |
| C10–C11 | WP01/02/06/10 | Do independent expectations prove the intended change and protected bystanders, with full trace? |
| C12 | WP05/07/08 | Is restraint delivery first while the framework remains extensible? |
| C13 | WP03/06/07/10 | Are the existing tabs, input custody and deployment contracts protected? |
| C14 | WP01/03/05 | Are limitations distinguished from invalid structure and from engineering approval? |
| C15 | WP01/02/03/06/10 | Was each parked asset assessed and requalified rather than installed by assumption? |

## 6. Fixture strategy

Use a small representative matrix with independent expected outcomes, then expand where a new grammar or semantic claim requires it:

- Owner-authorized original V14 and the exact reported generated file, when received privately.
- Public generated V11 benchmark and supported V14 profiles; actual version/layout/encoding/terminator variants, not renamed headers.
- Populated supported auxiliaries and selected unsupported populated families to test clear capabilities/refusal.
- Shared-node elements with different process values; multiple restraint occurrences, shuffled slots and CNodes.
- Text aliases/shared names; prescribed zero versus free/default state; exponent/precision/width limits; preserved inactive payload.
- SOURCE/TARGET renumbering, duplicates, reversed orientation and missing/competing mappings.
- Pending-read/conversion cancellation, stale validation/export, malformed XML and failed atomic publication.

R0's minimal indexing fixtures and its passing tests do not automatically constitute complete XML-converter or native-CAESAR fixtures. Each fixture records which profile/claim it exercises. Keep real, public synthetic, derived and malformed cases distinct; keep protected model data private.

## 7. Review and progression rules

Proceed through the design in the requested order. Before coding, resolve the selected existing XML adapter contract, first input-profile set, first restraint operation set, output fidelity policy and runtime fit. Keep remaining future capabilities explicitly deferred.

A bounded input/profile gap blocks that profile's write qualification, not unrelated concept/design work. No merge/release follows automatically from a WBS row or a PASS label. Existing R0 acceptance remains separate from the new XML workflow. Record PASS/FAIL/NOT_RUN against the claim actually executed, not the program as a whole.

The [implementation plan](04_IMPLEMENTATION_PLAN.md) expands WP01–WP10 into coding preparation and candidate acceptance. Until D1–D4 are reviewed, all implementation rows remain planned.
