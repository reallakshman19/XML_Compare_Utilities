# WIP iss1239 slice 2 — Source ↔ Target census audit

## Mission

Implement the second #1239 slice after audit: a first-class Source↔Target census that enumerates every SOURCE node and joins existing correspondence/review evidence without creating new identity claims. One model must drive UI and CSV/JSON export.

## Stack / live basis

- Issue: `reallaksh19/XML_Compare_Utilities#1239`
- Protocol: Engineering Relay V3.2, Owner-selected exact Common reference already recorded on #1239
- Base dependency: draft PR #1240 / branch `fix/cii-writer2-evidence-qualified-review-1239`
- Stack base SHA: `6e62621c6918b50485314fc87886072ef37b9a69`
- Branch: `fix/cii-writer2-source-target-audit-1239`
- Merge authority: OWNER_ONLY / NOT_GRANTED

## Audit-first findings

1. `combinedCompareReview()` only concatenates already-emitted member review rows; it is not a source-node census.
2. Each multi-source `memberPreview` retains the full `sourceDocument`; target document is retained once.
3. SOURCE population can be enumerated from parsed element endpoints, with parsed-node / NodeName keys used as supplementary population sources when present.
4. Mapping truth must come only from existing normalized NODE review/correspondence rows. Unemitted source nodes must stay `UNEMITTED`; the census must not invent target identities.
5. Existing `correspondenceCsv` exports emitted correspondence only and therefore cannot serve as the census export.

## Declared denominator

| Unit | State |
|---|---|
| U1 pure census model | ACTIVE |
| U2 attach model to multi-source preview/audit | PENDING |
| U3 Source vs Target UI | PENDING |
| U4 census CSV/JSON export | PENDING |
| U5 deterministic tests | PENDING |
| U6 stacked PR evidence / recovery | PENDING |

## Protected invariants

- no new correspondence generation;
- no NodeName-as-identity authority;
- no Method-A/B or anchor behavior changes;
- no review confidence/authority changes from #1240;
- no Writer1C/Writer2 mutation-authority changes;
- no V11↔V14 changes;
- no BM-001/TEXPECTED interpretation in this slice;
- no retained benchmark byte changes.

## Intended census states

```text
BOUND      = one existing normalized target identity is bound
UNRESOLVED = correspondence row(s) exist but identity is not bound
AMBIGUOUS  = existing rows claim more than one target node for one source node
UNEMITTED  = source node exists in parsed source population but no NODE review row exists
```

## MATERIAL_FRONTIER

Read-only audit projection + UI/export only.

## SEMANTIC_EVIDENCE_FRONTIER

SOURCE population = parsed document evidence. Mapping = existing normalized review/correspondence evidence only.

## EXACT_NEXT_ACTION

Implement a pure census model and deterministic unit fixture first. Only then wire it into preview/UI/export.