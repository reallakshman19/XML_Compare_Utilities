# CIIFR_GEO — implementation framework and Oracle contribution

26 October 2026. Current WBS3.1/G1/M13; next functional WBS3.2/G2/M14. This is the Owner-requested **framework → Oracle code contribution → ChatGPT builder onboarding** sequence. Oracle is a contributor to this seam; its checks are SELF_ASSESSED, not independent acceptance. Original PR181 at `683a1ac37b5e4457b3e67753cec1c951ec1a2dc9` remains the comparison reference.

## Outcome and connected stages

The Owner loads two existing supported XML geometries, adds manual NODE anchor hypotheses, reviews Method C candidates in linked table/drawing and exports reproducible evidence. Geometry is read-only. Later enrichment needs a separately accepted NodeMap, resolved element/end correspondence and field-specific transfer rules. No converter, field transfer or Writer is built here.

| Stage | Working contract / responsibility | Next consumer |
|---|---|---|
| Existing XML intake | Actual measured XML SHA, qualified F05/R4 native-mm geometry, XML witnesses and explicitly unverified embedded CII claims | Existing physical endpoint graph |
| Existing Method C | Experimental rigid pose plus all candidates, ambiguity, target reuse and segment observations | Ledger and current comparison result |
| **Oracle contribution** | Immutable `CIIFR.GeometryDisplaySnapshot.v1`, two existing `VisualGeometryModel.v1` objects, source-qualified pick identities and current-result binding | Current JSON evidence export; future shared GPU viewer |
| ChatGPT builder continuation | Local pinned Three0.160.0/worker assets, opt-in existing viewer, selection/table linkage, lifecycle and real-browser checks | Owner tries the same XML/anchors/ledger in SVG and GPU |
| **Next WBS3.2** | Independent pose-free topology; A anchors, C coordinates, T topology; Manual M=A∪C, OR=M∪T, AND=M∩T, all conflicts retained | Provenance WBS3.3 and hardening/integration WBS3.4 |

The Common [concept](https://github.com/reallakshman19/Common/blob/ca196c6ea5f5599a7c19cff9a828f1cf785a9f9c/oracle-cycles/ciifr/continuity/payload/CONCEPT_NOTE.md) and [revised plan](https://github.com/reallakshman19/Common/blob/ca196c6ea5f5599a7c19cff9a828f1cf785a9f9c/oracle-cycles/ciifr/continuity/payload/ROADMAP_AND_IMPLEMENTATION_PLAN.md) explain the overall journey and both connected cards. Native current task is [#180](https://github.com/reallakshman19/XML_Compare_Utilities/issues/180); next is [#177](https://github.com/reallakshman19/XML_Compare_Utilities/issues/177). Legacy `ciifr-map` paths are retained; the project name is CIIFR_GEO.

## High-ROI choices and bounded code

These are prospective engineering judgments, not measured time/cost savings.

| Choice | Established evidence / consequence | Implement now or hand off |
|---|---|---|
| Reuse graph/Method C | Signed-vector/cycle/component and pose limitations are already tested. A new matcher would fork these rules. | Keep existing algorithms unchanged. |
| Full pose once | Existing viewer only adds registration translation. Omitting rotation or applying translation twice gives a plausible wrong overlay. | Build copied SOURCE display positions with existing `registeredMethodCPoint`; viewer translation is exactly zero. |
| Stable typed identities | Node numbers repeat across sides/files; an element-interior point is not a TARGET node. | Encode side/member/XML SHA/type/local identity. Link actual NODEs/ELEMENTs back to every ledger row; never select a winner. |
| One current snapshot | Prior Writer2 stale-epoch failures and this preview's delayed-read/digest tests show that “work completed” is not “work current.” | Bind scene/picks/export to epoch, inputs, pose, tolerance and projection; retain existing immediate revocation. |
| Existing GPU machinery | Shared viewer already has instancing, GPU picking, floating origin, chunking and revision guards; source inspection is not a performance result. | Export a validated reusable scene now; next agent integrates the actual viewer and measures it. |
| Separate scaling costs | Renderer reuse cannot make XML parsing, candidate search or HTML tables faster. | Keep prototype input/work caps; next builder records parse/match/table/scene/frame/pick timings separately. |
| Preserve ambiguity | Real original3910 alternatives and3940/3970 duplicate signatures falsify greedy topology identity. | Display object links retain all source rows; next G2 must retain all T alternatives and conflicts. |

This contribution stops at a **usable scene artifact through the existing JSON download**, plus a tested pick-resolution API. It does not claim that the preview currently displays WebGL or has improved frame rate. The artifact is an additive `viewerScene` field; current JSON/CSV/SVG formats and original graph/ledger meanings remain intact.

## Module and API contract

- `geo-scene.js`: `createGeometryScene(context)` derives the selected registered components only; `geometrySceneBinding(context)` identifies the current render request; `assertGeometrySceneCurrent(context)` rejects a stale derived scene.
- `geo-scene-pick.js`: `resolveGeometryPick(scene, pick, currentBinding)` resolves a shared-viewer pick to typed original/XML identities and **all** associated SOURCE rows. It rejects wrong-side, unknown, mismatched-node or stale picks. A null pick returns null only for a current scene.
- Existing `compare.js` constructs the scene once after Method C; existing `evidence.js` uses that exact current scene for JSON export. The browser still draws through existing Method C SVG.

`models.source` / `models.target` use existing `VisualGeometryModel.v1`, unit `mm`; `models.registrationTranslation=[0,0,0]`. Markers represent actual endpoint nodes, segments actual element occurrences. Fixed centerline radius/marker size are explicitly display choices, never physical pipe dimensions. Models contain only the registered components; other components remain listed as unregistered scope rather than overlaid as if positioned.

The snapshot contains immutable plain data: source hashes/profile/frame/scope, copied visual coordinates, typed object metadata and ledger-row links. It never freezes/mutates the authoritative source graph. Its `binding` is an exact request descriptor, **not a cryptographic hash or proof that original CII was verified**. Input-byte SHA authority comes from existing intake; render-cache fingerprints remain noncryptographic.

## Before integration, falsify these rules

1. Known90° Z rotation plus translation: SOURCE[100,70,30] must display at[-30,80,60]; zero additional viewer translation. Original input coordinates must remain unchanged.
2. Equal node numbers, even equal SHA on opposite sides, still have distinct object IDs. Unknown or wrong-side IDs cannot resolve to another file's node.
3. A target with two candidate SOURCE nodes returns both row links; a source projected onto a segment interior remains ELEMENT evidence and creates no TARGET node.
4. Changing epoch, pose, tolerance or projection invalidates the old scene/pick/export. A late async result must compare against the **current** binding after completion.
5. Actual supplied F05/R4 S1 profiles produce57 markers and56 segments per side, pass the existing shared visual-model validator/runtime, and preserve XML/CII provenance distinctions. This pair is not independent physical matching acceptance.

## Contribution and onboarding boundary

The Oracle supplies this framework, code/diff, exact source/fixture identities, executed checks, contrary-case evidence and surviving risks first. Only then prepare one fresh ChatGPT builder brief for the remaining WBS3.1 integration. The earlier task-local read-only probe was paused and performed no implementation; it is not a completed onboarding or an active graphics assignment.

The new agent starts at native #180, this framework and the exact contributor candidate, inspects the actual diff and real input bytes, then demonstrates one source→display→pick→ledger trace. Use its real browser/WebGL capability to shape the task; do not repeat the build host's unchanged failed Chromium installation or call native tests a browser PASS. Keep overall purpose, current task and next WBS in the same brief. No new project, repeated initial grounding, successor activation or engineering v3.6 selection is introduced.

Next implementation files are bounded preview UI/view/server/README, task-owned GPU bridge/tests and pinned local assets. Shared viewer/MethodC, live G1 mirrors, converters, Writer, workflows, Page and canonical CURRENT stay untouched unless an actual necessary seam is separately coordinated. A separate affected-claim assessment remains required before consequential engineering use; author/fixture exposure must be disclosed.
