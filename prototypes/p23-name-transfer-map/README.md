# P2.3 Name Transfer from a Map file
Copy names from a source CII v14 to a target CII v14 using approved node pairs. No new name records are created. The unchanged P0.2 kernel checks the target checksum, old names, approval, byte spans and name uniqueness. Any refusal produces no revised file.

## Run

From this folder, with Node 22:

```
node cli.mjs plan source.cii target.cii map.json proposals.json
node cli.mjs approve proposals.json approved.json --by Engineer
node cli.mjs apply target.cii approved.json revised.cii
node --test
node bench/run.mjs --repo-root ../..
```

CLI prints JSON and returns 0 on success, 1 on refusal, 2 for bad usage. Outputs must be new paths. `plan` prints the Change set plus unchanged, missing-record and skipped blank-source rows, and informational wouldRepeat warnings. Warnings evaluate the final names after all proposed renames, without filtering any proposal. Approve only after reviewing the proposed names. Selected approval is available in the engine; applying a set containing unapproved changes refuses the whole set. The HTML page uses the same engine; serve this folder locally (ES modules require a local static server). Load the three files, plan, enter approver, approve, apply, export. Browser not tested per Oracle instruction.

The public X-TEXP → X-T plan contains 35 proposals and one missing record (10330). Applying all 35 currently refuses: the source reuses names for different nodes, forbidden by the pinned kernel. A node can also occupy multiple physical name slots. No partial output is emitted. The explicit test/benchmark subset selects one eligible node per distinct new name (12 nodes, 24 slots) and applies successfully. Production plans are never silently filtered. See REPORT.md.

## Refusal codes
| Code | Meaning |
|---|---|
| `NAMES_DOCUMENT_INVALID` | Map or Change set fails shared format rules. |
| `NAMES_FIELD_NOT_ALLOWED` | Change set includes non-name edits. |
| `NAMES_TOO_LONG` | Name must be text of at most 25 characters. |
| `NAMES_SOURCE_NAME_CONFLICT` | A node has different tokens; the refusal identifies the source or target file. |
| `NAMES_MAP_FILE_MISMATCH` | Map file hashes do not match the loaded files. |
| `NAMES_MAP_PAIR_INVALID` | Approved pair refers to a missing or repeated node. |
| `NAMES_TARGET_HAS_NO_ENTRY` | Informational noEntry row: target lacks an adjacent name record. |
| `NAMES_APPROVAL_INVALID` | Approver/time missing or selection unknown. |
| `NAMES_READBACK_FAILED` | A planned or unplanned node name, record or field diff does not match the plan. |
| `KERNEL_NAME_IN_USE` | A proposed name would name multiple different nodes. |
| `KERNEL_NOT_APPROVED` | At least one change is unapproved. |
| `INPUT_SHA256_MISMATCH` | Benchmark bytes differ from pinned hash. |

Other CII reader and kernel refusals are passed through unchanged. CLI additionally refuses unreadable inputs (`INPUT_NOT_FOUND`), invalid JSON (`NAMES_JSON_INVALID`), input/output collision (`NAMES_OUTPUT_IS_INPUT`) or failed output creation (`NAMES_OUTPUT_FAILED`).
