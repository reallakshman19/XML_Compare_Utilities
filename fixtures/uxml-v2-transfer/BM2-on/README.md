# BM2 transfer by node id (T2, Owner 22 Nov 2026)

Step 10 (3D_Converters main fed7783d, the XML to CII tab, output "both", "Engine reads UXML" on) for `Benchmarks/BM2.xml`. BM2 is a public test model (Owner, 16 Nov). Used by `prototypes/u2d-cii-source/tests/test_u2d_by_id.py`.

| File | What it is | SHA-256 of the bytes |
|---|---|---|
| `enriched.xml` | The Enriched XML step 10 delivered (the sidecar's `enriched.sha256`). | `7e7b7eb1993d469a0f9825a95499a5d5b0b32064f945496f21d6b66a46fb4050` |
| `step10.cii` | Step 10's CII for the same run. | `7534dd7fcd2d11c94ef9d814e85e6f0357296abd730ea0853d844fe0e66e77e7` |
| `step10.cii.sidecar.json` | The CII sidecar as the page downloads it (regenerated for S-fix step 3, see below). | `9bbbb54318b456ad03f0b0feabacf96f663d54d014579df823567cce5cfcfe7f` |

S-fix step 3 (Owner 23 Nov 2026): the sidecar was regenerated with 3D_Converters main 33e2c350 (PR 443), which adds `ciiSupports` (BM2: 58 = 11 from the XML, 2 moved from dropped nodes 30 and 3510, 42 by step 10's ANCI rule, 3 open-end anchors). Everything else in it, the Enriched XML and the CII are byte for byte as before. Expected supports with the sidecar: 58 points the same, 0 changes, no listed refusal; 2 XML supports counted as not written by step 10 (nodes 3300 and 3340 of /GLRD-1000-2"-B4110001-93833-01/B1, which step 10 does not write). Used also by `test_u2d_supports_by_step10.py`.
