# Agent Work Index

Live GitHub state remains authoritative over this snapshot.

| Work | Mission | Branch | State | Criticality | Main checked | Scope claim | Coordination | Next action |
|---|---|---|---|---|---|---|---|---|
| PR981 | CII Workspace V1 anchored topology + transfer preview | `agent/issue-980-cii-workspace-v1` | CORE IMPLEMENTED / INTEGRATION BLOCKED | ENGINEERING_CRITICAL | `b0f13c99` | new `tabs/cii-workspace/**`, focused tests/recovery only | SAFE | run repo-dependent tests; registry edit requires explicit owner authorization |

## PR981 authority note

Owner instruction on 2026-08-16 restricts implementation to new files. Product head `54cfa95e...` contains only added paths. The CII Workspace installer exists as a new module but is intentionally not registered in the pre-existing Utilities installer registry. Do not create an alternate launcher or touch parser/topology/writer/navigation authorities without explicit owner approval.
