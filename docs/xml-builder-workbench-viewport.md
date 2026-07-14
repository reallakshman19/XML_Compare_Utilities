# XML Builder Workbench Viewport

`XMLB-VP-001` integrates the domain-neutral Workbench Viewport into the Universal XML Categorizer preview only.

## Data authority

- XML Compare workspace records remain source authority.
- `universal-loaded-preview-bundle/v1-shadow` remains the loaded-preview boundary.
- `CategorizedGraph.v1-preview-shadow` and `universal-preview-model/v1-shadow` remain Tree/Pivot authority.
- Viewport state, selection identities and persistence are view-only.

## Modes

- **Tree** — hierarchy depth and deterministic visible-row coordinates.
- **Pivot** — deterministic column and row coordinates.
- **Side by Side** — linked selection with independent horizontal scaling.
- **Diagnostics** — read-only context and preview diagnostics.

Loaded contexts are labelled **Loaded preview**. When no usable loaded target identity exists, the workspace uses the existing sample model and is visibly labelled **Sample preview**. Export and editing remain locked.

## Lifecycle

One per-document lifecycle owns the popup, Tree/Pivot hosts, listeners and cleanup. Reopening destroys the previous lifecycle before mounting a replacement. No body-wide observer or cross-document popup singleton is used.
