# Repository Agent Instructions

This file is the canonical policy for the repository. Tools that discover
`.agents/AGENTS.md` must follow its pointer back to this file.

## Engineering Principles

- Keep changes simple, explicit, scoped, and easy to reason about.
- Reuse existing logic before adding abstractions; follow DRY, KISS, and YAGNI.
- Fix root causes, preserve unrelated work, and match established repository style.
- Write comments in English and document inputs, outputs, behavior, and explicit fallbacks close to the code.
- Prefer functional design, pure functions, immutable data, strict types, and small single-purpose functions.
- Use classes only for connectors, adapters, and external interfaces.
- Raise specific, actionable errors. Do not silently fail, hide errors, or add unrequested fallbacks.
- Inspect installed dependency source when behavior is unclear; keep dependencies project-managed.

## Common Work Pack Implementation Standards

Every coding Work Pack must enforce all of the following:

- Keep every new JavaScript file under 300 lines. Split existing files where possible only when they are edited, and always back up an existing file before editing it.
- Keep every function under 40 lines where practical.
- Use named exports only; do not add default exports.
- Prefer pure functions where practical.
- Do not add default or hidden mocks.
- Do not add shims or polyfills.
- Avoid mutation-heavy design; prefer immutable patterns.
- Do not switch the runtime, writer, or canvas unless the user explicitly approves it.
- Do not create generated snapshot or data churn unless it is explicitly part of the mission.
- Do not perform broad refactors outside the assigned Work Pack.
- Every PR must deliver usable capability, a UI action, an artifact, a measurable behavior improvement, or a measurable export improvement.
- Do not leave lint errors, dangling code, or unused code. Check this every time.

## Ad-hoc Task Patch Ledger

Every agent task that changes repository files, including a small ad-hoc task, must leave a module-wise local change ledger that another master agent can read and selectively undo.

### Required local structure

```text
.agent-worklogs/<YYYYMMDD_HHmm>_<task-slug>/
  manifest.md
  modules/
    <module-slug>.md
    <module-slug>.patch
```

- Keep `.agent-worklogs/` local and Git-ignored. Preserve it until the work is committed and handed off, or a master agent explicitly removes it.
- Before editing, inspect recent manifests for overlapping files and create a unique task directory.
- Write `manifest.md` before the first product-file edit. Record the request, agent/task identifier, start time, filesystem baseline, pre-existing dirty files, intended scope, and module plan. Version-control status may be included as optional context but must never define the baseline.
- Back up every existing target file using the repository backup rule. Record each backup ID or filename and its pre-edit SHA-256 in the relevant module log.
- Group changes by functional module, not merely by file extension or command batch. Use one module log and patch per independently reversible change group.
- Generate each `.patch` directly from the task's pre-edit snapshot to the final file state. Never derive it from `HEAD`, a commit, a branch, the index, or staged content. The ledger must work without a Git repository and remain valid after any history rewrite.
- `git diff --no-index --binary -- <pre-edit-copy> <current-file>` may be used only as a history-independent binary-safe comparison engine; exit code 1 means differences were found and is expected. An equivalent no-index diff tool is acceptable.
- For a newly created file, record that no pre-image exists, its final SHA-256, and that undo means deleting only that exact file after verifying its checksum and confirming no later agent changed it.

Each `manifest.md` must contain this index:

```markdown
| Module | Status | Planned | Did | Validation | Patch | Backups | Undo |
|---|---|---|---|---|---|---|---|
```

Each `modules/<module-slug>.md` must use these headings:

```markdown
# Module: <name>
## Planned
## Did
## Technical details
## Files and symbols
## Upstream/downstream impact
## Validation
## Patch and backups
## Undo
## Remaining risks or follow-ups
```

- Under **Planned**, state the intended behavior and boundaries before implementation.
- Under **Did**, state the actual behavior changed, including deviations from the plan.
- Under **Technical details**, record algorithms, contracts, data flow, state transitions, fallbacks, and important implementation decisions precisely enough for another agent to reason about the patch.
- Under **Files and symbols**, list every changed file and the functions, classes, selectors, routes, schemas, or configuration keys affected.
- Under **Upstream/downstream impact**, identify callers, consumers, stored data, exports, deployment paths, and compatibility concerns checked.
- Under **Validation**, record exact commands, input basis, expected result, actual result, and any tests not run. Label simulated evidence `[SIMULATED]` and ungrounded conclusions `[GUESSED]`.
- Under **Patch and backups**, link the module patch, list backup IDs/files, and record before/after SHA-256 values.
- Under **Undo**, give file-specific reversal steps based only on snapshots, checksums, and recorded hunks. Require a current checksum check first; restore the pre-edit backup or reverse only the recorded hunks. Never use reset, checkout, revert, or other history-based recovery; never overwrite later changes or undo unrelated dirty work.
- Update the module log after every material change batch and refresh its patch before handoff. Mark status as `planned`, `in_progress`, `completed`, or `blocked`; do not mark completed while required validation or undo data is missing.
- Do not place credentials, tokens, private data, or large generated artifacts in the ledger. Record safe references and checksums instead.
- Before modifying a dirty file touched by another task ledger, read its manifest and preserve its baseline. If selective undo is no longer safe because later changes overlap, stop and escalate instead of guessing.


## Backup and Git Safety

- Before editing any existing file, run `node utils/backup.cjs save <path> "Plan to ..."`.
- The command must create a timestamped binary-safe backup, a timestamped plan-log entry, and a SHA-256 checksum. Never overwrite an earlier backup or substitute a manual copy.
- `.backups/` is local recovery state. Never stage or commit it; clones do not receive it.
- See `docs/backup.md` for verification, restore, and safe pull procedures.
- Before pulling or merging with local product changes, create a preservation branch and commit those changes. Backups supplement Git; they do not replace it.
- Never use destructive Git commands or discard unrelated working-tree changes.

## Workflow

- Inspect the repository and active instructions before editing; prefer `rg` for searches.
- Do not switch runtimes, writers, canvases, deployment models, or hosting without explicit approval.
- Avoid generated snapshot or data churn unless it is part of the requested work.
- Keep refactors surgical. Ask before a major refactor or a risky cross-module change.
- Use non-interactive commands and non-interactive diffs.
- Keep imports at the top and remove unused or dangling code.
- Validate with the repository's existing lint, integration, end-to-end, or smoke strategy.
- Prefer real project data. Label ungrounded simulated results `[SIMULATED]` and solutions lacking upstream/downstream checks or real-world data `[GUESSED]`.

## Testing and Delivery

- Define input basis, expected output, and modules under test before a requested test run.
- Prefer a small number of real integration, end-to-end, or smoke tests; add unit tests only for stable pure transformations when useful.
- Avoid mocks when practical real calls exist, and never add tests only to increase coverage.
- Every delivered change must provide usable capability or measurable behavioral/export improvement.
- Do not submit an audit-only change as completed product work.
- Verify deployment compatibility when routing, hosting, or deployment is affected.

## Grounding and Architecture

- Treat `??`, `how?`, `why?`, `how come`, and `Think` as prompts to restate the problem and re-check assumptions, constraints, failure modes, and downstream effects.
- For complex, recurring, or cross-module changes, explain invariants, edge cases, and architectural impact before editing.
- Use `implementation_plan.md` only when the change is large enough to justify it.
