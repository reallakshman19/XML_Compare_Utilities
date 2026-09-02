# PR1071 Work Report — CII v14 explicit Apply-to-new-copy gate

CHAIN: CII-FIND-REPLACE-V14
PR: #1071
BRANCH: `feature/cii-find-replace-apply-copy-v14`
BASE_MAIN: `511d186926b67a71efa8163e85497f489ef3a3ed`
PRODUCT_CHECKPOINT_HEAD: `ff3639503728d2246746b343d3e9c5c803e1ed79`
STATE: DRAFT
ENGINEERING_STATE: IMPLEMENTED_FOCUSED_VALIDATION
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
WORK_ITEM_SOURCE: OWNER_DIRECT
OWNER_COMMAND: `proceed`

## Mission

Deliver the explicit user **Preview → Apply → Download** sequence for CII v14 Find & Replace without granting direct overwrite authority. In this PR, **Apply means Apply to New Copy**: it records an explicit release for the already independently validated TARGET1. Loaded TARGET0 remains immutable.

## Delivered behavior

1. `Validate & Preview` qualifies TARGET1 in memory exactly as before.
2. A qualified preview exposes `canApplyToNewCopy=true` while direct `canApply` remains `false`.
3. `Apply to New Copy` independently validates the output candidate and records a frozen release receipt/hash only.
4. `Download Modified CII` remains disabled until that release exists.
5. The download boundary independently repeats TARGET0/TARGET1 validation and rejects direct callers that did not pass the Apply-to-new-copy gate.
6. Any target/CSV/mode/row/review/qualification change clears the release.
7. Download receipt explicitly states `originalFileOverwritten=false`, `writerInvoked=false`, and `appliedToNewCopy=true`.

## Authority / invariants

- TARGET0 is immutable.
- Direct mutation authority remains `canApply: false`.
- `canApplyToNewCopy` is a separate release capability, not file-overwrite authority.
- TARGET1 remains same-length and independently postimage-validated.
- No Writer1/Writer2 invocation.
- No parser/converter/runtime switch.
- FORCE/FORCMNT remains fail-closed and qualification-pending.
- No workflow, benchmark, oracle, tolerance, or deployment change.
- Merge remains Owner-only.

## Current hypothesis and falsifier

**Hypothesis:** the existing qualified TARGET1 and output validator were sufficient; the missing user requirement was an explicit release state between Preview and Download.

**Falsifier:** any path that permits download before release, preserves release after input/review change, alters TARGET0, enables direct `canApply`, invokes a writer, weakens postimage validation, or enables FORCE invalidates this implementation.

## Changed-file ledger

| File | Preimage blob | Current blob | Change |
|---|---|---|---|
| `tabs/cii-workspace/cii-workspace-find-replace-session.js` | `062cab0367d0959e936ae8762e40a2ba7d2a3804` | `8cc27dbc232e2c8f9eca70cf99c9e54a13221d1b` | add immutable Apply-to-new-copy release state; preserve direct `canApply=false`; expose `canApplyToNewCopy`/`canDownload` |
| `tabs/cii-workspace/cii-workspace-find-replace-output.js` | `6cd10fd4c9f9dac8b07bf83b9eec915973e2b374` | `51848496ce4918aa8561aa86bc0f6a5ddda63d02` | split candidate validation from final download; require exact Apply release/hash at download boundary |
| `tabs/cii-workspace/cii-workspace-find-replace-ui.js` | `2aab16841a17dd3f050a568df42e983fe3efa777` | `773356d869bd79ade6e44eb105fea189afa384fd` | wire Apply action; disable download until release; recheck released target hash at download |
| `tabs/cii-workspace/cii-workspace-find-replace.js` | `3dcb5da7f9f9597b423206d9541e404834f91b64` | `6470248222f37fc767028587039b59237a382be3` | relabel Step 5 and button as Apply to New Copy; state TARGET0 never overwritten |
| `tests/cii-workspace-find-replace-session.test.js` | `6ec216ca8b7b77c1057d1d90372089ef34a5ae00` | `7ee0f9f86c8f555077e96aa670ff8ae6786fb105` | prove Preview→Apply-to-copy→Download readiness and release invalidation |
| `tests/cii-workspace-find-replace-output.test.js` | `61dade3eaa2fa86227ab031454a4daddc93ecb81` | `c86c075657941c81ea1198a357a9931f27c93670` | prove direct download is blocked before Apply and custody is rechecked after Apply |
| `tests/cii-workspace-find-replace-ui-registration.test.js` | `f35a83806b548d84bc37dbc2aaddc458a6e5b91c` | `10c24332a8ccf7f49a3de49cc104956919dabd16` | assert Apply-to-new-copy UI wiring and preserved no-writer/FORCE boundary |
| `agents/PR1071_workreport.md` | new | current report | durable recovery / validation / authority state |

`tests/cii-workspace-find-replace-foundation.test.js` is intentionally unchanged. Its transaction/direct-mutation boundary must continue asserting `canApply === false`.

## Validation ledger

### Focused Apply/output behavior

STATUS: **PASS**
OBSERVATION: isolated Node delta harness executed 10 tests covering the changed session/output behavior.
ORACLE: authored branch test assertions for session/output behavior; document-scope validation and SHA dependencies were locally equivalent harness implementations, not a complete authenticated repository checkout.
RESULT: **10/10 PASS**.

Covered:
- qualified preview is not download-ready before Apply;
- candidate validation passes without overwrite/writer authority;
- explicit Apply records the released TARGET1 hash/receipt;
- download becomes ready only after Apply;
- final receipt records `appliedToNewCopy=true`, `originalFileOverwritten=false`, `writerInvoked=false`;
- forged TARGET0 hash is rejected at final download boundary;
- changing TARGET0 invalidates the release;
- v11 remains fail-closed;
- FORCE remains blocked;
- unsupported block remains blocked.

### UI wiring inspection

STATUS: **PASS**
OBSERVATION: branch diff/static inspection confirms `Apply to New Copy`, `refs.apply.disabled = !summary.canApplyToNewCopy`, `refs.download.disabled = !summary.canDownload`, and no new Writer/file-system import.
ORACLE: source inspection; not browser runtime.

### Retained real `SOURCE 3.CII`

STATUS: **NOT_RUN**
OBSERVATION: exact retained file is 393008 bytes with Git blob `20c0c37014004fb9de46e3e4d01f0c62535495d5`, but the current connector substrate still cannot materialize the complete private file into the local execution runtime.
ORACLE: authored retained-real test remains unchanged.

### Full repository suite

STATUS: **NOT_RUN**
OBSERVATION: no complete authenticated checkout / applicable CI run is available in this substrate.

### Native-v14 archived fixture / external CAESAR acceptance / FORCMNT qualification

STATUS: **NOT_RUN** / **NOT_QUALIFIED** as previously recorded. This PR does not alter those gates.

## Coordination / overlap

Before branching, open Find & Replace PR search returned no overlapping active PR. Branch was created directly from current `main` `511d1869...`; compare showed 0 behind before PR allocation.

## Environment limitation / recovery

Work was performed through the connected GitHub API without a local authenticated repository checkout. Repository-local `node utils/backup.cjs save ...` and `.agent-worklogs/` commands therefore could not be executed. Exact preimage Git blobs are recorded above, and all changes are isolated on this branch. This does **not** claim satisfaction of the local backup/ledger command requirement.

## Highest remaining risk

The new release gate is focused-validated but has not yet run under the repository’s complete authored dependency graph/full checkout. Retained-real and full-suite status therefore remain `NOT_RUN`.

## Exact next action

In an exact authenticated checkout of PR #1071 head, run unchanged:

```bash
node --test tests/cii-workspace-find-replace-session.test.js \
  tests/cii-workspace-find-replace-output.test.js \
  tests/cii-workspace-find-replace-ui-registration.test.js \
  tests/cii-workspace-find-replace-foundation.test.js
```

Then run the existing non-benchmark Find & Replace group. If those pass, execute `tests/cii-workspace-find-replace-retained-real.test.js` against the retained `SOURCE 3.CII` and only then consider full-suite promotion. First authored assertion failure is `FAIL`; materialization/runtime stop before authored assertions is `NOT_RUN`.
