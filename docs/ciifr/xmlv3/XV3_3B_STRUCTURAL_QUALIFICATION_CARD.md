# XV3-3B - CONTROL/MISC structural qualification lab

State: **EXECUTED_LOCAL / PRIMARY_TECHNICAL_6_CASES_PASS / PRODUCT_CANDIDATE_UNCHANGED / NONAUTHOR_NATIVE_OWNER_NOT_RUN**. Parent WBS remains XV3-3 with a bounded XV3-4 grammar inventory. Owner subsequently approved the60-minute local qualification routine; primary Oracle01a1746f executed it directly, retaining aim/architecture/integration/reporting. No agent assignment, product expansion, held-source edit or publication occurred. Engineering PR Delivery/A1-A5 remains withdrawn. The design sections below preserve the proposed scope/method; commands/tooling are now realized in qualification/, as recorded in XV3_3B_QUALIFICATION_RESULT.md and checkpoint17. Historical task-design wording is not a new assignment or execution grant.

## User outcome, baseline and reason

What the user can do today: run the existing XML-only exact reconstruction, bounded literal diameter edit and read-only dependency inspection on the qualified B001 profile. Primary Windows27 PASS and reconciled assisting Linux27 technical PASS support the exact current candidate; native CAESAR and Owner acceptance remain NOT_RUN. XV3-3A is complete within its scope. Do not repeat its implementation, onboarding or review.

Proposed next observable result: one runnable, isolated qualification probe demonstrates how ELEMENTS order/count and auxiliary index changes affect CONTROL, MISC and pointers, and distinguishes byte fidelity from intended association. It returns a compact case report plus a source-backed grammar matrix. It is an engineering experiment on synthetic derivatives, not a new structural-edit feature.

Highest risk: a valid-range pointer or material can refer to the wrong intended occurrence while the converter still reconstructs its input perfectly. Byte equality alone cannot certify a structural edit. Do not conceal this case as a parsing failure or demand that the current converter infer an unexpressed editing intention.

Exact starting inventory: `.agent-worklogs/20261027_0517_xmlv3-3a-integration-01a1746f/full-candidate.json`,16 runnable product/dependency files, aggregate SHA256 `a7dd4e1432d960f2969ebbb189ad55004e31d8e3f22a55ee557c94bd74f36163` (sorted path NUL byte-length NUL SHA newline; not a Git head). Current bytes were rehashed at preparation with zero mismatches. Checkpoint15 and the0609 reconciliation ledger preserve the completed review and its limits; the current workreport checkpoint is authoritative for subsequent status.

Working location: `D:/CodeD/XML_Compare_Utilities`, no local.git; branch/HEAD/merge-base/dirty UNKNOWN. Remote main/PR facts from01:15UTC are historical and not refreshed for this local design. Before future product changes, obtain relevant live source/overlap facts; this card proposes none. Prior external coder and reviewer chat identities remain UNKNOWN. No assignment, active writer or authenticated appointment is inferred.

## Inputs and source walkthrough - load only these parts

Use actual current source and existing private custody, not chat history or a fresh assumed clone:

- `prototypes/ciifr-xmlv3/xmlv3/dependencies.py`: `control_entries`, `material_associations`, `misc_layout`, `inspect_dependencies`. Inspection is a validated projection, never count repair.
- Held `prototypes/ciifr-xmlv2-r3/engine/profile.py`: `SECTIONS`, `COUNT_NAMES`, `NUMERIC_ROWS`, `ELEMENT_ROWS`, supported/unsupported sets. Held `engine.py`: `_row_contract`, CONTROL/MISC parsing, `validate`, `establish_links`, `write_cii`. Read only; do not patch or unpin.
- `xmlv3/core.py`, `guards.py`, `views.py`: Storage owns values, structural fields remain locked, views are regenerated references, and a consistency digest is not authorization.
- `docs/ciifr/xmlv3/ARCHITECTURE_AND_CII_SYNTAX.md` sections5-6 and `HIGH_RISK_ITEMS.md`: retained source references and unresolved layout/engineering questions. Historical implementation status there is superseded by the current workreport. Do not repeat the unsuccessful F3 documentation search.
- Private original `OWNER_PRIVATE_REF:ciifr-xmlv2-primary-20261024`:803776bytes, SHA256 `5715c23f250d683a6c29ba84c2db9f01aae25788791317b99064c845bc2cdd57`; resolve its existing custody record locally. A remote executor must actually receive/rehash the permitted source/private packages; a Windows path is not access proof. No new copying/sharing is authorized here.

Essential format: exact ASCII/CRLF and physical lexical slices are retained. ELEMENTS has53 real slots and15 auxiliary pointers; its line_color/line_visibility row is not the material catalogue ID. CONTROL contains19 entries in6/6/6/1 fields:16 ordinary logical-record counts, NOZZLES/HANGERS special counts, IZUP orientation flag. Count retained records, including unreferenced ones; do not count owners, fields or physical lines. RIGID has156 original logical records/physical rows and312 numeric fields. RESTRANT122 logical blocks occupy2928 physical rows. NODENAME177 differs from511 endpoint nodes.

MISC has one positional material token per ELEMENTS storage occurrence, packed six per row;521 original IDs occupy87 rows with five last-row fields. Four execution rows follow, with types `I I I I R I / I I R R I I / I I I I R I / I`. Their meanings, populated nozzle/hanger partitions and general omission/default rules are not inferred. Preserve those execution rows byte-for-byte in the proposed experiments.

## Runnable slice and three decisive cases

Proposed command in a separately authorized isolated copy (NOT_IMPLEMENTED):

```text
python -B qualification/control_misc_probe.py --candidate-root CANDIDATE --fixture PRIVATE_ORIGINAL.CII --scratch EXPLICIT_PRIVATE_SCRATCH --receipt NEW_RECEIPT.json
```

No change to the production CLI, schema, engine, profile or existing tests. The probe's fixture builder/oracle must not import production count, link, layout or formatting helpers for expected results. It may invoke the frozen CLI as the system under test. Read raw section boundaries and complete record blocks independently; use literal retained field slices and explicit source-evidenced layouts. Reject fractional/nonfinite integer fields before integer conversion: `int(Decimal(...))` alone is insufficient. Keep expected source-occurrence identity separate from parser-assigned output ordinals.

1. **B1 - material row growth and reversal.** Starting from the real521-element source, append complete copied ELEMENTS occurrences with their own copied material tokens to create522 and523-element SYNTHETIC derivatives. Change only the ELEMENTS CONTROL count, appended ELEMENTS blocks and material-vector packing.522 fills87 rows;523 requires88 and a one-field final row. Independently verify that the entire four-row execution suffix shifts without content changes, auxiliary records/counts remain intact, and all old/new occurrence-material pairs retain their intended association. Remove the copied occurrences in the builder and recover the exact original bytes. No production insertion/deletion operation is exercised or claimed.
2. **B2 - permutation with a semantic falsifier.** Select two actual distinguishable element occurrences with distinct material tokens. Swap complete ELEMENTS blocks and their associated MISC tokens; all counts and unrelated sections remain unchanged. Independently match each intended occurrence to its token using source ordinal plus explicit permutation, not the new XML record ordinal or a deduplicated content hash. Also construct the counterexample that swaps blocks but leaves material tokens in place. If it remains syntactically valid, the converter may correctly round-trip it; the separate intended-association oracle must flag the mismatch. If the fixture cannot supply a discriminating pair, report that gap rather than inventing properties.
3. **B3 - auxiliary insertion/reindex closure.** Insert a complete copied RIGID record before a selected existing ordinal k, increase CONTROL.RIGID156->157, and shift every old nonzero RIGID pointer >=k by+1. Keep all other14 pointer types, all MISC bytes and every old RIGID payload unchanged. Record the explicit old-target-ordinal->new-target-ordinal bijection; never deduplicate equal payloads. Choose a copy/target pair with distinct source payloads so one deliberately unshifted owner still has a valid-range pointer but selects the wrong intended target. The independent target oracle must detect it. All old targets remain mapped; the added record can be unowned, so logical count changes without another owner. This extends the earlier shared/orphan observation into a transition; do not rerun the old case as the deliverable.

For each accepted derivative, invoke `to-xml`, `inspect-dependencies` and XML-only `to-cii` using fresh destinations; compare the complete reconstructed bytes, length and independent SHA to that derivative's own raw input. Also compare actual raw differences against the predeclared allowed sections/fields. Do not compare an intentionally changed derivative's SHA to the original and call it a fidelity failure. If a current grammar/relationship invariant rejects a derivative, preserve the exact error and isolate it; do not modify the converter, recompute XML structural digests, delete inconvenient records or turn rejection into a claimed positive qualification.

## Demonstration and return

Proposed timebox:60 minutes after an actual bounded execution/resource grant; first15 minutes should produce B1's522/523 result or one exact isolating rejection. Return partial/NOT_RUN on expiry; no silent scope extension. Demo in five steps: verify current16 pins and private input; run the single probe; inspect B1 row transition/reversal; inspect B2/B3 intended-association counterexamples; inspect grammar coverage and unresolved prerequisites.

Allowed new files after assignment: isolated `qualification/control_misc_probe.py`, small raw-byte oracle/case helpers and README; private case receipts/derivatives only in explicit scratch. Keep functions small/pure where practical; no generic dependency framework, alternate product writer, hidden mock, fallback, parser/profile fork or runtime switch. New tooling is assistance, not transfer of primary responsibility.

Return `START_HERE.md`, changed-file hashes, probe command/log, redacted JSON summary, grammar matrix, precise byte-diff ledger and recovery data. Keep original/derived CII/XML and model-identifying contents private. Per case record STATUS=PASS/FAIL/NOT_RUN, observed versus expected behavior, source/derivative identity, oracle authorship/coupling and limits. An expected semantic counterexample detected by the oracle is a successful falsifier, not a converter defect or native rejection. Attach no fabricated native/import receipt.

The matrix covers all22 current sections plus NOZZLES/HANGERS MISC partitions and IZUP: physical shape, logical unit, count/partition dependency, supported populated/empty-only state, relevant existing evidence/source pointer, permitted operations and missing proof. No new blanket vendor search is needed. Populated EXPJT/FORCMNT/UNIFORM/WIND/OFFSETS/FLANGES/EQUIPMNT, nonzero special branches, allocation/default/GUID/option meanings and surplus CONTROL admissibility remain unqualified unless a genuinely new authoritative source/fixture is obtained. Indexed labels are not complete engineering semantics.

Done-when: each proposed case has actual candidate-specific evidence or a precise bounded blocker; every claimed positive reconstruction is byte-exact to its own input; independent association oracles distinguish the valid-range wrong cases; allowed-byte audits close; grammar unknowns are explicit; all16 production/dependency hashes remain unchanged. Preserve prior27-test receipts as baseline evidence. This new qualification-only harness does not itself justify repeating all27 unchanged tests. A discovered source defect requires a separate minimal repair decision and relevant regression, not an unapproved fix in this card. Distinct non-author assessment remains a separate later claim; no formal appointment or acceptance is created by the lab.

## Keeps, qualification and next horizon

Keeps: XMLv2 HOLD and pinned bytes; E1 F1/F2/all15 bounded acceptance; F3_SOURCE_BLOCKED; current XML-only writer and literal-diameter evidence; reference-only Branch(LineNo)->Element->Node; no private payload relay/publication, product expansion, structural writer, property transfer, Geometry control, merge/deploy or Owner acceptance. Synthetic derivative grammar success is not native admissibility or permission to issue an engineering model.

Check level: isolated technical qualification, followed by primary evidence reconciliation. Real engineering structural export would require its separately scoped independent expectations and native/Owner decisions before use; this lab does not release that feature.

Two-card horizon: first XV3-3B qualification lab; then proposed XV3-4A chooses one actually accessible populated unsupported grammar with pinned source/fixture evidence and its own allowed surface. FORCMNT is a possible candidate, not a selected or qualified feature. Neither starts a generic structural writer or reopens F3.

NEXT -> primary Oracle01a1746f: preserve the completed local lab and use its grammar matrix to bound a later source-qualified XV3-4A card. No assisting agent, recipient, send, publication or new product operation is activated. Primary retains architecture, acceptance boundaries and eventual integration.


## Actual local result - 27 October 2026

Owner-approved local qualification produced6 synthetic derivative case PASS/18 CLI exit0 invocations. Growth522->523 changes material rows87->88 and raw reversal restores original bytes. Correct permutation/reindex preserve intended associations; deliberately wrong material/pointer cases still reconstruct their own inputs exactly and independently flag2/1 intended mismatches. AllCONTROL/MISC/pointer/by-stander scopes and all16 production/dependency hashes remain protected. Current result/matrix and1033 ledger contain exact receipts, full byte audits, tool/source hashes and recovery.

Initial sandbox-TEMP CLI failures remain PARTIAL with exact first cause UNKNOWN; separate TEMP nested-directory access failed before CLI. Persistent ignored workspace scratch succeeds. No product repair was needed. This primary-authored lab shares a raw decoder between builder/oracle; prior source authorship disclosed, no distinct non-author/native/Owner qualification. Current product structural generation remains UNSUPPORTED, XMLv2 HOLD and F3_SOURCE_BLOCKED remain. No repeat3A implementation/review, extra agents or publication.
