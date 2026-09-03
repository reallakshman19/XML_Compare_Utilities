# WIP — CII Writer2 multi-source next-step / stage-chrome correction

## Mission
Correct the live post-anchor workflow confusion after all S1/S2/S3 manual anchors are USER LOCKED:
- make the actual `Compare models →` execution action visible beside the master anchor ledger;
- distinguish the navigation tab from the compare execution action;
- suppress the unrelated legacy Writer1A Stage 06 chrome in multi-source Writer2 mode;
- show a Writer2-specific waiting/next-step placeholder in Transfer before a preview exists.

## Live basis
- main: `c44a564d5f487c4f7ed2664196c267e3a0996b9a`
- branch: `fix/cii-writer2-multisource-next-step-stage-chrome`
- Owner observation: master ledger reports `3 / 3 SOURCE members covered · 3 manual locked · 0 method-qualified`; Compare tab appears inert; Transfer shows `BLOCKED_WRITER_1A` / `Build an approved WRITER 1A transfer plan...`.

## RCA
1. `2 Compare Review` is a navigation tab only. The operation that builds correspondence is the separate `[data-ciiw-analyze]` button labeled `Compare models →`, still located at the bottom of the long Inputs panel.
2. `authorityReady()` is already true when all 3 members have manual anchors; therefore the compare execution button should be enabled.
3. The Transfer panel also contains legacy `[data-ciiw-stages]` produced by the single-source shell. Before the multi-source preview is built, its null/default readiness is rendered as `BLOCKED_WRITER_1A`, which is unrelated to the S1/S2/S3 Writer2 route.
4. Multi-source Writer2 has its own `transferMarkup()` and writer readiness; the legacy stage chrome is not authority for this route.

## Protected invariants
- Manual anchors remain reviewed USER LOCKED base authority only.
- One-axis propagated rows remain REVIEW unless independently reviewed/qualified.
- Method B >=2-axis automatic gate unchanged.
- No Writer2 mutation, NODENAME relocation, V11/V14 converter, target shadow, projector, BM-001 binding, or workflow change.
- Navigation tabs remain navigation; do not make tab clicks silently execute engineering computation.

## Planned minimal patch
- `cii-workspace-multisource-anchor-ledger-ui.js`: render a prominent `Compare models →` CTA only when every source member is covered; otherwise render disabled guidance.
- `cii-workspace-multisource-writer2-ui.js`: bind that CTA to the existing analyze button; hide legacy stages while multi-source mode is active; render a Writer2 waiting placeholder when no multi-source preview exists.
- `cii-workspace-transfer-scope-ui.css`: compact next-step/placeholder styling.
- focused regression test(s) only.

## Validation state
- Current failure isolation: PASS by source inspection.
- Browser end-to-end: NOT_RUN.
- Product patch: NOT_STARTED.
- GitHub workflow/CI: NOT_RUN.

## Coordination
Open Writer2 PR #1064 is runtime/oracle qualification and is read-only for this task. No planned exact-file overlap.

## EXACT_NEXT_ACTION
Implement the minimal UI-only patch on the branch, run focused existing multi-source UI tests plus new next-step regression, compare branch to current main, then open a PR. Merge remains Owner-only.