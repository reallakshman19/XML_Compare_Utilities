# WIP-ciifr-prop-r0-20261028 — Two-Path Property Transfer

**Owner request:** Link the full v1.0 concept note into this repo and add **one new top-level Property Transfer tab** hosting two independent modules, without changing Node Name Transfer or other VNext tabs.

**Recovery identity:** WIP-ciifr-prop-r0-20261028  
**Task/custody:** Independent read-only tab R0. No engineering fields/aux writer authority. Issue #224 provides conceptual scope; Element E1 issue #178 and PR #187 retain existing source-semantic and RIGID work. User explicitly authorized a new tab, **not** new property writer privileges, unreviewed merge or production tile replacement.  
**Branch:** `codex/ciifr-property-two-path-r0-20261028` from `main@fd86b21aa9dcbfbbe4f8a1d26133b7e9779448be`. Source/served modules copied with equal Git blobs.

## 1. READ_ONLY implementation takeover and Appendix A
- **A1 production trace:** VNext standalone host `docs/cii-fnr-vnext.html` mounts `ui/app.js`; existing `ui/nodal-panel.js` owns numeric Node Name writer and independent Geometry is `CIIFR_GEO`. Main app has no reusable semantic property engine. SOURCE/TARGET parsed via `physical.js` for NodeName only; merely possessing a numeric node does not identify element-owned T/P.
- **A2 current failure isolation:** no Property Transfer tab existed on main. Existing #224 R0 Python original V14 prototype already indexed 521 ELEMENTS, 122 REST, 6 DISPL, 0 FORCE, 156 RIGID read-only; no UI or typed source↔target transfer. Old PR #176 and current #187 remain separate lanes. Need a new UI rather than broadening the NodeName writer.
- **A3 authority/invariants:** Preserve Normal, NODAL, Line+Node, Geometry, CIIFR_GEO and Config. No edits to `physical.js`, `writer.js`, `nodal-transfer.js`, NodeName parsers, Geometry, production routing, main or any private CII bytes. R0 V14 reader uses the existing read-only parser for physical source validation and its own strict AUX parser; no SOURCE→TARGET identity guessing, and no mutation.
- **A4 independent validation:** GitHub source/served readback 6/6 pairs identical; V8 evaluated committed `physical.js`+R0 index modules against synthetic V14 2-element/1-restraint fixture. Confirmed two differently oriented elements share node 500, exact orientation selection, process stored values 200/30/1.01, first restraint pointer/DOF, immutable input, malformed header negative. Initially one test fixture error failed to *introduce* a shared pointer; corrected explicit two-owner fixture correctly raises `PROPERTY_SHARED_POINTER_RESTRANT`. These are author-run synthetic V8 checks, not independent/native/real original qualification. Native Node/browser/Windows, original V14 JS loading and full regression **NOT_RUN**.
- **A5 smallest patch:** add v1.0 note and implementation plan; new isolated `property-transfer/` modules and CSS served mirrors; add separate top-level panel/nav; minimal additive host import/registration/render; one new regression test. No existing engine files modified.

## 2. Changed-file functional ledger
| Module | Paths | Change/undo |
| --- | --- | --- |
| Documentation | `docs/ciifr/property-transfer/CONCEPT_NOTE_v1.0.md`, `IMPLEMENTATION_PLAN.md` | New; remove only if exact blob unchanged |
| Host shell | `docs/cii-fnr-vnext.html` | One new top-level nav button, independent panel markup/CSS; revert exact hunks, not the rest of HTML |
| Host integration | `tabs/.../ui/app.js` + exact `docs/tabs/...` mirror | Additive import, tab registry, mount and hide; preserve current original app body, source+served hashes matched |
| Physical index | `ui/property-transfer/cii-index.js` + served mirror | New V14 strict CONTROL/ELEMENTS/MISC length and four family aux index; default no write |
| Element Path A | `ui/property-transfer/element.js` + served mirror | Exact oriented FROM→TO; T1/P1/density raw physical witnesses, no case equivalence |
| Node Path B | `ui/property-transfer/node.js` + served mirror | Numeric node → restraint/displ/force records and adjacent rigid evidence |
| Isolated browser panel | `ui/property-transfer/panel.js`, `style.css` + served mirrors | Own SOURCE/TARGET inputs, mode switches, immutable queries, read-only table |
| Tests | `tests/cii-fnr-vnext-property-transfer-r0.test.mjs` | 9 synthetics/negative/integration/mirror assertions, native run awaits reviewer |

## 3. Evidence and blocker matrix
| Gate | State | Evidence |
| --- | --- | --- |
| Concept note in repository | PASS | committed exact textual content from previously delivered v1.0 MD |
| Read-only feature coded | PASS (source-level) | two independently imported path modules and separate panel/intake |
| Source/served code parity | PASS | six matching Git blob SHAs, read back |
| Synthetic physical index | PASS / AUTHOR_V8 | actual committed code execution, source-sha replaced only for V8 imports; no writer |
| Shared-pointer negative | PASS / AUTHOR_V8 | explicit second RESTRANT pointer=1 raises `PROPERTY_SHARED_POINTER_RESTRANT` |
| Native `node --test` | NOT_RUN | GitHub clone DNS unavailable; test committed for independent run |
| Served browser & tab switching | NOT_RUN | actual Chromium/Windows not launched |
| Original GLRD V14 via new JS | NOT_RUN | private original file not loaded into current GitHub-linked browser |
| Real SOURCE→TARGET mapping | NOT_IMPLEMENTED | user-entered values are query only, no identity acceptance |
| Effective process/RESTRANT semantics | HOLD | #178 field authority incomplete; restraint Tag/GUID not qualified |
| TARGET1 writer / CONTROL–MISC transaction | NOT_IMPLEMENTED / HOLD | requires new independent Owner-approved work pack |
| Independent exact-head reviewer | NOT_RUN | separate nonauthor reviewer not bound |
| Production deployment/merge | NOT_AUTHORIZED | draft PR pending independent checks and Owner acceptance |

## 4. Coordination, backup and provenance
Active open original Nodal PR #176 and E1 PR #187 checked; no adoption/overwrite of their branches. #167/#178 retain Element/Process source authority, #224 Node Properties scope. New app.js only host registration causes a declared **coordination-required** semantic seam, no version of #176/#171 is automatically stacked or merged.

GitHub DNS failed in this runtime. Native `utils/backup.cjs` and local `.agent-worklogs/` mandatory no-index patch/backup ledger could **not** be run. Remote GitHub exact immutable `main` blob preimages and branch commits are preserved. This is an explicit **protocol deviation**, not a fabricated canonical pre-edit backup. A native engineer should reconstruct canonical backup and patch ledger before additional engineering-critical edits or merge.

**Highest risk:** R0 parser currently certifies a *bounded* V14 physical index only. It does not prove actual effective temperature/pressure, global units/cases, shared-node source↔target physical identity, property writer safety or CAESAR II import equivalence. It must not be interpreted as engineering release.

**EXACT_NEXT_ACTION:** Distinct native qualified reviewer checks the exact new PR head against its base, runs `node --test tests/cii-fnr-vnext-property-transfer-r0.test.mjs` and affected VNext/Geometry/NodeName suites; verifies tab visibility and original V14 521/122/156 index in an authorized browser without modifying original. Report exact-head PASS/FAIL/NOT_RUN and named source provenance; only then Owner may decide R0 read-only merge. Never extend this PR into property writers.
