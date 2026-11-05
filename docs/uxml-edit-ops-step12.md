# STEP 1.2 — Invariant-first original InputXML node alias

Status: **DRAFT PR, NOT APPROVED FOR APPLY**. Retains XCU PR #257 at
d4ccec7c as its source base; new branch/PR. Only INPUT_XML
ALIAS_COINCIDENT_NODE; XCU alone writes original files.

## Release hold

The uxml-edit-ops/v1 envelope is NOT an authenticated TopoFix plan,
transaction, signature, action receipt or engineering finding. I-7 is
an explicit release dependency: **before Apply**, trusted lane A must
bind every source-hash-pinned operation to a selected non-review-only
TopoFix action and approved native transaction. Substituted/fabricated/
stale actions must refuse upstream. XCU cannot authenticate this in
the unsigned v1 envelope. Output does not claim authorisation,
committed status, or CAESAR II acceptance.

## Invariants and named refusals

| ID | Constraint | Refusal |
|---|---|---|
| I-1 | Reject owner/absorbed chains and cycles before geometry; group all A IDs by B. Require anchored S3 solved and complete original literal absolute witnesses, every original occurrence, all pairwise <=0.001 mm. | INPUT_XML_ALIAS_CHAIN_REFUSED; INPUT_XML_ALIAS_GROUP_SPREAD; INPUT_XML_ALIAS_COORDINATE_UNPROVEN |
| I-2 | Shared source-field/v1 lookup, case-normalized, returns raw token, XML-decoded value, exact BigInt node ID, original UTF-8 byte span, and absolute source witness, distinct from lexical recordKeys. Reject case-folded duplicate attributes. | INPUT_XML_UNKNOWN_NODE_CARRIER; INPUT_XML_NODE_IDENTITY_INVALID; INPUT_XML_ALIAS_COORDINATE_UNPROVEN |
| I-3 | Refuse only NEW equality among active numeric slots after mapping: endpoints, restraint/hanger NODE+CNODE, SIF NODE+BRANCHNODE, BEND NODE1-3 pairwise and vs parent endpoints. Already-equal original slots preserved. | INPUT_XML_ALIAS_SELF_CONNECTED with recordKey and both field paths |
| I-4 | Finite typed registry; NODE_REF, schema-confirmed NON_NODE, otherwise UNSUPPORTED. Ordinary public numeric properties stay intact. Unknown node carriers never silently pass as inert. | INPUT_XML_UNSUPPORTED_NODE_CARRIER; INPUT_XML_UNKNOWN_NODE_CARRIER; INPUT_XML_NODE_CARRIER_LOCATION_UNSUPPORTED |
| I-5 | A separately imported independent verifier, with no planner imports, recomputes owner groups, slot collisions, whole numeric typed graph and connected components, sourceRefs/positions and byte complement from immutable original and candidate. | INPUT_XML_PATCHED_NUMERIC_TOPOLOGY_MISMATCH; INPUT_XML_PATCHED_SOURCE_PARITY_FAILED; I-1/I-3 codes |
| I-6 | Atomic bytes:null/empty-ledger refusal; exact byte ranges, right-to-left splices, ledger replay, unrelated numbers unchanged. | Named no-byte refusal |
| I-7 | Upstream TopoFix approval and transaction provenance remains a mandatory pre-Apply release hold. XCU does not certify engineering authorisation. | External trusted-boundary release dependency |

0.001 mm remains INPUTXML_DELTA_TOLERANCE in UxmlInputXmlDeltaGraph.js.
Delta-only, unanchored, or missing complete original absolute coordinates
refuse as COORDINATE_UNPROVEN (not "non-coincident"). Geometry is never
moved or snapped. GRE and PLB314 are source exports and omit many
absolute anchors: **admission is not permission to alias**.

## XML 14.00 node-field registry and authority

Fields are classified by exact element lineage and case-folded attribute
name. Node IDs must be understood as numeric identities, not accidental
matches with metadata/property numbers.

| Element / family | Node fields | v1 status | Authority |
|---|---|---|---|
| PIPINGELEMENT | FROM_NODE, TO_NODE | PATCH-ALLOW original physical source row | Hexagon CAESAR II v14 Input Export Elements; strict S3 sourceRefs; GRE/PLB314 |
| RESTRAINT | NODE, CNODE | PATCH-ALLOW only direct child | Hexagon CAESAR II v14 Restraints Input Export; GRE/PLB314 |
| RESTRANT (compat spelling) | NODE, CNODE | PATCH-ALLOW direct child; spelling compatibility must remain explicit | User-card compatibility requirement; public RESTRAINT profile as corroboration, not an independently evidenced Hexagon export family |
| HANGER | NODE, CNODE | PATCH-ALLOW direct child, pending release semantic confirmation | Hexagon CAESAR II Hangers/Boundary Conditions and Elements Input Export HANGER family |
| SIF | NODE, BRANCHNODE | PATCH-ALLOW direct child | Hexagon CAESAR II SIF/Tees; PLB314 original SIF attributes |
| BEND | NODE1, NODE2, NODE3 | PATCH-ALLOW direct child | Hexagon CAESAR II v14 Bend extra-node documentation; GRE/PLB314 |
| DISPLACEMENTS | NODE_NUM | PATCH-ALLOW direct child, pending release export-profile confirmation | Hexagon v14 Elements Input Export DISPLACEMENTS auxiliary family and user-card minimum |
| FORCESMOMENTS / FORCEMOMENTS | NODE_NUM | **UNSUPPORTED; refuse** | Hexagon CAESAR II Forces/Moments Input Export |
| USERDEFINED_NOZZLE | NOZZLE_NODE, VESSEL_NODE | **UNSUPPORTED; refuse** | Hexagon user-defined nozzle Input Export |
| Other documented unpatched auxiliary node families | unverified | **UNSUPPORTED; refuse** | Input Export options list |
| Unknown node-like extension or unknown element/field | unverified | **UNSUPPORTED; refuse** | No checked schema identity |
| Known v14 non-node properties | none | NON_NODE; keep original bytes | 319 observed property names in committed public v14.00 GREInputxml.xml and PLB314Inputxml.xml, plus explicit synthetic/structural fields |

The static production NON_NODE whitelist uses original GRE/PLB314 XML
v14.00 public attr names, plus supported synthetic identity/coordinate
fields. Includes HYDRO_PRESSURE, TEMP_EXP_C*, PRESSURE*, MODULUS,
HOT_MOD*, MATERIAL_NUM, DIAMETER, RADIUS, STIFFNESS, GAP and FRIC_COEF.
No unrecognized numeric attribute is silently classified NON_NODE.
Entity decoding supports only XML predefined and character references.
No DTD/general/external entity expansion; non-UTF8 source not supported.

### External authority sources
- Hexagon [CAESAR II v14 Elements/Input Export](https://docs.hexagonppm.com/r/en-US/CAESAR-II-Users-Guide/Version-14/425675)
- Hexagon [CAESAR II v14 Restraints/Input Export](https://docs.hexagonppm.com/r/en-US/CAESAR-II-Users-Guide/Version-14/425679)
- Hexagon [CAESAR II v14 bend extra nodes](https://docs.hexagonppm.com/r/en-US/CAESAR-II-Users-Guide/Version-14/335015)
- Hexagon [CAESAR II Input Export Forces/Moments](https://docs.hexagonppm.com/r/en-US/CAESAR-II-Users-Guide/15/425681)
- Hexagon [user-defined nozzle XML fields](https://docs.hexagonppm.com/r/en-US/CAESAR-II-Users-Guide/Version-12/762053)
- Repo public source: docs/GREInputxml.xml, docs/PLB314Inputxml.xml (VERSION="14.00").

## Verification and custody

Use exact-head GitHub Actions with no continue-on-error:
- node --test tests/uxml-edit-ops-step12.test.mjs
- node --test tests/uxml-edit-ops-step12-mutants.test.mjs
- node --test tests/uxml-edit-ops-patch-back.test.mjs
- Existing strict S3, S4.1/S4.2, B7/B8, PSI116 and ISO suites.

Each mutant runs unchanged original GREEN, then removes one guard
and expects the SAME focused test assertion RED. The independent verifier
must never import planner functions. Native CAESAR II import/topology
verification and upstream transaction authentication are NOT_RUN and
remain Owner/TopoFix release gates.
