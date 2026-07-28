# SSK-TS-3H — Browser-qualified supervised command lifecycle

## Status

```text
Authority issue: #703
Dependency: merged SSK-TS-3G / PR #702
Dependency merge: fee6ff7ceab380e5ff7fd07880356f00e8f1e137
Implementation branch: agent/ssk-ts-3h-browser-command-lifecycle
```

SSK-TS-3H adds browser qualification only. It changes no production command, target, controller, scene, markup, CSS, persistence, transaction, journal, or construction-runtime module.

## Qualification boundary

The dedicated browser fixture imports the production:

```text
createSequentialDraftEditCommandPanel()
projectSequentialReversalCandidates()
```

It supplies deterministic immutable current-state evidence and a recording gateway. The gateway does not grant authority; it records the request produced by the production panel and returns deterministic prepared/acceptance evidence for browser assertions.

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

The fixture binds one exact current decision and candidate identity. Browser proof confirms:

- selection alone creates no preparation, acceptance, or publication;
- actor, reason, and evidence are mandatory;
- prepared command retains decision, candidate, scene entity, issued time, prepared ID, authority ID, predicted outcome, and transaction mapping;
- cancellation clears prepared evidence without publication.

### Candidate-bound manual connection

The browser proof confirms that the request uses only the indexed port pair already carried by the selected current candidate:

```text
fromPortId = /SSK/3H/BROWSER/P1:LPOS
toPortId   = /SSK/3H/BROWSER/C1:APOS
```

No visible port field exists.

### Boundary decision

The fixture supplies one open zero-candidate boundary decision. Browser proof confirms that classification retains exact decision identity, reason, and certified decision-target evidence.

### Component reversal

The fixture creates one indexed two-port component and derives the native candidate through `projectSequentialReversalCandidates()`.

Browser proof confirms exact:

- decision ID;
- reversal-candidate ID;
- component ID;
- entry-port ID;
- reversal-target ID;
- predicted `COMPONENT_TRAVERSAL_REVERSED` outcome;
- prepared authority and transaction evidence.

Selection remains non-publishing. Publication occurs only after a separate visible accept click.

## Failure and lifecycle containment

The browser proof covers:

- missing actor;
- missing reason;
- missing evidence note;
- stale acceptance rejection;
- authority/decision refresh invalidation;
- panel closure invalidation;
- single-shot acceptance;
- zero publication after cancellation or stale rejection.

Existing SSK-TS-1B browser coverage continues to qualify renderer exit, source reload, contained viewer failure, and controller destruction. SSK-TS-3H adds no duplicate production harness for those paths.

## Visible surface containment

The dedicated fixture exposes exactly the same twelve supervised command types:

```text
ADVANCE_ONE
RUN_UNTIL_BLOCKED
CONNECT_CANDIDATE
MANUAL_CONNECT
REJECT_CANDIDATE
MARK_TERMINAL
MARK_EXTERNAL_BOUNDARY
REVERSE_COMPONENT
DEFER_DECISION
RESUME_DECISION
UNDO_LAST_TRANSACTION
REDO_LAST_TRANSACTION
```

It exposes no candidate, component, connection, entry-port, from-port, or to-port authority input.

## Static containment

The static suite verifies:

- the new browser fixture imports the production panel;
- exactly twelve command controls are present;
- the browser spec is admitted by the existing Playwright configuration;
- primary tests use DOM clicks and inputs;
- the browser spec does not directly invoke panel prepare/accept or any gateway method;
- no free-form target fields or geometry gesture paths are introduced;
- all existing production line limits and named-export checks remain unchanged.

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

SSK-TS-3H does not authorize:

- new command types;
- automatic preparation or acceptance;
- arbitrary component or port selection;
- free-form authority IDs;
- geometry or topology editing;
- default-renderer changes;
- SVG retirement;
- SSK-TS-3I implementation.
