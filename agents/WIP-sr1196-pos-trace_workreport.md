# WIP-sr1196-pos-trace — Support Report POS-cluster trace remediation

PARENT_ISSUE: #1154
CHILD_ISSUE: #1196
BASE_MAIN: e1ccdf236588018f304be5942c92b587e3145f6e
BRANCH: agent/support-report-1196-pos-trace
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
RECOVERY_STATE: CONTINUE

## Mission
Correct Support Report staged-JSON trace and coordinate/member authority after Owner browser acceptance exposed that JSON trace is member-oriented rather than POS-cluster-oriented.

## Confirmed defects
- JSON trace has no deterministic POS cluster model.
- synthetic clash fallback objects can be displayed as FAMILY_LINE_ENRICHMENT;
- family-only PS/SL tokens can leak into report membership;
- native staged POS can overwrite report E/W, N/S, BOP before coordinate-frame/base-anchor qualification;
- PREV NAME can repeat the current member ID;
- SIZE can mix raw staged strings and fallback numeric formatting.

## Protected invariants
- report row location grain remains Navisworks clash-location based;
- native staged POS is evidence only until coordinate-frame/base-anchor qualification exists;
- separate report locations must never be collapsed merely because native POS is equal;
- staged JSON BORE remains SIZE authority when available;
- CU-PI/CU-PL Site/Zone behavior must remain unchanged;
- PS-12154 same-location and PS-12120 multi-location controls must remain regression-safe;
- no workbook oracle values become engineering input.

## Initial patch boundary
1. Add deterministic POS-cluster records to `SupportReportJsonTrace` while retaining member rows.
2. Pass only real selected native members into FAMILY_LINE_ENRICHMENT trace generation.
3. Keep report coordinates on clash/report-location evidence while native POS remains trace-only.
4. Filter non-concrete family tokens from exported primary-support membership.
5. Suppress no-op PREV NAME aliases and normalize SIZE values.
6. Update trace UI and focused tests.

## Validation status
NOT_RUN for this child branch at work-report creation.

## Connector recovery note
This task is being executed through the GitHub connector. Repository-local `.agent-worklogs/` and backup utility cannot be executed in the connector environment; compare-and-swap blob SHAs, isolated branch commits, this WIP report, child issue #1196, and PR diff are the durable recovery controls.

EXACT_NEXT_ACTION: add focused failing/acceptance tests for POS clusters, fallback trace truth, coordinate authority, concrete membership, PREV NAME and SIZE; then patch the smallest production owners.