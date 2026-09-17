# V2.5 handover — #1224

## Current relay state

- Lifecycle: `INITIALIZING`
- Material authority: `NONE`
- Active EP: none
- Objective: `OBJ-CII-W2-NB-R1-1224`
- Phase: `PH-V25-MIGRATION`
- Work package: `WP-V25-MIGRATION-001`
- Progress: `0%`

## Source custody

Owner adoption instruction is recorded at:
`https://github.com/reallaksh19/XML_Compare_Utilities/issues/1224#issuecomment-5712756544`

V2.5 protocol basis:
`reallaksh19/Common@feae969b860b83ee3df230fef1a162d4a4e7968e:skills/engineering-pr-delivery-v2.5/SKILL.md`

Legacy V2 source branch/head:
`revision/cii-writer2-nodename-byte-r1-1224@956db6b33d15874678851f20f7c8b6573c9d25e0`

Legacy EP12, ACTIVE/CURRENT state, candidate package, QSET answer, and benchmark evidence are migration evidence/context only until reconciled. They are not an executable V2.5 EP.

## Technical truth carried as discovery leads, not promoted authority

1. Current propagation requires equal source/target frontier cardinality and later treats unmatched target component edges as blockers, conflicting with required injective source-subgraph matching.
2. Current Writer2 member preview contracts nonblank-to-different-nonblank NodeName REPLACE to `BLOCKED` before multisource aggregation, so downstream multisource selection changes alone cannot recover Writer1C COPY authority.
3. Writer1C same-cardinality fixed-span mutation and Writer2 structural relocation remain protected low-level domains pending V2.5 qualification.
4. The current PB-0003 retained benchmark is lower-bound selectability evidence, not a complete mixed-transaction postimage proof.

## Environment truth

Retained-real execution remains `NOT_RUN_ENVIRONMENT`. GitHub Actions run `35060526042`, attempt 3, failed before runner assignment (`runner_id=0`, no steps). No byte-faithful repository checkout is mounted in the local execution environment.

## Exact next node

Perform migration inventory/reconciliation for the legacy #1224 chain, then create repository-native V2.5 DISC evidence. Do not create a material EP or modify production code before the reconstructed authority chain permits it.
