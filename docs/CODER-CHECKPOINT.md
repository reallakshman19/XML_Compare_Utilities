# CODER-CHECKPOINT · UXML-S3 final bounded reader reconciliation

**Owner decision:** 31 October 2026, 22:16 Asia/Muscat — **B: reconcile reader**, last bounded round. No further repair round, new PR, merge, release or writer work without fresh Owner authorization.

## Custody

- **Role:** coder-b; return point: XCU issue #239, topology issue #12.
- **XCU source:** prior S3 `8d430db5940f7792b9dc1f02252ec0c46a26a8f3`, final-round start `d8cf5228b0860ccda7f11c84cfd46229bd55f333`. Same branch `feat/uxml-s3-caesar-inputxml-hub-20261031`, same [draft PR #244](https://github.com/reallakshman19/XML_Compare_Utilities/pull/244) against the S1 branch.
- **TopoFix source:** prior S3 `4d1259337e81678e8c49661eeefd82f01e412365`, final-round start `86fd30420f5201c9d3c0f6040ca41ff1ea466fbd`. Same branch `feat/uxml-s3-caesar-topofix-20261031`, same [draft PR #18](https://github.com/reallakshman19/xml229-topology-wp1-preview-20261028/pull/18) against the original S1 branch.
- **Updated contract:** [docs/uxml-reader-contract.md](./uxml-reader-contract.md). Readers are source-bound and read-only; there is no InputXML writer.

## Source audit and classification

| Finding | PSI116 | Initial InputXML | Reconciled InputXML |
| --- | ---: | ---: | ---: |
| BRANCH_END_UNVERIFIED | 5 | 4 | 5 |
| ELBO_HELPER_PORTS_MISSING | 1 | 0 | 1 |
| ELBO_OWNER_ENDPOINT_MISSING | 1 | 0 | 1 |
| JUNCTION_OWNER_INFERRED_FROM_PORT_SET | 0 | 1 | 0 |

These are **synthetic fixture** results only, not an Owner benchmark. All four finding counts now agree. The 6 InputXML elements project into nine route-node records across three routes, matching the nine-node/three-branch PSI116 test fixture. Do not interpret finding-count equality as complete source or engineering equivalence.

**(a) Reader / projection fixed, with original InputXML witness:** (1) OD and wall were lost on elements following the first route element because the real Workspace writer emits explicit `DIAMETER`/`WALL_THICK` at route start, then the `-1.010100` sentinel; `physicalEvidence` now cites the first original PIPINGELEMENT index and exact attributes, and TopoFix checks the source again. (2) `BEND@RADIUS` belongs to the `TO_NODE`; normalized TopoFix type is `ELBO`, original raw type remains `BEND`. (3) Two-ended InputXML elements repeated interior nodes in the old projection; separate original routes are determined from literal source `FROM_NODE` and prior `TO_NODE`, shared route interior nodes are merged while retaining **all** original `recordKey` values. (4) Junction inference caused by assigning an SIF owner type to the wrong endpoint is corrected; the original `SIF@TYPE` remains literal and audited.

**(b) Workspace conversion losses, still UNEXPLAINED:** 9 source-field `component_ref_no` differences because the Workspace-produced InputXML has no original `REF_NO`; no synthetic component reference is invented. 4 source-field differences from original TEE declaration vs Workspace `SIF@TYPE=5` (OLET), including owner/connection fields on two route occurrences. The 13 differences remain present in the comparator output, all explicitly `UNEXPLAINED CLASS=B_WORKSPACE_CONVERSION_LOSS` with original XML field evidence. **No allow-list.** Cross-format CLI returns `DIFFERENT` (exit 1), even though findings match.

**(c) Source difference falsifier:** A source-consistent synthetic `+50 mm` change to one InputXML element's original `DELTA_X` and `TO_X` is read successfully, but the PSI116 cross-format comparison returns `UNEXPLAINED CLASS=C_SOURCE_DIFFERENCE ... NODE_POSITION` and cannot report EQUAL. Wrong delta sums / forged source refs are rejected, not reconciled by guesswork.

## Public InputXML-only samples

The public `docs/GREInputxml.xml` contains 100 elements; the public `docs/PLB314Inputxml.xml` contains 53. Both are single unanchored runs in S3 and are successfully read through the same original TopoFix engine:

| Public sample | InputXML BRANCH_END_UNVERIFIED | ELBO_HELPER_PORTS_MISSING | ELBO_OWNER_ENDPOINT_MISSING | Paired PSI116 |
| --- | ---: | ---: | ---: | --- |
| GREInputxml.xml | 2 | 12 | 12 | NOT_AVAILABLE |
| PLB314Inputxml.xml | 3 | 7 | 7 | NOT_AVAILABLE |

The matching PSI116 originals for these public examples are **not provided**. Do not invent PSI116 counts or claim cross-format equality. Within a single unanchored run, local source topology analysis is permitted; unanchored cross-run proximity/gap/join is refused.

## Tests and handover gates

- **XCU RED-before-fix:** [run #41228846526](https://github.com/reallakshman19/XML_Compare_Utilities/actions/runs/41228846526), three new reader assertions failed at baseline. **XCU GREEN-after-fix:** [run #41228967434](https://github.com/reallakshman19/XML_Compare_Utilities/actions/runs/41228967434), original reader + permanent mutation tests + three new provenance assertions PASS. Synthetic Workspace replay checks the original six-element pair and its delta-only counterpart byte-for-byte.
- **TopoFix RED-before-fix:** [run #41229013645](https://github.com/reallakshman19/xml229-topology-wp1-preview-20261028/actions/runs/41229013645), five new projection/geometry tests all failed against the original S3 adapter and comparator. **TopoFix GREEN-after-fix:** [run #41229582004](https://github.com/reallakshman19/xml229-topology-wp1-preview-20261028/actions/runs/41229582004), pinned 16-blob XCU source chain, 7 reconciliation tests including both public files, 5 previous S3 tests, 7 S1 tests all PASS.
- **Historic S3 mutation REDs** remain in the XCU reader suite: invented zero origin and missing record ordinal both fail named tests in isolated scratch; genuine wrong delta sums and forged source refs are also rejected.
- At the time this checkpoint was authored, **final exact-head independent reviewer verdict remains PENDING**, Owner private original dual-format comparison is NOT_RUN by coder-b, and release/merge remains **HOLD**. PR metadata and the final #239 work-returned receipt are authoritative for the final exact commit heads/CI runs; a checkpoint cannot embed its own immutable final SHA before its commit exists.

## Safety/ownership boundary

No modifications to TopoFix findings resolver, tolerances, CLOS rules, original PSI116 mapping, S2 coder-a files (`uxml_edit_ops.py`, `uxml_export_ops.py`, `uxml_patch_psi116.py`, `uxml_cli_common.py`, `test_uxml_psi116_s2.py`) or #13–#17. No Original Owner file bytes, node numbers, coordinates or hashes have been used. No InputXML writer, source patch, merge or production permission.

**NEXT → Oracle:** pin the two final heads, run the non-author source/geometry review against this checkpoint, the strict 13-item conversion-loss ledger and exact-head CI. Owner decides engineering disposition. **coder-b AWAIT_ORACLE** only after final receipt is published.
