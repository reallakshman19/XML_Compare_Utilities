# XML Geometry Preview — WBS 3.1 / G1 / M13

Upload two **existing XML files**, enter SOURCE→TARGET node anchors, and inspect an overlay and candidate ledger produced by the repository's unchanged Method C. Download SVG, JSON or CSV for the current inputs.

This is the bounded input-adapter preview for [#180](https://github.com/reallakshman19/XML_Compare_Utilities/issues/180), continuing [Geometry #166](https://github.com/reallakshman19/XML_Compare_Utilities/issues/166). It is **not integrated VNext**. Existing G1 PR174, converters and shared engine files are untouched. There is no CII input, conversion, property transfer, Writer or Apply control.

## Run locally

From the repository root, with Python 3 installed:

```sh
python3 prototypes/ciifr-map/server.py
```

On Windows, double-click `prototypes\ciifr-map\Start-MAP.cmd` (Python 3 required). The launcher opens `http://127.0.0.1:8873/prototypes/ciifr-map/`. Use `--port 8874` if that port is occupied, or `--no-browser` to open it yourself. Stop with Ctrl+C. Product runtime uses only Python's static server and standard browser ES modules/DOMParser/Web Crypto; no npm installation or external service is needed. Files stay in the browser.

## Try the supplied public-data pair

1. Choose `tests/fixtures/S1-F05.xml` as SOURCE and `tests/fixtures/S1-R4.xml` as TARGET.
2. Add `3790 → 3790`; run Method C. The status explicitly leaves orientation undetermined.
3. Add `3830 → 3830` and `3840 → 3840`; run again. These three noncollinear anchors yield a proper rigid numerical fit. At 100 mm XYZ tolerance this parity pair has 57/57 nearby endpoint nodes.
4. Select rows/nodes for signed residuals, all alternatives and XML field witnesses. Select an element for its record witness. Drag empty canvas to pan; zoom/reset; choose XZ/YZ/XY or explicitly nonmetric ISO.
5. Download current SVG/JSON/CSV. Changing a file, anchor input or parameter revokes previous results and exports immediately; run again.

The two fixtures come from the **same public S1 original** through two unchanged pinned converters. They demonstrate cross-profile geometry parity, not an independently accepted physical mapping. Their exact hashes and converter commits are in `tests/fixtures/manifest.json`. No Owner/private XML pair was supplied.

## Supported geometry profiles

| Profile | Geometry and units |
|---|---|
| F05 `RichInputXML-P1.v1.1` | `CAESARII` / `PIPINGMODEL` / `SECTIONS` / `SECTION` / `PIPINGELEMENT` / `Numeric` / uppercase `Field` names; explicit `COORDS` records and native-mm unit labels/factors |
| R4 `RichInputXMLv2.1`, `CII-V14-ASCII-CRLF-B001` | `RichInputXMLv2` / `Sections` / `Section` / `Record` / `Row` / lowercase geometry names; explicit coordinate rows and native-mm labels/factors |

UTF-8 XML only, at most 32 MiB and 50,000 elements; comparison is limited to five million SOURCE×TARGET endpoint pairs. Unsupported profiles/units, DTD/entities, malformed values/counts, contradictory cycles/seeds and invalid anchor custody fail closed. These are geometry-profile checks, **not full converter/writer schema or engineering-semantic certification**. Native-mm coordinate values are preserved; the observed conversion factors 25.4 are validated and are not multiplied into them.

Real FROM/TO endpoints define the graph. Auxiliary records do not create physical nodes. Signed vectors reconstruct each component; seedless components remain relative. Vector closure tolerance is 0.0001 mm; multiple seed shifts must agree within 0.25 mm, matching the existing graph policy. Anchors must belong to one SOURCE component and one TARGET component per run.

One anchor supports translation under provisional orientation; two leave axial twist undetermined; three or more noncollinear anchors permit a scale-1, determinant +1 numerical fit subject to residuals. Anchors and coordinate-near rows remain experiments/candidates. Alternatives, target collisions, residual conflicts and segment-only projections retain their existing Method C statuses. No physical identities are qualified.

## Evidence and next consumer

XML byte SHA-256 is measured independently on each uploaded snapshot. R4's embedded original-CII SHA/size is **CLAIMED_NOT_REVERIFIED**; F05 has no such embedded claim. No XML metadata authenticates original CII bytes. The preview honors XML `value` geometry and preserves field/row/record witnesses; it does not repair values from lexemes or benchmark expectations.

JSON schema `CIIFR.XmlGeometryPreview.v1` contains both serializable XML graphs, coordinate frames, units, claims, XML field witnesses and the unchanged Method C correspondence ledger. It identifies **WBS 3.2 / G2 / M14** as the next graph/ledger consumer; pose-free topology and Manual/Topology/OR/AND are deferred. SVG metadata and CSV columns bind XML hashes, current anchors, pose, projection/tolerances and preview epoch. JSON retains all alternatives; exports remain review-only.

## Checks

### CIIFR_GEO framework contribution

Read [FRAMEWORK.md](FRAMEWORK.md) for the overall/current/next WBS, existing-code reuse,
high-ROI rationale, shared-viewer contract and ChatGPT builder continuation boundary.
The current JSON download now also contains an immutable `viewerScene` artifact:
two existing `VisualGeometryModel.v1` objects, full SOURCE rigid pose applied once,
zero extra viewer translation, registered-component scope and side/member/XML-SHA
qualified NODE/ELEMENT identities linked to every applicable ledger row.
`resolveGeometryPick` rejects stale/wrong-side identities and retains target reuse.

This is an Oracle-authored, self-assessed framework/code contribution before
ChatGPT agent onboarding. SVG remains the current renderer. WebGL controls,
local Three/worker packaging and actual browser performance remain the next
builder's bounded implementation; the scene artifact does not establish them.

Run the focused pure bridge checks alongside the existing pure geometry suite:

```sh
node --test prototypes/ciifr-map/tests/scene.test.mjs prototypes/ciifr-map/tests/geometry.test.mjs
```

Pure geometry checks have no npm dependencies:

```sh
node --test prototypes/ciifr-map/tests/geometry.test.mjs
python3 prototypes/ciifr-map/tests/http_smoke.py
```

For native XML adapter checks, install a **test-only** standards DOM parser outside the repository, then set `CIIFR_TEST_RUNTIME` to that npm prefix:

```sh
npm install --prefix /tmp/ciifr-map-tests --ignore-scripts --no-audit --no-fund @xmldom/xmldom@0.9.12
CIIFR_TEST_RUNTIME=/tmp/ciifr-map-tests node --test prototypes/ciifr-map/tests/adapter.test.mjs prototypes/ciifr-map/tests/geometry.test.mjs
```

Windows PowerShell: `$env:CIIFR_TEST_RUNTIME = "C:\path\to\test-prefix"`, then run the same `node --test` command. Product code uses native browser DOMParser; these tests inject the real test DOM parser, not a simulated geometry/parser result.

`tests/prepare-fixtures.py` reproduces fixture bytes using unchanged code read from exact Git commits; it never becomes a product converter. Those immutable objects must exist locally. The checked-in fixture manifest is the delivery baseline.

Builder native XML/module tests and HTTP delivery ran. **Actual served-browser upload, keyboard, pan/zoom, download and Windows interaction are NOT_RUN** in this host: Chromium exits SIGTRAP before a page opens. The included launcher is ready for Owner browser trial; no browser PASS, Owner acceptance or independent engineering review is claimed.

## Opt-in existing 3D viewer (WBS3.1 R2)

Choose **Use existing 3D viewer** after running Method C; switch between overlay and side-by-side, or return to SVG at any time. The static server serves the unchanged shared `workbench3d/viewer` modules and worker through a narrowly allowed read-only path; the browser import map pins the bundled official Three.js **0.160.0** ESM from `vendor/three-0.160.0`, MIT license retained. No CDN is needed or authorized. SVG remains functional when WebGL or Workers fail. For XY/XZ/YZ the native viewer is orthographic, displayed as centerline mm evidence; ISO is perspective and not metric-comparable. This is NOT CAD pipe outside diameter or identity validation.

TARGET NODE selection (SVG/3D) lists **all** linked SOURCE rows, including reused/ambiguous candidates and physical XML witnesses. The 3D canvas consumes `result.viewerScene` produced by the existing Method C engine; registration has already been applied to SOURCE display copies, so extra registration translation is zero. File/anchor/pose/tolerance/projection changes revoke and dispose the viewer immediately; late asynchronous callbacks compare against the current session, not an old cached scene. Exports remain from the original current evidence path regardless of display mode.

Official asset provenance: `mrdoob/three.js` r160 commit `d04539a76736ff500cae883d6a38b3dd8643c548`, `build/three.module.min.js` SHA-256 `3e690ac7d180b0aadf0891bea39eec643e29e2d3e75c99b18689518665f69ba6`, `LICENSE` SHA-256 `852e0e8699169bf9f6fdc6bda3e682d078dcbc738b5d33e74df594721bff271d`. Original public source snapshot is not a local Git checkout. Native authored tests and served GPU qualification have different authority; absent GPU context or blocked browser navigation means GPU NOT_RUN.
