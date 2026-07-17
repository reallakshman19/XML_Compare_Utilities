# TTV Native SVG 3D Worklog

- Work item: Issue #354
- Branch: `agent/ttv-native-svg-3d`
- Started: 2026-07-17 09:05 Asia/Muscat
- Goal: replace Trace-tab WebGL `3D` with native SVG isometric projection and add support isolation, symbol overlays, on-canvas orientation controls, and a 3-axis compass.

## Process notes

The requested `AGENTS.md` was checked at repository root and `.github/AGENTS.md`; neither path exists on `main` as of base commit `b63da65e9cb56004e91cf852354148e29ddf2ebb`.

The execution container has no GitHub CLI and no outbound DNS, so `node utils/backup.cjs` and a local clone cannot run. The equivalent repository-side process is used instead:

1. Original file blobs are copied under `.backups/20260717_0905_ttv-native-svg-3d/` before feature files are changed.
2. All changes are made on the dedicated branch through GitHub's contents/git-data APIs.
3. Focused syntax, JSON, module-length, repository CI, and Chromium tests are recorded here.
4. A PR patch is stored as `changes.patch` after the draft PR is opened.

## Original blobs

- `topology-validator-controller.js`: `80078f7e27752bfea9e10afa4ca32133f95f3cbb`
- `topology-svg-projections.js`: `d5d840f53c475084ec310b24e10ce28daef20b5d`
- `topology-workspace-markup.js`: `888e98feec2005c3267cdd8e645f30e8ac09b3ee`
- `topology-workspace-wiring.js`: `06d6195fead9e4127b45ba9040601bdab4f21535`
- `topology-svg-view-model.js`: `6b8e861dd562be8b628bbffb7331b7ae0bda1ad0`
- `topology-parity-workspace.css`: `8ccd170c4e671624cf377719f70c138ed44ffb2b`
- `topology-trace-validator.spec.mjs`: `5b6b5d4fef54a3515f82d28759695c7e7205eed5`
- `package.json`: `de07b115b4872ab0d8085a8a8425e176f9185985`
