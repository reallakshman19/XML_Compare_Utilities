# BM2 transfer by node id (T2, Owner 22 Nov 2026)

Step 10 (3D_Converters main fed7783d, the XML to CII tab, output "both", "Engine reads UXML" on) for `Benchmarks/BM2.xml`. BM2 is a public test model (Owner, 16 Nov). Used by `prototypes/u2d-cii-source/tests/test_u2d_by_id.py`.

| File | What it is | SHA-256 of the bytes |
|---|---|---|
| `enriched.xml` | The Enriched XML step 10 delivered (the sidecar's `enriched.sha256`). | `7e7b7eb1993d469a0f9825a95499a5d5b0b32064f945496f21d6b66a46fb4050` |
| `step10.cii` | Step 10's CII for the same run. | `7534dd7fcd2d11c94ef9d814e85e6f0357296abd730ea0853d844fe0e66e77e7` |
| `step10.cii.sidecar.json` | The CII sidecar as the page downloads it (regenerated for S-fix step 3, see below). | `9bbbb54318b456ad03f0b0feabacf96f663d54d014579df823567cce5cfcfe7f` |
| `roundtrip.json` | T4 step 2: the round trip `tests/uxml-v2-step10-roundtrip.test.mjs` runs (step 10 -> CAESAR II edits -> transfer -> step 10 -> transfer): the XML step 10 first runs on, the edit set, and the expected counts of both transfers (the second: 0 edits, 0 support changes). | `c15b52964621409f8653f56f8e3deed7876d2cc259bca4597f9509098721737f` |

S-fix step 3 (Owner 23 Nov 2026): the sidecar was regenerated with 3D_Converters main 33e2c350 (PR 443), which adds `ciiSupports` (BM2: 58 = 11 from the XML, 2 moved from dropped nodes 30 and 3510, 42 by step 10's ANCI rule, 3 open-end anchors). Everything else in it, the Enriched XML and the CII are byte for byte as before. Expected supports with the sidecar: 58 points the same, 0 changes, no refusal. Nodes 3300 and 3340 of /GLRD-1000-2"-B4110001-93833-01/B1 are second ANCI records at the points of 3290 and 3330 with the same +Y: step 10 contracts them into those nodes (they are in the sidecar's notInCii) and writes one +Y each. Until S-fix 3i round 3 (26 Nov 2026) they were counted as not written by step 10 (2 U2D_SUPPORT_NOT_IN_CII), and a change at 3290 or 3330 was written on that node alone, so step 10 brought the second +Y back. Used also by `test_u2d_supports_by_step10.py`.
