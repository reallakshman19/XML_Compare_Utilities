# XMLv3 — complex architecture and CII syntax

Status: proposed contracts grounded in inspected XMLv2 source and version-qualified references. This is not a universal CAESAR grammar or a completed converter. See [concept](CONCEPT.md).

## 1. Fidelity architecture

Use a versioned concrete syntax model (ordered bytes -> sections -> logical records -> physical rows -> fields/literals) and a typed relationship graph. The graph is derived from authoritative storage fields; it is not an alternative serializer input with independently editable duplicate values.

| Layer | Responsibility | Protected invariant |
|---|---|---|
| Intake/profile | Identify encoding, dialect/version, section grammar and supported populated features | Reject a source outside the accepted profile before publishing output |
| Physical model | Preserve section/record order, empty sections, row boundaries, header bytes, numeric/string lexemes, prefix/suffix, padding, each terminator and EOF | Never silently normalize accepted input |
| Typed storage | Decimal/integer/string value, original token, width, field identity, units/state qualification and edit intent | A represented edit is authoritative; disagreement with an unmarked original token rejects |
| Ownership graph | Element endpoints, node incidences, branch membership, auxiliary indexes/shared owners, material and source-field links | References resolve; unresolved meaning remains explicit |
| XMLv3 views | Branch -> Element -> Node connectors; Element Data, Node Data and Endpoint Data field references | Views carry no second writable copy of a canonical value |
| Reconstruction | Validate XML, project the authoritative storage model into the qualified writer contract, format changed fields, preserve untouched tokens | Original CII, parser traces, sidecars and network unavailable |
| Qualification | Literal-byte oracle, counts/references, edit causality and later native import | Distinguish byte fidelity, editable causality and engineering validity |

The existing strict XMLv2 writer cannot accept arbitrary new root children. The first reuse prototype should explicitly project the v3 envelope into its pinned storage contract, retaining one authoritative field set. If that projection cannot preserve all validated semantics, stop and qualify a narrowly scoped writer extension; do not introduce a hidden fallback writer.

## 2. Source identity and ownership

Use IDs scoped to a model identity, not a bare ordinal assumed stable between files. An element's source ordinal identifies a physical occurrence in that input only. Node identity and element-end occurrence identity are distinct. Repeated labels, parallel members, shared junctions and disconnected components must not collapse distinct occurrences.

Element Data references the element's own properties and relevant material/auxiliary fields. Node Data references only qualified node-associated properties, preserving alias occurrences and conflicts. Endpoint Data retains FROM/TO role and orientation-sensitive fields. A RIGID record remains one shared record with an owner list: pointer 0 means absent; a referenced Weight of 0 is still data. No auxiliary block is cloned merely because two elements reference it.

Stored value, effective/inherited value and sentinel state remain separate. Preserve signed zero, tiny values and 9999.99 tokens without assigning a global meaning. Effective properties require field-specific evidence; unknown units or cases cannot become a guessed conversion.

## 3. Physical grammar and lexical preservation

Local XMLv2 profile is `RichInputXMLv2.1 / CII-V14-ASCII-CRLF-B001`. It accepts a narrow printable-ASCII, final-CRLF, fixed-section-order profile and VERSION values 5/14/1256. Those header values do not establish arbitrary codepage-1256 byte support. LF, mixed terminators, missing final EOL, other encodings and alternate physical layouts require their own acceptance and exact reconstruction tests.

Numeric storage uses fixed positions and 13-byte lexemes, including E/e/D/d exponent forms where supported. Parse with Decimal/integer contracts, not binary-float reformatting. Unchanged fields reproduce the token byte-for-byte. Changed fields must fit exactly and reparse to the intended value; overflow or rounding rejects. Distinguish unchanged integer signed-zero spelling from real signed-zero semantics.

Length-prefixed text needs declared length, exact payload and retained trailing padding. XML attribute/text normalization can destroy tabs, CRs and illegal XML characters; define explicit byte encoding for affected lexical fragments rather than trusting pretty-printed XML. Bounded lexical fragments are metadata for actual fields/rows, not an embedded original CII replay.

Validate duplicate/missing sections, records, IDs and fields; order, cardinality, widths, types and references; unexpected XML children/attributes and forbidden DTD/entities. Preserve explicit unqualified semantics only where physical grammar is known. Missing populated-section grammar must remain an unsupported operation, not a successful opaque fallback.

## 4. ELEMENTS and auxiliary reference syntax

The inspected v14 catalogue and local XMLv2 model use 15 physical ELEMENTS rows: eight six-real rows plus one five-real row (53 numeric slots), name and Line Number rows, display metadata, and three pointer rows (6+6+3). Each fixed numeric row has a two-byte prefix. These slots are not automatically 53 qualified editable engineering properties.

Pointers #1-15 refer to BEND, RIGID, EXPJT, RESTRANT, DISPLMNT, FORCMNT, UNIFORM, WIND, OFFSETS, ALLOWBLS, SIF&TEES, NODENAME, REDUCERS, FLANGES and EQUIPMNT. Pointer values are one-based section-local logical record indexes, with zero absent. Logical block count differs from physical row count: an indexed BEND occupies multiple rows; REDUCERS cardinality alone does not validate its numeric content.

A representative inspected source trace: ELEMENTS first numeric row, field 6 -> `outside_diameter`, byte slice [67:80] within that row -> XML Field value/lexeme -> `_serialize_field` -> `_row_bytes` -> `write_cii`. The width is 13 bytes. This is source-code inspection, not a newly passed original-file or native-import test.

## 5. CONTROL calculations

Direct [v14 Control Information](https://docs.hexagonali.com/r/en-US/CAESAR-II-Users-Guide/Version-14/337039?contentId=MeNVWhUncLa7t~1wG90vyQ) was retrieved with Version 14 metadata. It describes six leading counts, followed by thirteen auxiliary values, using `(2X,6I13)` output formatting. The rendered intersection/IZUP bullet is joined; separating those consecutive entries to reconcile thirteen is an explicit source-reading inference.

| Leading item | Derive from the logical model |
|---|---|
| NUMELT | Piping element occurrences |
| NUMNOZ | Nozzle records |
| NOHGRS | Spring-hanger records |
| NONAM | NODENAME blocks, not unique node numbers |
| NORED | REDUCERS blocks |
| NUMFLG | FLANGES blocks |

Auxiliary order: bend, rigid, expansion joint, restraint, displacement, force/moment, uniform load, wind load, offset, allowable stress, intersection, IZUP flag, equipment-limit blocks. IZUP is orientation state (0: global -Y vertical; 1: global -Z vertical), not a record count. Six-plus-thirteen items gives canonical generated row cardinalities 6/6/6/1. These are output-layout facts, not proof of input surplus-field rejection.

Design rules:

1. Unchanged round trip: derive expected counts and compare against stored CONTROL. Preserve the original count lexemes/layout. A mismatch rejects; no silent repair that would break the byte contract.
2. Value-only change in an existing field: counts ordinarily stay constant; validate that the operation did not alter record identity/cardinality.
3. Reference reassignment: counts need not change; validate target type/index and shared-owner consequences. Do not infer a count from the largest pointer or number of owners.
4. Explicit creation/deletion/reordering: operate on logical records, recalculate affected counts and dependent arrays, and consistently rebuild one-based references. Count stored blocks, including retained unreferenced blocks; deletion/deduplication is an explicit policy.
5. Unknown structural grammar or count authority: reject the affected operation while retaining the original. Do not silently substitute physical line counts.

Current XMLv2 validates exactly nineteen CONTROL values and rejects nonzero nozzle/hanger/IZUP values as unsupported profile features. That is an implementation limitation, not a claim that native v14 rejects them.

F3 status: DIRECT_V14_CONTROL_LAYOUT_RETRIEVED; TRAILING_FIELD_ADMISSIBILITY_UNRESOLVED. The newly available source improves version authority but does not settle padding, surplus numeric tokens or native importer tolerance. Preserve existing bounded E1 R2 acceptance; do not call F3 closed.

## 6. MISCEL_1 is data-dependent structured content

The official [v14 Miscellaneous Data Group #1](https://docs.hexagonali.com/r/en-US/CAESAR-II-Users-Guide/Version-14/337059?contentId=QRJHqQfpqhY__NjXLOrstQ) was retrieved through the vendor search index; direct opening failed. Its relevant rules are:

| Part | Version-qualified source basis |
|---|---|
| RRMAT | One material ID per element; IDs 1-699; generated row count ceil(NUMELT/6) |
| VFLEX | 22 values per nozzle over four rows; meanings depend on nozzle type |
| Hangers | Defaults, per-hanger arrays, eleven-value/two-row HGRDAT, tag/GUID strings, free/restraint/index/table/connection data |
| Execution options | Mixed integer/real row formats and a final North-arrow value |

Real output formats permit the documented alternate exponent form for greater significant-digit preservation. Integer, real and length-prefixed string formats must remain distinct. Hanger allocation-size prose does not prove universal emitted row counts, zero-count omission rules or trailing-slot contents; qualify those against actual v14 fixtures.

Design consequences:

- A material-value edit does not add an element or change CONTROL. Its material assignment must still refer to the correct element.
- Element reordering must reorder the associated material assignments by identity; blindly retaining position would attach the wrong material.
- Element insertion/deletion changes NUMELT and material-vector length. Exercise boundaries 6->7 and 12->13; preserve or regenerate final-row padding only under a qualified layout rule.
- Nozzle/hanger creation/deletion changes their logical count and the corresponding MISC substructures. Parse from explicit counts and a qualified grammar, not by guessing where execution options start.
- Pointer changes can alter ownership without changing a MISC row count. Revalidate all embedded node references and material associations affected by the authorized operation.
- Preserve the untouched suffix and all existing lexical fields for value-only edits. Structural edits need a dependency-driven regeneration plan, a complete byte-difference audit and their own permission scope.

Current XMLv2 supports material rows plus four execution rows, and rejects nonzero nozzle/hanger profiles. It does not yet establish a general MISC grammar. Its mostly indexed execution-field names must not be relabelled as verified meanings without source/fixture reconciliation.

## 7. Dependency engine and atomic output

Represent dependencies explicitly: record collections -> CONTROL counts; element order/identity -> material vector; nozzle/hanger counts -> MISC partitions; record indexes -> every pointer owner; text payload -> declared length; field edits -> exact formatting; changed model -> invalidated prior validation/output.

Maintain two operation modes: unchanged reconstruction and explicitly scoped edits. Plan dependencies before serialization, validate the full resulting model, serialize to a temporary new destination, verify output and publish atomically without overwriting the original. Failure preserves prior destinations and leaves no downloadable partial result. The existing CLI's direct exclusive write is not yet qualified against mid-write I/O failure.

## 8. Boundaries and unresolved claims

All populated sections must have a coverage entry: physical grammar, logical record cardinality, field typing, ownership, edit support and qualification. Current XMLv2 rejects populated EXPJT, FORCMNT, UNIFORM, WIND, OFFSETS, FLANGES and EQUIPMNT. No broad-v14 support claim is justified yet.

No XMLv3 schema, reconstruction, browser journey, native import or independent acceptance has passed in this design batch. A future converter must report supported profiles and exact tested input identities. See [WBS and prototype plan](WBS_AND_XMLV2_REUSE_PLAN.md).
