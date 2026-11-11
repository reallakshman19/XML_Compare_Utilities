# CII #102 — Independent review and selective adoption of PR #103 (2026-10-15)

## Source, ownership, and original goal

Source reviewed but NOT edited: draft PR #103 at f7c3c78d7db9f5258bdfe73e5953e2df4f27a90c. This independent branch was created at that exact commit, preserving all copyable source and tests, and is being advanced separately. Do not push to or modify the #103 source branch. Do not merge both PRs; independent integration must supersede rather than stack duplicate commits.

Parent: #69 / #102. The Owner's complete PS-to-SL Phase 2 original golden remains unauthenticated; therefore the >=70% correctness benchmark is NOT_EVALUABLE. #70 alone owns its test-only intake. Writer authority remains unchanged.

## Adopt from the original code, rather than copying its claims

1. Effective 100/200 mm Method A/M1 tolerance and configurable five-part 100-point score, including policy-bound invalidation. Preserve distinction between confidence CLASSIFICATION and physical correspondence ADMISSION.
2. Original SHA-custodied AUTO-only and MANUAL-active dual replays, with row-specific manual conflicts and safely visible alternatives.
3. The existing canonical read-only A2/F2 Worker, 147-element physical factor ledger, path witnesses, and original (pre-frontier) provenance rules. No new production solver or speculative writer path.
4. Existing Compare Review integration is read-only and preserves active correspondence identity, Transfer Preview and target bytes.

## Correct a material error in the pasted PR #103 report

The statement "103 uncontested nodes remain BOUND" is NOT true for the operational product. Actual exact-original replay: AUTO legacy BOUND 105; MANUAL-active legacy BOUND 38; review-only AUTO alternatives 70; manual/AUTO conflicts 2; new certified identities 0; new Transfer operations 0. These 70 are visible, NOT operationally reactivated. The number 103 is merely 105 minus two contested candidates and is not a new product BOUND count.

The newly introduced cii-workspace-auto-manual-coexistence.test.js on #103 tests synthetic READY-loop arbitration. It does not exercise the operational per-member AUTO-or-MANUAL selector, cannot prove a 105-to-38 repair, and provides no real Transfer evidence. Keep it as a narrow unit test only.

Reducing the HIGH threshold to 74 changes grading while S3 remains poorly conditioned. Low residual alone does not establish rotation observability, source-target physical uniqueness or Writer eligibility. Do not use score promotion to improve claimed benchmark results.

The old "65.1 < 8" UI display defect is already corrected on main and the #103 source head. Do not rebuild it.

## Independent original-file physical-chain witness falsifier (this branch)

tests/cii102-independent-original-chain-falsifier.test.mjs reads SHA-frozen original S2/S3/T using the repository's existing CII parser. The generic forensic scanner starts from every original TARGET NODE and uses source physical ELEMENT sequences, NOT Owner expected TARGET IDs, for candidate generation. Expected TARGET IDs appear only in post-search assertions.

Declared bounds: up to 3 contiguous collinear TARGET segments per SOURCE ELEMENT; <=25 mm length difference; intermediate TARGET degree 2; no reused target elements or nodes; OD case A exact within 0.01 mm and case B OD-engineering-revision possibility permitted. A search-state overflow causes an explicit incomplete result / thrown failure, never a fictitious unique match.

Expected after independent original-file replay:
- S2 SOURCE 420→440→450→470→480→500→510→540→560→570: exactly 1 full chain under exact OD, T10330→10420; 3 full chains when OD revision is permitted. Manual 420→415 is not on a qualifying full chain.
- S3 SOURCE 1560→1580→1590→1600→1610→1620→1640→1650→1660→1670→1680→1690: 1 full chain both with and without exact OD; T8890→9000; source 1610→1620 maps to subdivided TARGET path 8920→8930→8940. Manual 1560→7880 does not qualify for the full chain.
- These are bounded local geometric chains, not physical certificates. Independent global registration, competing revision interpretations, and cross-source TARGET custody remain separate proof duties.

## Successor engineering, on THIS separate PR

After confirming test and workflow results, integrate existing canonical A2/F2 multi-element path witness evidence into a new read-only governed path/chain review within existing Compare Review, with every competing identity and manual assertion visible. Start with S3 and use S2's alternative chains as a strong falsifier. Do NOT modify #103, enable Writer, auto-promote 103 pairs, hardcode benchmark answers into candidate generation, or claim >=70% with an absent Owner golden.

## Verification and release boundaries

CI must run both the independent original-file chain falsifier and the retained tests/cii-102-reconciled-authority-review.test.mjs with original fixtures, verifying 150-node/147-factor population, 105 vs 38 legacy BOUND, 70 alternatives, 2 conflicts, zero operational changes. Independent review and real Chromium/Writer byte custody remain later release gates; passing tests alone grants no merge or Writer authority.
