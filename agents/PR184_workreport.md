# PR184 — CIIFR_GEO G1 linked-pick evidence inspector

**Work ID:** CIIFR-GEO-G1-LINKED-PICK-REVIEW-1; same existing WBS3.1/G1/M13 / native XCU #180. **Owner order:** framework → highest-value code → prepare existing-agent onboarding. **Authority:** source-only read-only CONTRIBUTOR, self-assessed; no implementation/GPU/WebGL acceptance, merge, deployment, writer, Cycle activation or Oracle cutover.

## Exact recovery locations
- Candidate PR184 head at initial source publication: `2f79f552aff238dbf795799c3c961e6d243b31f2`, branch `codex/ciifr-g1-pick-evidence-20261026`, stacked on PR183 exact `3a1bec9524c8a14e4b0a90a23d628f0b5d47aaf6`, itself stacked on PR181 `683a1ac37b5e4457b3e67753cec1c951ec1a2dc9`.
- Files new only: `tools/ciifr-geo-pick-review/{review.mjs,cli.mjs,tests.mjs,FRAMEWORK.md,README.md,ONBOARDING_PLAN.md}` and this workreport. Pre-existing product/Method C/view/worker/GPU/Writer/workflow/Common/Progress files: unchanged.
- Root source contract: PR183 `CIIFR.GeometryDisplaySnapshot.v1`, `resolveGeometryPick`, and actual `candidates.rows`; relevant issue [#180](https://github.com/reallakshman19/XML_Compare_Utilities/issues/180#issuecomment-6408924726). Common [PR514](https://github.com/reallakshman19/Common/pull/514) is a **merged prepared brief**, not an implementation assignment.

## Technical result
The real existing `view.js` TARGET click currently uses first-result `rows.find(...)` and can hide a many-to-one candidate. The source-only CLI instead locates typed objects by exact side/member/XML-SHA/NODE-or-ELEMENT/local ID, independently computes every SOURCE-row link from Method C candidate alternatives and segment/element witnesses, checks PR183 scene source metadata, epoch and writer=false. Returns all linked source IDs/unchanged full ledger rows, reusedTarget flag, `OFFLINE_SNAPSHOT_ONLY`; rejects malformed/missing/fabricated links or identity mismatch. No full UI renderer or GPU code is included.

## Validation ledger
- **PASS, developer/SELF_ASSESSED:** `node --test tools/ciifr-geo-pick-review/tests.mjs`, 8/8 local synthetic tests (0 fail), including actual child process invocation of the CLI with a synthetic exported JSON. `node --check` for each three .mjs files PASS.
- **Publication:** initial JS Git blob SHA matches exactly local `git hash-object`: `review.mjs fdff0543bd556b34c2b4f281889bb9e8cc678acc`, `cli.mjs d9098fa282a089b45d8cf390e5c1f8dac0c546ca`, `tests.mjs 63ce704f9ce06b72ba8635f26d78d8548312d8f3`. GitHub connector commit/tree produced draft PR184; compare exact post-report head before adoption.
- **NOT_RUN:** full native XCU repository checkout/regression (this host DNS cannot resolve github.com, code fetched via connected GitHub source), actual PR183 JSON produced from real XML, served SVG/Three/WebGL, Windows Owner trial, independent reviewer, native CAESAR source/engineering semantics.
- **Data:** no private original/customer files, no secret/handoff folder locators, no sample asserted as real physical model witness. Tests deliberately use fake candidate data; **not** real S1/T acceptance.

## Changed-file and undo ledger
All task files are NEW; no existing module modified and so no existing-file backup required. Local independent ledger resides `.agent-worklogs/20261026_0920_g1-pick-review/` and is deliberately not committed. Selective undo is deletion of each *exact new file* only after SHA check and confirmation there were no later edits; never `reset` or overwrite unrelated work. GitHub branch is unique; no files claimed by PR183 were changed. Real new UI assignment would require independent file-ownership and native Appendix A qualification.

## Risks, hold and EXACT_NEXT_ACTION
Largest surviving issue: **current UI still picks only one SOURCE for a shared TARGET**; source-only offline evidence does not fix it. PR183 saved binding can remain self-consistent while stale: UI builder must check `geometrySceneBinding(session.current())` after callbacks. Browser/GPU capability and actual local native checkout are missing from this author host.

**EXACT_NEXT_ACTION:** Review the source-only inspector with one actual PR183 export if accessible; keep real-input NOT_RUN otherwise. The existing, already-source-onboarded builder `6adedbc6` (not a successor Oracle) should receive a separate actual authorized WBS3.1 assignment based on Common PR514, obtain a native checkout/Appendix A and bind all-row selection to SVG/existing viewer with current-session callbacks. Return real served/browser evidence on #180, preserving separate G2 #177 and Element WBS4 HOLDS. **ONBOARDING_PLAN.md is prepared, NOT dispatched; no new Cycle now.**
