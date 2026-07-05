# PS Family Clash Audit

`PS Family Clash Audit` is a Utilities-tab audit app for comparing Navis clash XML against an expected PS family register and an optional element-detail CSV.

## Inputs

1. **Clash XML** exported from Navis clash detective.
2. **Expected PS list CSV** containing at least `Item Name` and optionally `PDMS DESC`.
3. **Element Detail CSV** containing richer engineering attributes:
   - `Name of the element`
   - `p1bore`
   - `pipe`
   - `RTEXT of detailing text`
   - `SUPPORT GAP`
   - `Reference of the element`
   - `Position`
   - `ISOMETRIC NOTES`

## Core rules

- `Copy-(n)-of-...` is preserved as exact member identity. It is not normalized to the original PS name.
- Leading slash is ignored for matching only; display text remains human-readable.
- Family root is used only for grouping, for example `Copy-(2)-of-PS-11147.9` belongs to root `PS-11147` but remains a distinct member.
- Line-family data such as `D8810311` and the full line/branch node are preserved in clash rows and exports.
- POSFamily is derived only from E/S/U position proximity. Line number, pipe tag, and bore do not decide POSFamily membership.
- Default POSFamily tolerance is `±25 mm` independently for E, S, and U.

## Output reports

- Coverage
- Clash Rows
- Missing
- Out-of-Family
- Duplicates
- Line Families
- POSFamilies
- Source vs POSFamily Count
- Diagnostics

## Benchmark baseline

Golden PS-11147 clash fixture:

- Expected family members: 17
- Clash rows: 11
- Unique found in-family members: 7
- Missing members: 10
- Out-of-family rows: 1
- Duplicate members: 3

Golden PS-12005 element-detail fixture:

- Element details: 3 rows
- POSFamily count: 1
- Source vs POSFamily count for `PS-12005`: 1
- Line family retained: `D8810242`
