# Lane B B3 — original InputXML same-run coincidence (READ-ONLY)

Status: **DRAFT / PROOF ONLY**. Stacked on PR #258 at
`c4e3e1efc09b129f13c03311b099c1b87ee88205`.
Owner/Oracle card Q41 (7 Nov) authorizes one new isolated B3 proof PR.
No Step 1.2 alias writer, planner, verifier, numeric registry, 0.001 mm
tolerance, TopoFix transaction authority, or CAESAR II writer is changed.

## Proof chain and limitations

1. Accept a Uint8Array snapshot of **original** CAESAR II InputXML, not a
   derived/enriched/categorized file. Fatal UTF-8 decoding and exact re-encoding
   preserve the bytes. Measure SHA-256 and compare with required caller SHA;
   mismatch refuses before any geometry admission.
2. **Length-unit gate, before graph authority:** require exactly one actual
   `PIPINGMODEL/UNITS/LENGTH` element in the original XML with
   `LABEL="mm."` and `Number(FACTOR)===25.4` (CAESAR `25.400000`).
   Refuse missing, duplicate, non-mm, malformed, or misplaced declarations
   as `INPUT_XML_ALIAS_LENGTH_UNIT_UNPROVEN`. No unit conversion or inferred
   default: the unchanged 0.001 mm tolerance is meaningful only on admitted
   mm InputXML.
3. Scan physical direct-child PIPINGELEMENT records using the unchanged
   `UxmlInputXmlSourceStructure.js` scanner. Require exact case-sensitive
   `FROM_NODE`, `TO_NODE` and `DELTA_X/Y/Z` spellings; refuse missing fields
   and case-folded duplicates **before** calling the existing solver. Keep
   source-field/v1 exact numeric node identity and physical record ordinals.
   Before shared `trim()` or number conversion, accept padding on raw
   `FROM_NODE`, `TO_NODE`, `DELTA_X/Y/Z` values using only XML 1.0
   whitespace: #x20 (space), #x9 (tab), #xA (LF), #xD (CR).
   Unicode NBSP, EM SPACE, FEFF, etc. are **not** XML padding:
   invalid raw node values refuse `NODE_ID_INVALID`, invalid DELTAs
   refuse `DELTA_INVALID` (including decoded character references).
4. Preflight all original DELTAs: only a value whose numeric representation is
   **exactly -1.0101** is the CAESAR zero/unset sentinel. Any *other* value
   inside the shared solver's 1e-5 sentinel window is `DELTA_INVALID`.
   Call unchanged `solveCaesarInputXmlRuns` after sorting original records
   by a canonical node/attribute key (preserving original indices and refs).
   This makes the chosen spanning graph independent of physical element order.
   B3 explicitly assumes CAESAR's unset sentinel means **exactly -1.0101**
   numerically, and that **straight-node** geometry is the consistent
   original DELTA graph regardless of element order. A `BEND` element's
   DELTAs terminate at the tangent intersection rather than its far-weld
   `TO_NODE`, and `BEND NODE1/2/3` are curvature nodes. B3 refuses
   either requested node if it is a bend TO or curvature node, anywhere
   in the original source, with `INPUT_XML_ALIAS_BEND_NODE_UNPROVEN`;
   no bend geometry is inferred in this slice. The shared solver still case-folds
   `FROM_X/Y/Z` and `TO_X/Y/Z` absolute anchors. On a consistent connected
   run, those anchors only translate the solved node positions together:
   relative distances and edge residuals cannot change; inconsistent anchors
   can refuse. Mapping is still CAESAR to hub `(X,-Z,Y)`; 0.001 mm is unchanged.
5. Require both distinct node identities to exist in **one connected run**.
   Record all original endpoint occurrences with their physical recordKey,
   endpoint, relative hub-frame coordinate and run. For each original edge
   `e=(u,v)`, compute `r_e = ||(p_v-p_u) - delta_e||`, where `p` is the
   shared solver's node potential and `delta_e` is the source DELTA in hub
   axes. Sum `R = sum_e r_e` over the same run; refuse `DELTA_PATH_CONFLICT`
   if `R > 0.001 mm`. This conservative sum bounds the *cumulative*
   displacement error of any path, including paths with multiple small loops.
6. For a candidate `a,b`, the triangle inequality bounds **every path**
   between them by `||p_b-p_a|| + R`. Return `PROVEN_COINCIDENT` **only if
   that combined bound is <= 0.001 mm**; otherwise `NOT_COINCIDENT` with
   the measured relative 3D `distanceMm` and `pathBoundMm`, without a
   misleading `maxWitnessDistanceMm` alias. A node's repeated endpoint
   positions are projections of the same solved node potential, **not
   independent witnesses**; there is no separate endpoint-pair check.
   RecordKey/endpoint lists are provenance, and source edge residuals are
   the actual independent geometry checks. Cross-run joins remain unproven.

## Invariants / refusal codes

| B3 guard | Result |
|---|---|
| Original measured SHA | INPUT_XML_ALIAS_ORIGINAL_SHA_REQUIRED / _MISMATCH |
| Byte, structural, node identity | INPUT_XML_ALIAS_ORIGINAL_BYTES_INVALID / _SOURCE_REFUSED / _NODE_ID_INVALID |
| Node missing / same number | INPUT_XML_ALIAS_NODE_ABSENT / _DISTINCT_NODES_REQUIRED |
| Different original runs | INPUT_XML_ALIAS_CROSS_RUN_UNPROVEN |
| Missing, duplicate, misplaced or non-mm model length unit | INPUT_XML_ALIAS_LENGTH_UNIT_UNPROVEN |
| Bend TO node or BEND NODE1/2/3 in original source | INPUT_XML_ALIAS_BEND_NODE_UNPROVEN |
| Missing, nonfinite or invalid DELTA | INPUT_XML_ALIAS_DELTA_MISSING / _NONFINITE / _INVALID |
| Cumulative path contradiction / original field case ambiguity | INPUT_XML_ALIAS_DELTA_PATH_CONFLICT / _SOURCE_ATTRIBUTE_CASE_AMBIGUOUS |

No companion is admitted or required by B3. Extra supplied side-file objects
are intentionally unused; they cannot override the original DELTA graph.
If companions are ever introduced, separate MISSING / STALE / MODEL_UNBOUND
SHA and model checks must be designed and pinned before any authority.
Do not apply the B3 proof to PR #258's writer in this slice: it **still refuses**
unanchored DELTA-only alias requests as
`INPUT_XML_ALIAS_COORDINATE_UNPROVEN`.

## Tests, mutants, and authority

`node --test tests/uxml-edit-ops-b3-samerun.test.mjs
tests/uxml-edit-ops-b3-mutants.test.mjs`.
Seventeen delete-one-guard clones test ALL_PATH, SAME_RUN, TOLERANCE, SHA,
STACKED, CASE_DUPLICATE, CASE_REQUIRED, SENTINEL, NULL_INPUT, BOUNDARY,
NODE_ID, W1_XML_SPACE_DELTA, W1_XML_SPACE_NODE, U1_MM_LENGTH_UNIT,
V1_BEND, V2_UNITS_PLACEMENT and V2_UNITS_LABEL: each unchanged probe
GREEN -> one guard deletion RED on identical input. Both source orderings
and all six permutations of the stacked-tolerance case must be
`NOT_COINCIDENT`. XML-only whitespace padding stays accepted; U+00A0,
U+2003 and U+FEFF in original node/DELTA values all refuse by name.
Real GRE 500→510 must be NOT_COINCIDENT at approximately 225 mm; GRE
bend `TO_NODE=1500` and curvature `NODE1=1499`/`NODE2=1498` refuse.
Straight synthetic 10→40 is PROVEN despite an unrelated bend; forged
side-file remains non-authoritative. Unit regressions include genuine
model-level mm, non-mm, absent, duplicate, **nested-only mm UNITS** and
**`LABEL="in."` with `FACTOR=25.4`**, all with named admission outcomes.

B3 does not produce patches, byte ledgers, selected actions or Apply authority.
Native CAESAR import and private Owner files remain NOT_RUN. Existing PR #258
stays draft and untouched; Owner alone may approve a future writer integration.
