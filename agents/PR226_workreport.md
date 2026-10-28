# PR226 — Two-Path Property Transfer R0 · Review repair and exact-head handover

**Scope:** Owner-directed read-only `Property Transfer` tab with independent `Node→Element→Data` and `Node→Data`. No property writer, SOURCE→TARGET identity admission, TARGET1, production tile replacement or merge authorization. Existing Normal, NODAL Node Name, Line/Node, Geometry, CIIFR_GEO and Config code remains protected.

**Repository:** `reallakshman19/XML_Compare_Utilities`  
**PR:** https://github.com/reallakshman19/XML_Compare_Utilities/pull/226  
**Base:** `fd86b21aa9dcbfbbe4f8a1d26133b7e9779448be` (refresh live main).  
**Earlier reviewed candidate:** `e2d2e4893713aa56bfbb5a5f6fd8d7ff57b16970`; owner-provided source review reported native Node v24.22.1 9/9 R0 suite PASS, a base-PASS/head-FAIL Nodal startup regression and malformed source acceptance. Reviewer account identity/independence not established from chat text.  
**Current head:** refresh live PR head and inspect all commits; source changes described below were made in branch `codex/ciifr-property-two-path-r0-20261028`.

## Reviewer defects and disposition

| ID | Reviewer witness | Bounded repair | Verification currently available |
|---|---|---|---|
| F1 | Nodal UI head FAIL `null.addEventListener`, base PASS | New Property panel optional mount; guard shared app visibility when panel missing; extend shared test DOM fixture and add two focused Nodal/property switching tests | STATIC + author inspection PASS, native Nodal/new UI re-run NOT_RUN |
| F2 | RRMAT accepts malformed material | Parse all `NUMELT` ordinal material slots using V14 (2X,6G13.6), nonblank integer ID 1–699; preserve trailing MISC content untouched | Author V8 negative 4 controls PASS; original V14 NOT_RUN |
| F3 | CONTROL ignores negative NUMNOZ/NOHGRS, invalid IZUP | Retain NUMNOZ, NOHGRS, reject negative first-six CONTROL counts, validate IZUP 0/1 | Author V8 3 negatives PASS; nozzle/hanger **COUNT ONLY**, VFLEX/hanger/execution MISC semantics NOT_QUALIFIED |
| F4 | Malformed restraint slots/references | Reject negative restraint node/CNode and zero-node slot with nonzero type or CNode; reject negative displacement/force nodes | Author V8 4 restraint negatives PASS; exact vendor Tag/GUID and effective type/direction not qualified |
| F5 | Slot labelled DOF | Replace label with `Slot` in panel and HTML; clarify restraint type and direction define constrained DOFs | SOURCE inspection PASS |
| F6 | No TO-only navigation | Declare R0 exact **oriented FROM→TO pair** inspection; defer Node→TO matches→explicit element pick to P2 | Documented only; not implemented |
| F7 | P3 phase ambiguity | Reconcile concept §13 with implementation plan canonical phases: P3 read-only semantics; P4 first existing-slot W1 writer candidate. Restraint first write qualification; Process read-only parallel | Source readback PASS |
| F8 | Missing positive RIGID, DISPLMNT, FORCMNT | Synthetic four-family V14 fixture added; test asserts actual per-node auxiliary presence and rigid element owner | Author V8 positive PASS; native Node NOT_RUN |

## Canonical phases and custody

P0 source/authority ledger → P1 this R0 two-path inspector → P2 explicit correspondence/TO-only evidence filter → P3 typed read-only Process + Restraint semantics/proposals → P4 narrowly authorized qualified existing-slot writer (restraint-first) → P5 separately qualified structural CONTROL/MISCEL_1 transactions → P6 Owner-gated release.

The existing Element E1/PR187 owns effective Process and RIGID source meaning. PR226's T1/P1/density values are stored physical witnesses, not case/unit-qualified engineering values. Numeric SOURCE/TARGET IDs are document-local and no automatic transfer is allowed.

## Exact path ledger

- `tabs/cii-workspace/cii-fnr-vnext/ui/property-transfer/cii-index.js` and served mirror: P0 read-only CONTROL/MISC_RRMAT/RESTRANT safety guards, no writer.
- `tabs/.../ui/property-transfer/panel.js` and served mirror: optional mount and slot wording.
- `tabs/.../ui/app.js` and served mirror: null-safe optional Property Transfer visibility (only host addition).
- `tests/helpers/vnext-dom-env.mjs`: add Property panel mock, subtab/file inputs and preserved Nodal mock.
- `tests/cii-fnr-vnext-property-transfer-r0.test.mjs`: expand synthetic and negative test count to 14.
- `tests/cii-fnr-vnext-property-transfer-ui-regression.test.mjs`: 2 new native UI integration/legacy-DOM regressions (NOT_RUN locally).
- `docs/cii-fnr-vnext.html`: R0 exact-pair and restraint slot wording only; all old tab markup preserved.
- `docs/ciifr/property-transfer/CONCEPT_NOTE_v1.0.md` and `IMPLEMENTATION_PLAN.md`: canonical P0–P6 table and note alignment.

**All source/served file-pair equality must be rechecked after final edits.**

## Validation status

- **AUTHOR_V8_SYNTHETIC:** 14/14 property-index tests PASS using **exact source blobs fetched from GitHub**, stripped imports and a minimal Node assert/Buffer simulation; this is not a native Node.js result or independent qualification. Fixture includes shared endpoints with different pressure, positive rigid, displacement and force, structural pointers and negatives. 
- **SOURCE_SERVED:** six mirrored app/JS/CSS paths matched after parser/panel/app fixes before final HTML/test edits; repeat at exact head.
- **OWNER_REVIEW_PREVIOUS_HEAD:** 9/9 native Node tests PASS and existing Nodal UI FAIL at original `e2d2e48` head. **Do not carry PASS across code change.**
- **CURRENT_NATIVE_NODE:** NOT_RUN. Local Node v22 is present, but GitHub clone DNS fails; full source/checkouts were not available.
- **CURRENT_BROWSER:** NOT_RUN; original reviewer reported Chromium missing.
- **ORIGINAL_GL_RD_V14:** NOT_RUN through this JS implementation (prior Python source inventory distinct); licensed CAESAR import NOT_APPLICABLE to R0 inspection and mandatory for any future write qualification.
- **INDEPENDENT_EXACT_HEAD:** NOT_RUN, non-author review required.
- **BACKUP/LEDGER:** Existing GitHub exact base and changed blob preimages preserve recovery, but native `utils/backup.cjs` and `.agent-worklogs` patch ledger could not run. Explicit protocol deviation; no compliance assertion.

**Highest residual risk:** Actual V14 MISC nozzle/hanger *content* and execution-option semantics remain unqualified; R0 verifies their CONTROL counts only. RRMAT element material ID syntax/range is now checked, but material definition equivalence is not. Stiffness/gap/Tag/GUID, displacement/force case/units, source-to-target identity and property writer safety are outside R0.

**Merge/Release:** PR226 remains DRAFT, ENGINEERING R0 HOLD. Do not mark ready or merge from source-only tests.

**EXACT_NEXT_ACTION:** independent native reviewer at **current exact PR226 head** executes `node --test tests/cii-fnr-vnext-property-transfer-r0.test.mjs tests/cii-fnr-vnext-property-transfer-ui-regression.test.mjs tests/cii-fnr-vnext-nodal-ui.test.mjs`, full affected VNext + Geometry regressions, actual browser tab switching and authorized GLRD V14 original inspection. Reproduce all F1–F8 negatives and independently assess common UI startup, original RRMAT and CONTROL semantics. Return exact-head PASS/FAIL/NOT_RUN and one next correction. Owner decides draft→ready/merge only with accepted evidence.
