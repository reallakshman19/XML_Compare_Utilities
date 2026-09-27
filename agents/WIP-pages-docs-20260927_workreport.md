# WIP pages-docs-20260927 work report

## Mission

Prepare a checked-in `docs/` GitHub Pages publication tree for `reallaksh19/XML_Compare_Utilities` so repository Settings > Pages can use **Deploy from a branch**, branch `main`, folder `/docs`.

This is a release-plane change only. It must not change XML/CAD/topology engineering semantics.

## Live grounding

- Repository: `reallaksh19/XML_Compare_Utilities`
- Base branch: `main`
- Baseline main SHA: `af688aada9f1a1491c650a0a229b43e37a6382b0`
- Existing Pages workflow: `.github/workflows/deploy.yml`
- Existing Pages artifact contract test: `tests/deploy-workflow-pages-artifact.test.js`
- Existing workflow stages the repository root while excluding Git metadata, GitHub metadata, dotfiles, tests, node_modules, README, package manifests, Python cache files.
- `docs/` already contains authored project documentation, so a branch-source build must avoid recursive `docs/docs` copying and must preserve those authored files.
- Open PR review found no open PR specifically claiming Pages/docs deployment paths. PR #1219 records the current Pages artifact upload path as a release-plane blocker.

## Coordination

Classification: `SAFE` for the new build script and generated `docs/` publication paths, with the caveat that any later overlapping Pages/release-plane PR must be reconciled before merge.

## Scope

Planned new durable files:

- `scripts/build-pages-docs.mjs`
- `docs/.nojekyll`
- `docs/.pages-build-manifest.json`
- `docs/pages-deployment.json`
- generated `docs/<runtime/source path>` files mirroring the existing Pages staging policy, excluding source `docs/` to prevent recursion.

No workflow YAML edit is planned. No package.json edit is planned.

## Build invariant

The checked-in `docs/` tree must contain:

- `docs/index.html`
- `docs/main-rhbg-fitguard.js`
- `docs/tabs/psnm-utility-pages-entry.js`
- the shared build token `standalone-20260903-ciiw-ms-compare-action-refresh-1`
- `docs/.nojekyll`

The generated manifest is the only deletion authority for future rebuilds: the build script may remove prior generated paths listed by that manifest, but must not delete authored documentation that is not listed.

## Validation state

- Existing deployment workflow and contract test inspected: PASS (inspection).
- Current main recursive tree inspected: 5,212 blobs; 2,995 files match the existing Pages artifact policy after excluding source `docs/` for branch-build recursion safety.
- Collision check between those generated targets and current authored `docs/` files: 0 collisions.
- Local Node execution: NOT_RUN (connector-only repository access in this session).
- Deployed browser smoke: NOT_RUN.

## Highest risk

Branch-based Pages publishes every file under `docs/` publicly. The repository is private, so the existing warning in GitHub Settings is material. This change follows the user's requested branch/`docs` deployment model; it does not change GitHub's publication visibility.

## EXACT_NEXT_ACTION

Add the branch-build script, generate the `docs/` publication snapshot from baseline main using the same inclusion/exclusion policy as the current Pages artifact workflow (plus `docs/` recursion exclusion), validate required files/build token by repository inspection, then open a PR. Do not merge without owner authorization.
