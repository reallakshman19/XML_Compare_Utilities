# Method C — WP9 exact-SHA G2 / independent-checker handoff

**Parent** [#108](https://github.com/reallakshman19/XML_Compare_Utilities/issues/108) · **Plan** `V36-108-PLAN-01` · **Owner-approved label** `CII-METHOD-C@1.0.0` (`18d91c9`) · **Candidate** [draft PR #118](https://github.com/reallakshman19/XML_Compare_Utilities/pull/118), `methodc/108-geometry-20261016`.

**Status: REQUEST_FOR_INDEPENDENT_REVIEW; NOT APPROVED.** The authoritative candidate SHA is always the current `git rev-parse HEAD` in a hosted checkout, **not** a previously green SHA or the prior WP8 commit. Read the sibling `docs/METHOD_C_G2_REVIEW_STATUS.json` as a *worker-authored hold ledger*, never as G2 signoff. G2 must record PASS/FAIL/HOLD on every child at the exact reviewed SHA; the Owner alone determines physical-credit policy, merge and release.

## G2 reproduce and inspect, without changing existing source

```bash
git fetch --no-tags origin main methodc/108-geometry-20261016
git switch --detach origin/methodc/108-geometry-20261016
CANDIDATE=$(git rev-parse HEAD)
BASE=3a7c34cd1b8f2f88b36e55503a96378406ea0c71
git diff --name-status "$BASE" "$CANDIDATE"
node --test tests/cii-workspace-method-c-review-preflight.test.js
node --test tests/cii-workspace-method-c-independent-benchmark.test.js
```

The independent benchmark test requires an **additional isolated sparse checkout of the pinned PR #107** under `test-results/cii-method-c-wp8/pinned-owner-reference`, as installed in `.github/workflows/cii-method-c-wp2.yml`; it **must not** be run as if the frozen 428-owner-file resided on PR #118. Review the actual workflow run and artifact on the exact SHA; rerun original S1/S2/S3/T SHA-256 and all 1,761 original ELEMENT / 1,769 NODE checks, independent 37/45 and 41/57 counts, the 4060→original ELEMENT 900→905 segment projection and all global TARGET collision witnesses. Raw original files and 428 lexical relations are NEVER rewritten.

### WP1–WP9 review queue

| Task | Child | Worker-submitted state; reviewer action |
|---|---|---|
| WP1 O1 | [#109](https://github.com/reallakshman19/XML_Compare_Utilities/issues/109) | G2 structure aligned; re-check label/plan binding at current SHA |
| WP2 O2 | [#110](https://github.com/reallakshman19/XML_Compare_Utilities/issues/110) | Review original bytes/physical nodes/signed ELEMENT evidence; no physical identity grant |
| WP3 O2 | [#111](https://github.com/reallakshman19/XML_Compare_Utilities/issues/111) | Independently check proper det(R)=+1, underdetermination, residuals and contradiction |
| WP4 O2 | [#112](https://github.com/reallakshman19/XML_Compare_Utilities/issues/112) | Review full TARGET alternatives, 100mm box, TARGET collisions and segment-only noncredit |
| WP5 O2 | [#113](https://github.com/reallakshman19/XML_Compare_Utilities/issues/113) | Review real *standalone served* SVG/DOM Chromium screenshot, exports and injection controls |
| WP6 O2 | [#114](https://github.com/reallakshman19/XML_Compare_Utilities/issues/114) | **IMPLEMENTED / EVIDENCE SUBMITTED** — Owner-granted exact native entry + deploy mirror; actual served docs app Chromium PASS at `b6e44cc`; independent G2 review still HOLD |
| WP7 O2 | [#115](https://github.com/reallakshman19/XML_Compare_Utilities/issues/115) | **HOLD** — protected suite currently 12/14, identical two tests fail on approved main |
| WP8 O3 | [#116](https://github.com/reallakshman19/XML_Compare_Utilities/issues/116) | Review independent parser, frozen 428 SHA and separate 105/150 Midcycle; no release scoring |
| WP9 O3 | [#117](https://github.com/reallakshman19/XML_Compare_Utilities/issues/117) | **REVIEW_REQUESTED**; G2 checks every SHA, documents corrections, then independent checker checks G2 corrections |

Canonical task evidence belongs on each actual child. Worker-submitted `TASK_EVIDENCE` is a reproducible claim, **not G2 acceptance**. If G2 creates corrective commits, check `git show --stat <G2_SHA>`, record test logs from that exact SHA and have a *different* independent checker verify each G2 fix. Do not pretend a worker-owned test is independent G2 review.

## WP6 — Owner-authorized native app entry integrated; independent G2 review remains pending

The normal real CII tab installer is `tabs/cii-workspace/cii-workspace-tab.js`; the live deployment mirror `docs/tabs/cii-workspace/cii-workspace-tab.js` has the **same blob SHA `ec6f825d2e0e03f60b6e7e796c6f9dd7058a6bfc`** on approved main and PR #107. Both are *pre-existing shared paths*. The Owner's explicit `authorized, proceed` on 2026-10-16T17:16:47Z authorized the exact two-file Method C tile insertion and deployment mirror, not unrelated Method A/B/Writer2 edits or merger. The native and docs mirror now have **exactly** an independent Method C tile import/install/dispose; the existing Writer2 and Find/Replace logic remains verbatim identical to approved main. The owned `cii-workspace-method-c-tile.js` plus original-byte adapter and all ten owned module/CSS deploy mirrors were added. PR #107 shared files remain untouched. G2 still must independently review and accept the exact SHA.

**Actual served application qualification:** hosted [run #38939889648, native job #117104585557](https://github.com/reallakshman19/XML_Compare_Utilities/actions/runs/38939889648/job/117104585557) **PASS 1/1** at `b6e44cc840d0ed3370aa472ff2581fe8b7d255b1` using real `docs/index.html` startup → Utilities → native Method C tile → original S1/T uploads and SHA-256 custody → anchor 3910↔875 → 57 SOURCE rows with 41 near candidate observations, original route 45/45 marker scope, S1 4060 original TARGET segment 900→905 (no phantom NODE), linked NODE/table, metric XYZ projections, ISO, zoom/reset/tolerance, real CSV/JSON/SVG downloads, clear and close. Real artifact [#12062906229](https://github.com/reallakshman19/XML_Compare_Utilities/actions/runs/38939889648/artifacts/12062906229) includes screenshot, source and export SHA-256 receipts. No Method C page errors or missing Method C assets. This is **native WP6 engineering evidence**, not independent G2 acceptance or physical match authority.

## Blocker B — inherited protected Method A/B/Writer2 failures

The unchanged protected regression suite on PR #118 is **RED** (12/14), despite Method C isolation tests and pinned independent PR #107 reference tests passing. A separate checkout of approved main `3a7c34cd1b8f2f88b36e55503a96378406ea0c71` reproduces the **same two tests failing**; test and implementation blob SHAs are identical on main and candidate. [#115 diagnostic transcript](https://github.com/reallakshman19/XML_Compare_Utilities/issues/115#issuecomment-6219305890).

**Issue 1 — true qualification mismatch.** `tests/cii-workspace-multi-base-correspondence.test.js:51` expects the Method-B-only L-route to be `READY`, but `buildCiiMultiBaseCorrespondence` yields `UNRESOLVED`. The authority precondition at test line 48 is `READY` with two independently witnessed axes. G2 must inspect `tabs/cii-workspace/cii-workspace-multi-base-correspondence.js` path `buildMethodBCorrespondence` (calls `propagateSingleCiiAnchorCorrespondence`) and actual blockers/row evidence; correct only if independent basis and downstream corroboration justify `READY`. **Prohibited:** forcing `READY`, creating additional unverified anchors, or lowering identity vetoes. Alternative G2 disposition: if policy intentionally preserves `UNRESOLVED`, explicitly re-specify the protected test with Owner awareness under a separate authorized change, not as an ad-hoc Method C waiver.

**Issue 2 — source-text assertion versus bridge variants.** `tests/cii-workspace-writer2-product-routing.test.js:177` asserts an exact **literal** `path: 'V14_CHANGE_ISOLATED_VIA_V11'`. The unchanged `cii-workspace-writer-version-bridge.js:398` builds `path: bridge.target?.writer2Shadow?.enabled ? 'V14_TARGET_SHADOW_CHANGE_ISOLATED_VIA_V11' : 'V14_CHANGE_ISOLATED_VIA_V11'`, and line 159 selects shadow path for evidence. The exact contiguous test string is absent because the implementation is now conditional, **not because the non-shadow path is absent**. G2 should independently verify both shadow-enabled and non-shadow paths' actual byte/SHA/readiness guards with behavioral tests; if approved, update the protected test in its own authorized fix (or another G2-maintained test) to assert real bridge behavior rather than a brittle substring. **Do not** simplify Writer2 bridge logic to make a literal include succeed or weaken byte validation.

**No changes in this candidate PR** to either existing protected test or implementation; no authorization has been issued to Method C worker to repair them. No skipping/greenwashing inherited failures; the overall status must remain **RED** until genuinely remedied or separately and explicitly dispositioned by G2/Owner.

## Blocker C — frozen Owner corpus and custody ceiling

WP8 second raw parser verified all original `S1.CII` 57, `S2.CII` 47, `S3.CII` 46 physical source NODEs = **150**, TARGET 1,619 in five components, and the original Owner text SHA-256 `a84bd6cd59b774d32dbd32ee74efc0f9da2fc1ac0e485d2a8b2f6a67350a113f` with **428 lexical intended relations** (Owner-confirmed second-column SL SOURCE → first-column PS TARGET). Independent one-to-one physical custody can credit no more than 150 existing source identities; Owner's original 300/428 release target is therefore unachievable without *separate Owner policy/corpus authorization*. The **105/150** Midcycle diagnostic remains explicitly separate, not a scored replacement or fabricated 300/428 pass. WP8 reports **0** independently qualified Method C physical identities and **0** Writer2-authorized Method C matches. See [#116 raw proof](https://github.com/reallakshman19/XML_Compare_Utilities/issues/116#issuecomment-6219702070).

## G2 decision record required before any WP9 completion

On [#117](https://github.com/reallakshman19/XML_Compare_Utilities/issues/117) record exact candidate SHA and independent G2 checklist outcomes for WP1–WP8; links to task-specific child comments and native screenshots/exports; disposition of both inherited failures; grant/denial and deployment mirror scope; any G2-owned fix SHAs plus different independent checker signoff; original 428 SHA/corpus status; and explicit Owner merge/release **HOLD or authorized decision**. The worker may prepare this packet but **cannot self-grade WP9 PASS or create canonical completion evidence** for G2's missing review.
