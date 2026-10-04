# WIP iss1237 — Anchor correspondence propagation

## Mission

Implement issue #1237: keep anchor authority, correspondence cardinality, and Writer2 NodeName mutation cardinality as distinct concepts. A small trusted anchor set must seed governed correspondence propagation; the retained 36 NodeName changes remain an output oracle, not an anchor requirement.

## Protocol / live basis

- Responsibility: `reallaksh19/XML_Compare_Utilities#1237`
- Protocol: `reallaksh19/Common@149770a21ca073df49717a96e2106c967adddc2d:skills/engineering-pr-delivery-v3.2`
- Base: `main@b2ff4c67fe6b1ad1e9d4a0be182d6aa3dc53ac08`
- Branch: `issue1237-anchor-correspondence-propagation`
- Merge authority: OWNER_ONLY
- Open related draft: PR #1234, performance/search-budget responsibility under #1232.

## Takeover / implementation qualification

`TAKEOVER_AUTHORITY = READ_ONLY` was used for initial grounding. Disposition: `CONTINUE`.

### A1 — Production trace

`createCiiWorkspacePreview()` -> `workspaceMultiBaseAuthority()` -> `buildCiiMultiBaseCorrespondence()`.

- one legacy/manual anchor -> `propagateSingleCiiAnchorCorrespondence()`;
- multiple legacy/manual anchors -> `compareLockedCiiAnchorSpan()`;
- Method B one-anchor loop -> propagation;
- Method A loop -> locked-span correspondence under qualified geometry.

### A2 — Failure isolation

The repository already has recursive single-anchor component propagation. The semantic defect boundary is that multiple reviewed/manual anchors stop being propagation seeds and are collapsed to span comparison. In addition, loop arbitration only contributes correspondences whose whole loop is `READY`, so useful partial propagation cannot combine with another trusted seed.

### A3 — Protected authority

- NodeName equality is corroboration/discovery only.
- Do not weaken Method-B independent-axis authority.
- Do not change Method-A geometry mathematics.
- Do not hard-code retained benchmark node identities.
- Preserve V11/V14, Writer1C, Writer2 structural mutation semantics and retained fixture bytes.

### A4 — Independent validation

The retained browser oracle independently derives `T -> TEXPECTED-PARTIALLLYDONE` and requires 36 known-positive mutations: 35 REPLACE + 1 CREATE + 0 DELETE. Runtime execution is currently NOT_RUN in this connector-only environment.

### A5 — Minimal patch

Change correspondence authority/aggregation first; add focused tests; avoid PR #1234 search-budget files in the first slice.

## Declared denominator

| Unit | State | Evidence |
|---|---|---|
| U1 Grounding / recovery surface | COMPLETE | issue plan + this report |
| U2 Anchor-seed correspondence semantics | ACTIVE | production trace complete; patch pending |
| U3 Cardinality / proposal authority UX | PENDING | — |
| U4 Source-vs-Target audit | PENDING | — |
| U5 Root blocker projection | PENDING | — |
| U6 Retained qualification / delivery evidence | PENDING | independent oracle identified; execution pending |

## Current hypothesis / falsifier

Hypothesis: S1 manual/reviewed anchor behavior is degraded because multi-anchor authority switches to locked-span semantics instead of treating each reviewed pair as an independent seed/validation constraint, and partial propagation cannot contribute across seed loops.

Falsifier: retained/manual S1 execution shows correspondence failure originates elsewhere. If falsified, stop this semantic patch rather than redesign geometry.

## Active overlap

PR #1234 changes Method-A physical search and overlaps source-set/filter UI. Classification: `COORDINATION_REQUIRED`. This branch will not alter its search-ranking/budget algorithm or workflow files.

## Validation truth

- Live main grounding: PASS — GitHub readback.
- Repository instructions: PASS — `AGENTS.md` read at exact base.
- Code production trace: PASS — exact-base source inspection.
- Retained 36-row oracle presence/readback: PASS — static artifact inspection only.
- Focused tests: NOT_RUN — not yet authored/executed.
- Browser retained benchmark: NOT_RUN.
- Byte closure / V11↔V14: NOT_RUN.

## Highest risk

Incorrectly merging partial propagation can turn ambiguity into false correspondence. The patch must retain conflict vetoes and never promote NodeName equality or mere reachability into identity authority.

## Connector / local-ledger limitation

This responsibility is being mutated through the GitHub connector; no repository filesystem is exposed for `node utils/backup.cjs` or the git-ignored `.agent-worklogs/` ledger. Git blob SHAs and branch commits provide durable preimages, but no claim is made that the local backup/patch-ledger requirement was executed.

## EXACT_NEXT_ACTION

Patch the manual multi-anchor authority path so reviewed anchor pairs remain independent seed loops, then update arbitration to combine only evidence-supported claims while preserving conflict veto and unresolved-region diagnostics. Add focused regression coverage before touching UI/cardinality surfaces.
