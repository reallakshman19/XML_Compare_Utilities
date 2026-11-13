# U2a report

Base 8409590f36b641bfc755809e27f2e46d315300f2 verified from archive comment. Branch proto/u2a-uxml-transfer-plan-20261113. Node v22.16.0. Invented data only.

## TESTS

24 pass / 24 total, 0 fail (`node --test` in card folder). T1–T7, XML Map hash locks, invalid refs/options/choices, unknown bore, unmapped duplicates, name swap, final OD, branch safety, choice cascade, all eleven fields and CLI. The two kit tests are retained. Five review regression tests cover blank and malformed numeric values, crosswise bore mapping, numerically equivalent spellings and branch invalid-contributor isolation.

## MUTATIONS

- M1 ignore bore resolution (force repeat popup even with distinct known bores) → T4 red, exit 1.
- M2 plan without waiting for choices → T5 red, exit 1.
- M3 permit branch split → T3 red, exit 1.

Restored engine bytes after each mutation; final suite green.

## BENCH

B1 invented 41 × 40 nodes, 1,640 pairs, 4,961 edits (1,640 name, 1,640 weight, 1,681 element), zero ambiguity/refusal. Median 151.7 ms (110.4, 151.7, 196.9), limit 2,000 ms, PASS. SHA-256 for both generated inputs in bench/RESULT.json. No public or Owner benchmark bytes used.

## DECISIONS

1. Kit scaffolder requires pNN naming; used temporary p99-u2-temp, then renamed to requested folder. Kit files unchanged. No browser or XML writer. Validator is copied byte-for-byte; XML→XML maps accepted with approved pairs and SHA-256 checks. Raw supplied pairs are treated as explicit, one-to-one mappings; no inferred line/element matches.
2. NodeName compares exact decoded trimmed strings; numeric fields compare finite numbers under U1’s decimal/exponent grammar. Before/after retain decoded text. Invalid numeric contributors block the affected field, not unrelated edits. U1 edit ref omits kind, branch field uses first contributing target node; lineNo is an additional metadata key. No structure writes. Missing or self-closing target leaf is unavailable. A blank explicit source name can clear a target name.
3. Name identity is exact case-sensitive text plus nominal DN. ASME B36.10M table is fixed to DN 6–600, ±0.05 mm rounding; nonstandard OD is unknown. Optional OD gate compares positive numeric OD, not DN. Unknown bore or source/final-target nominal bore mismatch in repeated-name resolution opens popup. Mismatched pairs with otherwise distinct known bores are listed individually; explicit choices may authorize them. Position is decoded PSI116 Position text or null, no coordinate reconstruction.
4. Final-name analysis includes unmapped source and target nodes and final proposed OD. A choice may explicitly authorize repeated names; omitted targets withheld. Choice must reference popup targets; if blocked edits expose new owners, require a fresh decision. Other item edits remain independent. Unknown choice keys for names not requiring popup are ignored.
5. Branch fields aggregate every valid contributing pair, including unchanged values, and apply once only if all agree. Missing fields block that branch field; a bore-refused pair blocks dependent branch edits. Branch-level effects on unmapped nodes are inherent in PSI116. Summary counts diagnostics rather than distinct affected pairs. Fatal invalid input returns no edits; row-level refusals and ambiguities coexist with unrelated edits, as specified. CLI writes only a new JSON plan, never XML.

## Owner to confirm

Decision 2: an explicit blank source NodeName clears the target name; this behavior is retained pending Owner confirmation.

## FAILING

None. Final card-check 9/9 PASS. U1 integration and Owner review pending by design.

## Owner demo

Run `node --test` and `node bench/run.mjs`. For an invented or Owner-provided file pair, run the CLI shown in README.md; inspect edits, ambiguity candidates and refusals. Pass reviewed edits only to U1; U2a never writes PSI116.

---

# U2b report — compose plan → write-back

Base `78623ca70ff182cd5df67f4ed4319ff177100e98` verified via the GitHub connector (merge #271). Branch `proto/u2b-uxml-transfer-apply-20261113`. The uploaded ZIP is the earlier 8409590f snapshot; for local testing the merged U2a planner/fixtures/test suite and merged U1 writer were reconstructed from connector file contents and checked against their Git blob SHAs. All runtime dependencies used from the archive (kit, validator, UXML mapper and its imports) match the merged base's Git blob SHAs. No project inputs, no browser, no changes to U1 or to files outside this folder.

## TESTS

`node --test` in the card folder: **34 pass / 34 total**, 0 fail (24 existing U2a/kit, 10 new U2b). T1–T5 pass. Additional tests cover forced false writer receipt, approved XML Map and original pair hash lock, strict merged U1 numeric refusal, second-output I/O rollback, and zero-change receipt. Actual U1 and actual UXML parity verification run on namespace-qualified invented PSI116. No old test weakened or removed.

## MUTATIONS

- M1: replace re-plan with an empty successful result → U2b M1 test red (exit 1); restored.
- M2: auto-choose all ambiguous name candidates before writing → U2b T2 red (exit 1); restored.
- Final restored `node --test`: 34/34 PASS.

## BENCH

Existing U2a B1 re-run (invented 41 × 40 nodes): 1,640 pairs, 4,961 edits, 0 ambiguous/refused, median 163.6 ms (143.3, 163.6, 241.4), under 2,000 ms. U2b has no additional benchmark threshold; no write-back performance claim.

## DECISIONS

1. Plain `u2.transfer-receipt` v1 JSON, not a shared approved Change set. R12 requires actual Owner approval/by/at, and R9 explicit zero confirmation; neither is provided by the specified CLI. R13 decoded text length can differ from byte spans (entities/UTF-8/blank values). The audit ledger records the exact U1 spans and every edit's source/target pair evidence without inventing approval or span data.
2. Source/target/pairs/options are snapshotted. The round trip runs the original planner again on revised bytes, using the same choices. Only an internal Map copy gets the revised target hash. Receipt count/identity/before/after/hashes must reconcile, and the re-plan must contain zero edits across all requested items, including keys not present in the original plan. Ambiguity/refusal diagnostics may remain; they are not edits. Any residual proposal refuses both outputs. The success receipt retains `appliedRemaining:0` and `otherRemaining:[]` for compatibility.
3. Write exclusively after U1 parity and re-plan succeed. Both paths must be distinct and new. A caught I/O failure rolls back files created by this call; there is no crash-atomic multi-file filesystem transaction.
4. U2a source numeric validation now matches merged U1's strict finite decimal/no negative-zero rule. Exponent, leading-plus, negative-zero and other inadmissible numeric source spellings produce `U2_VALUE_INVALID` diagnostics before U1, including numerically equal source values. The target comparison still recognizes finite decimal/exponent spellings so numeric equality does not force rewriting. Invalid branch contributors block their shared field; unrelated edits proceed. U1 remains unchanged and any actual U1 refusal is fatal.
5. The card explicitly requests importing the merged U1 writer read-only. This is the only external prototype import (engine and integration test); it deliberately overrides the generic standalone-folder C5 rule. The kit and validator remain unchanged; the U2a planner is updated only for the reviewed numeric contract. Test injection is an in-process seam, never a CLI option.

## FAILING

No failing tests or mutations. Final generic card-check: 8/9 PASS; C5 refuses the two explicitly required U1 imports (engine and integration test). Do not change the shared checker or vendor a different U1 to hide that exception.

## Owner demo

In this folder run `node --test`. For reviewed PSI116 pairs and choices, run `node cli.mjs apply source.xml target.xml pairs.json --out revised.xml --changes changes.json --items name,weight,element`. Inspect `changes.json` for applied edits, spans, evidence, withheld rows and zero residual edits; original target remains unchanged. Review the revised PSI116 before the later CII conversion.

## U2b review fixes — 13 Nov 2026

`node --test`: **38/38 PASS**, 0 failures. The prior numeric-equivalence test retains all assertions with U1-admissible source spellings; the former exponent-triggered whole-batch refusal test is superseded by the required row-level refusal test (Weight `1e0` and `-0.00`, with independent name and weight edits). Four additional tests cover the retained fatal U1_VALUE_INVALID path, newly appearing unplanned residual edits, forged writer checksums (both before and after), and forged sameEdit receipt text/ref. All use invented fixtures and verify neither output exists on fatal refusal.

Mutation checks: restoring applied-keys-only residual filtering, removing the before SHA check, removing the after SHA check, and removing the sameEdit comparison each independently made its intended test fail (exit 1). All four mutants restored; final suite 38/38 PASS. Existing U2a B1 benchmark re-run: median 152.4 ms, 4,961 edits, zero ambiguity/refusal, PASS. U1 and the shared checker are unchanged; the documented direct-import C5 exception remains.
