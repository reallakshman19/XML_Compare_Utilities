# U2a — Transfer planner in UXML terms

Read-only PSI116 transfer planner. Node 22, no packages. `planTransfer(sourceBytes,targetBytes,pairs,{items,bore,choices})` returns a promise of `{ok,edits,ambiguities,refused,summary}` on successful planning; fatal refusal returns `{ok:false,refusals}` without edits. Each edit is `{ref,field,before,after,lineNo}`. Pass only `edits` to U1 after Owner review; U2a does not write XML or grant approval. `before` and `after` are decoded, trimmed leaf text, not numbers or raw entity spellings. Branch edits use the first contributing target node ref; one edit per target branch and field. Pair-level diagnostics can coexist with unrelated edits. Never apply a plan blindly.

```
node cli.mjs plan source.xml target.xml pairs.json --items name,weight,element --bore --choices choices.json --out plan.json
node --test
node bench/run.mjs
```

Without options, all three items are enabled and the OD gate is off. Raw pairs must be one-to-one, with five exact PSI116 ref fields (zero-based ordinals); XML→XML Map v1 accepted with shared validation, approved pairs only and both SHA-256 locks. No line matching yet: `lineNo:'[TBA]'`. Pairing is supplied, never inferred. `--out` creates a new JSON file only; no XML changes. CLI exit 0 = planned (possibly with diagnostics), 1 = fatal refusal, 2 = usage. `choices` is an object keyed by exact name, value `"skip"` or an array of target refs from that popup. Unselected name edits are withheld; unrelated item edits remain. Names are exact, case-sensitive; explicit blank text clears a name. Missing fields or self-closing target leaves are not written. Branch fields remain branch-wide, including unmapped nodes; a failed bore pair blocks all branch edits into its branch. A name swap is evaluated simultaneously, using final OD when the element item proposes OD changes. Unmapped source occurrences and target owners are included. Repeated same-name/same-bore or unknown bore requires a choice; explicit choices can authorize repeats. A newly exposed owner invalidates prior authorization and returns to popup.

## Fixed nominal bore table
Source: ASME B36.10M, Welded and Seamless Wrought Steel Pipe, standard outside diameters for NPS 1/8–24, expressed in mm and mapped to nominal DN (NB). Single table, ±0.05 mm matching tolerance for rounding; no nearest-size extrapolation and no unit guessing. Nonstandard/out-of-range OD is unknown. The optional pair gate compares positive numeric OD exactly (so 60.30 equals 60.3), not DN. The popup uses the table only for repeated-name resolution.

| OD mm | NB (DN) |
|---:|---:|
|10.3|6|
|13.7|8|
|17.1|10|
|21.3|15|
|26.7|20|
|33.4|25|
|42.2|32|
|48.3|40|
|60.3|50|
|73|65|
|88.9|80|
|101.6|90|
|114.3|100|
|141.3|125|
|168.3|150|
|219.1|200|
|273.1|250|
|323.9|300|
|355.6|350|
|406.4|400|
|457.2|450|
|508|500|
|558.8|550|
|609.6|600|

## Refusal codes
| Code | Meaning |
|---|---|
| `U2_ITEM_NOT_ENABLED` | Unsupported item. |
| `U2_OPTIONS_INVALID` | Invalid bore or choices option. |
| `U2_MAP_INVALID` | Map is not valid XML→XML Map v1. |
| `U2_MAP_FILE_MISMATCH` | Map hashes do not match loaded bytes. |
| `U2_PAIR_INVALID` | Missing, stale or repeated ref. |
| `U2_BORE_MISMATCH` | Pair OD mismatch or unavailable; dependent branch edits withheld. |
| `U2_FIELD_UNAVAILABLE` | Missing source or writable target field. |
| `U2_BRANCH_FIELD_SPLIT` | Ambiguity: contributing branch values disagree. |
| `U2_NAME_REPEATED` | Ambiguity: repeated name and bore. |
| `U2_BORE_UNKNOWN` | Ambiguity: repeated name with unknown bore. |
| `U2_CHOICE_INVALID` | Popup choice contains invalid target ref. |
| `INPUT_SHA256_MISMATCH` | Kit hash mismatch. |

The scanner passes through its XML refusals. CLI also reports U2_JSON_INVALID and U2_IO_FAILED.
