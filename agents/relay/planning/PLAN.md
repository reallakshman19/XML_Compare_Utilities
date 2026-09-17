# V2.5 initialization plan for #1224

This relay is intentionally non-executable. It was bootstrapped from legacy branch `revision/cii-writer2-nodename-byte-r1-1224` at `956db6b33d15874678851f20f7c8b6573c9d25e0` after Owner instruction to adopt `engineering-pr-delivery-v2.5`.

## Current node

`WP-V25-MIGRATION-001` — inventory and reconcile legacy V2 evidence for issue #1224.

The legacy V2 chain, endpoints, handovers, question set, candidate fix, and benchmark evidence are inputs to migration only. No legacy endpoint is an executable V2.5 EP. Existing technical findings may be adopted only after they are represented in repository-native V2.5 discovery/qualification custody.

## Truth boundary

- Production fix: `NOT_APPLIED_PRODUCT`.
- Retained S1/S2/S3/T/TEXPECTED benchmark: `NOT_RUN_ENVIRONMENT`.
- Latest GitHub Actions retry: failed before runner assignment with zero executed steps.
- V2.5 material authority: `NONE`.
- Active V2.5 execution package: `null`.

## Ordered next work

1. Inventory the legacy artifacts for `CII-W2-NODENAME-BYTE-R1-1224`.
2. Classify them as adopt / revalidate / supersede / archive, preserving history without importing lifecycle authority.
3. Create V2.5 DISC evidence for the two current first-wrong-boundary findings: source-subgraph propagation strictness and pre-multisource loss of Writer1C REPLACE through Writer2 contraction.
4. Reconstruct applicable QSET/QUAL obligations and an independent byte-oracle obligation.
5. Establish a transaction contract for the mixed NodeName workflow.
6. Only after the V2.5 authority chain is complete, create an EP that may derive material-write authority.

No product module, retained benchmark input, workflow, or protected converter may be changed during this initialization node.
