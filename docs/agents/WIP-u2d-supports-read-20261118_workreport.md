# Supports from CAESAR II, step 1: read the supports and confirm a clean baseline (18 Nov 2026)

**Owner's words (18 Nov):**
- "Supports from CAESAR II: restraints added, removed or edited in CAESAR II come back onto existing nodes. The smallest useful step; supports on new nodes are refused, with a plain reason."
- "Yes, start step 1".

The plan is in `topofix-agents/roadmap/UXML-SUPPORTS-FROM-CII-PLAN.md`.

## What changed

**`prototypes/u2d-cii-source/u2d_supports.py` (new):** reads the CII's RESTRANT records and compares them with the XML's `<Restraint>` entries on the matcher's node pairs. It is read-only: nothing is transferred yet. It follows these rules from step 10's writer:
- A CII point takes the supports of every XML record paired to it, with no repeats. This mirrors step 10's `_merge_restraint_specs`.
- Step 10's own open-end anchors (type 1, stiffness 9.41952E+19) are counted apart and never treated as "added".
- XML types are turned into CAESAR II codes as step 10 does it. A test checks the table against the writer.
- A negative XML friction (BM2's guides carry -1.0101) counts as 0.
- Direction is compared only where the XML gives direction cosines.
- Step 10 skips nodes numbered 0 or less, together with their supports, so those supports are listed as "not written by step 10".
- Every refusal has a plain reason:
  - a node the XML does not have;
  - a point with several nodes (from the matcher's ambiguities);
  - an XML support with no CII node at its point;
  - an XML support that step 10 does not write.

**`u2d_plan.py`:** `plan()` adds `summary.supports` (counts only). Edits and refusals are unchanged, so the receipt's changes are unchanged.

**Review page, section 5:** the transfer line gains "Supports (read only, not transferred yet): …".

**`scripts/pin-u2d-py.mjs` and `u2d-py-pin.json`:** `u2d_supports.py` is pinned, which makes 11 files.

**Tests:** `prototypes/u2d-cii-source/tests/test_u2d_supports.py`, 8 tests:
- no edits gives no changes;
- an edited stiffness;
- a removed support;
- an added support;
- a support on a new node, refused in plain words;
- the plan summary;
- negative friction;
- the type codes against step 10's writer.

## Checked

**Baseline with no edits (support changes found):**

| Model and files | Points the same | Changes | Step 10's own anchors | Not compared |
|---|---|---|---|---|
| EF-05: step 10's Enriched XML + step 10's CII | 162 | **0** | 30 | 11 supports step 10 does not write |
| BM2: step 10's Enriched XML + step 10's CII (step 10 run in the browser today) | 32 | **0** | 3 | 27 at points with several nodes, 2 with no CII node |
| BM2 sample: base.xml + the older BM2.cii | 32 | **0** | 6 | the same 27 + 2 |
| RMS-BLOW-1 (the existing end-to-end test) | 14 | **0** | 4 | none |

**Tests:**
- Python, `prototypes/u2d-cii-source/tests`: 26 of 26 pass, with `U3B_3DC` set to the 3D_Converters worktree.
- Node, with Pyodide: in-app 3/3, EF-05 sample 5/5 and locks 7/7, all passing. The BM2 receipt still equals the command line's.
- Full Node suite (`tests/*.test.mjs`, with Pyodide): 2015 tests, 1946 passed and 67 failed. Main 84d49ee6 gives the same 67, in the same tests (the revision-compare, sequential-edit and topology-scoped-edit files). This branch adds no failure.

**Browser (local server, review page):**
- EF-05 sample: 41 values transferred, as before. The supports line reads: 162 the same, 0 changed, 30 open-end anchors, 11 not written by step 10.
- BM2 sample: 10 values, as before. The supports line reads: 32 the same, 0 changed, 6 anchors, 27 at points with several nodes, 2 with no CII node.

## Findings for the Owner (not changed)

1. **Step 10 drops 11 supports on EF-05.** The supports step puts a support on 11 ATTA nodes numbered -2. Step 10's CII writer skips every node numbered 0 or less (`xml_to_cii2019.py`, `_parse_xml_document`), so these 11 supports are not in step 10's CAESAR II file. Examples are the ATTA at node 910's point and the one at node 1500's.
2. **On BM2, 13 CII support points sit where several nodes share a point** (for example CII nodes 10 and 40 together). The matcher does not pair these, so 27 supports cannot be compared yet. Pairing by node number inside such a point would be a later step.
3. **The default 3D_Converters path for the Python tests** (`../wt-modeb-isolation`) was moved to `D:\t` in today's cleanup. Set `U3B_3DC`.
