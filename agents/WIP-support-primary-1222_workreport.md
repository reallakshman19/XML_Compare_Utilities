# WIP-support-primary-1222 workreport

WORK_ITEM: github:reallaksh19/XML_Compare_Utilities#1222
CHAIN: SUPPORT-PRIMARY-1222
BRANCH: feature/support-primary-assembly-graph
BASE_MAIN: 242fc1b1df7e398b64e15a1fd3e2f87d1ff5b581
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE

## Mission

Introduce an auditable primary-support assembly graph upstream of Support Report count/typicality, using optional explicit SupportChain clash evidence plus canonical staged relationship evidence and geometry fallback. Preserve #1216 Support/Steel producer authority.

## Current implementation state

Prework/custody only. No production files have been changed yet.

Planned first material slice:
1. rename user-facing multi-location remark to `Multiple primary support`;
2. extract/reuse a member-pair parsing seam that can retain explicit member connectivity when pipe context is unavailable while keeping legacy callers compatible;
3. add a pure deterministic family-scoped assembly connected-component builder;
4. add focused tests for explicit component construction, DATUM non-countability, and explicit-component separation;
5. do not migrate final report count or Column 22 decision authority yet.

## Active findings / decisions

- Current `parseSupportChangeXml()` discards an edge when `lineContext(objects)` cannot produce a pipe. This is too strict for member-to-member assembly connectivity.
- Current Support Report occurrence grouping is branch/traversal gated before bore-axis geometry; explicit connectivity should be a stronger assembly-membership signal than widening normal geometry.
- #1216/PR #1219 protects combined staged JSON as Support/Steel carrier/steel relationship production authority. This WIP does not modify that authority.
- #1179 existing structural matcher remains intact; relationship topology is a later independent matcher consumed through consensus.
- Current main is one commit after merged PR #1221; main SHA `242fc1b1...`.

## Authority / invariants

- Explicit support-member connectivity != carrier/steel authority.
- DATUM/reference nodes are symbolic and non-countable.
- Geometry fallback cannot merge two distinct explicit assembly IDs.
- Missing evidence remains unresolved.
- No global tolerance widening for benchmark convenience.
- UI/export cannot create engineering relationships.

## Validation truth

- Common v2 protocol/references: PASS by source inspection.
- Repository overlay: PASS by source inspection.
- Work-item collision: PASS; no pre-existing canonical #1222 chain found.
- Main/active PR reconciliation: PASS for first-slice exact paths.
- Product tests: NOT_RUN.
- Real 1835 SupportChain XML benchmark: NOT_RUN / real file locator unresolved.

## Changed-file ledger

Current relay-only files:
- `agents/chains/SUPPORT-PRIMARY-1222/issue-basis/IB-SUPPORT-PRIMARY-1222-0001.md`
- `agents/chains/SUPPORT-PRIMARY-1222/issue-state/CURRENT.md`
- `agents/chains/SUPPORT-PRIMARY-1222/endpoints/EP-SUPPORT-PRIMARY-1222-0001.md`
- `agents/chains/SUPPORT-PRIMARY-1222/ACTIVE.md`
- `agents/qualifications/SUPPORT-PRIMARY-1222/QS-SUPPORT-PRIMARY-1222-0001.md`
- this workreport

## Highest risk

Accidentally converting legacy Clash-within-Supports evidence into a second Support/Steel production resolver. The patch must retain a strict typed evidence boundary.

## Exact work location

First product slice will touch the smallest parser/Support Report seams under:
- `tabs/ps-family-clash-audit/`
- `tabs/support-steel-relationship-builder/`
- focused `tests/`

No workflow files and no #1216 fixture/contract files.

## EXACT_NEXT_ACTION

Synchronize issue control-plane comments and comment IDs; then start the first material commit strictly after the prework endpoint. Open a draft PR after the first coherent material slice is committed and described.