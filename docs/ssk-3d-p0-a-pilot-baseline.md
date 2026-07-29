# SSK-3D-P0-A — exact pilot baseline manifest and evidence export

## Status

Implemented against:

- repository: `reallaksh19/XML_Compare_Utilities`
- baseline commit: `bda5489ef8097bdc41a26dbc30a9be2498a3e89e`
- roadmap phase: P0 — baseline freeze and pilot harness
- release level: engineering demonstration only

## Usable capability

The Sequential Sketcher toolbar exposes **Download 3D pilot baseline evidence**.
The control remains disabled until the current command, support, geometry,
read-model, scene, and production-shadow boundaries resolve to one active
Sequential branch.

One accepted click captures the current governed runtime snapshot, constructs the
artifact, and independently regenerates it from that captured authority before
download. The action then downloads one immutable JSON file:

```text
ssk-sequential-draft-edit-3d-pilot-baseline.json
application/json
SequentialDraftEdit3dReleaseManifest.v1
```

The action is read-only. It does not publish commands, edit geometry, move
supports, change selection, switch renderers, modify the canvas owner, or alter
package state.

## Evidence content

The manifest records:

- exact repository and baseline commit;
- engineering-demo release level;
- active branch and complete edit-authority identity;
- source, branch-set, command-journal, owner-revision, support-register,
  support-history, and geometry-journal fingerprints;
- effective read-model and engineering-scene identities;
- exact scene entity count and deterministic scene fingerprint;
- production-shadow status, authority, and mount key;
- controller availability, active, mounted, failure, and lifecycle state;
- current `ViewerStateSnapshot.v1` when a viewer is mounted;
- Construction SVG and Draft Edit 3D surface visibility;
- explicitly supported command, geometry, support, and structural-preview lists;
- explicit known limitations.

No timestamp is embedded. Identical governed runtime state therefore produces
byte-equivalent canonical JSON and the same manifest fingerprint.

## Validation and tamper behavior

`assertSequentialDraftEdit3dReleaseManifest` verifies schema and canonical
fingerprint. `validateSequentialDraftEdit3dReleaseManifest` additionally
regenerates the complete manifest from current runtime authority and requires an
exact canonical match.

Re-fingerprinting a changed payload is insufficient. Validation fails closed
when any governed value changes, including:

- baseline repository or commit;
- active branch or edit authority;
- command, support, or geometry journal head;
- owner, read-model, or scene identity;
- scene entity count;
- viewer/controller/fallback state;
- supported capability or limitation list.

## Failure containment

Viewer mount, scene-application, runtime, or navigation failure continues to use
the existing controller containment path. Draft Edit 3D is deactivated, its
surface is hidden, and the Construction SVG is retained. The evidence feature
records the controller failure count and fallback visibility without changing
engineering authority.

## Files

```text
docs/ssk-3d-p0-a-pilot-baseline.md
tabs/sequential-sketcher/scoped-edit/sequential-draft-edit-3d-release-manifest.js
tabs/sequential-sketcher/scoped-edit/sequential-draft-edit-3d-pilot-feature.js
tabs/sequential-sketcher/scoped-edit/sequential-scoped-edit-3d-controller.js
tabs/sequential-sketcher/sequential-sketcher-markup.js
tests/sequential-draft-edit-3d-release-manifest.test.mjs
tests/sequential-draft-edit-3d-pilot-ui.test.mjs
tests/browser/sequential-scoped-edit-3d-workbench-fixture.html
tests/browser/sequential-scoped-edit-3d-workbench.spec.mjs
```

## Verification

```text
node --check tabs/sequential-sketcher/scoped-edit/sequential-draft-edit-3d-release-manifest.js
node --check tabs/sequential-sketcher/scoped-edit/sequential-draft-edit-3d-pilot-feature.js
node --check tabs/sequential-sketcher/scoped-edit/sequential-scoped-edit-3d-controller.js
node --check tabs/sequential-sketcher/sequential-sketcher-markup.js
node --check tests/sequential-draft-edit-3d-release-manifest.test.mjs
node --check tests/sequential-draft-edit-3d-pilot-ui.test.mjs
node --check tests/browser/sequential-scoped-edit-3d-workbench.spec.mjs
node tests/sequential-draft-edit-3d-release-manifest.test.mjs
node tests/sequential-draft-edit-3d-pilot-ui.test.mjs
npx playwright test tests/browser/sequential-scoped-edit-3d-workbench.spec.mjs
git diff --check
git diff --name-only bda5489ef8097bdc41a26dbc30a9be2498a3e89e...HEAD
```

The repository has no configured lint command or ESLint dependency. Syntax,
focused contract/static tests, Playwright browser evidence, file/function-size
inspection, prohibited-pattern inspection, and exact-path diff review are the
applicable static gates. This statement does not claim a lint run occurred.

## Rollback

Before merge, discard `agent/ssk-3d-p0-a-pilot-baseline`. The exact base is
preserved at `backup/ssk-3d-p0-a-pilot-baseline-bda5489`. After merge, revert
the single Work Pack commit. Downloaded evidence is read-only and requires no
migration rollback.
