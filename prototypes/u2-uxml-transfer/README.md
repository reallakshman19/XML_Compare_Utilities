# U2a — Transfer planner in UXML terms

Read-only PSI116 transfer planner. Node 22, no packages. `planTransfer(sourceBytes,targetBytes,pairs,{items,bore,choices})` returns a promise of `{ok,edits,ambiguities,refused,summary}` on successful planning; fatal refusal returns `{ok:false,refusals}` without edits. Each edit is `{ref,field,before,after,lineNo}`. Pass only `edits` to U1 after Owner review; U2a does not write XML or grant approval. `before` and `after` are decoded, trimmed leaf text, not numbers or raw entity spellings. Numeric source text must satisfy the merged U1 finite decimal rule (no exponent, leading plus, or negative zero). Numerically equal text spellings do not generate edits. Invalid values refuse the affected field; an invalid contributor blocks the shared branch field. Branch edits use the first contributing target node ref; one edit per target branch and field. Pair-level diagnostics can coexist with unrelated edits. Never apply a plan blindly.

```
node cli.mjs plan source.xml target.xml pairs.json --items name,weight,element --bore --choices choices.json --out plan.json
node --test
node bench/run.mjs
```

Without options, all three items are enabled and the OD gate is off. Raw pairs must be one-to-one, with five exact PSI116 ref fields (zero-based ordinals); XML→XML Map v1 accepted with shared validation, approved pairs only and both SHA-256 locks. No line matching yet: `lineNo:'[TBA]'`. Pairing is supplied, never inferred. `--out` creates a new JSON file only; no XML changes. CLI exit 0 = planned (possibly with diagnostics), 1 = fatal refusal, 2 = usage. `choices` is an object keyed by exact name, value `"skip"` or an array of target refs from that popup. Unselected name edits are withheld; unrelated item edits remain. Names are exact, case-sensitive; explicit blank text clears a name. Missing fields or self-closing target leaves are not written. Branch fields remain branch-wide, including unmapped nodes; a failed bore pair blocks all branch edits into its branch. A name swap is evaluated simultaneously, using final OD when the element item proposes OD changes. Unmapped source occurrences and target owners are included. Repeated same-name/same-bore, unknown bore or a source-to-final-target bore mismatch within a repeated-name group requires a choice; explicit choices can authorize repeats. A newly exposed owner invalidates prior authorization and returns to popup.

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
| `U2_VALUE_INVALID` | Source numeric value is empty, invalid or nonfinite. |
| `U2_NAME_BORE_MISMATCH` | Ambiguity: repeated-name pair has different source and final target nominal bores. |
| `U2_BRANCH_FIELD_SPLIT` | Ambiguity: contributing branch values disagree. |
| `U2_NAME_REPEATED` | Ambiguity: repeated name and bore. |
| `U2_BORE_UNKNOWN` | Ambiguity: repeated name with unknown bore. |
| `U2_CHOICE_INVALID` | Popup choice contains invalid target ref. |
| `INPUT_SHA256_MISMATCH` | Kit hash mismatch. |
| `U2_ROUNDTRIP_MISMATCH` | U1 receipt or revised target re-plan does not reconcile. |
| `U2_OUTPUT_EXISTS` | Either requested output path already exists, or both are identical. |
| `U1_STALE_BEFORE` | U1 found a different current value; neither output is written. |
| `U1_VALUE_INVALID` | U1 rejected a planned value; neither output is written. |

The scanner passes through its XML refusals. CLI also reports U2_JSON_INVALID and U2_IO_FAILED.

## U2b — Apply a reviewed transfer

Run in the XCU checkout with merged U1 available. This command writes a **new** revised PSI116 and a JSON application receipt, after the in-memory U2a plan, U1 write-back/parity and round-trip checks pass:

```
node cli.mjs apply source.xml target.xml pairs.json --out revised.xml --changes changes.json --items name,weight,element --choices choices.json
```

A validated XML→XML Map can replace `pairs.json`; only approved pairs are used. `--bore` and `--items` behave as in `plan`. `--choices` is optional. U2a ambiguity and refusal rows are reported, not sent to U1; unrelated planned edits still apply. U1 itself remains atomic: any U1 refusal aborts the entire command. The merged U1 numeric grammar accepts finite `-?digits[.digits]` decimal text (not exponent, leading plus, or negative zero). U2a now refuses every inadmissible source numeric field as `U2_VALUE_INVALID`, even if its numeric value equals the target. Such rows are withheld before U1, while unrelated valid edits proceed. A bad branch contributor blocks the shared branch field. No silent rewriting or normalization is done.

The receipt (`format: u2.transfer-receipt`, version 1) records source/base/revised SHA-256, supplied pairs-file SHA-256, options, applied `changes` (target ref, field, before/after, original target byte span `[start,end)`, lineNo, evidence pairs), initial ambiguities/refused rows, summary and round-trip result. Branch edits include all approved contributing pairs. Raw pairs receive one-based `raw-N` evidence IDs. It is an audit receipt, not an approved `topofix.changeset`: this CLI has no Owner identity/approval or explicit zero-confirmation flags, and XML byte spans need not equal decoded text lengths. Do not use the receipt as a new approved Change set. `applyTransfer` itself returns bytes and ledger in memory only; CLI creates the two files exclusively after checks. `U2_OUTPUT_EXISTS` means either path already exists or both paths are identical; `U2_ROUNDTRIP_MISMATCH` means the U1 receipt or re-plan failed to reconcile. Both are fatal and produce no output. The re-plan uses the same options and pairs (a validated Map's target hash is updated internally only), and requires zero remaining edits across all requested items, including newly appearing proposals. Unresolved ambiguity/refusal diagnostics may remain, but any residual edit causes `U2_ROUNDTRIP_MISMATCH` and neither output is written. Exit 0 = both outputs written, 1 = refusal, 2 = usage. An I/O error during two-file creation triggers rollback of files created by this call; crash-atomic multi-file filesystem transactions are not provided.


## U2c — Resolve name ambiguities locally

From this card folder, start a local static server (for example, `python3 -m http.server 8000 --bind 127.0.0.1`) and open `http://localhost:8000/ui/index.html` in a browser. No packages, build, uploads, external scripts or network APIs are needed. The page reads the source PSI116, target PSI116 and pairs/Map JSON locally, then calls the existing planner. Select the same items and OD gate as the eventual CLI apply. For each exact name, choose one or more offered target refs or explicitly tick Skip; branch-field splits and candidate values are read-only. The download is exactly the name-to-refs-or-skip JSON consumed by `--choices`. Changing inputs/options discards the current selection. The download is disabled until every name group has an answer. Existing owners may be offered even if selecting them is a no-op. Multiple diagnostic rows for one name share a single selection over their deduplicated candidate refs.

```
node cli.mjs ambiguities source.xml target.xml pairs.json --items name,weight,element
node cli.mjs apply source.xml target.xml pairs.json --out revised.xml --changes receipt.json --items name,weight,element --choices choices.json
```

Use `--bore` on both commands if selected on the page. The first command prints the exact ambiguity array (exit 0), or a refusal object (exit 1). The CLI apply checks supplied choices against the fresh initial list; unknown names, unoffered/stale refs, empty/duplicate selections and invalid shapes refuse `U2_CHOICE_NOT_OFFERED` without writing outputs. Missing answers in a hand-written file still leave that name unresolved. The planner remains the final authority for cascading ambiguity/refusal and the strict U2b round-trip check remains mandatory. Branch splits cannot be resolved by a name choice.

The page module renders file-derived text via textContent, has a restrictive CSP and never sends bytes off the page. The HTML import map resolves the pinned validator's Node-only CLI imports to throwing stubs in the same ES module; an empty argv disables that CLI entry. Validator source and Map checksum checks are unchanged. The Node VM test checks the browser-style module graph without opening a browser; visual execution is for the Oracle.
