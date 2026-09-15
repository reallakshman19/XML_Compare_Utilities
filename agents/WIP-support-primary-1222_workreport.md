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

First material slice is implemented and recorded as `LEG-001`.

Implemented:
1. user-facing remark value is now `Multiple primary support`; legacy constant name remains a compatibility alias;
2. `parseSupportMemberRelationshipXml()` reuses the PS/SL legacy parser owner and retains SupportChain member pairs even when pipe context is unavailable;
3. existing `parseSupportChangeXml()` remains pipe-required for current legacy audit callers;
4. new `SupportPrimaryRelationshipBundle.v1` builds deterministic family-scoped connected components from explicit support-member edges;
5. concrete numeric members are countable; `DATUM` / `STRUCTURAL_REFERENCE` are symbolic and non-countable;
6. cross-family edges are excluded with diagnostics;
7. explicit components are topology-only and cannot be merged by coincident XYZ;
8. focused tests cover no-pipe parser retention, pipe-context retention, PS-11167 deterministic assembly ID, PS-11236 DATUM semantics, coincident explicit components, cross-family failure, and remark rename.

Not implemented in this slice:
- final `TOTAL SUPPORT POINTS ON SECONDARY` migration;
- zone multiselect UI;
- orphan resolver;
- relationship-topology Column 22 matcher;
- consensus integration.

## Active findings / decisions

- Current legacy `parseSupportChangeXml()` previously dropped any support relationship lacking line context at `if (!pipe) return null`. The new entrypoint changes only the new Support Report evidence seam; existing callers keep their current gate.
- Explicit member connectivity is now represented separately from carrier/steel authority. A member edge can be valid while `pipeContextStatus=UNAVAILABLE`.
- The assembly model deliberately ignores geometry for component connectivity. XYZ is source evidence only in this slice.
- #1216/PR #1219 remains protected: no Support/Steel carrier/steel producer file or tolerance was modified.
- #1179 current structural matcher is untouched.

## Authority / invariants

- Explicit support-member connectivity != carrier/steel authority.
- DATUM/reference nodes are symbolic and non-countable.
- Geometry fallback cannot merge two distinct explicit assembly IDs.
- Missing evidence remains unresolved.
- No global tolerance widening for benchmark convenience.
- UI/export cannot create engineering relationships.
- Current Support Report count and Column 22 decisions are unchanged except the displayed remark text.

## Validation truth

PASS:
- Common v2 protocol/references: source inspected.
- Repository overlay: source inspected.
- Work-item collision: no pre-existing canonical #1222 chain found.
- Main/active PR reconciliation: no exact first-slice conflict with PR #1219.
- Branch diff against `main@242fc1b1...`: first slice limited to parser, assembly module, remark constant, focused test plus relay files.
- Isolated Node v22 parser harness: legacy parser rejected a no-pipe edge while new relationship parser retained it with `pipeContextStatus=UNAVAILABLE`.

NOT_RUN:
- repository `tests/support-primary-relationship.test.mjs` execution;
- legacy PS/SL parser regression suite;
- Support Report benchmark suite;
- GitHub Actions / browser qualification.

BLOCKED:
- real 1835 Clash-within-Supports benchmark remains blocked on the real Owner relationship XML locator.
- therefore PS-11167=6 and PS-11236=4 remain frozen expectations, not PASS claims.

## Changed-file ledger

Production:
- `tabs/ps-family-clash-audit/ps-family-psclash-xml-parser.js`
  - adds separate relationship parser policy/entrypoint; legacy behavior retained.
- `tabs/support-steel-relationship-builder/support-primary-relationship.js`
  - new pure `SupportPrimaryRelationshipBundle.v1` topology seam.
- `tabs/support-steel-relationship-builder/support-report-location-grouping.js`
  - exports `SUPPORT_REPORT_MULTIPLE_PRIMARY_SUPPORT_REMARK = 'Multiple primary support'` and keeps legacy alias.

Qualification:
- `tests/support-primary-relationship.test.mjs`

Relay/control plane:
- `agents/chains/SUPPORT-PRIMARY-1222/**`
- `agents/qualifications/SUPPORT-PRIMARY-1222/**`
- this workreport

## Code-quality note

`support-primary-relationship.js` is 237 physical lines, within the Common review threshold. It is intentionally a staged prerequisite without a runtime count/typicality consumer yet; issue #1222 §17 explicitly authorizes that sequence. The next production consumer must use this canonical seam rather than reimplementing connected components.

## Highest risk

The next integration step could accidentally let explicit support-member clash evidence become carrier/steel authority. That remains prohibited. Count migration must join assemblies to pipe/report evidence without changing #1216 ownership.

## Exact work location

Material leg `LEG-001`:
- material base `54a088f478b69d8b0412f36db3558083446aec06`
- material head `2c065b69ed94dae63d531c0660103486d5447691`
- receipt `agents/chains/SUPPORT-PRIMARY-1222/material-legs/LEG-001.md`

## EXACT_NEXT_ACTION

Create `EP-SUPPORT-PRIMARY-1222-0002`, synchronize current/ACTIVE issue state, open a draft PR, and inspect actual CI execution. Do not report repository tests as PASS unless they execute. Do not merge. If the first slice qualifies, the next material work is zone-scope discovery/UI and assembly-to-report reconciliation before count migration.