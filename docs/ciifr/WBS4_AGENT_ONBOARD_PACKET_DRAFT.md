# CIIFR E1-FIELD-MAP-1 — Agent onboarding packet (PREPARED; NOT DISPATCHED)

Status: **PREPARED ONLY**. No named agent, chat identity, work assignment, private-file transfer, engineering approval, merge, release, or Oracle control cutover is claimed by this document.

## Release condition / owner responsibilities

The project's authorized Oracle (in standalone mode) should issue the packet **only after**:

1. The E0 Oracle framework at [WBS4_ORACLE_E0_E1.md](WBS4_ORACLE_E0_E1.md) is present on the selected exact GitHub candidate, the synthetic/source test receipts have been read, and the read-only capability limitations are explicit.
2. Check live [Progress Page PR #15](https://github.com/reallakshman19/progress-page/pull/15): published/main vs draft R4 state. Do **not** say R4 is live until Owner merges and page readback confirms.
3. Check live [CIIFR issue #167](https://github.com/reallakshman19/XML_Compare_Utilities/issues/167) and existing Geometry issue #166; confirm the sole writer for any overlapping source files/branches. E1 packet touches **only new read-only E1 paths / docs and tests** unless the Oracle grants an exact amendment.
4. Check pinned [Common Oracle Standalone](https://github.com/reallakshman19/Common/blob/a9491531fb98f6fd14bc486a4cc78ee4680cb1f5/skills/agent-work/oracle-standalone/SKILL.md), [Contribution/Handoff](https://github.com/reallakshman19/Common/blob/a9491531fb98f6fd14bc486a4cc78ee4680cb1f5/skills/agent-work/CONTRIBUTION_HANDOFF.md), [Progress Page](https://github.com/reallakshman19/Common/tree/a9491531fb98f6fd14bc486a4cc78ee4680cb1f5/skills/agent-work/progress-page), and selected project-specific coding protocol. The v3.6 lifecycle requires a real selected label/parent plan; do **not** invent it.
5. Before sharing any private original CII or report, follow [Common Artifact Relay](https://github.com/reallakshman19/Common/blob/a9491531fb98f6fd14bc486a4cc78ee4680cb1f5/skills/agent-work/ARTIFACT_RELAY.md). Public relay has hash/status/locator only; actual private bytes remain in authorized custody. Verify authorized recipient retrieved/hashed bytes before claiming transfer.
6. The Oracle or Owner designates exactly one initial agent for **E1-FIELD-MAP-1**. Record real short chat ID and actual role only after allocation; no self-assigned identity. The framework contributor must not independently review its own affected source/expected answers.

## Scope and bounded acceptance

**Goal:** Validate the read-only v14 physical field map needed before any ELEMENTS and RIGID Find & Replace writer.

A. Read exact E0 document, Hexagon v14 references and live main/current PR; independently map all 53 element real values and 15 auxiliary pointers (their physical line/column/byte spans), especially pointer #2 RIGID and #12 NodeName.

B. Show for *each candidate-to-enable field* its stable field ID, 1–53 ordinal, engineering name, units/profile-dependent ambiguity, applicable sentinel rules, physical location and observed lexeme, all on synthetic evidence. Confirm Material Number is not silently invented as one of the 53; if the Owner needs it, identify its distinct physical contract or mark `UNSUPPORTED`.

C. Demonstrate RIGID Weight/Type physical two-slot representation and pointer owner multiplicity. Handle pointer zero vs attached weight zero, shared index, invalid index, incomplete sections. Never change any input byte.

D. Cross-check the existing `tools/ciifr-wbs4/readonly-catalog.mjs` against an **independently derived** v14 reference (not only a mirror of the same expected array) and a separate read-only physical parser/scan. Record any discrepancy without changing the expectation to match the candidate.

E. Return a useful bounded ledger (no private customer values on GitHub): candidate exact head SHA, 53 field source-index reconciliation, rigid pointer sample ownership, synthetic positive/negative results, gaps by field, a source-labelled `NOT_RUN` for native CAESAR II and fields without independent semantic proof.

**Done** means read-only code+reference evidence returned at exact candidate, with independent contradictory-case challenge and clean ownership. It does **not** mean a runnable editor or engineering acceptance.

## Paste-ready onboarding instruction (fill only verified facts)

> [CIIFR · E1-FIELD-MAP-1 · AGENT ONBOARDING — PROPOSED]
>
> METER: report approximate context use (LOW/MID/HIGH/NEAR-END) and basis.
>
> You are assigned E1-FIELD-MAP-1 **only if this message comes from the authorized Oracle after checking current canonical state**. Read the Owner aim/WBS4 on CIIFR Progress Page (published or current draft, labelled), [issue #167](https://github.com/reallakshman19/XML_Compare_Utilities/issues/167), and `docs/ciifr/WBS4_ORACLE_E0_E1.md`. Read the actual main and selected framework PR exact head (Oracle provides SHA), and pinned Common Progress Page + Contribution/Handoff + artifact relay protocols. Preserve Geometry WBS3 as review-only; no changes to VNext NodeName writer, current source/served mirrors, or existing private files.
>
> **Stage 0:** repeat the bounded outcome in at most five lines; confirm repository, selected branch/head, source documentation and actual access. Distinguish read-only GitHub source access from permission to receive the Owner's private original. If required input is unavailable, report exact scope `BLOCKED`; do not synthesize a private acceptance.
>
> **Stage 1:** independently derive the 53-field physical specification, 15 pointers (Rigid #2, NodeName #12), text length/label layout, and field-specific numeric/sentinel caveats. Run positive and adversarial synthetic cases in `tests/ciifr-wbs4-readonly-catalog.test.mjs`, or independently replace the cases if expectations are questionable. Use a separate source oracle for any claim of engineering meaning.
>
> **Stage 2:** if authorized private custody becomes available, read/rehash the original; run the **read-only** field map and publish only sanitized counts, hashes, mismatch codes and test evidence. No customer text/labels/bytes; no writer, TARGET1, merge, deploy or native CAESAR acceptance claim.
>
> **RETURN** to CIIFR issue #167, or another exact issue assigned by the Oracle: prefix `[AGENT · E1-FIELD-MAP-1]`; include task/basis/SHA, prediction-vs-outcome for a material wrong-case, positive and negative checks with commands/results, bounded PASS/FAIL/NOT_RUN, unit and sentinel uncertainties, self-assessment/independence disclosure, actual changed paths and next recommended bounded task. Follow the selected engineering skill's actual TASK EVIDENCE and SELF-CHECK forms; do not fabricate a selected v3.6 label or child issue.
>
> **STOP** before edits outside your approved new E1 paths, user data exposure, a structural writer change, conflict with another sole writer, or an unsupported v14 field meaning. Await Oracle challenge and explicit next task; do not merge.

## Oracle challenge and post-return routing

- **First challenge**: could a wrong field ordinal or mistaken unit be accepted despite all synthetic offset checks passing? Use independent source derivation and authentic importer observations later; never promote source-format proof to engineering meaning.
- **Second challenge**: could pointer 0 be mistaken for zero RIGID Weight, or could a shared RIGID record be silently edited for two elements? Require both contradictory cases before enabling writer.
- **Integration**: check original NodeName branch-crossing gate and exact-byte TARGET0 safeguards remain unchanged; do not infer equivalence from clean local test count.
- **Next two connected deliverables** (subject to Owner/Oracle route): E1 accepted read-only field contract, then E2 **one specifically selected** numeric property editor; E3 RIGID Weight comes after pointer-level transaction semantics. No blanket 53-field Apply release.
- **Continuity**: post stable task, candidate head, source/fixture links, exact unresolved cases, and one next actor to native GitHub. Progress Page updates are coordinator-authored from real evidence via `pp_cli.py`, not a worker editing JSON.

This file is a reusable **prepared handoff**. The Oracle's later activation message, actual recipient identity, private custody and accepted gate results are separate events.
