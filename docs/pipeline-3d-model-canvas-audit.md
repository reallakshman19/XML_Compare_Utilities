# Canvas Audit Results

## Scope resolution

The two requested files were audited first:

- `tabs/pipeline-3d-model/pipeline-3d-model-preview.js`
- `tabs/pipeline-3d-model/pipeline-3d-model-samples.js`

They retain the legacy preview/SVG path. The production HTML5 Canvas runtime is implemented by the `pipeline-3d-model-cad-*` modules, principally `pipeline-3d-model-interactive-graph.js`, `pipeline-3d-model-table2x-canvas.js`, `pipeline-3d-model-table3x-canvas.js`, `pipeline-3d-model-cad-controller.js`, and `pipeline-3d-model-cad-workspace.js`. The audit therefore covered both the named legacy entry files and the effective Canvas runtime.

## Checklist

### 1. State Decoupling & Immutability — [PASS]

- `PipelineCanvasManager` now exposes internal immutable `nodes[]` and `edges[]` snapshots for the attached Table 2X and Table 3X graphs.
- Pointer movement changes graph override objects only. It does not mutate raw textarea strings.
- A committed `nodeMoved` command serializes the canonical profile model back to the raw textareas after pointer release.
- Geometry snapshots and edge records are frozen before broadcast so consumers cannot mutate Canvas state accidentally.

Pre-fix finding: the model-first behavior already existed, but there was no aggregate `PipelineCanvasManager` contract or explicit immutable `nodes[]` / `edges[]` facade.

### 2. Performance & Render Loop Constraints — [PASS]

- Rendering is now dirty-gated by `graph.isDirty`.
- Repeated `render()` requests within one browser frame are coalesced into one `requestAnimationFrame` paint.
- No constant animation loop is introduced; a new frame is requested only when state becomes dirty.
- Pointer preview broadcasts are separately coalesced to one event batch per animation frame.
- `syncSplitTables()` retains the mounted Canvas elements in Canvas mode. Model refreshes update the existing graph instances rather than recreating the HTMLCanvasElement.

Pre-fix finding: pointer move, pan, and wheel paths called the concrete paint routine synchronously for every input event.

### 3. Memory Leak Hunt — [PASS]

- Canvas pointer listeners remain canvas-scoped and are removed by `InteractiveGraph.destroy()`.
- Global keyboard, blur, and document visibility listeners are registered through cleanup callbacks and removed during graph destruction.
- A detached-popup lifecycle observer now detects removal of the Pipeline 3D Model dialog, destroys its controller and graph instances, cancels pending animation frames, and removes retained listeners.
- Destruction remains idempotent through the existing lifecycle hardening layer.

Pre-fix finding: popup close removed the modal DOM directly without invoking workspace destruction, allowing global listener closures to retain detached graph instances.

### 4. Custom Event Broadcasting — [PASS]

- `canvas:nodeMoved` is emitted for rAF-gated preview movement and committed pointer-release movement.
- `canvas:geometryUpdated` is emitted for preview geometry changes, model reloads, committed commands, graph reloads, and history navigation.
- Events are dispatched from `PipelineCanvasManager` and the attached Canvas DOM elements with structured node/edge snapshots.

Pre-fix finding: only internal `nodePreviewMoved`, `nodeMoved`, and controller events existed; the required public `canvas:*` event names were absent.

## Constraints verification

- New JavaScript module: under 300 lines.
- New functions and methods: under 40 lines each.
- Named exports only.
- No polyfills or runtime shims were added to production code.
- The existing legacy files exceed 300 lines, but this is pre-existing debt; this audit does not expand them.

## Regression coverage

`tests/pipeline-3d-model-canvas-audit-hardening.test.js` verifies:

- immutable manager node/edge snapshots;
- one-frame render coalescing and dirty reset;
- no textarea mutation during pointer move;
- model serialization on pointer release;
- `canvas:nodeMoved` and `canvas:geometryUpdated` broadcasts;
- detached popup destruction and listener cleanup;
- cancellation of pending animation frames.
