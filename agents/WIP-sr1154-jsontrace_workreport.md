# WIP-sr1154-jsontrace — Support Report benchmark/location + staged JSON trace

WORK_ITEM: github:reallaksh19/XML_Compare_Utilities#1154
OWNER_INSTRUCTION: 2026-09-10T06:02:03Z `proceed now, update concept note also`
BASE_MAIN: b6737f45365dbabaf86e71c070166e3c293afe90
BRANCH: agent/support-report-1154-jsontrace
PREWORK_ENDPOINT: EP-SUPPORT-REPORT-1154-0015
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
RECOVERY_STATE: CONTINUE

## Mission

Implement Owner-approved Support Report semantics for real benchmark location splitting and staged JSON trace enrichment while preserving clash/native/workbook authority boundaries.

## Planned product behavior

- location-aware report grain: secondary family + full pipe + physical clash-location cluster;
- default report-location merge tolerance 50 mm, distinct from structural contact tolerances;
- PS-12154 `.2/.5` same-location case remains one row, no multiple-location remark;
- PS-12120 `P8810365` splits into multiple rows with exact remark `Pipe supported at multiple locations`;
- generic CU primary Support Site/Zone derivation handles both CU-PL and CU-PI paths;
- staged JSON direct PS/SL member mapping preferred, explicit PREV-NAME alias second;
- coordinate/base-anchor mapping documented but inactive;
- Support Report-local JSON file import reuses the existing combined staged-model source;
- compact per-member JSON trace includes observed ID, resolved current ID, match basis, POS basis/POS and curated attribute evidence;
- accepted source attributes populate report fields only when source-proven. `INSU` is accepted as insulation thickness. No free-text schedule/type inference.

## Protected invariants

- expected workbook cells are never source engineering data;
- clash XML remains relationship/location evidence;
- staged JSON remains native identity/attribute/position evidence;
- no hard-coded benchmark answer in production;
- no geometry/topology/runtime/writer/workflow refactor;
- no merge without later explicit Owner authorization.

## Real evidence

- `benchmarks/SupportreportXML-PS-068_PS-12154.xml`: PS-12154 `/PS-12154.5` and `/PS-12154.2` on one pipe/BAR-7 are ~38.4 mm apart -> one location.
- `benchmarks/SupportreportXML-PS-12120.xml`: repeated `P8810365` clashes include 300 mm separations and multiple distant points -> multiple locations.
- Owner staged JSON `3D_Converters_v1.78@c76b467.../Benchmarks/1885_NC/1885_NC.json`: native support records expose ID/OWNER/POS/REF/PREV-NAME/CMPSUPTYPE/INSU/DTXR.

## Current hypothesis / falsifier

HYPOTHESIS: location clustering at 50 mm plus direct staged-member/alias mapping can satisfy both real benchmark exceptions without changing native authority or workbook contract.

FALSIFIER: PS-12154 `.2/.5` splits; PS-12120 P8810365 remains one row; a staged field is populated without a direct accepted source attribute; or a direct member with contradictory line context silently enriches a row.

## Module plan

| Module | Status | Planned | Validation | Undo |
|---|---|---|---|---|
| Location grouping | planned | location clusters + multi-location row metadata | both Owner benchmark XMLs | reverse only recorded module commits |
| Staged JSON trace | planned | direct/alias mapping + evidence trace | focused synthetic + source-shaped tests | delete new module if unchanged later |
| Field projection | planned | CU-PI site/zone, INSU, derived remarks | focused field tests | restore pre-image by commit-local patch |
| UI | planned | local staged JSON chooser + trace rendering | static/UI tests | restore pre-image by commit-local patch |
| Concept note | planned | durable architecture/authority/benchmarks | source inspection | delete/restore doc only |

## Validation status

NOT_RUN: implementation tests; product mutation has not started at WIP creation.

## Recovery note

This execution uses GitHub connector writes. Repository `.agent-worklogs/` and `.backups/` are local-only recovery facilities and cannot be created by the connector; no local repository checkout is available in this environment. Durable pre-work endpoint, this WIP report, per-module commits, PR diff and hashes are therefore the available recovery artifacts. Existing files will be updated only with content-SHA compare-and-swap.

EXACT_NEXT_ACTION: add concept note and pure location/JSON-trace modules first; then wire existing production files minimally and validate real benchmarks before opening a draft PR.