# SSK-TS-3H-Q — Browser-qualified supervised command lifecycle

## Status

```text
Authority issue: #703
Dependencies:
  - merged SSK-TS-3G / PR #702
  - merged SSK-TS-3H support move preview / PR #708
Baseline: bc8737181b68b8866cffac408f52e30a2745ebbd
Implementation branch: agent/ssk-ts-3h-q-browser-command-lifecycle-clean
Superseded PR: #706
```

SSK-TS-3H-Q adds browser qualification only. It changes no production command, target, controller, support-move, scene, markup, CSS, persistence, transaction, journal, or construction-runtime module.

## Qualification boundary

The dedicated browser fixture imports the production:

```text
createSequentialDraftEditCommandPanel()
projectSequentialReversalCandidates()
```

It supplies deterministic immutable current-state evidence and a recording gateway. The gateway does not grant authority; it records the request produced by the production panel and returns deterministic prepared and acceptance evidence for browser assertions.

The primary lifecycle proof uses actual DOM operations:

```text
select fixture authority
→ fill visible actor / reason / evidence controls
→ click visible command button
→ inspect visible prepared review
→ click visible cancel or accept control
```

The browser specification does not call `panel.prepare()`, `panel.accept()`, or `gateway.execute()` directly.

## Covered target classes

### Candidate

Browser proof confirms that selection alone creates no preparation, acceptance, or publication; actor, reason, and evidence are mandatory; prepared evidence retains exact target and transaction identities; and cancellation clears prepared evidence without publication.

### Candidate-bound manual connection

The request uses only the indexed port pair already carried by the selected current candidate:

```text
fromPortId = /SSK/3H/BROWSER/P1:LPOS
toPortId   = /SSK/3H/BROWSER/C1:APOS
```

No visible port field exists.

### Boundary decision

One open zero-candidate boundary decision proves exact decision identity, reason, and certified decision-target evidence.

### Component reversal

The fixture creates one indexed two-port component and derives the native candidate through `projectSequentialReversalCandidates()`. Browser proof retains exact decision, reversal candidate, component, entry port, target, outcome, prepared authority, and transaction evidence.

Selection remains non-publishing. Publication occurs only after a separate visible accept click.

## Failure and lifecycle containment

The browser proof covers missing actor, missing reason, missing evidence, stale acceptance, authority refresh, panel closure, single-shot acceptance, and zero publication after cancellation or stale rejection.

Existing SSK-TS-1B browser coverage continues to qualify renderer exit, source reload, contained viewer failure, and controller destruction. The merged SSK-TS-3H support-move target, draft, overlay, and non-publication safeguards remain unchanged.

## Visible surface containment

The fixture exposes exactly the existing twelve supervised construction command types and no candidate, component, connection, entry-port, from-port, or to-port authority input.

## Static containment

The static suite verifies:

- the fixture imports the production panel;
- exactly twelve command controls are present;
- the lifecycle spec is admitted by the Playwright configuration;
- primary tests use DOM clicks and inputs;
- no direct panel prepare/accept or gateway path appears;
- no free-form target fields or geometry gesture paths are introduced;
- every post-#708 support-move static assertion remains present;
- production files remain unchanged.

## Validation status

```text
Source and scope inspection: available
Browser fixture: present
Browser specification: present
Playwright admission: present
Static containment: present
Exact-head Playwright execution: not available in this connector environment
```

No browser, Node, aggregate, or CI pass is claimed without exact-head execution evidence.

## Deferred work

SSK-TS-3H-Q does not authorize new command types, automatic preparation or acceptance, arbitrary component or port selection, geometry or topology editing, support-draft application, default-renderer changes, SVG retirement, or SSK-TS-3I implementation.
