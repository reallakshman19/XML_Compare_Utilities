# SSK-TS-3H-Q — Browser-qualified supervised command lifecycle

## Status

```text
Authority issue: #703
Dependencies:
  - merged SSK-TS-3G / PR #702
  - merged SSK-TS-3H support move preview / PR #708
Browser implementation merge: PR #706
Browser implementation merge SHA: 193446815924042d5286a4661d2ca4d25312b0ec
Normalization branch: agent/ssk-ts-3h-q-browser-command-lifecycle-clean
```

SSK-TS-3H-Q is the browser-qualification companion to SSK-TS-3H. It changes no production command, target, controller, support-move, scene, markup, CSS, persistence, transaction, journal, or construction-runtime module.

## Qualification boundary

The dedicated fixture imports the production:

```text
createSequentialDraftEditCommandPanel()
projectSequentialReversalCandidates()
```

It supplies deterministic immutable current-state evidence and a recording gateway. The gateway records requests produced by the production panel and returns deterministic prepared and acceptance evidence for browser assertions; it grants no authority.

Primary lifecycle proof uses actual DOM operations:

```text
select fixture authority
→ fill visible actor / reason / evidence controls
→ click visible command button
→ inspect visible prepared review
→ click visible cancel or accept control
```

The browser specification does not call `panel.prepare()`, `panel.accept()`, or any gateway execution method directly.

## Covered target classes

### Candidate

Selection alone creates no preparation, acceptance, or publication. Actor, reason, and evidence are mandatory. Prepared evidence retains exact target, issued-time, authority, outcome, prepared-ID, and transaction identities. Cancellation clears prepared evidence without publication.

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

The fixture creates one indexed two-port component and derives the native candidate through `projectSequentialReversalCandidates()`. Browser proof retains exact decision, reversal candidate, component, entry port, target, predicted outcome, prepared authority, and transaction evidence.

Selection remains non-publishing. Publication occurs only after a separate visible accept click.

## Failure and lifecycle containment

Browser proof covers missing actor, missing reason, missing evidence, stale acceptance, authority refresh, panel closure, single-shot acceptance, and zero publication after cancellation or stale rejection.

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
- every post-PR-708 support-move static assertion remains present;
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
