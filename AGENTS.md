# Repository Agent Instructions

## Timestamped Backup and Plan Log

- Before editing an existing file for a structurally risky change or a change expected to exceed 25 lines, create a timestamped backup inside `.backups`.
- Name each backup with the source path encoded in the filename and the timestamp format `dd_MM_yy_HH_mm`, for example `workbench3d__viewer__workbench-viewer_17_07_26_06_57.js.bak`.
- Before the source edit, create a matching `.backups/plan-log_dd_MM_yy_HH_mm.md` file.
- The plan log must map every timestamped backup to a concise `Plan to` statement describing the intended change.
- Preserve unrelated working-tree changes and never overwrite an earlier backup.

