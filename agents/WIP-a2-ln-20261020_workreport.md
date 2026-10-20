# WIP-a2-ln-20261020 | Agent 2 | Issue #141

TAKEOVER_AUTHORITY = READ_ONLY initially; decision after A1-A5 = CONTINUE,
limited to newly created Line/Node files, tests and served copies. No claims
of third-party qualification. Identity: executing ChatGPT GPT-6 session;
independent of Agents 1 and 3 source code; no worker subdelegated.

## Grounding / task
- Owner contract #139 (`CiiFnrVnext.Proposals.v1`) and work packet #141.
- Read root AGENTS.md and pinned Common START_HERE; verified `main` and
  reserved A2 head both initially `9a5916f972af170f272c525907728237391b7ca8`.
- Adjacent reserved A1/A3 branches existed; no A2 PR or owner-path overlap.
  Writer2 #121 and Method C #127/#137/#138 are semantic overlaps requiring
  separate later review but have no planned exact-file modifications here.
- Local `git clone` attempt failed DNS resolution; live GitHub connector served
  as read-only GitHub truth. No existing repo file was changed.

## Appendix A qualification
A1: traced real v11 (`Benchmark/CIICompare/BM_CII_SOURCE.CII`) and v14
(`Benchmark/S1.CII`) original repository records. Both have 15 physical
records per element; line is +10, 7X/I5/1X/ASCII; pointer is +13 **sixth**
integer, 1-based `NODENAME`. Rows have FROM [2,28), TO [28,53).
A2: fifth +13 integer references other auxiliary data, not NODENAME;
shared pointers/duplicated labels risk unintended engineering changes.
A3: readonly, correct original-byte spans and SHA-bound claims, both selector
conditions hard, ambiguous identity HOLD, no cross-file node-ID assumptions.
A4: independent synthetic fixtures and Node crypto SHA test; original private
GLRD SOURCE/TARGET unavailable, not falsely certified.
A5: minimal new namespaced byte parser, selectors, planner, tests and mirror.
No claimed external qualification score, no Oracle benchmark access.

## Implementation
Public function `planLineNodeRules(request)` is synchronous, pure and returns
frozen read-only data. Modules: `bytes.js` (original byte scanner + SHA256),
`cii.js` (strict v11/v14 physical layout and connected components),
`selectors.js` (field-scoped literal/regex with explicit independent flags),
`index.js` (70/30 evidence, joint gates, aliases, conflict/HOLD policy),
`README.md` (API semantics); exact `docs/` mirror. New independent test file:
`tests/cii-fnr-vnext-line-node.test.mjs`.

## Validation
- PASS [SIMULATED]: `node --test tests/cii-fnr-vnext-line-node.test.mjs`,
  16 of 16 individual Node subtests on local task copy (not a full repo clone).
  Test expected values specified independently of the engine, using Node
  `crypto.createHash` as independent SHA256 implementation.
- PASS [SIMULATED]: permutation, renumbered TARGET node IDs, connected/disconnected
  duplicated labels, suffix conflict, blank/malformed, FROM/TO, alias partial,
  regex captures/invalid/unsafe/overflow, full line family, tees and both mandatory gates, competing nodes,
  overlapping rules, original span/newline v11/v14 fixtures.
- NOT_RUN: private original GLRD SOURCE/TARGET SHA256 receipts, Oracle withheld
  expected outputs, independent engineering review, full repository CI, browser
  integrated UI, downstream writer/patch/benchmark validation.
- Actual public repository file inspection is READ_ONLY evidence, not a
  full original-input execution of this planner.

## Risk, hypothesis, falsifier
Highest risk: original CII variants may use further physical text layouts not
represented in inspected v11/v14 samples. Hypothesis: guarded formats suffice
for sampled neutral files; falsifier: source original with valid variant record
where current parser holds, or accepted claim whose `before` differs from exact
TARGET0 bytes. Fail closed rather than reinterpret malformed layouts.
Regex safety is conservative heuristic, not a proof for all pathological
expressions; external regex engine hardening may be needed before untrusted
production use. Shared pointer cloning is unsupported by design.

## Patch ledger / backups / undo
Task-local `.agent-worklogs/20261020_1851_a2-line-node` manifest, module log
and no-index new-file patch. New files have no preimage; no backup command was
necessary because no existing file was edited. Verify current SHA256 before
selective new-file deletion. Local clone remained unavailable.

## Branch / PR / release
Branch: `wip/cii-fnr-vnext/a2-line-node-20261020`.
Commit and PR: to be updated upon actual connected GitHub write.
No merge or existing production tile changes authorized/performed.

EXACT_NEXT_ACTION: Oracle/Agent 1 checks exact committed public adapter and
served mirror, obtains private original GLRD custody with SHA256 receipts, runs
independent adversarial CII cases, and qualifies before integration; Owner alone
may authorize merge or later production tile replacement.
