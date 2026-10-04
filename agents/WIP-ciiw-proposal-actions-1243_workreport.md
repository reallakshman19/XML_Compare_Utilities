# WIP — CII Writer2 direct anchor proposal actions (#1243)

## Recovery header
- `WORK_ITEM`: `reallaksh19/XML_Compare_Utilities#1243`
- `WORK_INTENT`: IMPLEMENT
- `CRITICALITY`: ENGINEERING_CRITICAL / UI AUTHORITY SURFACE
- `MERGE_AUTHORITY`: OWNER_ONLY / NOT_GRANTED
- `BASE`: `main@b2ff4c67fe6b1ad1e9d4a0be182d6aa3dc53ac08`
- `BRANCH`: `fix/cii-writer2-proposal-actions-1243`
- `PR_STATE`: NOT_CREATED_YET

## Mission
Expose existing retained Writer2 anchor-authority operations directly in `Anchor proposal rationale` so the engineer can act on the row being reviewed.

No new matching/qualification rule is introduced.

- qualified Method A/B proposal -> existing suggestion selection key / selectedBySource authority;
- review-only proposal -> explicit USER LOCKED manual SOURCE↔TARGET pair;
- exact existing manual pair -> visible Locked state, no duplicate;
- manual lock continues to replace automatic base selection for that SOURCE.

## Coordination
Open PR #1234 changed-file inspection shows no overlap with the two planned production files:
- `tabs/cii-workspace/cii-workspace-multisource-anchor-ledger-ui.js`
- `tabs/cii-workspace/cii-workspace-multisource-writer2-ui.js`

## Protected boundaries
Do not change Method-A/B mathematics, proposal scoring/ranking, Node Name identity authority, Writer1C/Writer2 mutation authority, V11↔V14, benchmarks, workflows, deployment, or persistence.

## Planned validation
- markup unit test: Action column + selected/locked states;
- state helper regression where possible;
- static retained-shell registration check for proposal action handlers;
- no full retained/browser PASS claim without execution.

## Environment limitation
Authenticated GitHub mutation is available but no complete authenticated local checkout is available in this session. Do not claim local backup/worklog artifacts that cannot be produced.

## EXACT_NEXT_ACTION
Implement proposal-row state/action markup as a pure projection first, then wire the retained shell handlers to existing authority maps and add focused tests.