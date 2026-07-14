# XML Compare Line-wise Sideload Producer Adoption Audit

Date: 2026-07-14
Base: `main` at `4b2290670b0bf5886630d18af9d359ee1b45a4c9`

## Scope

This Work Pack integrates the XML Compare tab's native **Line-wise XML Enrichment / Categorized XML** sideload path with the merged browser-worker operation:

```text
producer.categorizeInputXml
```

It does not change sideload matching, XML mutation, enrichment, restraint/coordinate logic, worker protocol, producer service semantics, InputXML reconciliation, CII conversion, InputXML Workspace, Workbench3D, or either `3D_Converters` producer.

## Current runtime

The live path is:

```text
XmlCompareLinewiseWorkflowActions.applyLinewiseSideload()
→ applyXmlCompareSideload()
→ enriched InputXML stored in workflow state
→ ensureCategorized()
→ direct inputXmlToCategorizedInputXml() call on the UI thread
```

The XML Compare tab click handler calls `applyLinewiseSideload()` synchronously. Categorized preview, export and canvas loading then call `ensureCategorized()`, which invokes the converter directly.

## Adoption problem

The merged producer API and worker transport are available, but this runtime does not invoke them. Therefore the line-wise module currently lacks:

- producer identity and repository/module/operation trace;
- source and categorized fingerprints;
- producer-service InputXML validation;
- categorized-service validation receipt;
- worker cancellation/timeout/error boundary;
- explicit distinction between sideload success and categorization success.

## Required boundary

```text
existing applyXmlCompareSideload()
→ unchanged enriched InputXML
→ client.producer.categorizeInputXml()
→ producer receipt + categorized-review-document
→ preview/export/canvas
```

## Authority rules

1. `applyXmlCompareSideload()` remains the only sideload mutation authority.
2. `InputXmlProducerService.v1` validates and categorizes the post-sideload InputXML.
3. The worker transport owns asynchronous execution only.
4. The categorized artifact returned by the worker becomes the categorized preview/export/canvas artifact for that sideload run.
5. A worker or producer validation failure must never remove or alter the enriched InputXML result.
6. After a sideload run, categorized actions must not silently fall back to direct UI-thread categorization when worker adoption failed.
7. Direct categorization remains available for ordinary imported InputXML that has not entered the sideload adoption path.

## State additions

The line-wise workflow state will retain:

```text
producerCategorizationStatus
producerCategorizationResult
producerCategorizationError
lastCategorized
```

Statuses:

```text
idle
running
success
failed
```

## UI behavior

The sideload and preview/canvas surfaces will show:

- worker status;
- producer ID;
- source fingerprint;
- categorized fingerprint;
- source and categorized element counts;
- error/diagnostic summary;
- downloadable producer receipt JSON.

Categorized preview/export/canvas actions are blocked while status is `running` or `failed` for the current sideload output. Enriched/InputXML preview and export remain available.

## Lifecycle

The XML Compare tab owns one lazy worker client. It is closed and terminated when the tab cleanup function runs.

## Explicit exclusions

- no changes to `XmlCompareSideloadEnricher.js` or its helper modules;
- no changes to worker/service/converter implementation;
- no automatic `InputXmlChangeSet` derivation or application;
- no UI for approval/reconciliation;
- no HTTP, storage, Pyodide or CII call;
- no adoption by InputXML Workspace or other producers;
- no broad XML Compare tab refactor.

## Acceptance

The Work Pack is complete when tests prove:

- sideload output bytes are identical before and after worker adoption;
- the worker receives the enriched InputXML and XML Compare producer trace;
- successful worker categorization becomes the preview/export/canvas artifact;
- worker validation and transport failures preserve enriched InputXML and block categorized actions;
- producer receipt JSON is available;
- the worker client is lazily created and closed with the tab lifecycle;
- direct non-sideload categorization remains compatible;
- all new modules remain below 300 lines, use named exports and keep functions below 40 lines where practical;
- the full repository suite remains green.
