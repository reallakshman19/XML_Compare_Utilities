# SSK-ESVG-003A — Sequential production Engineering SVG adoption readiness

## Decision

| Field | Value |
|---|---|
| Schema | `SequentialEngineeringSvgProductionAdoptionDecision.v1` |
| Evaluated main | `12df61d956fde2b83c8e6e59d3dff6a3c23553d5` |
| Status | `REVIEW_REQUIRED` |
| Recommended architecture | **Option A — existing interactive SVG default plus optional read-only preview** |
| Production UI authorized | No |
| SSK-ESVG-003B authorized | No; `proposedNextMission` is `null` |

The merged Shared Engineering SVG adapter and shadow composition are suitable read-only consumers. The shipped Sequential workspace does not yet publish the immutable, reasoned owner snapshot/subscription required to mount them safely in production. Candidate, scene, review-queue and inspector selections also lack an implemented backend-switch reconciliation contract. Production adoption therefore requires a separately authorized bridge design before any viewer toggle is attempted.

## Evaluated architecture options

### Option A — recommended, but not yet implementation-ready

The existing interactive construction SVG remains the default visual surface and the only decision-authoritative interaction surface. A future Shared Engineering SVG view may be offered as an optional read-only preview. Exactly one visual surface is mounted, visible and focusable at a time. The existing construction inspector remains reachable and owns all explicit construction decisions.

This option is compatible with the current authority split because Shared Engineering SVG already has no command gateway, exposes only read-only properties, and derives its domain revision from session and downstream fingerprints.

### Option B — not approved

Two simultaneous visual surfaces would create duplicate focus order, selection, accessibility announcements, fit policies and lifecycle subscriptions. The current renderer includes candidates in auto-fit, while the Shared scene deliberately excludes candidates and active ports from fit. No production contract currently establishes which selected identity, projection, fit or keyboard surface would be primary.

### Option C — forbidden by current source

The existing canvas and inspector render the candidate set and expose Preview, Connect, Manual connect, Reverse and Reject controls. The workspace delegates those controls directly to `applyConstructionDecision()`. Shared Engineering SVG is read-only and has no command gateway. Replacing the existing renderer would hide required decision interactions or require forbidden writes in Shared Engineering SVG.

## Authority matrix

| Concern | Exact owner and revision | Source evidence | Proving test | Confidence | Production-adoption action |
|---|---|---|---|---|---|
| Source records and indexes | `buildSequentialEvidenceModel()` creates frozen `SequentialSourceEvidence.v1`; `indexSequentialEvidence()` owns branch/component/port/reference Maps. Source reload creates a new evidence/index set. | `tabs/sequential-sketcher/source/sequential-evidence-model.js`, exports `buildSequentialEvidenceModel`, `indexSequentialEvidence`, lines 218–250. | `tests/sequential-sketcher-ui-static.test.js` | High | Publish the existing evidence and indexes in one immutable owner snapshot. |
| Construction session | `model.session` in `mountSequentialSketcherWorkspace()` is replaced only with results from `advanceConstruction()`, `runConstructionUntilBlocked()` or `applyConstructionDecision()`. Session revision is `sequentialSessionFingerprint(session)`. | `sequential-sketcher-workspace.js`, `mountSequentialSketcherWorkspace`; `construction/sequential-construction-runtime.js`, exports at lines 69–143; `construction/sequential-session-fingerprint.js`, lines 121–170. | `tests/sequential-construction-engine.test.js`, `tests/sequential-supervised-transactions.test.js` | High | Emit a reasoned owner event after each accepted runtime result. |
| Confirmed construction | `createConfirmedSequentialConstruction()` is the sole acceptance boundary. It requires `ROUTE_COMPLETE`, no open decision, validated head evidence and accepted connections. | `construction/sequential-construction-acceptance.js`, export at lines 97–176. | `tests/sequential-construction-acceptance.test.js` | High | Include only a confirmed object matching the current session. |
| Candidates | `buildConnectionCandidates()` creates stable `CAND-*` identities from active and target port IDs; `session.currentDecisionRequest.candidates` owns the current lifecycle. | `construction/sequential-connection-resolver.js`, exports `buildConnectionCandidates`, `resolveNextConnection`, lines 117–190 and 236–298. | `tests/sequential-construction-engine.test.js` | High | Consume current candidates; never rebuild or sort them in the adapter. |
| Candidate selection | `model.selectedCandidateId` is workspace presentation state and is stored in each branch registry snapshot. | `sequential-sketcher-workspace.js`, `branchSnapshot`, `onClick`; `sequential-branch-workspace-state.js`, `frozenSnapshot`, `save`, `open`. | `tests/sequential-sketcher-branch-switch-ui.test.js` | High | Keep raw candidate preview selection distinct from Shared scene selection. |
| Candidate confirmation/rejection | Workspace `decide()` calls `applyConstructionDecision()` for Connect, Manual connect, Reverse, Reject, defer/resume, terminal, external boundary and undo. | `sequential-sketcher-workspace.js`, `decide`, `onClick`; `construction/sequential-construction-runtime.js`, `applyConstructionDecision`. | `tests/sequential-supervised-transactions.test.js` | High | Retain all mutations outside Shared Engineering SVG. |
| Active exit port | `session.activeExitPortId` is construction state and participates in the session fingerprint. | `construction/sequential-session-fingerprint.js`, `sequentialSessionFingerprint`, lines 121–170. | `tests/sequential-engineering-svg-authority.test.js` | High | Read from the current session only; Shared selection cannot change it. |
| Continuity repair | `resolveNextConnection()` applies exact/unique repair rules; runtime records repairs and transactions. | `construction/sequential-connection-resolver.js`, `resolveNextConnection`; `construction/sequential-construction-runtime.js`. | `tests/sequential-construction-tolerance-policy.test.js` | High | Shared SVG may display repairs but cannot invoke resolution. |
| Rejected candidates | `session.rejectedCandidateIds` plus recorded decision candidates form the recoverable rejected ledger. | `sequential-engineering-svg-authority.js`, `rejectedCandidateEvidence`, lines 53–65. | `tests/sequential-engineering-svg-parity.test.js` | High | Preserve rejected evidence across snapshots and branch restoration. |
| Support projection | `buildConfirmedConstructionSupportProjection()` consumes accepted construction and emits `SequentialConfirmedSupportProjection.v1` carrying the accepted construction fingerprint. | `support/sequential-confirmed-support-projection.js`, lines 90–139. | `tests/sequential-confirmed-support-projection.test.js` | High | Reject supplied support evidence when its fingerprint is stale. |
| Current projection mode | `model.mode` is workspace presentation state; projection clicks set the mode and repaint. It is absent from the session fingerprint. | `sequential-sketcher-workspace.js`, `model.mode`, projection branch of `onClick`; `sequential-sketcher-projection.js`. | `tests/sequential-engineering-svg-shadow-parity.test.js` | High | Publish projection as presentation metadata, not a domain revision. |
| Current SVG fit | Existing renderer computes fit from confirmed strokes, candidates and supports. Shared scene fit includes confirmed, repair and support entities but candidates/active/rejected entities use `contributesToFit:false`. | `canvas/sequential-construction-svg.js`, `allPlantPoints`, `renderSequentialConstructionCanvas`; `sequential-engineering-svg-scene.js`, candidate/active/rejected builders. | `tests/sequential-sketcher-ui-static.test.js`, `tests/sequential-engineering-svg-shadow-parity.test.js` | High | Keep independent renderer-local fit state; do not claim equivalence. |
| Pointer interaction | Root delegated click handler owns projection, candidate preview, decision controls, branch navigation and construction actions. | `sequential-sketcher-workspace.js`, `onClick`. | `tests/sequential-sketcher-ui-static.test.js` | High | Only the existing interaction path may execute construction writes. |
| Keyboard interaction | Root key handler owns Ctrl/Cmd+Z undo and Alt+Left/Right branch navigation. Candidate SVG elements are focusable but have no independent decision keyboard handler. | `sequential-sketcher-workspace.js`, `onKeyDown`; `canvas/sequential-construction-svg.js`, candidate SVG attributes. | `tests/sequential-sketcher-branch-switch-ui.test.js` | High | Do not register duplicate decision shortcuts on the preview. |
| Inspector | `renderConstructionInspector()` displays active port, candidate cards, Preview/Connect/Manual/Reject, reversal and decision controls. | `canvas/sequential-construction-svg.js`, export `renderConstructionInspector`, lines 181–199. | `tests/sequential-sketcher-ui-static.test.js` | High | Keep the inspector visible, focusable and authoritative in preview mode. |
| Branch workspace state | `createSequentialBranchWorkspaceRegistry()` owns immutable per-branch wrappers for session, confirmed construction, support projection and candidate selection. | `sequential-branch-workspace-state.js`, lines 17–92. | `tests/sequential-sketcher-branch-switch-ui.test.js` | High | Snapshot the currently opened branch and clear unrelated selections. |
| Revision tokens | `classifySequentialEngineeringSvgAuthority()` derives an `EngineeringRevisionToken` from session, confirmed-construction and support fingerprints. | `sequential-engineering-svg-authority.js`, `revisionToken`, `classifySequentialEngineeringSvgAuthority`, lines 84–135. | `tests/sequential-engineering-svg-authority.test.js` | High | Use this token unchanged; no local revision counter. |
| Renderer teardown | Tab close destroys continuity, persistence, export, redo and workspace controllers; workspace removes delegated listeners; shadow destroys reconcile subscription, shell and bridge. | `sequential-sketcher-tab.js`, `installSequentialSketcherTile`; `sequential-sketcher-workspace.js`, `destroy`; `sequential-engineering-svg-shadow-workspace.js`, `destroy`. | `tests/sequential-engineering-svg-shadow-ownership.test.js` | High | Future switching must completely destroy the inactive renderer and subscriptions. |

## Required production owner snapshot

A future bridge must publish a deeply immutable owner snapshot equivalent to:

```js
{
  session,
  evidenceModel,
  indexes,
  confirmedConstruction,
  supportProjection,
  visibleProjection,
  constructionCandidateSelection,
  reviewQueueSelection,
  inspectorSelection
}
```

Rules:

1. `session`, `evidenceModel` and `indexes` come directly from the opened branch workspace.
2. `confirmedConstruction` is either absent or validated against the current session.
3. `supportProjection` is either absent or fingerprint-matched to confirmed construction.
4. `visibleProjection` is presentation-only.
5. Selection values remain separate concepts.
6. `classifySequentialEngineeringSvgAuthority()` validates the snapshot and derives its revision.
7. No owner value is recovered from DOM markup, rendered coordinates, array position or rounded geometry.
8. No adapter-local counter or fallback session is permitted.

## Required owner subscription

The shipped workspace currently exposes `getModel()` but no production subscription. A future bridge must add an explicit owner API with behavior equivalent to:

```text
getState() -> immutable current owner snapshot
subscribeState(listener) -> deterministic unsubscribe function
```

Reasoned events are required after:

- source inspection and source reload;
- branch open and branch switch;
- construction advance and run-until-blocked result;
- decision application, undo and redo;
- route completion;
- confirmed-construction and support-projection refresh;
- workspace package restoration;
- presentation projection change;
- viewer switch.

The subscription must not depend on `window`, `document`, `CustomEvent`, event bubbling, polling or mutation observation. It must not derive a revision from the wall clock.

## Selection separation

| Selection concept | Identity | Owner | Allowed consequence |
|---|---|---|---|
| `constructionCandidateSelection` | raw `candidateId` | Sequential workspace / branch snapshot | preview highlight only |
| `engineeringSceneSelection` | exact Engineering Scene entity ID | Shared read-only shell | property display only |
| `reviewQueueSelection` | `reviewId` | Review queue controller | may open its authoritative branch |
| `inspectorSelection` | raw `candidateId` | Existing inspector/workspace | preview plus separately clicked explicit decision controls |

Candidate mapping is explicit:

```text
Engineering Scene entity.domainRef.candidateId
        ↔
workspace selectedCandidateId
```

The entity ID `ssk:candidate:<candidateId>` may be used as a scene identity, but the implementation must read `domainRef.candidateId`; it must not strip arbitrary text or infer equality from coordinates.

A Shared Engineering SVG entity click must never:

- confirm or reject a candidate;
- advance or run construction;
- apply a repair;
- open a branch or review row;
- modify active component or active port.

## Projection and fit

- The existing `mode` may govern both renderers only through an explicit presentation event.
- Projection changes must not modify the construction fingerprint.
- Existing construction SVG auto-fit includes current candidates because decision visibility requires them.
- Shared Engineering SVG excludes candidates, active port and rejected candidates from fit and includes confirmed geometry, repairs and supports.
- Each renderer may retain independent fit state.
- Switching renderer must not rerun construction, repair, acceptance or support projection.
- Switching back restores a valid mapped selection or clears only the selection that cannot be mapped.

## Lifecycle contract

| Lifecycle point | Authoritative state | Active visual renderers | Subscription and selection behavior | Permitted mutation | Disposal owner |
|---|---|---:|---|---|---|
| Workspace open | no session until source/branch action | 1 existing | no shared subscription | open only | tab controller |
| Source inspection | new evidence/indexes; session/downstream reset | 1 | future event `source-inspected`; clear all selections | parse/index only | workspace |
| Branch open | registry snapshot or clean session | 1 | future event `branch-opened`; restore branch candidate, clear unrelated selections | open branch only | workspace |
| Construction advance | runtime result replaces session | 1 | future event `construction-advanced`; reconcile selections | advance/run from existing controls | workspace |
| Decision required | current decision request owns candidates | 1 | future event `decision-required`; mapped preview may survive | shared preview remains read-only | workspace |
| Decision applied | recorded supervised transaction | 1 | future event `decision-applied`; clear candidate and stale scene selection | existing inspector only | workspace |
| Route complete | accepted construction may be created | 1 | future event `route-complete`; reconcile to confirmed entities | acceptance only | workspace |
| Support refresh | fingerprint-matched projection | 1 | future event `support-refreshed`; drop stale support IDs | support build only | workspace |
| Branch switch | save old snapshot, open target snapshot | 1 | one reasoned event; one owner subscription | branch open only | workspace |
| Source reload | records/evidence/indexes/workspaces replaced | 1 | future event `source-reloaded`; clear all selections | source load only | workspace |
| Viewer switch | domain state unchanged | exactly 1 | destroy inactive surface before activating next; map or clear selections | no domain mutation | future viewer owner |
| Workspace close | no mounted renderer | 0 | unsubscribe all, clear focus/selection | close only | tab controller |
| Workspace remount | one validated current snapshot | 1 | exactly one subscription | none | future viewer owner |
| Shared mount failure | domain state unchanged | 1 existing fallback | dispose partial shell/bridge; preserve construction selection | no domain mutation | shared preview owner |

### Constructed-network conflict

`mountSequentialContinuityController()` can replace the same canvas with a constructed-network SVG after “Build entire geometry.” A future viewer switch must define this as a separate presentation state. It cannot silently mount the Shared preview over constructed-network output, and it cannot lose the ability to return to the active branch construction renderer.

## Accessibility contract

- Only one visual renderer is visible and focusable.
- The inactive renderer is destroyed or hidden with no tabbable descendants.
- The existing decision inspector remains reachable while the read-only preview is active.
- Viewer changes announce the active mode and any fallback.
- Focus returns to an exactly mapped entity or the viewer-switch control.
- Shared candidate selection remains property-only and is never announced as a confirmed action.
- Existing keyboard construction shortcuts remain owned by the production workspace.

## Failure contract

| Failure | Required outcome |
|---|---|
| Shared mount fails | dispose all partial shared resources and keep/recreate the existing renderer |
| Snapshot is malformed | fail closed; do not hide the existing decision surface |
| Confirmed construction is stale | reject shared publication |
| Support fingerprint is stale | reject shared publication |
| Selection mapping fails | clear only engineering-scene selection; retain construction candidate selection |
| Subscription creation or event validation fails | dispose the preview and return to existing renderer |
| Branch/source invalidates selected entity | reconcile by exact identity or clear it |
| Shared parity fails | no production switch; existing renderer remains authoritative |

## Blockers

1. **`PRODUCTION_OWNER_SUBSCRIPTION_MISSING`** — no immutable, reasoned `getState`/`subscribeState` production bridge exists.
2. **`BACKEND_SELECTION_MAPPING_NOT_IMPLEMENTED`** — candidate, engineering-scene, review and inspector selections are not reconciled across viewer switching.
3. **`CONTINUITY_CANVAS_LIFECYCLE_UNBOUNDED`** — constructed-network rendering uses the same canvas without a viewer-switch ownership contract.

These blockers require review because the permitted implementation files for a bridge and toggle have not been authorized.

## Review items

- `package.json` has no `test:sequential-sketcher` script. This mission cannot add it because package changes are forbidden. The readiness workflow records the command as unavailable and runs the focused Sequential suites directly.
- Existing and Shared fit policies differ intentionally.
- A future Work Pack must decide the minimum file ownership for the bridge, renderer switch and markup.
- The future Work Pack must decide whether the inactive renderer is destroyed or retained hidden; destruction is preferred for one-subscription certainty.

## SSK-ESVG-003B boundary

Because the status is `REVIEW_REQUIRED`, this gate does **not** define or authorize SSK-ESVG-003B implementation files. The executable artifact therefore contains:

```json
{
  "allowedProductionFiles": [],
  "proposedNextMission": null
}
```

A later owner decision may create a new Work Pack after the bridge and selection design is approved. That future issue must independently specify its branch, PR title, exact files, controls, Chromium cases and CI.

## Scope audit

The SSK-ESVG-003A branch may add only:

```text
docs/architecture/sequential-engineering-svg/**
tabs/sequential-sketcher/sequential-engineering-svg-production-readiness.js
tests/sequential-engineering-svg-production-readiness.test.js
tests/sequential-engineering-svg-production-readiness-static.test.js
.github/workflows/sequential-engineering-svg-production-readiness.yml
```

No open PR identified during the live audit owns these audit-only paths. No existing Sequential product, adapter, shadow, shared-core, package or application file is modified.
