# SSK-TS-2A — Sequential Journal-Aware Workspace Package v2

## Purpose

Persist the accepted-command authority introduced by SSK-TS-1A before any production command is originated from Draft Edit 3D.

```text
existing workspace package v1
+ journal adoption checkpoint
+ post-adoption CommandJournal.v1
+ exact branch-set authority
+ journal-head fingerprint
→ SequentialWorkspacePackage.v2
```

## Guarantees

- existing `SequentialWorkspacePackage.v1` creation and restoration remain unchanged;
- v2 packages declare a minimum reader revision and reject unsupported future readers;
- the command journal is validated before export and again after restoration;
- the adoption checkpoint must match the restored source and complete branch workspace set;
- every journal payload must retain exact `SequentialNativeCommand.v1` identity;
- every command branch must exist in the restored workspace set;
- every non-null transaction reference must exist in that branch transaction ledger;
- source, branch-set, checkpoint, journal-head, authority, and outer-package fingerprints are re-derived;
- restoration exposes the journal only after all evidence passes.

## Scope boundary

This slice is an additive package foundation. It does not change the current v1 export UI, route commands from Draft Edit 3D, enable decision commands, alter construction algorithms, or retire either SVG renderer.

A later adoption slice may switch the production export/import controller to v2 only after exact package preview, application-receipt, and downgrade-blocking evidence is complete.
