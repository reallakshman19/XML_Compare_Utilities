# XMLv3 — WBS, prototypes and XMLv2 draft reuse

Status: proposed implementation plan, 26 October 2026. Owner approved the named XMLv3 coding task and requested this concept/plan first. This batch delivers the plan; it does not claim converter completion, lift the old XMLv2 HOLD or authorize Geometry/transfer/release changes.

## 1. Exact starting truth

| Source | Observed identity / disposition | Reuse boundary |
|---|---|---|
| Remote XCU main | c823f0c0edbeb315c07fa2911390dc781968146f | Base drift must be checked before implementation |
| XMLv2 PR157 | a67487023bcafc13d68b62dbfc9bb74c61b3c64c; OPEN/DRAFT/UNMERGED | Relevant held converter foundation; not accepted product |
| R4 PR163 | 9da244e7670a21d963def16543679a6d983d5ba7; OPEN/DRAFT/UNMERGED | Related hierarchy/trace source, actual dependency not inferred |
| E1 PR168 | 2aeaf7372de66eda3bc082b8d81bf8db43c34f4b; OPEN/DRAFT/UNMERGED | Separate read-only catalogue and bounded tests; not XMLv2 ancestry |
| Common handover PR506 | 74e7af53e7d24e8e3896796bed246e8f2f501b62; OPEN/DRAFT/UNMERGED | E1 source/custody/decisions, not converter code |
| Local workspace | D:/CodeD/XML_Compare_Utilities; no .git | Preserve filesystem baselines; branch, merge base and dirty status UNKNOWN |

Local XMLv2 `engine/engine.py` SHA-256 is `b2bb8ed87440e46f72833424cacd82e6605c47f372f146deec749ad2bb0ee264`; historical SOURCE-MANIFEST records `508c7b53d35b4f023621b693b94c31426213d40d0e02cf4f0bafb01b15b4851f`. Four other listed engine members match. PR157's HOLD notice attributes a later DTD guard change and directs readers to its PACKAGE-SHA256 inventory, but the local notice/inventory is missing. Do not assume byte equivalence without comparing actual members.

Takeover/reuse disposition: SALVAGE_PARTIAL. Preserve known-good algorithms, tests, failure evidence and old packages. Establish a pinned, attributable XMLv3 candidate before claiming any inherited PASS. Existing source remains unmodified.

## 2. Reuse map

| Existing XMLv2 source | Inspected capability | XMLv3 plan |
|---|---|---|
| engine.py: make_xml / add_row / text_field | Ordered CII rows, typed fields and lexemes | Retain after profile and exact-byte requalification |
| _row_contract / _check_row_contract / validate | Closed widths, names, field/record cardinalities and typed relationships | Retain fail-closed validation; extend only with versioned, tested grammar |
| _serialize_field / _row_bytes / write_cii | XML-field-driven writer with edit-causality/representability checks | Use pinned qualified implementation through explicit v3 storage projection |
| establish_links | Element/node/auxiliary/material relationships | Extend reference views, preserve shared records and unresolved evidence |
| profile.py | Explicit narrow supported profile/section coverage | Make profile/coverage visible; qualify missing features incrementally |
| service.py / server.py / web inspector | Loopback conversion, output binding, escaped lazy hierarchy | Reuse the established Python runtime and inspection surface after source/browser assessment |
| XMLv2 retained tests / R4 trace tests / E1 negative cases | Discriminating fixture and regression knowledge | Preserve original oracles and verdicts; add v3-specific expectations independently |

No full engine rewrite, runtime switch, alternate canvas or silent copying of mutable shared files. Place new implementation in an isolated XMLv3 namespace after resolving current base and active claims. P2/P2.1, XMLv2 and Geometry PR174/181 retain their ownership and byte baselines.

## 3. Proposed work breakdown and observable prototypes

The IDs below are proposed child work packs for XMLv3. They are not published issues, dispatched agents, a replacement Geometry WBS 3.x or a revival of MAP WBS 5.x.

| ID | Scope | Observable result / completion criterion | Dependency |
|---|---|---|---|
| XV3-0 | Custody and source qualification | Exact XMLv2 source/package/member hashes, live base/overlap, current HOLD disposition and repository-specific A1-A5 evidence; qualified safe reuse boundary | This plan and real source access |
| XV3-1 | First lossless vertical slice | One authorized supported CII -> XMLv3 -> CII, standalone XML-only writer, zero differing bytes/length/SHA; report actual input/profile | XV3-0 |
| XV3-2 | Branch/Element/Node reference views | Inspect stored Line Number grouping, all element occurrences and shared nodes, canonical field references and visible conflicts; unchanged round trip still exact | XV3-1 |
| XV3-3 | CONTROL and MISC dependencies | Independently expected record counts/material associations; value-only edit leaves counts; explicitly qualified structural cases update all dependent records consistently | XV3-1; structural export remains separately scoped |
| XV3-4 | Populated-section/lexical coverage | Versioned coverage matrix and real/synthetic proofs for each supported grammar, including nozzle/hanger and currently rejected auxiliary sections | Source-qualified grammars; no opaque success fallback |
| XV3-5 | Editable causality and negative cases | One diameter field, existing Node Name and material-assignment pilots; independent expected spans; malformed/stale/ambiguous/overflow XML rejects | Each affected field's ownership/format authority |
| XV3-6 | Usable isolated converter | CII/XML intake, hierarchy, download and exact-byte verification on the supported loopback/browser runtime; stale outputs revoked | Qualified engine/profile and existing UI boundary |
| XV3-7 | Delivery qualification | Exact-head distinct review, reproducible real-input corpus, supported-feature statement, native-import observations and Owner acceptance disposition | Candidate-specific proofs; no self-certification |

Parallel read-only grammar research is useful; production writes stay with one named writer per shared scope. Before every new implementation stage refresh exact-file/path-prefix, semantic authority, stacked dependency and base-drift checks. New namespace alone does not establish semantic independence.

## 4. Immediate runnable builder card

**Card: XV3-0 -> XV3-1, XML-only lossless baseline and one qualified field.** Builder/custodian: this chat's named XMLv3 Coder scope; distinct implementation reviewer NOT_ASSIGNED. No claim of engineering takeover qualification is created by this document.

Input: actual bytes of pinned PR157 package/member inventory, the local differing candidate and a permitted real supported fixture. The historical private primary is referenced only by opaque custody ID `OWNER_PRIVATE_REF:ciifr-xmlv2-primary-20261024`; its past reported 803,776-byte digest is not a current recipient receipt. Locate existing authorized custody before requesting another upload.

1. Reconcile exact candidate and HOLD/source identities; inspect source and independent expectations. Complete A1 production trace, A2 failure isolation, A3 invariants, A4 independent validation and A5 minimal patch boundary under repository policy. Do not manufacture a self-awarded qualification score.
2. Capture original fixture bytes/length/SHA read-only. Freeze expected identities before conversion; preserve all originals and prior package bytes.
3. Add a minimal, explicit v3 envelope/reference view over the qualified storage model. Keep one canonical field set and the existing Python runtime/qualified writer contract.
4. Reconstruct in a separate process/location containing only XMLv3 and permitted runtime code. No original file, sidecar, parser trace, working-directory dependency or network. Compare output bytes/length/SHA externally.
5. Change one source-qualified diameter using explicit edit intent. Compare with a literal 13-byte expected replacement independently specified before running the writer. Verify all bystanders unchanged and both altered value and exact output spelling.
6. Return a runnable command and actual results, profile/fixture hashes, source/PR identity, changed-file ledger, failures/NOT_RUN, recovery patch and next one card. Repair only demonstrated faults within this boundary.

First card excludes cross-file field transfer, CII construction from Geometry XML, pointer creation/reindexing, element insertion/deletion, effective-property guessing, runtime/canvas changes and Geometry UI integration. Later structural experiments require a separately bounded supported-operation contract; coding approval is not Owner acceptance or merge authority.

## 5. Discriminating validation plan

Define input basis and literal/analytical expected result before each run. Test count alone is not acceptance.

| Claim | Necessary falsifier / independent expectation |
|---|---|
| Exact unchanged output | Per-input byte equality/length/SHA; final-EOL, spacing, exponent and signed-zero variants accepted exactly or rejected by declared profile |
| XML controls the writer | Remove original/sidecars; edit a represented field; disagreement without edit intent rejects; no original payload replay |
| Safe ownership views | Shared junction/auxiliary, duplicate Line Number, conflicting aliases, multiple components and reversed endpoints remain distinct and traceable |
| Correct CONTROL | Literal collection counts; zero/one/shared/unreferenced blocks; IZUP not equipment count; malformed count or invalid pointer fails |
| Correct MISC | Material association survives element reorder; ceil-count boundaries 6/7/12/13; nozzle/hanger grammar and final-row padding qualified independently |
| Exact edits | Literal byte splice for selected field; no rounding/overflow; unsupported units/sentinels reject affected edit |
| Atomic/stale output | Mid-write error preserves existing destination; invalid model publishes no output; changing either input revokes old artifacts |
| Broad profile claim | Every populated section on target corpus has a coverage entry and source-qualified grammar; unsupported content visible and fail-closed |

Pure mathematical boundary tests do not by themselves certify a native-valid CII. Native CAESAR acceptance and engineering changes remain separately observed, not inferred from digest equality.

## 6. Evidence already obtained for this plan

STATUS=PASS, OBSERVATION=source inspection, ORACLE=implementation-coupled: inspected local XMLv2 physical model/validator/writer and compared manifest engine SHA; retrieved live PR metadata/HOLD notice and primary v14 CONTROL. MISC v14 content was available through the official search index, with direct opening failing.

STATUS=PASS for observed profile-rejection behavior, not universal conversion: a read-only helper ran in-memory Python `-B` intake attempts on four existing fixtures. One v14 target rejected at FORCMNT; two alternate-profile inputs rejected at VERSION; another input rejected at section grammar. No files were written. A positive current local round trip was not observed.

STATUS=NOT_RUN: current primary private fixture, positive current XMLv2 round trip, XMLv3 implementation/round trip/edit tests, served-browser qualification, failure-atomic output proof, distinct exact-head assessment, native CAESAR and Owner acceptance. The helper assessments are not independent product acceptance.

## 7. Next two connected outcomes and delivery boundary

First: a usable XMLv3 converter/hierarchy on an explicitly supported real profile, with independently verified byte-exact unchanged output and one proved field edit. Second: complete field/grammar coverage and data-dependency qualification so later correspondence can consume stable field references without guessing ownership. Property transfer and Target_enriched.CII follow their own mapping/engineering authorization.

EXACT_NEXT_ACTION: execute XV3-0 source/member reconciliation and repository A1-A5 qualification, then implement XV3-1 only within its pinned, demonstrated safe reuse boundary. No active Geometry control or old accepted E1 R2 transaction is reopened by this plan.
