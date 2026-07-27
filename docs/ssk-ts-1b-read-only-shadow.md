# SSK-TS-1B — Sequential Read-Only Draft Edit Shadow

## Status

This document records the contained read-only production-shadow slice for the Sequential SVG-to-3D migration.

```text
Sequential owner snapshot
→ independently certified read model
→ deterministic EngineeringScene.v1
→ EngineeringScope.v1
→ read-only four-method Draft Edit host
→ fail-open production subscription
```

## Included

- exact owner-snapshot authority regeneration;
- existing Sequential EngineeringScene projection reuse;
- deterministic selection and structural scopes;
- finite read-only geometry anchors for point, segment, and polyline entities;
- explicit denial of every edit command;
- stale-authority rejection and same-authority selection/projection remounting;
- fail-open subscription from the existing Sequential owner bridge;
- diagnostics, invalidation, remount, and destroy evidence;
- integration and static containment tests.

## Excluded

- visible 3D renderer mounting;
- shared drag runtime;
- command routing or acceptance;
- SVG replacement;
- workspace-package migration;
- persistence changes;
- HPOS/APOS/LPOS or construction-algorithm changes.

## Next controlled batch

Expose the mounted read-only host to a dedicated 3D Draft Edit view controller and prove visual scene, selection, support, branch-switch, and lifecycle parity against the existing SVG surface. No command routing is permitted in that batch.
