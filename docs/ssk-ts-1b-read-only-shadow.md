# SSK-TS-1B — Sequential Read-Only Draft Edit Shadow

## Status

This document records the contained first implementation batch for the Sequential SVG-to-3D migration.

```text
Sequential owner snapshot
→ independently certified read model
→ deterministic EngineeringScene.v1
→ EngineeringScope.v1
→ read-only four-method Draft Edit host
→ fail-open shadow lifecycle
```

## Included

- exact owner-snapshot authority regeneration;
- existing Sequential EngineeringScene projection reuse;
- deterministic selection and structural scopes;
- finite read-only geometry anchors for point, segment, and polyline entities;
- explicit denial of every edit command;
- fail-open mount, stale-authority rejection, remount, invalidation, and destroy evidence;
- integration and static containment tests.

## Excluded

- workspace production subscription;
- visible 3D renderer mounting;
- shared drag runtime;
- command routing or acceptance;
- SVG replacement;
- workspace-package migration;
- persistence changes;
- HPOS/APOS/LPOS or construction-algorithm changes.

## Next controlled batch

Mount the fail-open shadow from the existing Sequential owner bridge, expose diagnostics/read-only host access through the workspace API, and prove that owner publication remains unaffected when the shadow degrades.
