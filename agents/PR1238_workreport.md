# PR1238 Work Report — Issue #1237 anchor correspondence propagation

## Mission

Implement issue #1237: keep anchor authority, correspondence cardinality, and Writer2 NodeName mutation cardinality as distinct concepts. A small trusted anchor set must seed governed correspondence propagation; the retained 36 NodeName changes remain an output oracle, not an anchor requirement.

## Protocol / live basis

- Responsibility: `reallaksh19/XML_Compare_Utilities#1237`
- Draft PR: `#1238`
- Protocol: `reallaksh19/Common@149770a21ca073df49717a96e2106c967adddc2d:skills/engineering-pr-delivery-v3.2`
- Base: `main@b2ff4c67fe6b1ad1e9d4a0be182d6aa3dc53ac08`
- Branch: `issue1237-anchor-correspondence-propagation`
- Initial PR head: `5872b6f89c5eefdaf9e8aeb610177854f3d39754`
- Merge authority: OWNER_ONLY
- Related draft PR: #1234, performance/search-budget responsibility under #1232.

## Takeover / implementation qualification

`TAKEOVER_AUTHORITY = READ_ONLY` was used for initial grounding. Disposition: `CONTINUE`.

### A1 — Production trace

`createCiiWorkspacePreview()` -> `workspaceMultiBaseAuthority()` -> `buildCiiMultiBaseCorrespondence()`.

- one legacy/manual anchor -> `propagateSingleCiiAnchorCorrespondence()`;
- multiple legacy/manual anchors -> `compareLockedCiiAnchorSpan()`;
- Method B one-anchor loop -> propagation;
- Method A loop -> locked-span correspondence under qualified geometry.

### A2 — Failure isolation

The repository already has recursive single-anchor component propagation. The first concrete semantic defect is that multiple reviewed/manual anchors stop being propagation seeds and are collapsed to span comparison. The minimal first patch is to make the manual/legacy route propagate from the complete trusted anchor set while using all locked pairs as one-to-one constraints.

Arbitration's treatment of partial non-READY loops remains a separate risk to revisit only if retained/manual execution proves multi-seed propagation still cannot reach the required region.

### A3 — Protected authority

- NodeName equality is corroboration/discovery only.
- Do not weaken Method-B independent-axis authority.
- Do not change Method-A geometry mathematics.
- Do not hard-code retained benchmark node identities.
- Preserve V11/V14, Writer1C, Writer2 structural mutation semantics and retained fixture bytes.

### A4 — Independent validation

The retained browser oracle independently derives `T -> TEXPECTED-PARTIALLLYDONE` and requires 36 known-positive mutations: 35 REPLACE + 1 CREATE + 0 DELETE. Runtime execution is currently NOT_RUN in this connector-only environment.

### A5 — Minimal patch

Generalize the existing recursive propagation engine from one anchor to a trusted anchor set. Seed node custody with every locked pair and reject frontier assignments that contradict any locked node mapping. Keep single-anchor behavior as a wrapper. Route legacy/manual one-or-many anchors through this propagation path. Add focused tests, without altering Method-A or Method-B qualification.

## Declared denominator

| Unit | State | Evidence |
|---|---|---|
| U1 Grounding / recovery surface | COMPLETE | #1237 IMPLEMENTATION_PLAN + PR1238 report |
| U2 Anchor-seed correspondence semantics | ACTIVE | production trace complete; multi-seed patch next |
| U3 Cardinality / proposal authority UX | PENDING | — |
| U4 Source-vs-Target audit | PENDING | — |
| U5 Root blocker projection | PENDING | — |
| U6 Retained qualification / delivery evidence | PENDING | independent oracle identified; execution pending |

## Current hypothesis / falsifier

Hypothesis: S1 manual/reviewed anchor behavior is degraded because multi-anchor authority switches to locked-span semantics instead of treating each reviewed pair as seed/validation constraints. Multi-seed propagation with locked custody constraints should let extra anchors disambiguate a frontier without requiring one anchor per mutation.

Falsifier: retained/manual S1 execution shows the relevant frontier remains unresolved for reasons independent of anchor constraints. If falsified, stop this patch direction and publish the first unresolved evidence boundary rather than weakening geometry/evidence rules.

## Active overlap

PR #1234 changes Method-A physical search and overlaps source-set/filter UI. Classification: `COORDINATION_REQUIRED`. PR #1238 will not alter its search-ranking/budget algorithm or workflow files. Initial U2 files do not overlap #1234's changed-file set except common downstream behavior through existing APIs.

## Validation truth

- Live main grounding: PASS — GitHub readback.
- Repository instructions: PASS — `AGENTS.md` read at exact base.
- Code production trace: PASS — exact-base source inspection.
- Retained 36-row oracle presence/readback: PASS — static artifact inspection only.
- Focused tests: NOT_RUN — patch pending.
- Browser retained benchmark: NOT_RUN.
- Byte closure / V11↔V14: NOT_RUN.

## Highest risk

Incorrect multi-seed constraint handling could convert ambiguity into false correspondence. Only explicit locked source↔target node custody may narrow candidate assignments; NodeName or mere spatial proximity must not become authority.

## Connector / local-ledger limitation

This responsibility is being mutated through the GitHub connector; no repository filesystem is exposed for `node utils/backup.cjs` or the git-ignored `.agent-worklogs/` ledger. Git blob SHAs and branch commits provide durable preimages, but no claim is made that the local backup/patch-ledger requirement was executed.

## EXACT_NEXT_ACTION

Generalize `cii-workspace-propagation.js` to multi-seed locked-anchor propagation, route legacy/manual anchor sets through it in `cii-workspace-multi-base-correspondence.js`, and replace the obsolete multi-anchor span-compatibility test with one-anchor expansion + symmetric-frontier disambiguation coverage.
