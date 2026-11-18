# EF-05 transfer sample (Owner 18 Nov 2026)

Used by "Use the EF-05 CAESAR II sample" in review page section 5, and by `tests/uxml-v2-ef05-sample.test.mjs`. EF-05 is a public test model (Owner, 16 Nov).

| File | What it is | SHA-256 of the bytes |
|---|---|---|
| `base.xml` | The Enriched XML that step 10 (3D_Converters main 8ae7e02b, the XML to CII tab, output "both") writes for `Benchmarks/EF-05-PRO.TEST.xml`. | `706f048989eed218296359f8263ebe98b05de9a285a23bcf06ba089fcaf4a2a3` |
| `source.cii` | Step 10's CII for the same run (sha256 045918b3…), with Temperature 1 raised by 10 on every one of its 616 elements, as an engineer's CAESAR II edit would. | `930446cb90d2236d89b5bcc0413f28a536844ace7569c739dddd10b5682bed46` |

Expected result in section 5, with the CII weights in N:
- the transfer pairs all 617 CII nodes and transfers 41 values, the Temperature 1 of each of the 41 branches, each 10 above the base;
- the run under locks completes, and every temperature the stage tried to reset keeps the transferred value;
- the restraint count of the final XML equals that of `base.xml`.
