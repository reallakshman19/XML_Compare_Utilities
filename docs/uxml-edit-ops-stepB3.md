# Lane B B3 — original InputXML same-run coincidence (READ-ONLY)

Status: **DRAFT / PROOF ONLY**. Stacked on PR #258 at
\`c4e3e1efc09b129f13c03311b099c1b87ee88205\`.
Owner/Oracle card Q41 (7 Nov) authorizes one new isolated B3 proof PR.
No Step 1.2 alias writer, planner, verifier, numeric registry, 0.001 mm
tolerance, TopoFix transaction authority, or CAESAR II writer is changed.

## Proof chain and limitations

1. Accept a Uint8Array snapshot of **original** CAESAR II InputXML, not a
   derived/enriched/categorized file. Fatal UTF-8 decoding and exact re-encoding
   preserve the bytes. Measure SHA-256 and compare with required caller SHA;
   mismatch refuses before any geometry admission.
2. Scan physical direct-child PIPINGELEMENT records using the unchanged
   \`UxmlInputXmlSourceStructure.js\` scanner; read FROM_NODE, TO_NODE using
   source-field/v1 exact numeric identity. Record physical ordinal and source
   field paths. Missing/ambiguous source records refuse.
3. Call unchanged \`solveCaesarInputXmlRuns\` on original attributes and signed
   DELTA_X/Y/Z (CAESAR -1.010100 sentinel, hub X/-Z/Y mapping). It checks
   path closure against the **unchanged 0.001 mm** tolerance.
4. Require both distinct node identities to exist in one **same connected run**.
   For every original endpoint occurrence, retain the node, element recordKey,
   endpoint, hub-frame position and run. Sum all individual edge-closure
   residual magnitudes for that run; refuse if the sum exceeds 0.001 mm.
   This is a deliberately conservative bound on alternative simple-path
   displacement, including paths combining multiple small loop errors.
5. Require each node's endpoint witnesses to agree pairwise, then compare
   every absorbed/canonical endpoint witness pair at 0.001 mm. Return
   PROVEN_COINCIDENT or NOT_COINCIDENT with actual 3D distance and source
   evidence, or REFUSED with a named code. Coordinates are **relative only**:
   origin is arbitrary and does not authorize a cross-run join.

## Invariants / refusal codes

| B3 guard | Result |
|---|---|
| Original measured SHA | INPUT_XML_ALIAS_ORIGINAL_SHA_REQUIRED / _MISMATCH |
| Byte, structural, node identity | INPUT_XML_ALIAS_ORIGINAL_BYTES_INVALID / _SOURCE_REFUSED / _NODE_ID_INVALID |
| Node missing / same number | INPUT_XML_ALIAS_NODE_ABSENT / _DISTINCT_NODES_REQUIRED |
| Different original runs | INPUT_XML_ALIAS_CROSS_RUN_UNPROVEN |
| Missing, nonfinite or invalid DELTA | INPUT_XML_ALIAS_DELTA_MISSING / _NONFINITE / _INVALID |
| Path or endpoint contradiction | INPUT_XML_ALIAS_DELTA_PATH_CONFLICT / _ENDPOINT_WITNESS_CONFLICT |

No companion is admitted or required by B3. Extra supplied side-file objects
are intentionally unused; they cannot override the original DELTA graph.
If companions are ever introduced, separate MISSING / STALE / MODEL_UNBOUND
SHA and model checks must be designed and pinned before any authority.
Do not apply the B3 proof to PR #258's writer in this slice: it **still refuses**
unanchored DELTA-only alias requests as
\`INPUT_XML_ALIAS_COORDINATE_UNPROVEN\`.

## Tests, mutants, and authority

\`node --test tests/uxml-edit-ops-b3-samerun.test.mjs
tests/uxml-edit-ops-b3-mutants.test.mjs\`.
Four delete-one-guard clones test ALL_PATH, SAME_RUN, TOLERANCE, SHA:
unchanged probe GREEN -> a single guard deletion RED on the same seed.
Real GRE 500→510 must be NOT_COINCIDENT at approximately 225 mm; synthesized
10→40 is PROVEN; forged side-file remains non-authoritative.

B3 does not produce patches, byte ledgers, selected actions or Apply authority.
Native CAESAR import and private Owner files remain NOT_RUN. Existing PR #258
stays draft and untouched; Owner alone may approve a future writer integration.
