# InputXML Workspace Phase 2 Work Pack checks

Baseline: `f7efffc7a26d63f72e8b33f9dd07608adf37015d`

## Capability target

- Reject non-InputXML content before Tab 2 sideload mutation.
- Route CleanXML through Tab 3 XML-to-InputXML instead of silently applying PIPINGELEMENT enrichment to node XML.
- Return successful Tab 3 output into Tab 2 automatically.
- Invalidate dependent stale outputs when upstream content changes.
- Block zero-record manual CleanXML output.
- Expose `inputxml_workspace_diagnostics.json` and a collapsible diagnostics panel.

## Guardrails

- New JavaScript modules are under 300 lines.
- Named exports only; no default exports.
- Pure orchestration and diagnostics functions are used for preflight, routing and invalidation.
- Existing large files have immutable backup blob references.
- No runtime, writer or canvas switch.
- No mocks, shims, snapshot churn or unrelated refactor.

## Validation gates

- Exact-anchor patching must complete without partial edits.
- `node --check` on every touched or new JavaScript file.
- Focused InputXML Workspace acceptance tests.
- Pull-request static, XML, table and full `npm test` workflow.
