# PR182 recovery-first workreport — CIIFR_GEO G2 source-only contribution
**Task:** `CIIFR-GEO-C-G2-TOPOLOGY-BOOLEAN-1`, WBS3.2/M14. **Contributor:** the coordinating Oracle explicitly asked by Owner to create framework **and** coding contribution; different performer identity not claimed. **Authority:** bounded SOURCE_ONLY, `SELF_ASSESSED`; no writer, geometry identity acceptance, UI merge or Cycle assignment. [Native WBS #177](https://github.com/reallakshman19/XML_Compare_Utilities/issues/177).

## Mission, basis and current source
**User outcome:** compare topology candidates without anchors, display all alternatives, then inspect Manual=A∪C / Topology=T / OR / AND and conflicts. Output is for downstream PR181 ledger/UI and future G3/G4. Source basis: XCU main `c823f0c0edbeb315c07fa2911390dc781968146f`; [XML preview PR181 head `683a1ac3...`](https://github.com/reallakshman19/XML_Compare_Utilities/pull/181) serializable `graphs.source/target` with nodes, signed edges and XML hashes; original-CII G1 [PR174](https://github.com/reallakshman19/XML_Compare_Utilities/pull/174) left unchanged. New standalone PR182 branch from current main, no file overlap with PR181's `prototypes/ciifr-map/**`, PR174's G1 app, PR168 E1 or PR176 NodeName.

## A1–A5 source walkthrough, contributor-exposed
- **A1:** `prototypes/ciifr-map/xml-graph.js` emits `nodes[{id,...}]`, `edges[{from,to,delta}]`, `sha256`; `evidence.js` exports `graphs:{source,target}`. This PR consumes only that serializable graph shape, *not* a CII parser or claimed original SHA.
- **A2:** G2 #177 had a real S3910→T875/1625/21860 ambiguity and hundreds of weak alternatives; no topology/Boolean implementation yet. Candidate signatures cannot produce accepted uniqueness.
- **A3:** From original requirements, no pose ⇒ no signed global XYZ residual; signed edge vector may be used for invariant *length* only; one source node may map to multiple target nodes and vice versa. Segment-only witness never becomes a physical target NODE.
- **A4:** Local `node --test tests/ciifr-geo-g2.test.mjs` **7/7 PASS (author-built invented positive/contrary cases)**. `node tools/ciifr-geo-g2/cli.mjs <demo-json> <hash-bound-manual.json> AND` actual local smoke: 3 selected, 3 excluded, 6 evidence pairs, 6 conflict observations. NOT_RUN: actual S1/T PR181 graphs, browser/Windows integration, GPU, independent reviewer, native CAESAR.
- **A5:** New source-only CLI, pure topology module, evidence-set module, native tests, README; no touched existing files; local file hashes compared to published Git blobs for the 4 code/test paths. No Appendix A 92/100 claim or production engineering takeover clearance.

## Implementation decisions and falsifier
**Signature:** incident degree + sorted `(edge vector length rounded 0.001 mm, neighbor degree)`. Rotation/translation- and ID-independent. **Rejected:** nearest XYZ/greedy singleton, direct NODE number equality, signed-axis vector signature, use of unqualified diameter/material/branch. It is a *weak candidate* and can have false-negative split/rounded lengths. Reports all possible equal signatures and fails over 2M pairs instead of silently truncating.

**Boolean:** A anchors, C Method C coordinate observations and T topology proposals retain distinct roles for same SHA-scoped pair keys. Manual=A∪C, Topology=T, OR=M∪T, AND=M∩T. Reports all evidence, excluded AND rows, alternatives, target reuse and segments separately. No `accepted` status, `qualifiedNodeMap=[]` and writerEligible=false. Any external A/C hypothesis requires exact SOURCE/TARGET XML digest equality; but the CLI receives claimed graph SHA fields and cannot independently remeasure raw XML or guarantee live browser epoch.

**Contrary case predicted before running:** two independently rotated 3-node chains produce duplicate weak candidates; naïve first-only matcher would pick one; implementation must return all six candidate pairs (two alternatives for every SOURCE node). A manual wrong pair under AND must remain excluded and visible; a segment witness stays typed as SEGMENT, not a target node. Actual author local outputs PASS, not original S1/T engineering truth.

## Changed-file ledger
| Path | Change | Pre-image | Undo |
|---|---|---|---|
| `tools/ciifr-geo-g2/topology.mjs` | Pure graph validation + weak pose-free pairs | None | Remove after exact SHA/ownership check |
| `tools/ciifr-geo-g2/ledger.mjs` | Role-preserving Boolean/conflict JSON | None | Same |
| `tools/ciifr-geo-g2/cli.mjs` | Local JSON CLI reader/writer to stdout | None | Same |
| `tools/ciifr-geo-g2/README.md` | Usage, limits, source/independence | None | Same |
| `tests/ciifr-geo-g2.test.mjs` | 7 substantive author-built tests | None | Same |
| `agents/PR182_workreport.md` | This recovery report | None | Same |

Local `.agent-worklogs/20261026_0743_ciifr_g2/` manifest prepared before code edits; it remains local, not staged in GitHub. No backups necessary because every path is newly introduced and no existing file was changed. Local original source/test file git-blob hashes: topology `1429bb16...`; ledger `010b4763...`; CLI `7be4d7c9...`; tests `46545d2a...`. Those exact published blobs were retrieved and verified, not merely assumed from text.

## Limitations, review, priority and next handoff
**Expected ROI HIGH (not measured savings):** supplies the missing independent-topology/Boolean inspectable data seam; eliminates need to build another viewer or use position-only association. Boundary matters more than percentage completion. This is an **isolated CLI consumer**, not yet PR181 product UI behavior. Significant error still possible: weak signature admits coincidental pairs or loses true matches under resegmentation; author tests might share assumptions. Qualify on real public S1/T exported graphs with blinded/independently derived expectation, then integrate with actual Method C pose and visible conflict tray under an authorized separate task. Browser performance and large-graph limits still NOT_RUN.

**EXACT_NEXT_ACTION → Oracle / new G2 integrator (not yet assigned):** Fetch PR182 exact head and PR181 export shape; run Node tests and CLI on a real PR181 exported graph pair (hash verification at source), compare genuine #177 S3910 and duplicate-target examples, then return PASS/PARTIAL/FAIL and one minimum affected repair or isolated UI adapter. Do not automatically merge, edit active GPU viewer, dispatch using rev4 G1 Cycle or accept any physical NodeMap. Product release decisions stay Owner-reserved.
