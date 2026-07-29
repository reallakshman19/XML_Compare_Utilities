# SSK-3D-P0-A — Exact Pilot Baseline Manifest and Evidence Export

## Status

```text
Roadmap phase: P0 — baseline freeze and pilot harness
Authority issue: #861
Baseline: main @ 19e04711fc54083bd8e622bbd82048839ca8ebfa
Release level: ENGINEERING_DEMO_BASELINE
New editing authority: none
```

## Purpose

This work pack freezes the existing Sequential Draft Edit 3D capability as one reproducible engineering-demo baseline. It does not qualify internal-pilot or production use and does not add an edit operation.

The Sequential Sketcher toolbar gains one visible action:

```text
Download 3D pilot baseline
```

The action is disabled until one authoritative Sequential branch is open. Export reads current authority and runtime state without preparing, applying or publishing any engineering change.

## Release artifact

The action exports:

```text
SequentialDraftEdit3dReleaseManifest.v1
```

The manifest binds:

- repository and exact frozen baseline commit;
- roadmap phase, work pack and engineering-demo release level;
- active branch, source fingerprint, read authority and scene identity;
- owner-shadow mount key and schema identity;
- current command-journal state and head;
- support-adjustment register and history heads;
- geometry-edit journal head and entry count;
- controller availability, mount, active, failure and fallback state;
- viewer runtime snapshot when mounted;
- exact supervised-command vocabulary;
- qualified geometry operations;
- same-carrier support adjustment;
- structural-impact preview capabilities;
- qualified runtime paths;
- explicit known limitations and non-authority disposition.

## Fixed capability inventory

### Supervised construction commands

```text
ADVANCE_ONE
CONNECT_CANDIDATE
DEFER_DECISION
MANUAL_CONNECT
MARK_EXTERNAL_BOUNDARY
MARK_TERMINAL
REDO_LAST_TRANSACTION
REJECT_CANDIDATE
RESUME_DECISION
REVERSE_COMPONENT
RUN_UNTIL_BLOCKED
UNDO_LAST_TRANSACTION
```

### Applied edit authority

```text
MOVE_COMPONENT
STRETCH_NODE
ROTATE_SUBGRAPH
MOVE_SUPPORT_SAME_CARRIER
```

### Structural-impact preview only

```text
ADD_STRAIGHT_ELEMENT
BRIDGE_GAP
DISCONNECT_ENDPOINT
MERGE_NODES
RETIRE_COMPONENT
SPLIT_PIPE
```

Structural-impact preview does not imply structural-topology application authority.

## Deterministic evidence

The release manifest has a canonical `manifestFingerprint`. Validation independently regenerates the complete artifact from current runtime input and rejects any difference in:

- baseline repository or commit;
- branch or read authority;
- owner, scene or revision identity;
- command, support or geometry journal heads;
- controller or viewer state;
- supported capability lists;
- runtime path inventory;
- limitation and release-disposition records.

A consistently re-fingerprinted forgery is rejected because fixed baseline and disposition invariants are asserted independently of the fingerprint.

## Browser harness

The existing real-Workbench fixture now exposes deterministic pilot-harness actions and evidence:

1. open Sequential Sketcher;
2. inspect representative staged records;
3. open one branch;
4. activate Draft Edit 3D;
5. verify real Workbench realization;
6. export the exact release manifest;
7. return manually to Construction SVG;
8. inject a `scene-apply` failure;
9. verify automatic Construction SVG fallback and reported failure;
10. close without leaked canvas.

The fixture uses the same production controller and Workbench path. The pilot export timestamp is explicit for deterministic evidence. No engineering-state mock is introduced.

## Known limitations

```text
NO_STRUCTURAL_TOPOLOGY_APPLICATION
NO_GEOMETRY_OR_SUPPORT_PERSISTENCE_IN_PORTABLE_PACKAGE
NO_HETEROGENEOUS_ATOMIC_TRANSACTION
NO_UNRESTRICTED_MULTI_SELECTION
NO_AUTOMATIC_TOPOLOGY_REPAIR
ENGINEERING_DEMO_ONLY
```

The artifact explicitly records:

```text
internalPilotReady: false
newEditingAuthority: false
structuralTopologyPublication: NOT_AUTHORIZED
packagePersistenceChange: NONE
fallbackSurface: CONSTRUCTION_SVG
```

## Containment

This work pack does not:

- mutate topology, geometry, support or construction state;
- prepare or accept a command;
- publish through command, support or geometry boundaries;
- alter package schemas or persistence;
- change the Workbench viewer, canvas or renderer implementation;
- promote the release above engineering-demo baseline;
- claim that CI is the release gate.

## Phase 0 continuation

This work pack delivers the exact release manifest, authority diagnostic export and deterministic launch/fallback harness. Remaining Phase 0 work is the representative fixture catalog, signed known-limitation register ownership and controlled operator walkthrough record.
