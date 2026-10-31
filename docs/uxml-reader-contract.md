# UXML reader contract — PSI116 S1/S2 and CAESAR InputXML S3

**Status:** read-only source ingestion. This is the current contract for XCU draft PR #244 and consumer TopoFix draft PR #18, pending independent final-round acceptance. It does not authorize any new writer or engineering release.

## Authorities and invariant boundaries

- **XCU owns UXML readers.** TopoFix downloads the pinned XCU JavaScript modules at one immutable commit and verifies every Git blob hash. It does not vendor reader copies.
- **The original XML bytes remain the source of truth.** Both CLI readers SHA-256 the exact original file bytes before UTF-8 decoding with `fatal:true, ignoreBOM:true`. `sourceText` retains BOM and CRLF so `sha256(utf8(sourceText))` equals the file-byte digest. TopoFix validates it again.
- **Immutable per-record identity:** PSI116 references use `B{branchIndex}:N{nodeNumberOrNone}:S{sourceIndex}`; InputXML references use `E{zeroBasedPipingElementIndex}:F{encodeURIComponent(FROM_NODE)}:T{encodeURIComponent(TO_NODE)}`. An InputXML component and both ports retain `format=INPUT_XML`, original `fileSha256`, exact `recordKey`, `elementIndex`, both literal node identifiers, run ID and anchoring status. Port refs additionally identify `FROM` or `TO`. Python applies the exact JS `encodeURIComponent` safe set, including `!'()*` and excluding `/`.
- **No rebuild from UXML.** The only allowed future write pattern is a separately reviewed original-file patch whose original SHA and exact record identity, targets, parameters, policy and kind are all verified. S3 introduces no InputXML writer. The existing PSI116 S2 patch-back is independent and unchanged.

## CAESAR InputXML delta graph

- Real CAESAR14 files ordinarily contain `DELTA_X/Y/Z`, not `FROM_X/Y/Z` or `TO_X/Y/Z`. The strict S3 reader derives positions by directed delta chaining along connected `FROM_NODE`→`TO_NODE` edges, including tees, bends and repeated node IDs. Source ordering determines the element ordinal; self-closing and paired elements have equal status.
- The CAESAR zero/unset delta sentinel `-1.010100` is interpreted as zero only for delta axes. Missing delta attributes and inconsistent forward/backward path sums are rejected, never averaged.
- Each connected run is independently tracked. If original literal absolute `FROM_X/Y/Z` / `TO_X/Y/Z` evidence exists, it anchors the run and must agree with every summed path. Otherwise the run is declared `UNANCHORED_LOCAL_FRAME` with its own origin at the first source node. No relative offset between two disconnected unanchored runs is inferred.
- **Coordinate frame:** CAESAR source is `CAESAR_INPUTXML_XYZ_MM`; hub/PSI116 is `PSI116_XYZ_MM`. Map CAESAR `(X,Y,Z)` to hub `(X,-Z,Y)`. Every strict InputXML UXML document exposes the original frame, hub frame, transform, run list and per-component/per-port run anchoring. Comparing unanchored runs to global PSI116 positions, or judging proximity/join/gap between independent unanchored runs, is explicitly refused. A safe per-run analyzer may assess topology within that one source-connected run.
- InputXML relative geometric coordinates are source-derived evidence, **not** authorization for topology edits, weld closure or source modification.

## Physical fields, bend and tee ownership — final S3 reader reconciliation

- The Workspace CleanXML→5C converter emits full `DIAMETER`/`WALL_THICK` values on the first element of each sequential route and `-1.010100` on later elements. S3 only inherits from the *immediately preceding sequential route* with matching literal `TO_NODE`→`FROM_NODE`. It resets on a tee branch restart or disconnected run. No default physical properties are guessed.
- The strict reader emits `rawAttributes.inputXml.physicalEvidence` for `outsideDiameter` and `wallThickness`: value, mode `EXPLICIT`/`INHERITED`/`SOURCE_UNAVAILABLE`, original `sourceElementIndex`, and original `PIPINGELEMENT@DIAMETER` / `PIPINGELEMENT@WALL_THICK` field. TopoFix independently re-reads those exact original source fields and rejects any falsified value or lineage.
- `PIPINGELEMENT/BEND@RADIUS` and its exact `TO_NODE` are the only authority to project a source bend radius to the TO endpoint as TopoFix `ELBO`. The reader carries `bendEvidence`; TopoFix verifies its raw child attributes.
- `PIPINGELEMENT/SIF@TYPE=3` supports a TEE classification; `TYPE=5` supports **OLET**, never TEE. The reader carries `sifEvidence` with literal original fields. A derived TopoFix branch stub at an actual route fork may retain that literal SIF code but must never claim an unsupported TEE. The Workspace converter may emit type 5 even when original PSI116 says TEE: that is an unresolved conversion difference, **not** an allow-listed equivalence.
- Original `PIPINGELEMENT` records are two-ended spans, whereas PSI116 contains node records. The read-only TopoFix projection de-duplicates the identical TO/FROM *within one sequential route*, preserving all original `inputxml_record_keys` on the merged NodeRecord. It creates a new route for a changed `FROM_NODE` or run, and never merges physical node records across those routes merely for proximity. The source's missing `REF_NO` is not fabricated as a real component reference.

## Validation, uncertainty, comparison and test requirements

- The shared `UxmlValidationGate` returns `ready`, warnings and blocker codes. Some source-valid CAESAR14 documents omit physical bore or specialized anchor roles; the CLI may return read-only evidence with `ready=false`, **not** engineering permission. Source SHA, sourceRef, delta, frame and run contradictions still reject ingestion.
- Source-only CAESAR fields and nested attributes appear in the `lossContract` with original XML preserved; raw retention does not imply that every source semantic can be reconstructed.
- The TopoFix findings engine, resolver, CLOS binding rules and tolerances are unchanged. Strict cross-format comparison uses the common hub frame, ALL occurrences for each node, all fields, and every finding-count/detail difference. It has **no allow-list**. All differences remain `UNEXPLAINED` with a specific cause/evidence classification: (a) unresolved reader/projection, (b) source conversion loss, or (c) genuine source difference. The compare CLI prints `DIFFERENT` and exits nonzero whenever such a difference remains.
- The synthetic Workspace-rich and delta-only fixture files are byte-verified by actually invoking the Workspace CleanXML→5C converter. Source-backed tests must prove inherited attributes, bend ownership, route de-duplication, unchanged PSI116 direct/UXML equivalence, and a real 50 mm source geometry change that makes cross-format compare FAIL. The public `docs/GREInputxml.xml` and `docs/PLB314Inputxml.xml` are InputXML-only fixtures; absent a matching PSI116 file, a cross-format PSI116 count is **NOT_AVAILABLE**, never invented.
- No private Owner file bytes, node numbers, original SHA or sensitive source excerpts may be stored in these documents, PRs, issues or synthetic CI output.

## Current release boundary

XCU #244 and TopoFix #18 remain **DRAFT / HOLD** until exact-head independent non-author review, full green CI and Owner acceptance. No InputXML writer, automatic source edit, CLOS change, engine change or merge is authorized.
