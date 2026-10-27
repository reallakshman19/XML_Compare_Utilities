# PR203 — Current-main Node-Based Name Transfer integration

## Identity and Owner intent
Owner requested "do it" after PR176 old draft merge attempt failed. New direct-on-main additive integration candidate, no removal of original draft PR176, no production tile change. Source PR176 pinned `3cb13e696bc346843b84623886b47323de4ffe3d`; initial current-main base `9217e52daa1ace6189ba6d02cddd66c380f9769f`. Task #189 / marker #200 / integration #196 / authority #139 / independent review #190.

## Scope and exact changed paths
- `docs/cii-fnr-vnext.html` — add NODAL tab and its separate UI panel; CIIFR_GEO iframe and styles preserved.
- `tabs/cii-workspace/cii-fnr-vnext/ui/app.js` and exact `docs/tabs/` mirror — mount Nodal panel, preserve Geometry lifecycle, hide Standard UI only when Nodal, revoke stale Nodal state when input changes.
- `tabs/cii-workspace/cii-fnr-vnext/ui/nodal-transfer.js` and exact served mirror — port PR176 exact numeric-node and structural-writer logic, add NODAL-only canonical section marker guard at preview, prewrite, validate and postimage. No modifications to `physical.js`, `writer.js` or other engines.
- `tabs/cii-workspace/cii-fnr-vnext/ui/nodal-panel.js` and exact served mirror — port source-owned UI module from PR176.
- Six `tests/cii-fnr-vnext-nodal*.test.mjs`/node-only-csv files from PR176 including a new malformed marker F1 regression. Test helper extended additively, preserving main mock.
- WIP and PR handover reports. No user private original CII or Node/Replace names committed.

## Appendix A / responsibility and risks
A1: TARGET0 enters main app via read-only file intake; `nodal-panel.js` consumes that parsed immutable snapshot; `nodal-transfer.js` uses numeric TARGET0 logical node and all incidental FROM/TO fields to generate new-copy TARGET1 only.
A2: old PR176 merge failed GitHub draft 405; diverged from current Geometry-containing main. Old `physical.js`/nodal marker regex accepted noncanonical lowercase/indented headers and propagated bytes to TARGET1; IR2 confirmed synthetic.
A3: preserve exact original bytes, counts/pointers and unrelated MISCEL_1/sentinels, no shared-writer/Geometry edits, no source→target inferred remap. New guard rejects noncanonical markers instead of normalizing.
A4: SOURCE-STATIC PASS on exact latest GitHub branch for source/served mirror equality; standalone 5 syntactic JS module checks PASS in V8 after removing import/export declarations; **ISOLATED_V8_PARTIAL**: dynamically evaluated actual committed `physical.js` and `nodal-transfer.js` with fake SHA binding, 1 synthetic V14 NODENAME insertion and 5 malformed marker rejections PASS. This does not prove actual crypto/hash or native browser/Node/real file, and is NOT an independent reviewer verdict.
A5: independent native new-head Nodal+VNext+Geometry regression tests, HEAD-specific browser, private original V14 CII TARGET0→actual Node/Replace approved TARGET1, independent changed-byte oracle, licensed CAESAR II import and standalone non-author review are all **NOT_RUN** in this environment.

## Recovery limitation
GitHub connector wrote commits to an isolated new branch; local git clone failed DNS lookup. Canonical repo-native `utils/backup.cjs` and local `.agent-worklogs/` were unavailable; preimage SHA and GitHub branch commits retained but this is **NOT canonical backup/patch-ledger compliance**. No PR176 force update or author workspace changes.

## Governance blockers and merge
Owner selected Nodal integration and requested merge. **Approval to bypass engineering qualification was not given.** Issue #139 common-writer authority still requires explicit narrow NODAL exception; native independent original V14 TARGET1/Hexagon import and independent new-head reviewer remain pending. **PR203 DRAFT/HOLD.** #192 baseline-red Normal test is separate.

EXACT_NEXT_ACTION: Assign a genuinely distinct native Windows/Hexagon engineer to verify PR203 *new* head and private Owner-controlled V14 original; validate marker F1 negatives, standard VNext and Geometry, original/TARGET1 byte spans, and licensed CAESAR import. Resolve #139 Option-A authority, then Owner can lift HOLD and merge this direct-on-current-main integration PR.