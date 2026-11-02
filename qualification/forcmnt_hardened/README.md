# Hardened FORCMNT section qualifier

Publishes the existing XMLv3 qualification continuation as a standalone CLI. The five executable files and their candidate manifest are unchanged from the scoped qualification candidate. It extracts one pinned public CII fixture's FORCMNT section into typed/lexical XML, then reconstructs that section body using XML alone.

Read [current qualification and limitations](QUALIFICATION_STATUS.md) before interpreting output. This is section qualification; the output is not a complete CII file.

## Run from the repository root

Use unoptimized Python and `-B`. Clear any nonzero `PYTHONOPTIMIZE` setting. Create a new, private scratch directory outside the checkout; set `SCRATCH` to its path. Both destination files must be absent and the parent directory must already exist.

```sh
python -B qualification/forcmnt_hardened/entry.py extract --source Benchmark/T.CII --xml "$SCRATCH/forcmnt.xml"
python -B qualification/forcmnt_hardened/entry.py reconstruct --xml "$SCRATCH/forcmnt.xml" --output "$SCRATCH/FORCMNT-body.bin"
```

PowerShell uses `$env:SCRATCH` instead of `$SCRATCH`. Compare the reconstructed body with the original FORCMNT source section using an independent source comparator. Expected body: 9,060 bytes, SHA-256 `b6602bcdd4d48a13952af26171d3c620071e4e39361072c7500babd5dd558d7e`.

The XML declaration is permitted; other processing instructions are rejected, including UTF-16 encodings. The entrypoint refuses optimized Python, verifies five code pins before import and before publication, and checks them again on completion or failure. Destinations are exclusive/new; existing outputs are not replaced.

The manifest is a trusted consistency baseline, not a signature. Replacing code together with its trusted manifest is outside this safeguard. Calling payload modules directly bypasses the qualified entrypoint. The scoped Python file-open audit is not an operating-system sandbox. File fsync does not imply directory or power-loss durability.

`ORIGIN.json` and the CLI's static `PRIMARY_SCOPED_ONLY` / `independent_acceptance=NOT_RUN` output fields retain their author-stage wording to preserve executable identities. The subsequent scoped assisting-IR PASS is recorded separately in QUALIFICATION_STATUS.md and its public receipt; these static fields are not a current review ledger.
