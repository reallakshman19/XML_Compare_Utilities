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
2. Scan physical direct-child PIPINGELEMENT records using the unchanged
   `UxmlInputXmlSourceStructure.js` scanner. Require exact case-sensitive
   `FROM_NODE`, `TO_NODE` and `DELTA_X/Y/Z` spellings; refuse missing fields
   and case-folded duplicates **before** calling the existing solver. Keep
   source-field/v1 exact numeric node identity and physical record ordinals.
3. Preflight all original DELTAs: only a value whose numeric representation is
   **exactly -1.0101** is the CAESAR zero/unset sentinel. Any *other* value
   inside the shared solver's 1e-5 sentinel window is `DELTA_INVALID`.
   Call unchanged `solveCaesarInputXmlRuns` after sorting original records
   by a canonical node/attribute key (preserving original indices and refs).
   This makes the chosen spanning graph independent of physical element order.
   Mapping is still CAESAR to hub `(X,-Z,Y)`; 0.001 mm is unchanged.
4. Require both distinct node identities to exist in **one connected run**.
   Record all original endpoint occurrences with their physical recordKey,
   endpoint, relative hub-frame coordinate and run. For each original edge
   `e=(u,v)`, compute `r_e = ||(p_v-p_u) - delta_e||`, where `p` is the
   shared solver's node potential and `delta_e` is the source DELTA in hub
   axes. Sum `R = sum_e r_e` over the same run; refuse `DELTA_PATH_CONFLICT`
   if `R > 0.001 mm`. This conservative sum bounds the *cumulative*
   displacement error of any path, including paths with multiple small loops.
5. For a candidate `a,b`, the triangle inequality bounds **every path**
   between them by `||p_b-p_a|| + R`. Return `PROVEN_COINCIDENT` **only if
   that combined bound is <= 0.001 mm**; otherwise `NOT_COINCIDENT` with
   the measured relative 3D distance and bound. A node's repeated endpoint
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
Eleven delete-one-guard clones test ALL_PATH, SAME_RUN, TOLERANCE, SHA,
STACKED, CASE_DUPLICATE, CASE_REQUIRED, SENTINEL, NULL_INPUT, BOUNDARY
and NODE_ID: each unchanged probe GREEN -> one guard deletion RED on
the identical input. Both source orderings and all six permutations of
the stacked-tolerance case must be `NOT_COINCIDENT`.
Real GRE 500→510 must be NOT_COINCIDENT at approximately 225 mm; synthesized
10→40 is PROVEN; forged side-file remains non-authoritative.

B3 does not produce patches, byte ledgers, selected actions or Apply authority.
Native CAESAR import and private Owner files remain NOT_RUN. Existing PR #258
stays draft and untouched; Owner alone may approve a future writer integration.
