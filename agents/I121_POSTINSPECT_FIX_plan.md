# I121 post-Inspect stale-operation containment — pre-edit plan

Source: [reported review PR132 comment 6259872088](https://github.com/reallakshman19/XML_Compare_Utilities/pull/132#issuecomment-6259872088); [owner directive to fix](https://github.com/reallakshman19/XML_Compare_Utilities/issues/121).

## Aim
Prevent any asynchronous Compare, review-rebuild, scope-binding or Writer2 Apply result started under obsolete SOURCE/TARGET, base-selection or review decision state from restoring UI previews or exporting a stale TARGET. Scope is the **existing deployed docs Writer2 multi-source UI**. Keep the proven Worker Inspect fix intact, physical BOUND/Apply authority unchanged and separate PR107 tabs ownership untouched.

## Exact approved module
`docs/tabs/cii-workspace/cii-workspace-multisource-writer2-ui.js` at parent PR132 blob `b9766bbf88f1dc4d4ef4423dfa73ec5699c54688`. New bounded tests, optional standalone guard helper if needed and workflow are permissible. NO original fixture, Python, Method A/B/BM001, PR107 tabs, PR132/133 or release-state edits.

## Hypothesis and falsifier
Inspect's `inspectionEpoch` already fences its awaits; four legacy handlers do not check any same-generation/current-operation stamp after their own awaits. A completion after SOURCE/TARGET reset or changed review inputs may revive preview/scope or trigger old download. Check every handler after await on success **and error** and before downloading. A shared generation/revision must invalidate stale operations on reset, changing manual/base/review choices and overlapping new operations. Where original S1 has only 2/3 qualified bases, do NOT construct a fake physical base to force real downstream browser actions: rely on separately labeled controlled unit adversaries plus authentic original four-file Inspect regression. State those evidence limits.

## Custody and ownership
Source preimage must be fully backed up before editing existing file using `node utils/backup.cjs save` in a GitHub Actions full checkout, with actual SHA256, no-index binary patch from preserved snapshots and selective undo directions. Local hidden `.backups/` and `.agent-worklogs/` are retained in CI artifacts only, not committed. All work remains DRAFT, no merge or P2 certification.
