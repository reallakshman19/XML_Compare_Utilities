# EF-05 transfer by node id (T2, Owner 22 Nov 2026)

Step 10 (3D_Converters main fed7783d, the XML to CII tab, output "both", "Engine reads UXML" on) for `Benchmarks/EF-05-PRO.TEST.xml`. EF-05 is a public test model (Owner, 16 Nov). Used by `prototypes/u2d-cii-source/tests/test_u2d_by_id.py`, `tests/uxml-v2-transfer-in-app.test.mjs` and "Use the EF-05 sample by node id" in review page section 5.

| File | What it is | SHA-256 of the bytes |
|---|---|---|
| `enriched.xml` | The Enriched XML step 10 delivered (the sidecar's `enriched.sha256`). | `b1a6a831f4bbbb85aead9b67c73af54e4192cfa54b05de788a7bfce374df4f1b` |
| `step10.cii` | Step 10's CII for the same run (the sidecar's `cii.sha256`). | `f514e02409d8ddfc5c1cc7334d9525a0262a36d390680e4efe4b44f63c944808` |
| `step10.cii.sidecar.json` | The CII sidecar as the page downloads it (`JSON.stringify(sidecar, null, 1)`). | `30629ca02b6402e9d359f38bb5cc5eeb7650de1e446d600b1cfd073da58b6a0e` |
| `shared-points.cii` | `step10.cii` with the wall thickness (element from end) and insulation (to end) set on every element end at the 45 points where today's transfer refuses (`U2D_NODE_AMBIGUOUS`: several XML records at one point), one value per node id (5.00, 5.01, ...). Made by `edit_shared_points` in `test_u2d_by_id.py`, which checks the file. | `1a793fadf2e61c60e1ccc0bf1535083fae7a54c8492286806870f199a32ac6de` |

Expected in section 5 (CII weights in N): without the sidecar 0 values transferred and `U2D_NODE_AMBIGUOUS 45`; with it 112 values on 84 node ids, no `U2D_NODE_AMBIGUOUS`, and the by-node-id line (616 elements, no node renumbered).
