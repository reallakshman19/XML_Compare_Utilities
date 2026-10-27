# WIP-ciifr-nodal-20261027 — recovery report

Task: Owner-requested make Node-Based Name Transfer usable in current VNext without discarding merged Geometry; fix #200 marker recognition; #196 integration. Source: draft PR #176 at 3cb13e696bc346843b84623886b47323de4ffe3d. Candidate base: main@9217e52daa1ace6189ba6d02cddd66c380f9769f.

## Authority / custody
Owner explicitly instructed "do it" after unsuccessful PR176 merge. Preserve original source, current Geometry and production tile. This is a NEW integration candidate, not a silent rebase/approval of PR176. Source/served modules must remain exact bytes. #139 common-writer exception NOT ratified; this code remains DRAFT / ENGINEERING MERGE HOLD pending independent review and qualified vendor import.

## Source-backed takeover (Appendix A)
A1 Production trace: existing ui/app.js mounts NORMAL/LINE_NODE/GEOMETRY/CIIFR_GEO and a shared TARGET0 intake; PR176 mounts a separate Nodal panel with numeric-node CSV, isolated NODENAME writer, and independent new-copy export.
A2 Failure isolation: PR176 merge request rejected HTTP405 draft, GitHub mergeable=false; current main contains CIIFR_GEO and lacks Nodal tab. PR176 parser permits noncanonical leading-space/lowercase markers (IR2 #190), including TARGET1 export.
A3 Invariants: preserve immutable TARGET0, numeric TARGET0 node selection, all incident aliases, no shared pointer mutation, CRLF and unrelated MISCEL_1/sentinels, Geometry workbench lifecycle, shared app DOM, SOURCE/LINE_NODE and Normal. Restrict marker repair to Nodal writer, not shared physical.js.
A4 Evidence: previous native Windows IR2 #190 22/22 PR176 tests PASS; private original V14 input has bounded structural PASS, but no original TARGET1 generated and licensed CAESAR II NOT_RUN. Current integration new-head native/browser/independent review NOT_RUN at creation.
A5 Minimal patch: copy source+served Nodal modules and six tests from exact PR176, add fail-closed canonical marker gate in Nodal transfer, mount within MAIN HTML/app without replacing Geo, amend DOM mock, add marker regression, require distinct independent new-head review.

## Local checkout and backup limitation
The remote GitHub connector is available but this execution runtime cannot resolve github.com using git, preventing canonical native utils/backup.cjs and source-local .agent-worklogs exact-preimage patches. Preserved GitHub blob preimages + exact main commit, and separate clean branch without force. This is a transparent protocol deviation, not a claim of canonical backup compliance.

## Post-implementation validation
[NOT_RUN] full new-head Node suites, Windows browser, original GLRD TARGET1, CAESAR II licensed import, non-author independent review. Source-level checks will be recorded in follow-up. #192 inherited branch-scope test defect remains separate.

## Merge frontier
PR176 old branch remains untouched. This WIP should become a distinct draft integration PR with no automatic deployment. Reviewer must check the exact new head; Owner must resolve #139 writer exception; no merge while any engineering gate fails.

EXACT_NEXT_ACTION: Independently run native Node full Nodal/VNext suites and browser for this exact new head; perform original V14 TARGET1 byte audit + licensed CAESAR II import, resolve #139, then submit new exact-head independent verdict to Owner.