# XV3-0 — pinned source and input qualification

Grounding epoch: `XV3-0-20261026T0606Z`. Candidate/custodian: XMLv3 Coder in chat `01a1746f-74ee-74d1-aad3-9c5ff090df59`. This is source qualification evidence for the new XMLv3 task, not resumption or acceptance of held XMLv2 development.

`APPENDIX_A_STATUS = EVIDENCE_PREPARED / ASSESSMENT_PENDING`

`TAKEOVER_AUTHORITY = READ_ONLY`

`DISPOSITION = SALVAGE_PARTIAL`

The Owner's named XMLv3 coding grant remains valid. No non-author assessor has been assigned and no qualification score is claimed. Existing engineering-source mutation remains gated. No XMLv3 converter has been implemented by this pass.

## Source and custody reconciliation

| Item | Observed current truth |
|---|---|
| Local work location | `D:/CodeD/XML_Compare_Utilities`; no `.git`; local branch, merge base, ancestry and dirty state UNKNOWN |
| Remote main | `c823f0c0edbeb315c07fa2911390dc781968146f`, unchanged from checkpoint r2 |
| [XMLv2 package PR157](https://github.com/reallakshman19/XML_Compare_Utilities/pull/157) | OPEN / DRAFT / UNMERGED; head `a67487023bcafc13d68b62dbfc9bb74c61b3c64c`; base `8fea0491ca4ca85565132a81f1620f57fbc3014e` |
| Base drift | The GitHub comparison reports current main 96 commits ahead of the PR157 base. Its listed changes do not alter the XMLv2 package. This does not establish local Git ancestry. |
| Package identity | All 16 locally present payload members match both pinned package SHA-256 expectations and actual PR Git blob IDs. Local HOLD notice, PACKAGE-STATUS and PACKAGE-SHA256 files are absent. The package inventory excludes itself from its member list. |
| Engine | `prototypes/ciifr-xmlv2-r3/engine/engine.py`: SHA-256 `b2bb8ed87440e46f72833424cacd82e6605c47f372f146deec749ad2bb0ee264`; Git blob `5eaeb9c945032e4baa695feffcda60cb7bd1b570` |
| Historical source manifest | Retained unchanged; its older engine attribution is contradicted by actual package bytes. Do not substitute it for the package inventory. |
| Review/check readback | PR157 reviews endpoint returned no submitted reviews; queried head check-runs returned none. Historical author test claims are not current independent qualification. |
| Original fixture | Existing authorized private custody located; opaque reference `OWNER_PRIVATE_REF:ciifr-xmlv2-primary-20261024`; 803,776 bytes, SHA-256 `5715c23f250d683a6c29ba84c2db9f01aae25788791317b99064c845bc2cdd57`. Actual bytes were hashed before and after checks; unchanged. No model payload was copied into this repository. |

The pinned [HOLD notice](https://github.com/reallakshman19/XML_Compare_Utilities/blob/a67487023bcafc13d68b62dbfc9bb74c61b3c64c/prototypes/ciifr-xmlv2-r3/00-READ-FIRST-HOLD.md) and [package inventory](https://github.com/reallakshman19/XML_Compare_Utilities/blob/a67487023bcafc13d68b62dbfc9bb74c61b3c64c/prototypes/ciifr-xmlv2-r3/PACKAGE-SHA256.json) govern reuse attribution. This pass neither edits nor finalizes that held package.

## Actual isolated observations

Basis: current pinned local engine, existing real private original, Python standard-library runtime. All conversions stayed in memory. The standalone writer received only serialized XML on stdin and the pinned engine directory. An audit hook denied file opens, socket operations and subprocess creation after imports. Output bytes were captured by the parent for comparison; no CII/XML output files were emitted.

| Check | STATUS | Observation and oracle |
|---|---|---|
| XML-only unchanged reconstruction | PASS | Output length 803,776 and full bytes/SHA equal the original. Independent expected bytes are the pre-captured original, not writer output. XML representation was 10,636,786 bytes. |
| Authoritative diameter edit | PASS | First element numeric slot 6, zero-based byte span `[5147,5160)`, replaced with literal ASCII ` 2.540000E+02`. Expected full postimage is an independently specified 13-byte splice; actual full output equals it. All bystander bytes identical. Expected/actual SHA-256 `331e5053e3d73660875828ed7b9efdeeba74652b02057f7f1158ad9e9ef853fb`. |
| Changed value without edit intent | PASS | Rejected conflicting value/lexeme with an actionable `edited=true` error. Contract/source oracle; not native engineering evidence. |
| Unrepresentable numeric edit | PASS | Value `254.123456789012345` rejected rather than rounded into the source slot. Independent requested value and exact-representation requirement. |
| Substitute v3 schema at v2 root | PASS | Rejected unsupported schema/version/profile, confirming the existing v2 boundary. |
| Add EngineeringViews to v2 root | PASS | Rejected invalid root children. A v3 wrapper must explicitly project its validated storage to the unchanged v2 contract. |
| Stale endpoint relationship | PASS | A changed endpoint link target was rejected against regenerated relationships. |

Seven isolated checks passed on this fixture. They do not establish general profile coverage, XMLv3 behavior, native CAESAR admissibility, failure-atomic file publication or independent product acceptance. The previously observed four unrelated fixture profile rejections remain historical evidence, not converted successes.

## A1–A5 candidate evidence and next-commit boundary

These are candidate answers/evidence for assessment, not self-awarded marks or a substitute for fresh assessor challenges. The governing [takeover qualification](https://github.com/reallakshman19/Common/blob/main/skills/engineering-pr-delivery/references/takeover-qualification.md) uses five 20-mark challenges, normally at least 92 total and at least 17 per challenge.

**A1 — Production trace.** Raw first ELEMENTS numeric row begins after its header CRLF; two prefix bytes plus five preceding 13-byte fields locate the diameter. `engine.py:102 make_xml` selects 15 physical rows per element; `add_row:50` slices numeric fields; `text_field:43` stores authoritative value, original lexeme and width. The first element's `outside_diameter` is numeric ordinal 6. `write_cii:610` invokes `validate:514`, then `_row_bytes:472` and `_serialize_field:407`; untouched fields return lexemes, while explicit edits format and prove exact representability. The separate process and literal splice demonstrate the entire observed path without source replay. A byte outside that span changing falsifies the scoped-edit claim.

**A2 — Current failure isolation (QST-XV3-ROOT).** The first proposed v3 boundary must coexist with a strict v2 root contract. Prediction before implementation: changing the schema or appending a view directly to that root must fail. Both isolated experiments did fail at validation, before CII output. That is a contract incompatibility, not a demonstrated v2 defect. The minimal design response is an explicitly validated v3 envelope/storage projection; relaxing the held validator or ignoring stale views is prohibited. If the unchanged v2 writer accepts arbitrary new roots or ignores a represented field edit, this diagnosis/reuse boundary fails.

**A3 — Authority/invariants.** The Owner authorizes the XMLv3 task; qualification does not lift XMLv2 HOLD. Stored fields alone control CII. Future Branch/Element/Node views contain references, not competing mutable values. Preserve original bytes, lexical forms, P2/P2.1 and all held/source package members. E1 F1/F2/all 15 guards remain bounded accepted; F3 native CONTROL admissibility remains SOURCE_BLOCKED. Geometry PR174/181/182/183 and NodeName176 remain separate. Counts/structural edits, transfer, native acceptance, merge and deployment are outside the first implementation slice.

**A4 — Independent expected result.** Original pre-captured bytes/length/SHA define the no-edit oracle. The edited oracle is a literal 13-byte replacement computed independently from raw CII layout, not by the production formatter. Diameter is stored in source units; no unit or coordinate transform is applied or claimed. Required tolerance is zero byte difference; full-output equality also proves CONTROL/MISC and other bystanders unchanged for this value-only edit. The parser and serializer are the reused implementation under test; their reported links/counts do not independently establish engineering semantics. Native CAESAR, distinct product review and broader lexical/populated-feature coverage remain NOT_RUN.

**A5 — Minimal next patch (XV3-1).** Only after actual qualification: add an isolated Python XMLv3 envelope/CLI under NEW `prototypes/ciifr-xmlv3/`, pin and verify the existing engine/profile bytes before reuse, strictly validate the envelope and project its storage into the unchanged v2 writer. Initial observable result: real supported CII → XMLv3 → independently verified identical CII from XML alone, plus the same literal diameter edit and explicit negative checks. Branch/Element/Node views follow in XV3-2. Do not change held source, validator rules, legacy UI/runtime/writer/canvas, workflows, pointer/count cardinality or original inputs. Add only the smallest fresh-destination command and tests required to exercise this vertical slice; qualify publication failure behavior before claiming atomic file export. Reversal uses per-file preimages/checksums and exact new-file deletion, never history reset or overwrite of later work.

## Overlap, custody and continuation

Live changed-file lists were checked for PR157, 163, 168, 174, 176, 181, 182 and 183. New XMLv3 document paths have no observed exact or prefix overlap. Other live work now includes Geometry framework PR183 and G2 CLI PR182; neither is assigned to this task. Read-only source qualification is SAFE. Future XMLv3 dependency reuse is COORDINATION_REQUIRED until the pinned reuse/one-writer boundary is assessed. Production integration is not authorized by absence of filename overlap.

Recovery: `.agent-worklogs/20261026_1009_xmlv3-qualification-01a1746f/`; evidence/probe, member/blob comparison, source/overlap receipts, hashes and history-independent patch. Existing report preimage is native backup145. No product file changed, agent dispatched, public artifact published or Oracle cutover occurred.

EXACT_NEXT_ACTION: obtain the scoped A1–A5 qualification assessment from an authorized non-author assessor or Owner; preserve READ_ONLY until its actual disposition. Then execute the bounded XV3-1 patch only if qualified and resource/custody conditions still permit it.
