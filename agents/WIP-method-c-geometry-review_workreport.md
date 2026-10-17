# WIP-method-c-geometry-review — recovery-first work report

- Work: CII-METHOD-C, plan V36-108-PLAN-01, parent reallakshman19/XML_Compare_Utilities#108.
- Worker: XMLwtMethodC (chat 6ad1fa79); MemberCoordinator/reviewer: G2 (chat 6ad1ce42).
- Authority: Owner-approved v3.6 label `relay/AIM/CII-METHOD-C.yaml` v1.0.0, label_sha `18d91c9`; main approval commit `3a7c34cd1b8f2f88b36e55503a96378406ea0c71`; issue #108 Coordinator decision #6216400079.
- Branch lease: `methodc/108-geometry-20261016`; only new Method C JS/CSS, named tests/docs, plan and recovery report. Any shared existing CII file requires exact-file G2 grant; PR #107 untouched.
- Original requested baseline for engineering reproduction: `86a2d3b40568c2bcb43dacbe32c862144d00fd53` (PR #107 HEAD, NOT a branch dependency or permission to port its diff). Method C branch starts on approved main `3a7c34cd1b8f2f88b36e55503a96378406ea0c71`.
- Status: WP1 ADMIN IN PROGRESS, WP2–WP9 NOT ACCEPTED. Plan committed; nine real children #109–117 and a unique managed index in #108 verified. Pinned v3.6 Python validator execution in container NOT_RUN due inaccessible upstream script; equivalent schema validation and provider GET readback PASS. Do not mislabel alternate validation as pinned CLI execution.
- Local prior-source evidence (not committed): `Method_C_Local_Staging_Rigid_Fit_20261016.zip`, SHA-256 `0c3470d15d95a28a4ad5874a9d4481f557970ff434a4b10e6617712408221aba`; 11/11 standalone TAP tests and detached Chromium preview reported PASS, **not** native app or original-raw CLI acceptance. Audit/adapt before porting.
- Physics constraints: rigid unit-scale proper rotation only; 1 anchor has rotation ambiguity, 2 anchors twist ambiguity, conflicting anchors show residual; ±100 mm INDEPENDENT per axis; distinguish actual TARGET NODE from segment projection; never force matches or Writer2.
- Raw witnesses to reproduce independently: S1 56 elements/57 nodes; S2 46/47; S3 45/46; T 1,614/1,619 with 5 components. Experimental 3910↔875 identity orientation: 37/45 selected route, 41/57 full anchored source; S1 4060 aligns with T 900→905 segment without TARGET NODE; second illustrative 5110↔1095 has 300.57 mm developed length disagreement.
- Validation: label/master readback PASS; plan blob GET equality PASS; nine child issue GET equality PASS; managed index uniqueness PASS; native Method A/B/Writer2 suites NOT_RUN; actual served Chromium NOT_RUN; original-file CLI against local ORIGINAL bytes NOT_RUN; G2 review NOT_RUN.
- Highest risk: accidental semantic overlap with PR #107 and treating detached geometry preview as native engineering authorization; no existing shared file modified.
- Changed file ledger: `plans/V36-108-PLAN-01.yaml` (new); this WIP report (new). Additional Method C-only modules/tests will be ledgered as added.
- Hypothesis/falsifier: local prototype can be adapted to real native CII custody while retaining signed original witnesses; falsify via SHA mismatch, counts/coordinate mismatch, collision red tests or inability to run served native workspace. No use of golden rows as live match input.
- Next review state: G2 on HOLD until Method C code matures; future independent checks of G2's own corrections required.
- Undo: for these new files, only selectively delete exact recorded files after current SHA verification and assurance no later agent edited them; never reset or force-rewrite unrelated work.

## EXACT_NEXT_ACTION
1. Create first separate draft PR from this branch to `main` without modifying PR #107.
2. Port and audit only Method C-owned modules from the local staged ZIP, one functional unit at a time, with original bytes/hash custody; prove parser against untouched originals.
3. Execute regression + negative controls; post exact-commit canonical `TASK_EVIDENCE` only for completed work on its own child issue.
4. Do not integrate into shared router until G2 exact-file grant. No merge/release.


## Recovery checkpoint — WP6 intake boundary / pending G2 shared-file grant

- Current owner lease remains \`methodc/*\` branch plus NEW Method C modules/tests/documents and dedicated CI workflow. Exact-file grant for the **pre-existing** \`tabs/cii-workspace/cii-workspace-tab.js\` and deployment mirror \`docs/tabs/cii-workspace/cii-workspace-tab.js\` has been requested on [child #114](https://github.com/reallakshman19/XML_Compare_Utilities/issues/114#issuecomment-6218912249). It has **not been received** as of this record; **DO NOT EDIT THESE EXISTING FILES**.
- Newly added/owned files: \`tabs/cii-workspace/cii-workspace-method-c-native-adapter.js\`, \`tabs/cii-workspace/cii-workspace-method-c-tile.js\`, \`tests/cii-workspace-method-c-native-adapter.test.js\`; owned \`tests/cii-workspace-method-c-ui-browser.test.js\`, CI workflow and engineering doc also updated.
- Verified hosted original-file intake crosswalk at commit \`2f47f63af69cce924aa6996afc47843ec6899e38\`: 40/40 Node tests PASS (native source/target intake, full original S1/T hashes and physical-file byte custody; wrong-side/hash/text corruption red controls). Separate WP5 hosted Chromium module remains green; tile helper browser lifecycle test and final-current-head CI still must be checked after latest commits.
- Native integration blocked: no existing CII Workspace tile/route patch yet; do not publish canonical WP6 task evidence as complete; do not label isolated tile browser walkthrough native Workspace E2E. G2 independent exact-SHA review and any later G2 corrective code still require independent check.
- Changed-file provenance: plan, WIP, WP2–WP5 new Method C modules/tests/docs/workflow and new WP6 adapter/tile/tests only. The protected PR #107 diff, main's existing CII Workspace entry, Methods A/B, Writer2 and original CII/Owner golden files remain UNCHANGED.
- Exact next action: verify the current PR #118 head and both hosted numerical/Chromium jobs, read G2's #114 authorization response. **Only if granted**, use the specified exact-file scope to mount new Method C tile in the existing native app, then serve actual application in Chromium using native CII uploads and record exported hash artifacts. Otherwise continue non-overlapping red controls and label WP6 HOLD.
