# XV3-3A — CONTROL/MISC dependency inspector

State: **IMPLEMENTED / INTEGRATED / PRIMARY_27_TESTS_PASS / ASSISTING_LINUX_SCOPED_PASS_RECONCILED / OWNER_ACCEPTANCE_NOT_RUN**. Updated27 October2026: external assisting Coder (identity UNKNOWN) returned an isolated four-file implementation; primary Oracle01a1746f integrated it under Owner approval. Earlier preparation/brief wording below is historical scope, not a new assignment. This is the first bounded implementation card within XV3-3, not completion of CONTROL/MISC structural regeneration. Owner authorized preparation. Primary Oracle/Coder `01a1746f-74ee-74d1-aad3-9c5ff090df59` retains architecture, integration, validation and reporting. Assisting coder/reviewer identity: UNKNOWN, not assigned by this document. Engineering PR Delivery is withdrawn; historical A1–A5 language in earlier plans creates no gate.

## Outcome and fixed boundary

Add a read-only CLI inspection of an existing supported XMLv3 model:

```text
python -B prototypes/ciifr-xmlv3/cii_xmlv3.py inspect-dependencies MODEL.xml
```

The JSON report shows actual declared CONTROL entries, independently derived logical record counts where qualified, the distinction between counts and flags, and each element's positional MISC material-field reference. It exposes actual versus expected row cardinalities and explicit unsupported semantics. It does not change a model, recalculate stored CONTROL, render CII, edit materials/options or publish an output file. The current source XML is the only model input; an original CII is required only for the private independent validation exercise.

Insertion/deletion/reordering, deduplication, pointer reassignment, nozzle/hanger support, IZUP changes, material edits and MISC option edits remain outside this card. No scope here permits changing held XMLv2, Geometry, transfer, merge/deployment or native/Owner acceptance. E1 F1/F2/all15 bounded acceptance and F3_SOURCE_BLOCKED remain intact. A digest is a consistency check, not permission.

## Grounding and exact starting evidence

Use the existing repository copy, not an assumed fresh clone. There is no local `.git`; branch/merge-base/dirty state UNKNOWN. Frozen checkpoint8 has19 author Windows tests and19 separately executed Linux tests (Python3.13.5) with scoped technical PASS, not universal/native acceptance. Current non-report15 frozen artifacts and both held dependency hashes matched at card preparation. Live workreport advanced through checkpoint11; frozen8's historical report intentionally differs.

| Source | Relevant inspected symbols/lines | Establishes |
|---|---|---|
| `prototypes/ciifr-xmlv2-r3/engine/profile.py` | `SECTIONS`, `COUNT_NAMES`, `NUMERIC_ROWS`, `CONTROL_INDEX`, `ELEMENT_ROWS`, `POPULATED_SUPPORTED` (6–26) | Current supported dialect/order; populated and empty-only boundaries |
| held `engine.py` | `add_row` 50–101; `make_xml` CONTROL/MISC branches148–196 | Physical fields retain lexical form, width, source line/ordinal; current parsing boundaries |
| held `engine.py` | `count_map`, `establish_links`214–255 | Declared values and positional element/material relationships; external material catalogue remains unloaded |
| held `engine.py` | `_row_contract`311–349; `validate`575–605 | Qualified row shapes, logical counts, pointer ranges, special-count rejection and reconstructed relationship checks |
| XMLv3 `guards.py` | `locked_value`, `structure_contract`, `structure_digest`6–26 | CONTROL/node/pointer/material/COORDS lock; original structural/lexical contract preserved |
| XMLv3 `core.py` | `validate`, `storage_of`, `summary` | Single Storage authority; current summary computes material row estimate, not a detailed ownership report |
| XMLv3 `cli.py`, `intake.py` | parser/main; `read_bounded_xml` | Existing command conventions and bounded XML input boundary |
| `ARCHITECTURE_AND_CII_SYNTAX.md` §§5–6 | Retained vendor references and source limitations | Format provenance, flag/count distinction and unresolved broader grammar; do not repeat failed searches |
| continued review ledger | `.agent-worklogs/20261026_2206_xmlv3-review-return-01a1746f/` | Exact supplied review/receipt/logs/scripts; independently derived physical and reference falsifiers |

Held engine SHA256 `b2bb8ed87440e46f72833424cacd82e6605c47f372f146deec749ad2bb0ee264`; profile `8d2c2123bce98a387d00a3aeca69c8e5dea6b3831e29f65e7760f6a5694204b2`. These files remain read-only. At implementation refresh actual candidate hashes, overlap and consequential source drift; do not infer a Git identity or reuse a stale resource window.

## Dependency rules to make visible

**CONTROL:** nineteen stored entries use four current-profile rows6/6/6/1. Of these, sixteen entries map to actual named Section/Record collections. Derive those counts from stored logical records, including retained/unreferenced records; do not derive them from physical line count, pointer-use count, unique nodes, maximum pointer or number of owners. NOZZLES and HANGERS are special counts unsupported when nonzero; zero is the current profile restriction, not proof of a universal omission grammar. IZUP is orientation state, not a count. The current profile admits only0; do not derive it from a record collection or reinterpret unsupported1 as an invalid native format.

For each entry report canonical field reference, name, role, declared value, applicable derived count, and comparison/profile restriction. A flag or unavailable special grammar has no fabricated derived record count. Reuse pinned field naming/order, while deriving expected ordinary counts from actual collections rather than copying `count_map()` output as both sides of the comparison.

**Material ownership:** current MISC has one `material_id_*` field per element in ELEMENTS storage order. For element storage ordinal i starting at1, its material slot has row index `(i-1)//6` and within-row index `(i-1)%6`, both zero-based; its lexical numeric span is `[2+13*j, 2+13*(j+1))` within that row. Report element record ID/ordinal, material field reference, stored material number, actual row/source-line/field location and link target. Source-line metadata is not an absolute byte offset. Do not invent an absolute offset by multiplying line number by a constant width.

The ELEMENTS row called `material` holds line_color/line_visibility; it is not the MISC material ID. Material numbers1–699 are identifiers in this profile; a valid number does not load the catalogue, resolve engineering properties or authorize transfer. A change of assignment can leave all counts unchanged. Equal row counts alone do not prove correct element/material association.

**MISC layout:** distinguish actual material-field cardinality and observed row field sizes from the expected packing `(n+5)//6`; last material row contains the remaining qualified slots. Current zero-nozzle/zero-hanger profile then has four execution rows of6/6/6/1 fields with explicit mixed types from `_row_contract`. Report them by existing field references/types and source positions. Their indexed names are not fully qualified engineering meanings. Preserve them; no guessed labels/defaults, padding, GUID allocation or options mutation.

Private original identity: opaque `OWNER_PRIVATE_REF:ciifr-xmlv2-primary-20261024`,803776 bytes/SHA256 `5715c23f250d683a6c29ba84c2db9f01aae25788791317b99064c845bc2cdd57`. Existing custody is already accessible locally; use its custody record instead of requesting another upload. Qualification observations:521 elements; CONTROL logical NODENAME177, RIGID156 and RESTRANT122; MISC521 IDs in87 rows (86×6 plus5) followed by4 execution rows,91 total. Those are fixture-specific independent review observations, not hard-coded production answers. Unique nodes511, physical RIGID rows156 (312 numeric fields) and RESTRANT rows2928 must not replace their logical counts.

## Small implementation structure and allowed files

Proposed product files, only when the implementation card is actually assigned:

- NEW `prototypes/ciifr-xmlv3/xmlv3/dependencies.py`: small pure walkers for CONTROL entries, material associations and actual/expected layout, composed into one report. Public entry validates through existing XMLv3 authority before inspection. No original-file access, mutation, hidden globals or alternate writer.
- EDIT `prototypes/ciifr-xmlv3/xmlv3/cli.py`: add `inspect-dependencies INPUT.xml`; route it through `read_bounded_xml` and `load_xml`, then report without entering conversion/publication. Avoid new `core.py` imports back into this module or other circular dependencies. Do not change existing command behavior.
- NEW `prototypes/ciifr-xmlv3/tests/test_dependencies.py`: explicit private fixture/scratch arguments, focused real integration and pure transformation checks, no production mocks. Reuse existing safe scratch conventions.
- EDIT prototype README for usable command, report meaning and unchanged qualification limits. Keep expected regression values and existing test files unchanged unless a demonstrated harness fault needs separately explained correction.

Prefer functions under40 lines where practical, clear immutable return values and source references. No framework, class hierarchy, runtime switch, schema change or generic structural dependency engine is needed. Keep existing Storage and EngineeringViews authoritative contracts; this report is a transient read-only projection, not persisted competing data. Include actual XML input fingerprint and dependency pins in the receipt; original provenance SHA must not be mislabeled as the edited/current XML or output identity. JSON `PASS` means supported-profile inspection succeeded, not engineering acceptance; include scope and `structural_recalculation: UNSUPPORTED` explicitly.

## Independent expectations and decisive checks

1. **Actual original:** independently decode section boundaries, logical record groupings and CONTROL/MISC fields from private original physical bytes, without calling production report/count/link helpers for expected values. Compare every mapped count and every one of521 element/material associations to the report. Preserve identifier contents and full reports in private scratch; public receipts use opaque references/hashes and permitted aggregates.
2. **Different counting units:** verify NODENAME blocks versus unique nodes, RIGID blocks versus physical rows, RESTRANT blocks versus DOF rows/slots, and stored auxiliary counts versus pointer-owner usage. Shared/unreferenced records remain counted. Use the real fixture where it demonstrates a distinction; otherwise label a small isolated synthetic walker case, not a newly qualified CII dialect.
3. **Packing boundaries:** pure expected vectors for n=0,1,5,6,7,12,13: row field counts `[]`, `[1]`, `[5]`, `[6]`, `[6,1]`, `[6,6]`, `[6,6,1]`. These arithmetic cases do not authorize structural CII edits or claim zero-element/native support. Verify element/material association across slots6/7 and12/13 with distinguishable values in isolated synthetic walker inputs if needed.
4. **Protected/invalid input:** existing malformed CONTROL, material cardinality/range, wrong row type/layout, missing/duplicate references and nonzero unsupported special values still fail closed. Do not recompute structural digests, weaken validation or fabricate a successful structural edit to make a negative check pass. Flag/count status must never turn IZUP into a derived zero record count.
5. **Read-only and real CLI:** XML bytes and in-memory storage contract unchanged before/after inspection; no output/temp/bystander changes. An authorized diameter edit leaves the complete CONTROL/MISC byte sections unchanged while its existing independent exact-splice proof continues to hold. Test the new command's actual150000001-byte XML path rejects before parsing with existing size diagnostic/exit2; avoid multiplying identical large fixtures per command.
6. **Regression after implementation:** run the new focused suite plus original7 intake and12 engineering tests with explicit private scratch and frozen original; unchanged no-edit/full-literal-splice expectations. New CLI routing justifies this regression. Do not claim planning/source inspection as executed product tests. Declare input basis, expected values, commands, status and oracle independence separately.

## Acceptance, correction and remaining structural work

This card is complete only when the runnable inspection returns source-backed counts/associations and the checks above pass on a newly frozen candidate, with normal native backups and history-independent module patches. Primary retains integration; non-author assessment of changed bytes remains distinct. New module/CLI changes create a new candidate and must not borrow checkpoint8's independent PASS automatically.

If completing this report requires changing held parser/profile, allowing new populated grammar, changing field authority or writing structural state, stop that affected change and return the exact gap. Do not expand the task. Required future structural qualification includes element-order identity/material-vector transitions, insertion/deletion across packing boundaries, complete auxiliary pointer reindexing including shared/unreferenced records, nonzero nozzle/hanger MISC partitions, qualified IZUP handling, allocation/default/GUID rules, independent whole-file differences and separately authorized native contrasts. Do not implement those as a fallback here. E1 F3 surplus/trailing CONTROL admissibility remains separate and blocked absent a new authoritative source/access path.

## Historical implementation assistance brief — superseded by completed return

When an assistant is actually assigned, use this card with the latest primary workreport, current exact source inventory and existing private custody. Assignment: scoped assisting coder for XV3-3A only; primary Oracle/Coder01a1746f retains responsibility. Read this card and the named current code first, return a short source-bound plan and any blocking conflict, then implement only the listed inspector surface under the actual coding/one-writer grant. No scored onboarding, old Engineering PR Delivery gate, structural editing, extra agents, publication or acceptance authority is created here. Preserve actual failed/NOT_RUN checks and keep synthetic/real/native evidence distinct.

For remote assistance, share the new card/current exact candidate through the authorized Common artifact route and private input through permitted recipient-accessible custody; confirm received byte hashes. The historical frozen8 source and private archives already have matched reviewer measurements, but do not assume a different assistant has them. No agent is launched, contacted or handed responsibility by preparing this document.


## Implementation reconciliation — 27 October 2026

The inspector, CLI and README match the returned bytes. The integrated new test removes only unused load_xml/to_cii imports and an unused assignment; no oracle/assertion changed. Primary Windows8 dependency +7 intake +12 integration tests PASS, zero errors/failures/skips. Separately decoded raw CII confirms156 RIGID rows with312 fields, correcting the previous row/field wording. Actual diameter output preserves complete CONTROL/MISC physical sections and matches the literal whole-file splice; all521 raw material assignments match. A labeled isolated walker retains3 logical records despite72 rows,2 owners and2 unreferenced records; this does not qualify a new CII grammar.

Integrated four-file identity76047a9acc527619943c2b7628b3af5f0177abe420d392928ba542d9777763a4; exact file hashes, received author identity/deltas, logs and recovery are in .agent-worklogs/20261027_0517_xmlv3-3a-integration-01a1746f. Primary authored the prior core and performed the import cleanup; these checks do not replace distinct review of this changed candidate. Full structural CONTROL/MISC generation, native CAESAR and Owner acceptance remain NOT_RUN/UNSUPPORTED. XMLv2 HOLD and F3_SOURCE_BLOCKED unchanged. No assistant dispatch/publication or acceptance is created by this update.


## Assisting technical review reconciled — 27 October 2026

Owner supplied16-member26102-byte evidence archive SHA32ab066392a22c074638df498ece99c01cce2b5ef0ed0cc065f39be7442cacf6. Current full16 runnable candidate a7dd4e1432d960f2969ebbb189ad55004e31d8e3f22a55ee557c94bd74f36163 and four-change76047a9acc527619943c2b7628b3af5f0177abe420d392928ba542d9777763a4 match all actual current bytes and returned receipt. Actual logs/receipts/scripts support scoped assisting Linux technical PASS:8+7+12 personally rerun by reviewer, full unchanged/reconstructed byte equality, literal diameter splice/all protected bytes, all521 material references/locations,9 negatives without digest repair and synthetic shared/orphan RIGID records. No product defect/correction proposed. Exact original return remains unchanged in the0609 reconciliation ledger. Primary inspected evidence and source bytes; no product/test edits or test reruns in this routine.

Reviewer identity/formal appointment UNKNOWN; prior exposure disclosed, not blind/organizational review. The reviewer lacked separate expected outer-source-archive digest and original author test bytes. Primary now matches receiver archive measurements to its actual prior receipt and independently compares the exact26-byte cleanup/72 assertion AST nodes; reviewer NOT_RUN remains untouched. Raw reviewer material int(Decimal) conversion does not separately assert material integrality, and pointer-target sets do not alone prove owner multiplicity. Primary read-only raw checks corroborate actual521 integer IDs/max1 original owner; no generic grammar proof is inferred.

This records supported assisting technical findings, not formal appointment, native or Owner acceptance. Windows-independent rename/crash durability, global field semantics, structural CONTROL/MISC generation and F3 remain NOT_RUN/UNSUPPORTED/SOURCE_BLOCKED as applicable. XMLv2 HOLD/E1 bounded acceptance/Engineering PR Delivery withdrawal preserved. No repeat XV3-3A implementation/review, new source search or dispatch is required merely because formal identity remains unknown. Next Oracle planning should address the remaining parent WBS qualification gaps before any further product expansion.
