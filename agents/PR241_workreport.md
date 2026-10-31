# PR241 — TOPO-B B2 recovery-first work report

Status: **DRAFT / PARTIAL / INDEPENDENT REVIEW AND BROWSER ACCEPTANCE HOLD**

## Identity and custody
- Actor: GPT-6, acting as `coder-b` for activated standalone TopoFix Cycle revision 1, assignment `TOPO-B-B2`, generation 1. Chat id8: **UNKNOWN**; this is a role declaration, not authenticated identity continuity with Agent B's earlier conversation.
- Canonical assignment: [Common CURRENT.json](https://github.com/reallakshman19/Common/blob/main/oracle-cycles/topofix/CURRENT.json) and [B2 brief](https://github.com/reallakshman19/Common/blob/main/oracle-cycles/topofix/TOPO-B-B2.md).
- Native issue: [#239](https://github.com/reallakshman19/XML_Compare_Utilities/issues/239). First ACK: [#6542125840](https://github.com/reallakshman19/XML_Compare_Utilities/issues/239#issuecomment-6542125840).
- Predecessor: draft [PR #240](https://github.com/reallakshman19/XML_Compare_Utilities/pull/240) `feat/topo-b-format-admission@a3ad4dd328739f4180f75acc8d431e2b3d77f5d3`, independently qualified only for its earlier B1 scope (93/100); **B2 itself has not been independently qualified**.
- This PR: [#241](https://github.com/reallakshman19/XML_Compare_Utilities/pull/241), branch `feat/topo-b-b2-workspace-admission-20261031`, stacked on PR #240's branch. No merge authorized.

## Purpose, production trace and minimal changes
The strict read-only F05/R4 `admitXmlBytes` entry point in `prototypes/ciifr-map/xml-format-admission.js` was not connected to the InputXML Workspace. Ordinary Workspace paths can misclassify F05 as conventional InputXML. B2 provides a separate admission and evidence preview without changing those existing paths.

1. `prototypes/ciifr-map/xml-format-admission.js` — source-visible `'\\uFEFF'` BOM guard; same semantics.
2. `prototypes/ciifr-map/tests/format-admission.test.mjs` — a partial `CAESARII` F05 DOM with nested `parsererror` must be INVALID.
3. `tabs/inputxml-workspace/inputxml-workspace-tab.js` — add independent `Misc → Topo` source uploader with measured `File.arrayBuffer` bytes; lazy `admitXmlBytes` call; read-only banner; source epoch invalidation before asynchronous work and stale/closed-dialog result rejection. No existing CleanXML, 5C, enrichment, categorized or 5B routing logic changed.
4. New `tabs/inputxml-workspace/inputxml-workspace-topo-admission.js` — pure fail-closed renderer/gate; status, source identity/counts/coordinate-frame, short SHA-256 and preview of at most 8 source elements. Preview is never a physical or engineering-approved connection.
5. New `tests/inputxml-workspace-topo-admission.test.mjs` — six acceptance/negative test groups.
6. This report. No `xml-profiles.js`, `xml-graph.js`, Workbench3D, TopoFix, CII Writer/Weight/Final or private original changed.

No product implementation elsewhere, no CII source mutation or automatic join. GLRD remains UNSUPPORTED. RichInput is not routed through 5C.

## Exact self-test evidence
**EXECUTED_HERE, local isolated mirror (Node 22.16.0):**
```sh
node --test tests/inputxml-workspace-topo-admission.test.mjs
# tests 6, pass 6, fail 0
```
Both locally executed new files were shown identical to committed Git blobs via `git hash-object`:
- View helper: `e081c3ff0f98782b705696d0f71af456fe28085f`
- Unit tests: `1ea7299c733043a751c347696918817669357c80`

**Deliberate-failure proof, EXECUTED_HERE:** temporarily replace the unknown-root banner label `Not supported` with `Admitted`. Local command exited 1: **5 pass / 1 fail** (specifically unknown root / GLRD refusal test). Reverted and reran: **6/6 PASS**. File SHA-256 before/after restore: `6f6a2a7bcf9b42bc46f20e9a82d0de68e06baf2cc3eca7f81bdb68a0e80c568b`. The deliberate mutation was never committed.

**Observed GitHub Actions:** ISO Composite Identity Qualification [run #41192584947](https://github.com/reallakshman19/XML_Compare_Utilities/actions/runs/41192584947) on initial PR241 head `4dbed88bc81fe15a20ce6204aca086c27a641898` succeeded; its existing Node/table and ISO browser jobs do **not** constitute a real B2 F05/unknown upload trial.

**NOT_RUN:** repo-wide CIIFR 0.9.8 native test command at PR241 head; full Workspace Chrome upload of real public F05 and synthetic unknown; product `DOMParser` acceptance via browser; two required original-flow screenshots; Owner-private F05/R4/GLRD. An attempted local Chromium rendering check was blocked by host browser policy (`ERR_BLOCKED_BY_ADMINISTRATOR` even on localhost). Do not substitute synthetic component screenshot or the unrelated ISO workflow for product acceptance.

## Appendix A / independent qualification boundary
- **A1 trace:** confirmed B1 `admitXmlBytes` routes through existing `extractXmlProfile` / `buildXmlGraph`; B2 requires actual bytes.
- **A2 failure:** pre-B2 Workspace had no mounted fail-closed F05/R4 admission banner; F05 can resemble InputXML to the generic detector.
- **A3 authority:** raw input bytes preserved; source digest measured; rejected input cannot preview; no writer/Apply; stale result is discarded; no GLRD.
- **A4 evidence:** prior PR240 93/100 is scoped to B1, **not** independent approval of PR241. New isolated 6/6, deliberate-failure 5/6, existing unrelated CI success. Browser/real-fixture gate OPEN.
- **A5 smallest patch:** dedicated Topo subtab intake and five scoped production/test files; avoid refactoring existing conversion paths.

Verdict: **AUTHOR_SELF_TEST_PARTIAL / A4 B2 INDEPENDENT_REVIEW_NOT_RUN / ENGINEERING_HOLD**.

## Highest risks and exact next action
- The new intake is under **Workspace → Misc → Topo**; pre-existing Enrichment file upload remains its original pipeline and does not itself show a B2 banner. Do not treat either path as an engineering-approved topology fix.
- **EXACT_NEXT_ACTION:** On an eligible real-browser checkout of exact PR241 head, upload the *public pinned S1 F05 fixture* via **Misc → Topo** and verify `Admitted · F05 v1.1 · 56 elements / 57 nodes · absolute`, measured digest and source evidence. Replace with synthetic `<Plant><Pipe/></Plant>` and verify `Not supported`, reason, no graph; capture both screenshots. Exercise the actual browser DOMParser partial-F05 `parsererror`; run full CIIFR tests with xmldom 0.9.8 and compare known baseline failures. Then independent non-author reviewer qualifies actual changed PR head against A1–A5.
- Return to Oracle via **issue #239** only. **NO MERGE / NO RELEASE**.

## Recovery state
The final product-code/test commit before this report refresh was `e2e842fc9ff9f06dd8d7574845dbceae96fe026d`; report updates do not change product bytes. Recheck current branch/PR and original base before taking over.
