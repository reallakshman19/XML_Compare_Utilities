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
