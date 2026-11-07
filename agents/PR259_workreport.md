# PR259 work report — lane B B3 same-run proof (read-only)

**Owner mission:** 7 Nov 2026 Q41, new draft PR from #258 exact head
`c4e3e1efc09b129f13c03311b099c1b87ee88205`; no merge,
no writer-policy change, no side coordinate authority. Native issue #239.
**State:** DRAFT / review-only / `CONTINUE` scoped B3; existing writer
and upstream TopoFix native transaction remain under RELEASE HOLD.
**PR:** #259, stacked on #258 branch, not main. Owner-only merge.
**Agent:** coder-b8. **Source:** Drive Handoffs/LANE-B-B3/STEP-B3-SAMERUN-B8.md,
declared size 2693 B, declared SHA-256
`a5cedef1d5e9648db03d68d98084d8d7fa5fad111501b836cd27ecbf410abcda`;
Drive content inspected. Protected/private Owner geometry NOT_RUN.

## Recovery-first source trace / Appendix A (evidence, not a scored approval)

| Area | Actual code / observation | Gate |
|---|---|---|
| A1 production trace | `uxml/UxmlInputXmlSourceStructure.js` physical direct-child scan; `uxml/UxmlInputXmlSourceFields.js` numeric IDs; `uxml/UxmlInputXmlDeltaGraph.js` same-run solve and 0.001-mm closure | Read-only source chain grounded |
| A2 failure isolation | PR #258's `UxmlEditOpsInvariants.js` requires literal FROM/TO XYZ; real GRE has none and correctly refuses DELTA-only alias | Writer untouched |
| A3 authority / invariants | Q41 permits relative same-run proof; no cross-run join, side-file authority, source reconstruction, writer or tolerance change | B3 module returns evidence only |
| A4 independent validation | Synthetic closed geometry positive, public GRE original 500→510 negative ~225 mm, forged side negative, cross-run refusal; four focused delete-one mutants GREEN→RED | Initial B3: 15/16 behavior + 4/4 mutants; single GRE residual test assertion fixed in follow-on |
| A5 minimal patch | New read-only module, fixture/probe/behavior/mutation tests, B3 doc; existing step12 test registers new tests behind file-existence guard for isolated old clones | No workflow file touched |

## File-level change ledger / selective undo

| Module | Path | Preimage / intent | Undo |
|---|---|---|---|
| Read-only geometry | `uxml/UxmlInputXmlSameRunCoincidence.js` | NEW; input SHA, original scanner, DeltaGraph, conservative loop residual and endpoint source provenance | Delete only if unchanged |
| B3 fixtures | `tests/uxml-edit-ops-b3-fixtures.mjs` | NEW; isolated synthetic original exports | Delete only if unchanged |
| B3 behavior | `tests/uxml-edit-ops-b3-samerun.test.mjs` | NEW; GRE + synthetic + failure cases | Delete only if unchanged |
| B3 mutant oracle | `tests/uxml-edit-ops-b3-probe.mjs` | NEW; independent focused expected status | Delete only if unchanged |
| B3 mutations | `tests/uxml-edit-ops-b3-mutants.test.mjs` | NEW; clones remove exactly one guard; original GREEN/mutant RED | Delete only if unchanged |
| CI registration | `tests/uxml-edit-ops-step12.test.mjs` | Original blob `a24df240ec7ffdf5a7fc60f7b555c192c2e38f12`; add `existsSync` and guarded B3 dynamic imports | Restore original import and remove B3 registration only |
| Proof doc | `docs/uxml-edit-ops-stepB3.md` | NEW; same-run proof limitations and names | Delete only if unchanged |
| Handover | `agents/PR259_workreport.md` | NEW; recovery and no-merge controls | Delete only if unchanged |

No edits to `UxmlEditOpsPatchBack.js`, `UxmlEditOpsInvariants.js`,
`UxmlEditOpsIndependentVerifier.js`, `UxmlInputXmlDeltaGraph.js`,
tolerance, S3 reader, CLOS, policy or production workflows.
No private data placed in PR. Separate local no-index patch ledger was
NOT_AVAILABLE in the connector-only environment; source preimages and
exact commit/PR diff are preserved by GitHub for selective rollback.

## B3-R1 takeover / repair (Owner Q46, 7 Nov 2026)

**Authorized handoff:** Drive
`Handoffs/LANE-B-B3-R1/STEP-B3-R1-B8.md`, source metadata 3420 B,
declared SHA256 `cec9ff30cfb7d865974c9be9ce47bb5c385112a2338a0ed34895942ba06cbda9`.
Starting exact PR259 head `cf16ad600fd074a7f0e5c05864610ac525fb5719`;
PR258 dependency remains draft. B3-R1 blocks unsafe read-only coincidence
proof; no writer, shared DeltaGraph, tolerance or workflows changed.

| Qualification | Source-grounded finding / fix |
|---|---|
| A1 / A2 | `UxmlInputXmlSameRunCoincidence.js` computed independent path residual and pair distance checks; `UxmlInputXmlDeltaGraph.js` case-folded DELTA and interpreted a 1e-5 sentinel window. Three crafted unsafe accepts reproduced by Owner/Oracle. |
| A3 | Exact original row fields, same connected run, conservative all-simple-path distance bound and 0.001-mm tolerance; no source mutation or Apply |
| A4 | New tests pin order permutations, case-fold duplicates/lowercase-only, near-sentinel, null inputs, exact 0.001 and bad node ids. Eleven guard deletion probes must each be GREEN→RED |
| A5 | Change isolated proof module and its tests/docs only; no change to shared solver/writer |

**Repair rationale:** Canonical-sort original row references for
order-independent graph potentials while retaining original record ordinals.
Preflight required case-sensitive node/DELTA keys; treat only
`Number(raw) === -1.0101` as sentinel and refuse adjacent numeric values
inside the shared solver's window. Let `R=sum_e ||(p_v-p_u)-d_e||`;
prove only when `distance(p_absorbed,p_owner) + R <= 0.001 mm`.
This bounds each simple-path deviation by the triangle inequality.
Drop vacuous endpoint-pair guard: both endpoints derive from the *same*
solved node map. Original endpoint refs remain available for audit.

**Forward repair change ledger**, each original preimage available via
GitHub immutable blob in starting head:

| File | Starting blob / action | Selective undo |
|---|---|---|
| `uxml/UxmlInputXmlSameRunCoincidence.js` | `94dfd064ce6b9eb17e3689ea7dcde1924f6a9a4d` — preflight, canonical solve, combined bound, input guard, remove vacuous endpoint check | Restore only that blob if unchanged |
| `tests/uxml-edit-ops-b3-samerun.test.mjs` | `9443a9d71b263741d2c7cfc00e5f8084aa936cd6` — 11 focused repair tests | Restore only that blob if unchanged |
| `tests/uxml-edit-ops-b3-mutants.test.mjs` | `e38be5717f8551ca1b58e7532ac8fd2f9c944381` — 7 more single-guard deletions | Restore only that blob if unchanged |
| `tests/uxml-edit-ops-b3-probe.mjs` | `208b08d25d2484ed2c6e5a83f89df7c0c106dc10` — independent focused expected results | Restore only that blob if unchanged |
| `docs/uxml-edit-ops-stepB3.md` | `4b0c33c2006165215f0177d4934871204f1c5b6b` — precise proof chain/refusals | Restore only that blob if unchanged |
| `agents/PR259_workreport.md` | `4821710c65855d8738efb9022af5ad704a1ca31c` — recovery report | Restore only that blob if unchanged |

**Verified B3-R1 head `40197c6a94c40c7e11edb0f1edfbd826d9144ad4`:**
Step12 130/130 GREEN (27 B3 behavioral + 11 isolated guard mutants);
GitHub Actions 9/9 observable workflows SUCCESS. Oracle separately
reported CI 13/13 GREEN. These are R1-base observations, not a substitute
for the R2 exact-head CI gate.
**Highest risk:** upstream legacy solver has its own case-fold and widened
sentinel acceptance; B3 compensates **without** changing that shared
implementation. PR258 original-literal geometry guard still blocks
DELTA-only writer calls; broader upstream audit is outside scope.

**R1 exact-head receipt:** issue #239, comment 6700734463.
**EXACT_NEXT_ACTION:** Validate B3-R2 successor head, ensure the new
XML-whitespace cases and mutants are GREEN, check inherited workflows,
then record the R2 result on #239; STOP and leave draft.


## CI and risk

- First candidate `44643cb47973cc38d3b55b7150ab83a1d95aed91`:
  edit-ops workflow `42322887282` **FAIL 111/112** on an overly exact GRE
  test expectation (computed path residual 5.832e-9 mm instead of 0).
  Behavior / mutant outcomes correct: all 4 guard mutants passed.
- Follow-on repairs only that test assertion using a strict `<1e-6 mm`
  numerical roundoff check; docs formatting is mechanical. Final exact-head
  CI results must be recorded separately on issue #239 when observed.
- **Highest risk:** output is relative graph evidence, not engineering
  authorisation; cumulative loop-residual bound is conservative and can
  refuse safe inputs. Never weaken tolerance or silently join two runs.
- **Collision verdict:** COORDINATION_REQUIRED (semantic stacking on active
  #258), no exact writer-file edit and no independent writer authorisation.
- **EXACT_NEXT_ACTION:** inspect new #259 head Actions for Step12/B3 and
  inherited regressions; record exact green/red receipts on #239. STOP;
  wait for Owner/Oracle review before any B3 writer integration.

## B3-R2 whitespace repair and evidence hygiene (Owner Q48, 7 Nov 2026)

**Card:** Drive `Handoffs/LANE-B-B3-R2/STEP-B3-R2-B8.md`, advertised 2909 B,
SHA-256 `0787a30baecde86e3903feb7e85dac13c27d649e9ad5ea4311ab8a5818a16d50`.
Grounded PR259 R1 parent `40197c6a94c40c7e11edb0f1edfbd826d9144ad4`.

**W1 invariant:** B3 admits raw XML attribute padding only from XML 1.0
`#x20,#x9,#xA,#xD`. The legacy `String.trim()` also removes Unicode
NBSP/EM SPACE/BOM and must not be authoritative. Required DELTA source
values are checked against the original XML-only numeric grammar;
FROM_NODE/TO_NODE values are XML-entity-decoded then validated against
the XML-only numeric node grammar before unchanged source-field/v1
identity canonicalization. Illegal whitespace refuses `DELTA_INVALID`
or `NODE_ID_INVALID`. ASCII/XML padding and legal numeric node entities
stay supported. Two independent guard deletions must turn GREEN→RED.

**W2 evidence:** Drop redundant `maxWitnessDistanceMm` (it equaled
`distanceMm`), preserve actual `distanceMm` and `pathBoundMm`.
Document that case-folded absolute anchors in the **unchanged** solver
can only translate a consistent connected run, leaving relative node
distance invariant; B3 assumes exactly -1.0101 as CAESAR sentinel and
order-independent DELTA geometry. No new writer or Apply authority.

| Module | R1 preimage blob | W1/W2 repair | Selective undo |
|---|---|---|---|
| `uxml/UxmlInputXmlSameRunCoincidence.js` | `7a28f9d475955ca65ba4f0d2f898cf44345b0d4b` | XML whitespace source admission, remove redundant output | Restore immutable preimage only if unchanged |
| `tests/uxml-edit-ops-b3-samerun.test.mjs` | `3e44b53890457e877d14554db5e55f449dccd708` | Unicode regressions, XML padding positives, output shape | Restore preimage if unchanged |
| `tests/uxml-edit-ops-b3-probe.mjs` | `8b6aa135611d2d052d8bf91dc04b32cf9435187c` | W1 delta and node independent probes | Restore preimage if unchanged |
| `tests/uxml-edit-ops-b3-mutants.test.mjs` | `b9e376cdfe9a9388f7a1cca65fbc84970a157dd5` | Two more delete-one-guard mutants | Restore preimage if unchanged |
| `docs/uxml-edit-ops-stepB3.md` | `a91436cb4cdbe29f174f58e87dc362f70546bbf9` | Sentinel/order/anchor qualification, output shape, whitespace | Restore preimage if unchanged |
| `agents/PR259_workreport.md` | `1969c710d96e9e89be2eb80024eab76df5c02875` | Correct R1 CI, authority handoff, remove vacuous witness text | Restore preimage if unchanged |

**Collision verdict:** COORDINATION_REQUIRED (stacked PR259 on draft
PR258); exact shared solver/scanner, writer, tolerance and workflow
mutations are expressly prohibited and remain unchanged.

**EXACT_NEXT_ACTION:** Observe R2 exact-head B3-inclusive edit-ops CI
and 13 guard mutants, record all workflow outcomes on issue #239;
STOP and retain PR259 draft for Owner-only merge authorization.
