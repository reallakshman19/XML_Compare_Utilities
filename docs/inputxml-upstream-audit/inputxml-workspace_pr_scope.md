# Phase 2 PR scope — InputXML Workspace orchestration

This PR is limited to workspace-owned routing, preflight, handoff, stale-output invalidation and diagnostics.

The shared sideload matching/mutation engine remains the Phase 1 implementation and is not duplicated here. The embedded 5C converter receives only an explicit result callback; its topology/runtime behavior is unchanged.

The temporary guarded patch runner and workflow are operational scaffolding only. They must be deleted before the PR is marked ready for review.
