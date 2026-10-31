# CIIFR Property Transfer — Implementation Plan

**Task:** `CIIFR-PROPERTY-TWO-PATH-R0`  
**Parent:** [Concept Note v1.0](./CONCEPT_NOTE_v1.0.md) · [Node Properties #224](https://github.com/reallakshman19/XML_Compare_Utilities/issues/224) · [Element WBS4 #167](https://github.com/reallakshman19/XML_Compare_Utilities/issues/167)  
**Status:** R0 read-only candidate; all writes/engineering import RELEASE HOLD.

## Owner requirement — protected existing tabs

Create **one new top-level Property Transfer tab** containing two independently mounted conceptual paths:
- **A. Node → Element → Data:** exact oriented FROM→TO selection, element ordinal, process/geometry/material/rigid ownership; initial P1 T1/stored, P1/stored, fluid density/stored field witnesses.
- **B. Node → Data:** numeric node selection, its incident elements, restraint DOF/slot and owner, displacement/force specs, adjacent element-owned rigids.

**Do not change Node-Based Name Transfer behavior, Normal, Line+Node, Geometry, CIIFR_GEO, Config, existing CII writers or the production tile.** The sole allowed shared-app edits are registering and showing the new tab; all new behavior and SOURCE/TARGET file intake are isolated under `property-transfer/`. There is no shared approval state or TARGET1 creation.

## Architecture

```text
VNext Standalone (existing shell)
├── Normal / NODAL / Line+Node / Geometry / CIIFR_GEO / Config  [PRESERVED]
└── Property Transfer  [NEW TOP-LEVEL TAB, ISOLATED INTAKE]
    ├── SOURCE CII / TARGET0 CII (separate local inputs, SHA-256-bound)
    ├── Property Index (V14 read-only CONTROL, ELEMENTS, selected AUX, MISC count)
    ├── A: Node → Element → Data
    │   ├── oriented FROM–TO lookup, all matching elements
    │   └── T1/P1/fluid-density raw fields and exact byte witnesses
    └── B: Node → Data
        ├── numeric node incidents
        ├── RESTRANT owner/pointer/six DOF slots
        ├── DISPLMNT/FORCMNT record/spec
        └── adjacent RIGID owner/pointer
```

SOURCE→TARGET correspondence is **never auto-approved** from equal node numbers, element endpoints, line labels, geometric proximity or ordinal. A user-entered pair of node IDs is a query, not a transfer authorization. Physical-process values are **stored lexemes, not effective model interpretations**. No write control is present in R0.

## Exact scope of current R0 candidate

| File | Boundary |
| --- | --- |
| `docs/ciifr/property-transfer/CONCEPT_NOTE_v1.0.md` | Full text of Owner concept note, no private CII |
| `docs/ciifr/property-transfer/IMPLEMENTATION_PLAN.md` | This acceptance/rollout plan |
| `docs/cii-fnr-vnext.html` | One new top-level tab, scoped section and CSS link; preserve all other sections verbatim |
| `tabs/.../ui/app.js` + `docs/tabs/.../ui/app.js` | Only import/mount, tab registration, hide new panel; existing behaviors unchanged |
| `tabs/.../ui/property-transfer/cii-index.js` + served mirror | Read-only V14 physical index, CONTROL counts (including NOZZLES/HANGERS/IZUP), full RRMAT material-entry presence/type/range and alignment by element ordinal, typed aux ownership with bounded slots; fail closed |
| `.../property-transfer/element.js` + served mirror | Path A read-only exact oriented FROM/TO; no implicit reversal |
| `.../property-transfer/node.js` + served mirror | Path B read-only node/auxiliary occurrence; no copy/rename |
| `.../property-transfer/panel.js` + served mirror | Fully isolated inputs and local-only file reads, dual independent subpanels, no writer |
| `.../property-transfer/style.css` + served mirror | Scoped styles only |
| `tests/cii-fnr-vnext-property-transfer-r0.test.mjs` | Synthetic physical/marker/pointer/orientation/immutability and tab source/served regression |
| `agents/WIP-ciifr-prop-r0-20261028_workreport.md` | Reproducible source-based handover |

**No pre-existing NodeName, Nodal writer, physical parser or Geometry implementation was modified.** Existing `ui/app.js` has the minimal additive host integration only. Version mismatch, unknown section ownership or materially incomplete V14 control/aux data must be reported and held.

## Canonical phase semantics

The table below is the **single P0–P6 implementation contract**, also reconciled into the concept note §13. **P3 is read-only typed semantic comparison, never writer authority.** P4 is the first existing-slot W1 candidate and requires a new, explicit approval. Restraints have first priority for *write qualification*; Process may be inspected in parallel. The present R0 inspector uses **exact oriented FROM–TO pairs**; TO-only navigation is a P2 evidence-filter enhancement, not a claimed R0 feature.

## Phases, dependencies and acceptance

| Phase | Scope | Ready when | Engineering gate |
| --- | --- | --- | --- |
| P0 — Baseline/docs | Link v1.0, freeze current main, overlap and custody ledger | Concept readable from PR and source copied exactly | No approval to alter CII |
| **P1 — R0 independent tab** | Two read-only modules, separate input state, V14 index, physical evidence | Exact-head Node/browser tests, source/served parity, old tabs unchanged | Read-only |
| P2 — Approved correspondence | Manual SOURCE→TARGET node/element pairs, distinct orientation and 1-to-many ownership | Dual-file identity evidence, independent negative suite, review statuses | No writer |
| P3 — Typed semantic readers | Process T/P/density and restraints first; follow Element E1 authority rather than duplicate | Field/version/units/case semantics qualified on original, independent reviewer | No writer |
| P4 — Existing-slot proposal | Explicit typed plans, conflict detection, per-slot approval, original SHA, no side effects | Independently validated byte addresses and changed-byte allowlist; engineering CAESAR import | Owner writer decision #139 |
| P5 — W2 structural transaction | New/delete aux slots/blocks, CONTROL and MISCEL_1 dependency closure, pointer renumber, material alignment | Counts/pointers/RRMAT oracle, never partial commit, native vendor round-trip | New structural Owner work pack |
| P6 — Release | Standalone browser, private originals, independent final IR, deployment | Explicit Owner GO; no release from a draft or mocked test | Release HOLD until approval |

### Cross-file semantics / refusal codes
- `V14_ONLY`: R0 does not claim reliable V11/v15 auxiliary interpretation.
- `PROPERTY_SOURCE_PAIR_INCOMPLETE`, `PROPERTY_NODE_NOT_CANONICAL`: incomplete/invalid operator query.
- `UNVERIFIED_READ_ONLY`: physical correspondence is not proven by a matching number/name.
- `PROPERTY_SHARED_POINTER_*`, `PROPERTY_ORPHAN_AUX_*`, `PROPERTY_AUX_CARDINALITY_*`: pointer/aux ownership not qualified.
- `PROPERTY_MISC_RRMAT_TRUNCATED`: material array cardinality inconsistent with NUMELT.
- `PROPERTY_NONCANONICAL_SECTION`, `PROPERTY_DUPLICATE_SECTION_*`: malformed source.
- `T1` effective meaning and `P1`/density case semantics are held until Element E1 #178 gets exact evidence.
- Node query does not imply all adjacent elements share pressure, temperature or material; physical FROM→TO orientation is not flow direction.
- Applied FORCMNT input must not be called computed restraint reaction.

## Verification minimum, with evidence classes

1. **Native:** `node --test tests/cii-fnr-vnext-property-transfer-r0.test.mjs`, all affected VNext suites, Geometry and NodeName regression; compare against exact baseline.
2. **Static:** source/served Git blob equality for every touched UI script/style; only new nav and panel markup in HTML.
3. **Synthetic negatives:** reversed element pair, shared node with different pressures, duplicated element identity, malformed markers, corrupted CONTROL.NUMELT, orphan/shared/out-of-range pointers, missing/truncated MISC, V11 rejection, stale input selection, no accidental writer.
4. **Actual private original:** authorized Windows browser loads Owner V14 `GLRD-SYS-20-10.CII`, checks 521 elements, 122 restraint blocks and 156 rigid blocks, 6 displacement blocks, 0 force blocks; validates selected node/element evidence against an independent oracle. Never publish raw file, private identities or outputs.
5. **Browser:** independent SOURCE/TARGET load, tab switch across NODAL/Normal/Geometry/Property, cancellation/invalidation and no export/write affordance; real browser/GPU/Windows testing must be recorded as PASS/FAIL/NOT_RUN, never inferred.
6. **Independent exact-head reviewer:** non-author verifies original-byte custody and negative cases, then Owner decides whether to lift R0-only HOLD. This does not lift writer/release gates.

## Repository governance and branch handling

The open draft Element field map PR #187 and WBS4 #167 retain process/rigid **semantic authority**; Property R0 consumes a read-only physical subset only and must not merge or edit that PR's writer. Original #176 and merged #203 node-name code are not reworked. A separate WIP branch is used to avoid claims over existing author branches. Remote GitHub APIs provide immutable preimages/patch content; repo-native `utils/backup.cjs` and `.agent-worklogs` cannot run in this connector-only session because local GitHub DNS fails. This deviation is recorded, not presented as compliant.

**EXACT_NEXT_ACTION:** Distinct native reviewer checks R0 exact head, executes new test plus existing regression suites, loads authorized V14 original and confirms read-only behavior and preservation of all six existing tabs. Only after an independent PASS should this R0 draft be marked ready for Owner merge; do not begin P4/P5 writer work in the same PR.
