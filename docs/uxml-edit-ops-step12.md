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

## Step 1.2-R1 regression and verifier custody

- Incomplete literal absolute coordinate triples (for example missing
  FROM_Y or TO_Z while another axis is present) are refused by the unchanged
  strict S3 reader first, exposed as INPUT_XML_ORIGINAL_SOURCE_REFUSED,
  **before** the later INPUT_XML_ALIAS_COORDINATE_UNPROVEN source-witness
  check. Never claim the partial-triple case reaches the coordinate gate.
- Whitespace-padded absolute literals such as FROM_X=" 100 " fail the exact
  source-literal witness and refuse INPUT_XML_ALIAS_COORDINATE_UNPROVEN.
  The strict-S3 solved value cannot replace the original unambiguous token.
- B7/B8 mutation harness clones explicitly depend on
  UxmlInputXmlSourceFields.js imported by UxmlInputXmlSchemaMapper.js.
  Their workflow path filters cover cloned source dependencies and public
  fixtures; both mutant suites must run on edits to shared original readers.
- The independently imported verification code validates fresh original
  bytes, typed numeric references and graph topology, but it **shares**
  UxmlEditOpsTypedInventory.js carrier classification with the writer.
  A classification defect replicated in that shared module is a correlated
  risk, not independent corroboration of the XML schema. The version-matched
  Hexagon schema evidence and external Oracle tests remain necessary.
- The original-byte ledger and unchanged strict-S3 re-read cannot directly
  manufacture a geometry or text change without triggering an earlier
  byte/typed invariant. The verifier's *actual live* changed-count, text-item,
  owner-spelling and solved-point checks therefore also have read-only
  invariant probes and isolated one-guard RED mutations to pin those
  redundant defense-in-depth layers.
- Step 1.2 implementation intentionally does not authenticate the TopoFix
  selected native action, does not validate CAESAR II import, and does not
  certify all pre-existing unrelated topology. No tolerance/policy/CLOS
  widening is permitted.

### Nonblocking maintainability hold (R1)

N1: UxmlEditOpsTypedInventory.js currently exceeds the repository's
under-300-line convention. A follow-on purely mechanical split can move the
static v14 carrier registry into a versioned module and separate bounded
XML tokenization, while snapshot-diff testing the registry values, scanner
offsets, existing inputs and all mutation seams. **NOT DONE in R1**:
not worth risking the code safety gate with an unverified parser refactor.

## Final repair R2: original CAESAR v14 source restrictions and CI custody

The checked public original InputXML documents contain **no non-whitespace
direct character data and no CDATA** within the PIPINGMODEL subtree.
The new original-source verifier therefore treats **all** such model text,
regardless of whether it is numeric, node-like or prose, as a named
INPUT_XML_UNKNOWN_NODE_CARRIER refusal. Both ordinary text and nonblank
CDATA use the same fail-closed check. Whitespace-only text/CDATA remains
unchanged; the original byte ledger still forbids unrelated modifications.

Public GREInputxml.xml has **0/200 anchored ports**, and PLB314Inputxml.xml
has **0/106 anchored ports**. Both omit FROM_X/TO_X source-literal absolute
fields. Even though both pass v14 typed admission, **every proposed alias
on these two originals refuses INPUT_XML_ALIAS_COORDINATE_UNPROVEN**.
The InputXML alias capability is restricted to source exports carrying
complete original absolute coordinates, not merely DELTA_X/Y/Z.

All five S3/S4 mutation workflows explicitly trigger on shared original
reader/field imports plus their checked clone lists. B8 additionally
triggers on the cloned B7 controller fixture. The edit-ops workflow
triggers on the tolerance and source-structure modules. A committed
source/clone/CI consistency test covers these dependencies and fails on
an omitted path filter. Workflow edits are Owner-authorized only for R2.

The independent verifier's original-byte/reader proof retains the shared
typed-inventory classification risk documented above. Its UTF-8 identity
check was removed as redundant: TextDecoder with fatal=true rejects invalid
or noncanonical encodings, and the immutable original byte complement
already verifies every exact candidate byte. Its C.REMAIN diagnostic constant
was removed because its throw was removed in R1.

## Step 1.2-R2 FINAL: surviving guard accountability

PINNED = isolated original GREEN → one-guard-deleted RED. COVERED =
independent surviving named refusal after one-guard deletion; those
mutation tests correctly remain GREEN. REMOVED = proved redundant.

| Guard | Status | Committed focused test / mutation |
|---|---|---|
| PatchBack OWNER raw (:221) | COVERED-BY fullNumericOracle + independent verifier | R2 COVERED OWNER_PLANNER / IR B6 mixed spelling |
| PatchBack REMAINED (:294) | COVERED-BY numeric b.key===expected | R2 COVERED REMAINED_WRITER / writer absorbed remainder |
| PatchBack numeric new SELF (:325) | PINNED | R2 PIN writer numeric oracle self-connection / R2_FULL_NUMERIC_NEW_SELF |
| PatchBack verifyS3Candidate point (:346) | PINNED | R2 PIN writer solved point parity / R2_S3_POINT_PARITY |
| PatchBack duplicate CONFLICT (:201) | COVERED-BY reserveField or strict preflight | R2 COVERED DUPLICATE_ABSORBED |
| PatchBack legacy verifyCoincidence (:211) | COVERED-BY all-pairs owner group | R2 COVERED LEGACY_LOCAL_COINCIDENCE / IR B4/F6 |
| PatchBack assertByteParity (:352) | COVERED-BY independent originalByteProof | R2 COVERED WRITER_BYTE_PARITY / independent complement |
| Invariants original literal (:53) | PINNED | R2 PIN planner literal / R2_PLANNER_LITERAL_WITNESS |
| Invariants anchored/frame | PINNED | R2 PIN planner physical anchor / R2_PLANNER_ANCHORED_FRAME |
| SourceFields sentinel absolute | PINNED | R2 PIN source sentinel / R2_SOURCE_SENTINEL_ABSOLUTE |
| Verifier NODE_REF key===mapped (:216) | PINNED | R2 LIVE CHILD |
| Verifier ledger match (:219) | PINNED | R2 LIVE LEDGER |
| Verifier unchanged node/raw (:221) | PINNED | R2 LIVE UNCHANGED |
| Verifier unchanged non-node (:222) | PINNED | R2 LIVE NONNODE |
| Verifier numeric edges/components (:230) | PINNED | R2 LIVE EDGES |
| Verifier per-row S3 numeric ref (:240) | PINNED | R2 LIVE ROWNUM |
| Verifier shape (:207) | PINNED | R2 LIVE SHAPE |
| Verifier re-encode identity (:195) | REMOVED | Fatal UTF-8 decode and independent exact-byte complement already prove it |
| Verifier text call (:224) | PINNED | R2 LIVE TEXT |
| Verifier owner raw call (:231) | PINNED | R2 LIVE OWNER |
| Verifier S3 point call (:242) | PINNED | R2 LIVE POINT |
| Verifier anchor/frame | PINNED | R2 LIVE ANCHOR |
| Verifier literal witness | PINNED | R2 LIVE LITERAL |
| Verifier FROM/TO SELF | PINNED | R2 LIVE SELF |

All LIVE seeds call the actual verifyUxmlEditOpsIndependent(original,
mapping, ledger, bytes). Each uses byte-consistent original and
candidate XML with a faulted original reader/inventory only in its
disposable test clone. No production dependency-injection hook exists.

### R2 nonblocking outcome

N1 PARTIAL: unused verifier C.REMAIN and PatchBack absoluteInputXmlSourceWitness
import removed; same-branch node-field ternary simplified. The test-only
assertUnchainedIds probe and old R.LOOP/R.COINCIDENCE refusal names remain.
N2 DONE: workflow label no longer hardcodes fourteen invariant mutants.
N3 DONE: public GRE 0/200 and PLB314 0/106 anchored ports; without
complete original FROM/TO X/Y/Z all aliases refuse COORDINATE_UNPROVEN.
N4 NOT DONE: 641-line TypedInventory.js is above the under-300 line
convention. A registry/scanner/text split needs separate snapshot and
mutation-seam parity; not safe to undertake in final repair.

Oracle acceptance, authenticated TopoFix action approval and native CII
import/topology validation remain external and NOT_RUN.

### Final anchored/frame sub-guard witness coverage

The planner and the independent verifier each pin three *separate* source
evidence preconditions: original port anchored, original sourceRef anchored,
and the unchanged INPUTXML_HUB_FRAME coordinate-frame designation.
Planner tests R2 PIN planner source physical anchor/frame refusal,
R2 PIN planner sourceRef anchored flag refusal, and R2 PIN planner
coordinate-frame refusal each kill a single corresponding guard deletion.
Verifier live-clone tests ANCHOR, REF_ANCHOR and FRAME each kill a separate
single-edit deletion inside verifyUxmlEditOpsIndependent. None of the
three original evidence checks may be inferred from the others.

## Closure exception R3 (Owner-approved 6 November) — C1–C4

This is the final repair exception. The same DRAFT PR stays unmerged.
No S4.2/B7/B8 production, CLOS, policy, tolerance or native CAESAR II
verification changes were authorised.

### C1 hidden-XML construct protection

Public Hexagon v14 GREInputxml.xml and PLB314Inputxml.xml contain zero
comments, processing instructions, CDATA sections or DOCTYPE declarations
in the PIPINGMODEL subtree. The original-byte writer refuses ALL
`<!--...-->`, `<?...?>`, `<!DOCTYPE...>`, `<!...>` or
`<![CDATA[...]]>` sections inside the model, **including whitespace-only
CDATA**, as `INPUT_XML_UNKNOWN_NODE_CARRIER` before strict S3 can interpret
any hidden carrier. A separate typed-inventory lexical check provides
defence in depth. Ordinary whitespace remains allowed. Direct live
examples conceal RESTRAINT or BEND NODE 40 in comments or PI; all refuse
with `bytes:null`, empty ledger and no changed original.

The strict S3 legacy child finder can read XML-looking text in a comment
or PI. The independent verifier therefore compares both original and
candidate strict-S3 RESTRAINT/RESTRANT/HANGER, SIF and BEND child node
evidence against distinct typed inventory child element paths and
numeric node-field identities. No strict-S3 active child can be
unaccounted-for in the lexical inventory. A divergent parsed candidate
must refuse `INPUT_XML_PATCHED_NUMERIC_TOPOLOGY_MISMATCH`.
This is independent in implementation, but still shares the inventory's
classification API, so the preexisting correlated-classification
release risk is not erased.

### C2 and C3 independent geometry/topology

Committed isolated byte-consistent candidate tests invoke the **actual**
`verifyUxmlEditOpsIndependent` entry point (not just exported helpers).
RESTRAINT NODE+CNODE and SIF NODE+BRANCHNODE newly colliding under 40→20,
and BEND NODE1+NODE2 colliding on a separate parent record, each refuse
`INPUT_XML_ALIAS_SELF_CONNECTED`. Separate single-guard mutants remove
each corresponding family or the intra-BEND pair loop and go RED.

A source original absolute FROM_X that parses to 100.005 while strict-S3
ports solve to 100.000, with unchanged 0.001 mm tolerance, refuses
`INPUT_XML_ALIAS_GROUP_SPREAD`. Removing only the independent
verifier's raw literal from the pairwise witness list turns that one
live-entry-point control RED.

### C4 named surviving-guard disposition

PINNED: committed targeted GREEN original, one-guard-deleted RED.
COVERED-BY: committed test still refuses the **same unsafe input** after
this redundant guard is deleted, due to the named independent layer.
REMOVED: unreachable or duplicate with explicit upstream proof.

| Guard from R3 Oracle review | Status | Covering layer and committed test |
|---|---|---|
| Verifier :213 item path/kind | **PINNED** | R3 LIVE ITEM_PATH; single-edit path/kind assertion removal |
| Verifier :208 typed item length | **PINNED** | R3 LIVE ITEM_COUNT; single-edit length check removal |
| Verifier :232 S3 components length | **PINNED** | R3 LIVE COMPONENT_COUNT; single-edit count check removal |
| Verifier :236 strict recordKey/ordinal/format | **PINNED** | R3 LIVE REF_SHAPE; single-edit ref-shape removal |
| Writer :238 count>0 patches for absorbed ID | **COVERED-BY** ownerGroups/physicalNodeWitnesses | R3 COVERED writer zero absorbed count by original physical source proof; removed count guard still COORDINATE refusal |
| Writer :111 original raw endpoint spelling match | **COVERED-BY** strict original reader/source-field duplicate admission | R3 COVERED writer endpoint string mismatch by source/typed duplicate gate |
| Writer fullNumericOracle CALL | **PINNED** | R3 writer CALL FULL_NUMERIC_CALL: candidate-only wrong immutable non-node inventory, live caller must refuse SOURCE_PARITY; removing call goes RED |
| Writer verifyS3Candidate CALL | **PINNED** | R3 writer CALL S3_CANDIDATE_CALL: candidate-only solved point drift 0.004 mm, live caller must refuse SOURCE_PARITY; removing call goes RED |
| Inventory :486 raw attribute '<' | **COVERED-BY** strict original source structure / exact node ID | R3 COVERED invalid lexical < in node attribute by strict source parser |
| Inventory :614 duplicate namespaced-attribute check | **REMOVED** | earlier readStartTag checks colon-prefixed names before typed classification; R3 C4 redundant namespaced-attribute gate removed but scanner still refuses |
| Inventory :571 model DTD/DOCTYPE | **COVERED-BY** lexical original model-markup preflight | R3 COVERED model declaration refuses before loose strict child reader, plus R3 C1 fail closed doctype |
| Inventory :545 node-like text heuristic | **COVERED-BY** preceding model attribute-only character-data guard | R3 COVERED node-like value NODE 40 refuses via shared model text rule; outside-model ALLOWABLESTRESS non-node text NODE 40 remains inert |
| Inventory :556 malformed comment '--' check | **COVERED-BY** model-markup lexical preflight | R3 COVERED XML comment double dash cannot conceal a node carrier |
| Typed comment and processing instruction skip | **PINNED** | R3_COMMENT_TYPED_GUARD / R3_PI_TYPED_GUARD, direct inventory source-ref tests |
| Writer lexical model markup preflight | **PINNED** | R3_MODEL_MARKUP_PREFLIGHT / doctype source refusal |
| Inventory whitespace-only CDATA section | **PINNED** | R1_KNOWN_TAG_CDATA retargeted direct-inventory test; any model CDATA refused |
| Independent strict S3 child node inventory parity | **PINNED** | R3 LIVE S3_RESTRAINT / S3_SIF / S3_BEND, candidate parity-call mutants |

All pinned mutants require an assertion-level RED, not module-not-found
or syntax errors, after the original isolated control passes GREEN.
The two writer call-site mutants alter a single production invocation
in disposable clones with candidate-only reader/inventory fault seeds;
the separately imported verifier uses real source modules.

### Optional N1 disposition

**NOT DONE (non-blocking):** Extend the static clone-to-workflow map from
each mutant harness's current primary workflow to every workflow that
invokes it. `uxml-s4-0-converter-audit.yml` and
`uxml-b7-categorized-edit.yml` are known secondary consumers of
`uxml-s3-caesar-mutants.test.mjs` /
`uxml-s1-followup-mutants.test.mjs` without complete cloned-file
trigger paths. This secondary-trigger expansion is outside the scoped
C1–C4 safety correction and must not be silently reported DONE.
The R2 committed primary workflow dependency check remains green.

### Final release hold

Owner's independent Oracle gate acceptance, authenticated TopoFix
native action/transaction provenance and actual CAESAR II import/model
topology verification remain NOT_RUN in this lane. This CLOSURE R3
does not grant release, patch PSI116, or authorise merge.
