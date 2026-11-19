# EF-05 transfer sample (Owner 18 Nov 2026)

Used by "Use the EF-05 CAESAR II sample" in review page section 5, and by `tests/uxml-v2-ef05-sample.test.mjs`. EF-05 is a public test model (Owner, 16 Nov).

| File | What it is | SHA-256 of the bytes |
|---|---|---|
| `base.xml` | The Enriched XML that step 10 (3D_Converters main 8ae7e02b, the XML to CII tab, output "both") writes for `Benchmarks/EF-05-PRO.TEST.xml`. | `706f048989eed218296359f8263ebe98b05de9a285a23bcf06ba089fcaf4a2a3` |
| `source.cii` | Step 10's CII for the same run (sha256 045918b3…), with Temperature 1 raised by 10 on every one of its 616 elements, as an engineer's CAESAR II edit would. | `930446cb90d2236d89b5bcc0413f28a536844ace7569c739dddd10b5682bed46` |
| `supports-edits.cii` | Supports from CAESAR II, step 3 (Owner 18 Nov): `source.cii` with four scripted RESTRANT edits: node 50 stiffness 2E+12, node 90 support removed, a guide added at node 240, a +Y support on node 99999 (a node the XML does not have). Expected: 41 values and 3 support changes applied and locked, node 99999 refused (`tests/uxml-v2-supports-apply.test.mjs`). | `5a00c8e3f16c51c3b2b2da1e4a655255c113678c170839449a369db151e79751` |
| `broken-pipe.cii` | Group 2 (Owner 19 Nov): a pipe broken in CAESAR II. Step 10 (3D_Converters 8ae7e02b, the step 10 that wrote `base.xml`; on `base.xml` it gives 045918b3, as `source.cii`) on `base.xml` with pipe 2490 -> 2520 (4900 mm, branch `/ASIM-1836-4"-P8810038-31441C4-PP/B1`) broken at its midpoint by an ATTA node 2505 with a +Y support (stiffness 1.751270E+12). 617 elements (base: 616). Expected: node 2505 made between 2490 and 2520, its +Y transferred and locked, 0 other changes (`tests/uxml-v2-cii-new-node*.test.mjs`). | `ac1f4d3a50b4aeeeb3601f7862e9f97f92e75b13d76add9af0e292f3af07b4ec` |

Expected result in section 5, with the CII weights in N:
- the transfer pairs all 617 CII nodes and transfers 41 values, the Temperature 1 of each of the 41 branches, each 10 above the base;
- the run under locks completes, and every temperature the stage tried to reset keeps the transferred value;
- the restraint count of the final XML equals that of `base.xml`.

**Made with the step 10 of 18 Nov 2026 (before 3D_Converters PR 433).** That step 10 did not write the supports on the 11 unnumbered EF-05 ATTA points (NodeNumber -2), so these files and the section 5 line "11 supports in the XML that step 10 does not write" stay true for them. Step 10 from PR 433 on writes those 11 supports (raw EF-05 CII f514e024), so a new step 10 CII shows 0 such supports.
