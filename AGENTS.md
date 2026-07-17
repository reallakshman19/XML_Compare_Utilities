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
