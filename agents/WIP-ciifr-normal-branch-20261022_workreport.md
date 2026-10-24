# WIP CIIFR Branch Scope — 2026-10-22

**Authority:** Owner requested a new branch-conditioned Normal replacement mode after testing existing Normal. `TAKEOVER_AUTHORITY=READ_ONLY` was used during inspection; bounded implementation proceeded on a separate WIP branch. **No merge/deployment authority asserted.**

**Start base:** main `8fea0491ca4ca85565132a81f1620f57fbc3014e`.
**Branch:** `wip/ciifr-vnext-normal-branch-scope-20261022`.
**Related:** PR #155 is an independent open DRAFT that also edits the standalone HTML (demo-loader button); this branch changes the Normal rule grid/CSV hint, and the two changes require future overlap check before integration. PR #145 A2 is separate and not modified.

## Bounded implementation

### Scope
Introduce `BRANCH` as a fourth **scope** choice for the Normal engine (not a new geometry engine). The user enters an exact physical branch identifier from the `ELEMENTS` per-record length-prefixed line (index 10 in each 15-row element block). CSV supports optional `Branch` header and uses real RFC-style quote escaping already supported by the existing importer.

- Parser: `ui/physical.js` returns a `branch` label for each element **only** when length and printable ASCII match and its value begins `/`. Do not infer branch paths from geometry or substring matching.
- Planner: `normal/plan.js` allows `scope:'BRANCH'` and exact label; no implicit fallback to DOCUMENT. Zero matches are observational, not fabricated. Additional `normal/branch-scope.js` requires every connected element at each proposed named node to belong to the selected physical branch. Cross-branch shared node → `BRANCH_NODE_CROSSES_SCOPE` blocking ERROR.
- Writer: `ui/writer.js` independently verifies scope and branch evidence against the **original** physical parsed bytes, rejecting forged/off-branch `BRANCH_CLAIM_SCOPE_INVALID`. Existing SOURCE/TARGET hashing, alias closure, fixed widths, immutable original and reparse controls unchanged.
- Controller: `ui/app.js` adds Branch option and per-rule Branch field, blank state and optional CSV column. Existing `invalidate` is used on branch input changes; no stale approval/export allowed. Still 299 source lines.
- Standalone HTML adds visible Branch column, qualified scope explanation, CSV guidance. No production tile modification.

### Module/file ledger
- Existing, paired source+served: `ui/physical.js`, `normal/plan.js`, `ui/app.js`, `ui/writer.js`.
- New paired source+served: `normal/branch-scope.js`.
- Existing standalone page: `docs/cii-fnr-vnext.html`.
- New synthetic only: `tests/cii-fnr-vnext-branch-scope.test.mjs` (v11/v14 × LF/CRLF, same-name other branch, cross-branch node reject, forged branch evidence reject, exact branch label, CSV quote escaping, parity).
- This recovery report: `agents/WIP-ciifr-normal-branch-20261022_workreport.md`.

### Executed, evidence-bounded validation
1. **PASS [source-exact, isolated JS V8]** on SHA-pinned module source: v14 synthetic positive case generated exactly two name claims, no diagnostics. Crossing outside-branch connectivity generated **zero claims** plus `BRANCH_NODE_CROSSES_SCOPE` blocking diagnostics.
2. **PASS [source-exact, isolated JS V8 with mocked Web Crypto digest]**: real committed writer body produced complete synthetic expected TARGET1 **byte-for-byte** and rejected forged wrong-branch claim `BRANCH_CLAIM_SCOPE_INVALID`. SHA behavior itself was stubbed in this test; no claim of real cryptographic verification.
3. **PASS [source-exact JS V8]**: quoted synthetic CSV `Find,Replace,Branch` imported exact label as `scope:'BRANCH'` with embedded double quotes.
4. **PASS [local analysis only, not posted]**: an Owner-provided private original CII was inspected read-only. Branch identifier belonged to the two target named fields on the same logical node, with all connected node elements on that exact branch. A private independently calculated expected postimage preserves original file length and changes only those two authorized name-field spans. **No private CII contents, original checksums, or full file posted**.
5. **NOT_RUN**: actual complete checkout native `node --test tests/cii-fnr-vnext-branch-scope.test.mjs` and full inherited suite, real HTTP-served Chromium, file upload→approve→Validate→Apply→Export. Local clone probe failed `git ls-remote` exit 128 due `github.com` DNS restriction.

### Recovery caveat (MANDATORY)
The environment cannot obtain a *complete Git checkout*, so **canonical pre-edit** `node utils/backup.cjs save` **was NOT run** and the required locally ignored `.agent-worklogs` chronological patch ledger **was NOT established**. GitHub connector commits on this **separate draft branch** preserve the pre-image as exact Git history but **are not equivalent to a compliant backup**. Under root `AGENTS.md`, a qualified full-checkout handoff must reconcile this deviation and run native/browser qualifications before Owner-authorized merge. Do NOT mark backup chronology COMPLIANT or claim a full-checkout PASS.

### Invariants and undo
- No original CII data is modified or uploaded. TARGET0 immutable.
- Claim writer remains sole byte editor; no geometry or A2 behavior enabled.
- Branch identity comes from length-qualified ELEMENTS record, not a raw text-find operation.
- For selective undo, verify current blob IDs and compare with branch base commit; reverse only this PR's file deltas; do not reset unrelated changes. New `branch-scope.js` files may be deleted only with checksum and overlap check. Original source files' preimages are accessible at base SHA. This Git-history recovery is **not** a substitute for required local backup/patch ledger.

**EXACT_NEXT_ACTION:** Full-checkout qualified worker reconciles PR with live main and PR #155, establishes proper local recovery state before corrective edits, runs the new and inherited native tests and real browser flow on synthetic fixture, then reports PASS/FAIL and seeks Owner merge authorization. No production tile replacement or three-engine signoff.
