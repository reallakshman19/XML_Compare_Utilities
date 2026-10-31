# Restraint-first W1: existing-slot property transfer

**Status: concrete implementation proposal; no property writer implemented or enabled by this document.**

Prepared 31 October 2026 against `XML_Compare_Utilities/main` at `f7ada348f51017f9ca335281c35c4e90fc79b74d`. Owner asked whether the writer was finished, then directed preparation of the restraint-first scope. R0 inspection is merged; the larger transfer goal remains unfinished. This proposal supplies the specific P2/P3 prerequisites and P4 deliverable for a working first writer. It does not activate P5 structural changes or authorize merge/deployment.

Parent: [property workstream #224](https://github.com/reallakshman19/XML_Compare_Utilities/issues/224), [master WBS #227](https://github.com/reallakshman19/XML_Compare_Utilities/issues/227). Correspondence seam: [#230](https://github.com/reallakshman19/XML_Compare_Utilities/issues/230). Existing common-writer contract: [#139](https://github.com/reallakshman19/XML_Compare_Utilities/issues/139). The current R0 acceptance and its tests remain valid within their scope.

## 1. The usable result

Inside **Property Transfer → Node → Data → Restraints**, an engineer will:

1. Load SOURCE and TARGET0 V14 files. Both are required for transfer; TARGET0-only inspection remains usable.
2. Choose a SOURCE node and TARGET0 node independently. Enumerate every restraint occurrence on each side.
3. Explicitly pair one SOURCE occurrence with one existing TARGET0 occurrence. Show the owning element, typed pointer, block and slot on both sides, even when their numbers differ.
4. Review eligible **stiffness, gap and friction coefficient** differences, with units, restraint direction/type, old/new values and exact stored lexemes. Unsupported rows show a reason and a route to resolve it.
5. Select fields, approve the proposed transaction, Validate, Apply to New Copy, then Export TARGET1 plus a local change audit.

SOURCE and TARGET0 remain immutable. A successful delivery includes a real TARGET1 with independently expected changed bytes; another inspector-only tab is not completion of W1.

The first proposed profile is deliberately small: **basic global double-acting X, Y or Z translational restraints, CNode=0 on both sides, already populated target slots, verified matching units and coordinate basis**. The numerical type-code mapping and stored direction representation must first be qualified for V14. The type names here are a proposed admission set, not an already verified numeric enum.

## 2. Why the mapping differs from process-property transfer

| Question | Element-owned process data | Node-attached restraint data |
|---|---|---|
| Discovery | A node finds incident elements, or an exact oriented FROM→TO query finds candidate element records | A numeric node finds all restraint occurrences, including attachment-only nodes |
| What is paired? | One explicitly selected SOURCE element with one TARGET0 element, plus qualified operating-condition/field context | One explicitly selected SOURCE restraint occurrence with one TARGET0 occurrence, plus qualified type/direction/connection context |
| Local physical address | Element record and field | Owning element → RESTRANT pointer → auxiliary block → slot → field |
| Is equal node number sufficient? | No | No |
| Is equal FROM→TO or equal ordinal sufficient? | No | No; the owning element is storage provenance, not the restraint's cross-model identity |
| Is equal slot number sufficient? | Not applicable | No. SOURCE slot 2 may legitimately pair with TARGET0 slot 5 |
| Is orientation significant? | Explicitly preserve element orientation; reversal/splitting requires separate policy | Global X/Y/Z context must agree. GUIDE/LIM and other local/directional types are outside W1 |

Do not require a restraint node to equal its storage owner's FROM or TO node merely to simplify indexing. Storage ownership and physical attachment are distinct. Do not copy a whole block, pair the first matching type, or treat the six slots as a universal X/Y/Z/RX/RY/RZ ordering.

RIGID remains element-owned. DISPLMNT and FORCMNT require their own specification/vector/case semantics. None is admitted through the restraint writer.

## 3. What current source actually supports

At the bound main commit:

- `ui/property-transfer/cii-index.js` indexes V14 positive-node ELEMENTS, validates typed pointer bounds, and resolves four auxiliary families. RESTRANT blocks are 24 cards: six occurrences of four cards. It presently exposes restraint node, type, CNode, owner, pointer, slot and record span. Its own qualification string says stiffness/gap/tag/GUID semantics are not qualified.
- `ui/property-transfer/panel.js` retains only the index and file hash after loading. Transfer needs immutable raw-byte custody as well; DOM text and parsed numbers cannot reconstruct TARGET0.
- `ui/writer.js::validatePostimage` admits existing naming/line fields under its current schema. It rejects RESTRANT and PROPERTY_TRANSFER. Merely adding a button cannot make a valid property writer.
- `ui/physical.js::sameStructure` serves existing naming workflows. It cannot substitute for typed restraint invariants and a whole-file approved-byte guard.

Source root for these paths: `tabs/cii-workspace/cii-fnr-vnext/`; the served mirror is `docs/tabs/cii-workspace/cii-fnr-vnext/`. The standalone host is `docs/cii-fnr-vnext.html`.

The previously qualified original model remains available in authorized private custody. Its indexing/browser evidence is not a SOURCE→TARGET transfer test, an exported postimage, or a licensed importer check. Do not request the already supplied original again or republish its bytes, digest, raw nodes, private field addresses or screenshots.

## 4. Physical field map and source quality

Hexagon's indexed **V14 Auxiliary Element Data** describes four cards per restraint occurrence: two numeric cards followed by tag and GUID cards. Numeric storage uses a two-character prefix followed by 13-character fields. The following zero-based, half-open slices are calculated from that format, rather than asserted from a whitespace split.

| Within an occurrence | Slice | Stored field | W1 treatment |
|---|---|---|---|
| Numeric card 1 | `[2,15)` | Node | Read-only attachment witness |
| Numeric card 1 | `[15,28)` | Type | Read-only admission witness |
| Numeric card 1 | `[28,41)` | Stiffness | Proposed writable field |
| Numeric card 1 | `[41,54)` | Gap | Proposed writable field |
| Numeric card 1 | `[54,67)` | Friction-position payload | Proposed writable field only when the qualified type makes it Mu |
| Numeric card 1 | `[67,80)` | CNode | Read-only; both must be zero in W1 |
| Numeric card 2 | `[2,15)`, `[15,28)`, `[28,41)` | Direction components | Read-only basis witness |
| Cards 3–4 | Whole original cards | Tag and GUID | Byte-preserved; no identity-copy authority |

For one-based block `p` and slot `s`, the numeric first card is at RESTRANT data-card index `24*(p-1)+4*(s-1)`. Add the recorded raw line start to a field slice to obtain the physical byte span. Headers, CRLF and blank cards must be handled by the qualified scanner, not by counting split text lines. Card indexing must independently reconcile with the physical file.

Source register:

| Ref | Primary source and observed access | Permitted conclusion |
|---|---|---|
| H1 | [V14 Auxiliary Element Data, 1471418](https://docs.hexagonppm.com/r/en-US/CAESAR-II-Users-Guide/Version-14/1471418?contentId=xcQneu2SDluXPQOwi7pmDQ); indexed text retrieved 31 October; direct page fetch returned 404 | Supports the documented card/field ordering. The type-code image was not retrieved; it supplies no numeric-enum qualification here |
| H2 | [V14 Gap, 335382](https://docs.hexagonppm.com/r/en-US/CAESAR-II-Users-Guide/Version-14/335382); indexed text retrieved | Gap meaning depends on restraint type; translational and rotational dimensions differ |
| H3 | [V13 Stif, 335381](https://docs.hexagonppm.com/r/en-US/CAESAR-II-Users-Guide/Version-13/335381); indexed text retrieved | Corroborates stiffness/default hazards; not sufficient by itself to enable a V14 field |
| H4 | [V13 Mu, 335385](https://docs.hexagonppm.com/r/en-US/CAESAR-II-Users-Guide/Version-13/335385); indexed text retrieved | Corroborates type-dependent payload meaning, including friction versus load; not V14 qualification |
| H5 | [V15 Units Conversion Data, 337060](https://docs.hexagonppm.com/r/en-US/CAESAR-II-Users-Guide/15/337060); indexed text retrieved | Locates unit constants/labels for follow-up; V14 representation and semantics still require proof |

The earlier supplied V14 `337037` page and guessed `337041` route were unavailable through the web reader. A changed documentation route is not a defect in the CII model. Do not silently replace V14 evidence with V12/V13/V15 format authority. Preserve a permitted official V14 reference or licensed V14 export/import witness for any outstanding enum, units, zero/default and direction rules before admitting writes.

## 5. Proposed admission profile

Every condition below must pass for each proposed transaction. These are design requirements, not current test results.

| Condition | W1 rule | Why it matters |
|---|---|---|
| Input profile | Both version 14, admitted ASCII fixed-card representation, supported positive attachment-node profile, structurally validated immutable bytes | A similar-looking legacy file can have a different record layout |
| Correspondence | Engineer explicitly accepts SOURCE node→TARGET0 node and exact occurrence→occurrence pairing, with provenance and input epoch | Matching numeric IDs, tags, ordinals or proximity cannot grant cross-file identity |
| Type | Both decode to the same qualified basic global double-acting X/Y/Z type; code mapping must be independently evidenced | Numerical range 1–62 does not identify field semantics |
| Direction/basis | Qualified axis-aligned representation on both sides, same global axis convention and accepted basis; no rotation/reflection or local-axis inference | Equal component numbers in different frames can constrain different directions |
| Connection | CNode=0 on both sides | A connecting node changes which two points the restraint connects |
| Units | V14 UNITS structure qualified; complete original unit-section bytes agree and unit evidence is valid for the selected dimensions | Unit labels alone, or a manual assertion that the job is SI, are insufficient. W1 performs no conversion |
| Stiffness | Explicit finite positive source value; translation stiffness semantics qualified; no blank/default/zero-stiffness transfer | Missing or sentinel values may mean rigid/default rather than a numerical spring |
| Gap | Explicit finite nonnegative length under the admitted type; zero is admitted only after its V14 neutral-file meaning is qualified | A rotational or bilinear payload must not be interpreted as a distance |
| Mu | Explicit finite nonnegative dimensionless coefficient under the admitted type; zero behavior qualified if used | The same storage position can mean a force for other restraint types |
| Target preimage | Selected target field and its current stored value are qualified; exact original bytes retained | Unknown target defaults must not be concealed by a guessed numeric zero in the preview |
| Occurrence | Populated existing target slot, unique validated owner/pointer, complete cards, no selected-record UNKNOWN residue | Editing a dormant slot would introduce a new attachment or conceal unsupported data |
| Conflicts | One accepted source occurrence per target occurrence; no duplicate targets, overlapping claims or competing unapproved claims at selected spans | Approval of one proposal cannot hide another proposal over the same bytes |

Do not use JavaScript's `Number('')===0` or the R0 reader's blank-as-zero convenience as writer semantics. Preserve the original lexeme and distinguish EXPLICIT, BLANK, ZERO, DEFAULT/SENTINEL and UNKNOWN.

UNKNOWN evidence outside the selected transaction is not automatically a demand to qualify every auxiliary family. It may remain byte-preserved and visibly unqualified if it cannot affect the admitted record or context. Unknown selected ownership, field meaning, unit/basis dependency or selected-record residue blocks that transaction. Structural intake failures remain blocking.

Rows needing correction remain actionable: select another occurrence; confirm or correct the mapping; supply the missing V14 context evidence; deselect the unsupported field; or leave the transaction held. A manual override must not bypass field, width, ownership, basis, units or postimage checks.

## 6. Explicit exclusions from this first writer

No addition/removal/reordering of slots, blocks, cards or elements. No edits to CONTROL, MISCEL_1, pointers, node IDs, CNode, type, direction components, tags, GUIDs, geometry, process conditions, material, names, load cases or configuration. No cross-version or cross-unit conversion. No ANC, one-way, GUIDE/LIM, skewed, rotational, bilinear, rod, spring or snubber profiles until separately qualified. No transfer into dormant zero-node slots. No inheritance of default engineering settings. No RIGID/DISPLMNT/FORCMNT writer through this plan.

Nonzero selected CNode and differing coordinate bases require later explicit node/basis mapping. They are not solved by copying the source integer or by reversing an element pair.

## 7. Plan, approval and byte mutation logic

Use a new property-specific schema, proposed as `CiiPropertyTransfer.Plan.v1`, rather than disguising a restraint as a NodeName claim. The accompanying JSON is a non-executable candidate field/admission matrix, not a runtime permission file.

A plan binds at least:

- SOURCE and original TARGET0 SHA-256; version/layout/profile identity; units and basis evidence fingerprints;
- mapping revision, accepted node pair, accepted occurrence pair, reviewer provenance and input epoch;
- each occurrence's owner element witness, pointer, block, slot, attachment node, type, CNode, direction witness and original record fingerprint;
- selected field identities, exact source slices, exact TARGET0 before slices, target spans, after slices, dependencies and diagnostic reasons;
- complete transaction membership and explicit approved transaction IDs.

For the first same-profile writer, `after` is the **exact validated 13-byte SOURCE field lexeme**, not a formatted `Number`, a pasted table cell or an entire record. This avoids a new numerical rounding/serialization policy. A byte-identical proposed field is a no-op and needs no mutation claim; numerically equivalent but differently formatted lexemes should also be shown as an optional formatting-only difference and excluded from engineering transfers by default, using a qualified decimal comparison rather than an arbitrary epsilon.

Selected fields in one occurrence form one atomic transaction. To change a subset, regenerate the transaction with that subset and obtain fresh approval. Do not export half an approved transaction.

The **existing VNext common writer remains the only byte-mutation boundary**. Proposed integration is a separately typed `validatePropertyPostimage` entry in `ui/writer.js`, calling isolated property admission code and a small shared fixed-width splice primitive. Preserve existing `validatePostimage` admission and behavior. Do not widen its NodeName field list, switch to a legacy writer, or add a property-panel `bytes.set()` bypass. Any extraction of the splice primitive must be bounded and covered by existing writer regressions.

Immediately before applying, the writer must independently rederive permitted RESTRANT spans and ownership from original bytes, recheck both hashes and all context/mapping fingerprints, validate approval membership, preimages, field semantics, width, ASCII and non-overlap, then splice into `new Uint8Array(TARGET0)`. Never accept field addresses or an `eligible=true` boolean from the UI as authority.

After splicing:

1. Full file length and original line-ending bytes are unchanged.
2. The complete set of differing byte positions is a subset of exactly approved typed fields.
3. Reparse with the typed V14 restraint reader and confirm expected selected values plus unchanged node/type/CNode/direction/ownership, slot/block/card counts and all structural counts/pointers.
4. Every unselected field, text card, other auxiliary family, ELEMENTS, CONTROL, MISCEL_1 and unit/context section is byte-identical.
5. SOURCE and original TARGET0 digests are unchanged. Hash TARGET1 and bind its audit to the validated plan and approval set.

Export only the already validated TARGET1 preview, never reconstruct it from mutable controls at download time. If any check fails, discard the candidate and leave export disabled. A failure never falls back to text replacement.

## 8. UI state and stale-work cancellation

Suggested state sequence: LOADED → MAPPING_ACCEPTED → COMPARED → REVIEWED → VALIDATED → APPLIED_NEW_COPY → EXPORTABLE. These labels describe behavior, not a new project lifecycle protocol.

Changing either file, beginning an asynchronous read, clearing a file, changing a node or occurrence pair, field selection, mapping decision, units/basis evidence or profile revision immediately revokes the property preview, decisions and export. Old file-read/hash/validation promises must not reinstall stale state. Failed intake also leaves no previous property export available.

Visiting another tab and returning does not itself revoke a still-current plan. Property state is isolated from Normal, Nodal, Line+Node, Geometry, CIIFR_GEO and Config. Preserve their approval/export behavior. The prior F1 navigation defect must not recur.

Keep implementation-only byte offsets under an evidence detail view. The main review shows the engineering choice: which restraint, why these records are paired, type/direction, units and old/new field values. Do not imply engineering legality from a green byte-validation badge.

## 9. Bounded implementation sequence

| Step | Concrete deliverable | Completion evidence |
|---|---|---|
| W1.1 — P3 field qualification | Isolated typed restraint reader and V14 source/units/type/direction/default evidence sheet; separate raw lexemes from meaning | Independent fixed-card witness and supported profile definition. Unproved enum/units/defaults remain explicitly held |
| W1.2 — selected P2 correspondence | In the existing Node→Data panel, accept node and occurrence pairs; list all competing candidates and record why a pair was accepted | Renumbered nodes, shuffled slots and duplicate same-type occurrences produce the exact intended pair or conflict; no first-match shortcut |
| W1.3 — P4 candidate | Typed comparison, atomic reviewed plan and common-writer admission, Validate/Apply/Export TARGET1 and audit | Independent hand-specified byte splice equals actual output; only approved fields differ; stale/forged plans fail |
| W1.4 — qualification | Native existing tests, focused transfer/adversarial checks, actual served Edge/Chrome flow, licensed V14 importer/input-echo check on bounded outputs | Exact candidate/source identities, actual TAP/exit codes/browser evidence and importer outcomes. NOT_RUN remains NOT_RUN |

These may be one coherent W1 draft PR with internal checkpoints; do not spend another release on an unrelated inspector. Broad automatic correspondence, topology alignment and TO-only process discovery are not dependencies for explicit manual restraint pairing. #230 remains the canonical broader P2 workstream; do not mark it fully complete when W1's narrower pairing seam works.

Proposed files are isolated under `ui/property-transfer/` (`restraint-fields.js`, `restraint-mapping.js`, `restraint-plan.js`, `restraint-admission.js`, scoped state/view helpers), plus bounded changes to its current panel, the existing common writer/splice helper and standalone markup/styles where needed. Mirror source/served modules exactly. Avoid changing `app.js` unless a necessary host contract is demonstrated. Refresh path and authority overlap before implementing, especially open PR176/171 on the common app and PR145 on the Line+Node engine. Element PR187/168 retain their field-workstream scope; W1 does not adopt their process/RIGID authority.

## 10. Acceptance and contrary cases

Positive output must be derived from independently specified fixture bytes, not from the implementation's index. Use public-safe V14 SOURCE/TARGET0 pairs with different numeric node IDs, different owner ordinals, shuffled restraint slots and at least two same-type occurrences. Qualify X/Y/Z independently. At least one case changes each admitted field and at least one approves only a subset. Expected TARGET1 bytes are an independent fixed-width splice, with expected original immutability and unchanged sections.

| Challenge | Required result |
|---|---|
| Equal node IDs in different files; two candidate occurrences at one node | No auto-pairing; explicit occurrence selection required |
| Source slot 2 → target slot 5, distinct storage owners | Correct selected occurrence only; no same-slot or first-owner shortcut |
| Valid attachment not incident to storage-owner endpoints | Preserve attachment semantics; do not rewrite it to an endpoint |
| Same type number but missing V14 enum/basis qualification | HOLD with the missing-evidence reason |
| One-way/skewed/rotational/bilinear/rod/spring/snubber, nonzero CNode, changed basis | HOLD outside this profile; no reinterpretation of payload |
| Different or malformed units; matching labels but different constants | Block transfer; no conversion or guessed equality |
| Blank/default/zero stiffness, unproved zero gap/Mu, NaN/Infinity, underflow disguised as zero | Explicit classification and rejection unless that exact stored case is qualified |
| Truncated cards, negative/unsupported nodes, shared/orphan/out-of-range pointer or selected dormant residue | Reject unsupported intake or hold the selected transaction as appropriate |
| Forged source slice, target span, owner, type, before bytes, approval IDs or overlap | Writer rejection even when UI marked eligible |
| One approved and one rejected transaction | Only the approved complete transaction changes |
| Mapping/field edit or pending file read after approval; late async completion | Immediate revocation; stale export cannot return |
| Visit Property and each existing tab, then return | Preserve valid independent approvals; no cross-tab mutation |
| Change outside approved spans or failed typed reparse | No export; original inputs unchanged |

Run the focused new tests, all `cii-fnr-vnext-*.test.mjs` tests and the existing bounded Geometry regressions for actual runtime changes. Last R0 integration was 125/125 VNext and 9/9 Geometry PASS; these are historical baselines, not W1 results. Hosted ISO/XML checks do not replace this suite. Do not rerun unchanged private R0 qualification solely to produce another receipt.

The licensed V14 check verifies import/input-echo of the modified scalar values and retention of node/type/CNode/direction, plus unrelated restraint preservation. Solver execution is required only where an engineering behavior claim is made; import success alone does not prove acceptability of the chosen support values. Keep protected execution evidence local and publish only permitted sanitized facts.

## 11. Current gaps and first implementation action

| Item | Current truth | Next concrete resolution |
|---|---|---|
| V14 card positions | Official indexed description and R0 layout support the proposed map; new writable slices are not yet runtime-qualified | Independently measure public fixture cards and licensed/exported V14 witness |
| Numeric code→X/Y/Z, stored direction/default representation | Not established by the retrieved type image | Obtain official V14 type mapping or a permitted licensed V14 export/input-echo witness; do not guess codes |
| V14 UNITS and zero/default semantics | R0 does not qualify these; adjacent-version docs are corroboration only | Supply independent V14 evidence and field-specific positive/negative expectations |
| SOURCE→TARGET occurrence mapping | Not implemented | Add the explicit manual node/occurrence pairing seam after qualification; preserve unresolved alternatives |
| Restraint proposals/common-writer admission/export | Not implemented | Build W1.3 after its field and correspondence dependencies are satisfied |
| Fresh W1 native/browser/importer execution | NOT_RUN | Execute on the actual candidate after implementation; no claim of a completed writer today |

**EXACT_NEXT_ACTION:** The W1 builder begins with the V14 X/Y/Z field/units/type qualification sheet and explicit stored-value witnesses, then implements the manual occurrence pair → typed plan → existing common-writer TARGET1 path in a new bounded draft PR after this scope's writer extension is accepted. No new agent has been launched by this document.

## 12. Copy-ready builder brief

You are implementing **CIIFR-Node restraint-first W1**, not reopening the completed R0 repair. Read this exact document, its JSON matrix, current main, #224/#227/#230 and the existing common writer before edits. Refresh active overlaps and source identities. Start with read-only qualification of the selected V14 profile. Preserve the Owner's withdrawn protocol decision; do not add new Cycle, exams, scheduler, governance or telemetry machinery.

Deliver a working transfer for explicitly paired, existing populated X/Y/Z ground-connected restraint occurrences: stiffness, gap and friction, matching qualified units/basis, unchanged identities and structure, reviewed atomic changes, Validate → Apply to New Copy → Export TARGET1 plus audit. Qualification of the numeric type mapping, V14 unit data and field-specific zero/default behavior is a prerequisite, not a permission to assume common meanings. Leave unsupported cases held with precise next steps.

Use the current reader only for its demonstrated physical indexing; derive writable-field admission afresh from original bytes. Keep one existing common writer boundary, preserve all previous tab contracts and source/served parity, and retain immediate pending-read/stale-state revocation. Do not call the NodeName writer with forged name claims, mutate bytes in the panel, copy whole restraint records, create auxiliary entries or convert units.

Before existing-file edits use the repository-native backup and local module patch ledger. Keep each new JS file below 300 lines and functions small where practical. Use a unique WIP report, then a canonical PR report with current facts, exact changed files, validation and one recoverable next action. Do not reactivate Owner-withdrawn delivery protocols because old AGENTS references contain them; retain the practical backup/byte-safety rules that remain applicable.

Prove output using an independent expected byte splice and contrary cases in §10. Run focused tests and existing native regressions, actual served-browser approval/export isolation checks and bounded licensed V14 input validation. Declare NOT_RUN where unavailable; do not replace expected outputs with your own parser's results. Keep the original model and private evidence out of public Git. Return a draft candidate with exact head, changed files, actual test/byte/import evidence and remaining limits; no self-certified engineering release, merge or deployment.
