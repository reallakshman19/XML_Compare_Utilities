# P2.3 Name Transfer from a Map file (Oracle revision)
Base XCU main 8409590f36b641bfc755809e27f2e46d315300f2. Independent of P2.1. Folder prototypes/p23-name-transfer-map. No browser run. Delivery via authorized connector branch only. Vendor the unchanged P0.2 kernel; write CII only through it. Use the pinned kit reader and shared validator. Version 14 only.

Plan approved cii-node pairs from a hash-locked Map file. A conflicting name for one node refuses NAMES_SOURCE_NAME_CONFLICT. Names >25 characters refuse NAMES_TOO_LONG. Missing name records are listed NAMES_TARGET_HAS_NO_ENTRY; never add records. Proposals start unapproved. Provide approveAll and approveSelected, applyNames with independent read-back, CLI plan/approve/apply, and HTML plan/approve/apply/export. Refuse wrong map hashes as NAMES_MAP_FILE_MISMATCH; refuse read-back failure as NAMES_READBACK_FAILED. Benchmarks X-T, X-TEXP, X-S1 per pinned kit.

## Tests
- T1: X-TEXP → X-T: independently compute expected 35 changes; noEntry node 10330.
- T2: full map refuses KERNEL_NAME_IN_USE with no output bytes.
- T2b: explicitly select one eligible pair per distinct new name; approve and apply. Diff only NODENAME, all read-backs OK.
- T3: candidate and rejected pairs do not propose.
- T4: invented 26-character name refuses, no output.
- T5: wrong map hash refuses.
- T6: vendor kernel matches manifest SHA-256.

## Mutations
M1 allow 26 characters (T4 red); M2 also write an element field (T2b red); M3 skip checksum (T5 red). Undo mutations. B1 T2b apply median of three under 2000 ms. Keep the kernel unchanged and fail closed. No old CSV comparison. Report decisions and failures.
