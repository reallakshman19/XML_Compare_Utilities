# PR1002 — CII Writer 1C authority and future upgrade roadmap

# CURRENT RECOVERY STATE — READ FIRST

## Recovery Header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: DRAFT_DOCUMENTATION_NORMALIZED_PHASE1_AUTHORITY
WORK_INTENT: DESIGN_AUTHORITY / ROADMAP
CRITICALITY: ENGINEERING_CRITICAL_WRITER_AUTHORITY
REPOSITORY: reallaksh19/XML_Compare_Utilities
PR: 1002
IMPLEMENTATION_ISSUE: 1003
IMPLEMENTATION_PR: 1004
BRANCH: agent/cii-writer-1c-roadmap
BASE_AT_GROUNDING: main@5a5fa0ae5068a7c15eecc1a57557e71336b9754c
PREDECESSOR: PR1001 merged -> 5a5fa0ae5068a7c15eecc1a57557e71336b9754c
MERGE_AUTHORITY: OWNER_ONLY
CURRENT_STAGE: DOCUMENTATION AUTHORITY NORMALIZED TO PHASE1 EVIDENCE
CURRENT_BLOCKER: NONE INSIDE PR1002; PR1004 MUST RECONCILE STACKED-BASE DRIFT AFTER THIS BRANCH UPDATE
EXACT_NEXT_ACTION: refresh PR1002 live state and file ledger; then reconcile PR1004 against the updated PR1002 head without merging either PR
```

## Handover in 60 seconds

PR1002 is documentation-only. It freezes Writer 1C as pointer-stable, row-count-stable mutation of already-existing auxiliary records, but Phase-1 evidence from PR1004 tightened two earlier roadmap assumptions.

The governing Phase-1 authority is now:

```text
original TARGET bytes are physical authority
+ exact persisted NODENAME physical custody
+ apply-time custody re-proof
+ independently derived authorized span set S_auth
+ Writer-reported spans are testimony only
+ actual byte changes D must satisfy D ⊆ S_auth
+ exact preimage/postimage
+ fixed-width in-place replacement
+ structural and semantic negative assurance
```

Writer 1C does **not** rewrite the whole CII file from parsed objects/text.

Phase-1 transaction authority is NODENAME-only Writer-1C APPLY. Mixed Writer-1A/1B APPLY + Writer-1C APPLY remains blocked until the complete mixed transaction receives equivalent original-byte qualification. Long-term lower-writer delegation remains a roadmap goal, not current Phase-1 authority.

Shared physical ownership is fail-closed:

```text
same span + different desired bytes -> BLOCK
same span + identical desired bytes -> canonicalize only with complete compatible owner set
unselected alias changed by mutation -> BLOCK
```

SIF/TEE remains closed while `FIELD_2_SEMANTICS_UNQUALIFIED` is true. Hanger mutation remains outside Writer 1C.

---

# 1. Ground truth

Latest grounding before this checkpoint:

```text
main = 5a5fa0ae5068a7c15eecc1a57557e71336b9754c
PR1001 = MERGED
PR1002 = OPEN / DRAFT / MERGEABLE before branch normalization
Issue1003 = OPEN / WRITER_1C_IMPLEMENTATION HANDOFF
PR1004 = OPEN / DRAFT / stacked implementation follow-on
branch = agent/cii-writer-1c-roadmap
production-code changes in PR1002 = 0
```

This checkpoint updates only PR1002-owned documentation/custody paths. Live GitHub state overrides this snapshot.

---

# 2. Source findings driving the roadmap

## 2.1 NODENAME

Current qualified layout used by Phase-1 implementation:

```text
ELEMENT block rows                  15
NODENAME pointer row                13 zero-based within ELEMENT block
NODENAME pointer fixed field        [67,80) zero-based on that row
NODENAME FROM slice                 [2,28)
NODENAME TO slice                   [28,53)
```

The crucial upgrade from the original roadmap is that semantic extraction is insufficient for mutation. Intake must retain exact original-byte custody for the physical pointer/row/FROM/TO spans and complete alias ownership.

## 2.2 SIF / TEE

Structural evidence establishes:

```text
SIF/TEE block = 10 rows
ELEMENT SIF/TEE pointer = 1-based block index
existing block ownership = pointer-bound
```

But engineering field semantics remain intentionally unqualified:

```text
FIELD_2_SEMANTICS_UNQUALIFIED
```

Therefore no raw SIF/TEE COPY is authorized. Phase 2 starts with a source-qualified field dictionary, not writer code.

## 2.3 Hangers

Current evidence proves only node presence/count from:

```text
CONTROL.NOHGRS + MISCEL_1.IHGRNODE
```

HGRDAT/TAG/GUID and cardinality-safe mutation remain unqualified. Hanger mutation remains Writer 2 territory.

---

# 3. Writer 1C structural gates

Every 1C operation must satisfy:

```text
TARGET auxiliary row/block already exists
AND pointer value/index remains unchanged
AND section row count remains unchanged
AND CONTROL counts remain unchanged
AND no record is inserted/deleted/reordered
AND no element/node/connectivity is created/deleted/renumbered
AND exact record ownership is proven
AND exact field semantics or byte-slice custody is source-qualified
AND mutation is explicitly APPLY in the bound transfer scope
AND original TARGET bytes remain the physical authority
AND preview physical custody is re-proved at apply time
```

Failure of any gate keeps the operation in Writer 2/3 territory.

Long-term architecture may delegate lower Writer classes, but Phase 1 is deliberately narrower:

```text
Writer 1C Phase 1
  -> APPLY only qualified NODENAME Writer-1C operations
  -> all other mutable operations explicitly EXCLUDE
  -> mixed 1A/1B + 1C APPLY transaction BLOCKED until separately qualified
```

---

# 4. Mandatory first slice — existing NODENAME rows

Qualified Phase-1 authority:

```text
existing TARGET NODENAME pointer > 0
existing referenced TARGET row exists
pointer/row/field ownership is exact
SOURCE/TARGET identity is bound
SOURCE desired name fits exact ASCII field width
operation is APPLY
patch equal-width bytes in original TARGET stream
pointer unchanged
row count unchanged
```

Creation/deletion stays Writer 2.

Required fail-closed blockers include:

```text
WRITER_1C_NODENAME_POINTER_REQUIRED
WRITER_1C_NODENAME_ROW_OUT_OF_RANGE
WRITER_1C_NODENAME_LAYOUT_DRIFT
WRITER_1C_NODENAME_FIELD_OVERFLOW
WRITER_1C_NODENAME_PREIMAGE_MISMATCH
WRITER_1C_NODENAME_SHARED_RECORD_CONFLICT
WRITER_1C_NODENAME_UNAPPROVED_ALIAS_EFFECT
WRITER_1C_NODENAME_CREATE_REQUIRES_WRITER_2
WRITER_1C_NODENAME_RECORD_DELETE_REQUIRES_WRITER_2
```

Shared physical spans are arbitrated before write. Last-writer-wins is prohibited.

---

# 5. Planned second slice — existing SIF/TEE fields

Before enabling any SIF/TEE field, establish an authoritative field map containing at minimum:

```text
section
10-row block-relative row
field or byte-column span
numeric/text format
engineering meaning
unit basis where applicable
zero/blank semantics
allowed domain
pointer ownership
preimage expectation
source locator / authority path
```

Only same-block, same-pointer, same-row-count in-place edits can even be candidates for Writer 1C.

Explicit Writer 2 territory remains:

```text
record CREATE/DELETE
new 10-row block allocation
pointer renumbering
section compaction/expansion
CONTROL count change
```

---

# 6. Anti-drift qualification

The independent validator derives mutation authority; the Writer does not self-authorize its own changed spans.

Definitions:

```text
S_auth = independently derived authorized physical byte spans
B      = Writer-reported mutation spans / testimony
D      = actual changed byte indices
```

PASS requires:

```text
D ⊆ S_auth
B consistent with expected report for S_auth
exact TARGET preimage at S_auth
exact expected postimage at S_auth
all bytes outside S_auth identical
```

Structural invariants include:

```text
file byte length unchanged for Phase-1 NODENAME
physical line count unchanged
line-ending sequence unchanged
section order unchanged
ELEMENT block count/cardinality unchanged
all ELEMENT pointers unchanged
CONTROL values unchanged
NODENAME/SIF/RESTRANT/RIGID/MISCEL_1 row counts unchanged
node count / element count unchanged
node identities unchanged
connectivity unchanged
```

A requested edit that succeeds while an unrelated pointer, whitespace byte, padding byte, comment byte or line ending changes is unequivocally FAIL, even if the CII reparses.

Writer 1C must not reconstruct or serialize the complete file from parsed text/objects. SHA custody is over original bytes.

At least one independent oracle is required per Writer-1C family. Production Writer helpers may not calculate the expected output for that oracle.

---

# 7. Current implementation evidence from PR1004

PR1004 is the stacked implementation follow-on. Its durable status records Phase-1 engineering-path qualification including:

```text
exact TARGET1 original-byte identity                     PASS
production NEUTRAL intake + NODENAME physical custody   PASS
production core Writer1C benchmark round trip           PASS
real TARGET1 unauthorized-byte falsifier                PASS
stale TARGET SHA falsifier                              PASS
shared/redundant NODENAME ownership cases                PASS
independent Python fixed-column oracle                   PASS
Writer1A/1B focused regressions                          PASS
Chromium Writer1C product routing/binary path            PASS
full repository suite                                    NOT_RUN
GitHub PR checks/workflows                               NOT_RUN / none present
```

The full repository suite remains an execution gate; the documentation PR does not convert that `NOT_RUN` into PASS.

---

# 8. Future phases

```text
Phase 0  close retained repository-wide qualification debt
Phase 1  Writer 1C existing NODENAME rows
Phase 2  source-qualify SIF/TEE field semantics, then one field family at a time
Phase 3  optional existing auxiliary text after separate qualification
Phase 4  Writer 2 pointer/cardinality transaction engine
Phase 5  Writer 3 topology transaction engine
Phase 6  mutation manifest / rollback / batch automation
```

Writer 2 must be a relocation transaction engine, not a set of local pointer patches. Writer 3 owns node/element/connectivity changes.

---

# 9. Implementation issue

Issue #1003 remains the authoritative implementation task. Its Phase-1 handoff is now backed by PR1004 evidence, and it continues to prohibit SIF/TEE mutation until semantic field authority exists.

---

# 10. Changed-file ledger

PR1002 must remain exactly documentation/custody-only:

```text
agents/MASTER_INDEX.md
agents/PR1002_workreport.md
agents/claims/PR1002.yaml
agents/status/PR1002.yaml
docs/CIIcompareconceptnote.md
```

No production code belongs in PR1002.

---

# 11. Validation truth

```text
main grounding: PASS / SOURCE_INSPECTION
PR1002 ownership/coordination: PASS / SOURCE_INSPECTION
concept-note Phase1 authority normalization: PASS / DOCUMENT_UPDATE
production code execution in PR1002: NOT_APPLICABLE
browser execution in PR1002: NOT_APPLICABLE
Writer1C implementation evidence: REFERENCED_FROM_PR1004, not reclassified as PR1002 execution
full repository suite for implementation stack: NOT_RUN
```

Known baseline debt retained separately: live `main` already has a parserAuthority expectation mismatch in `tests/cii-workspace-intake.test.js`; if the eventual full suite fails there it must be classified as PREEXISTING unless new evidence proves otherwise.

---

# 12. Decisions / risks / debt

- `DEC-1002-01` Writer 1C is defined by physical ownership and cardinality stability, not UI family name.
- `DEC-1002-02` Original TARGET bytes are physical mutation authority for Writer 1C.
- `DEC-1002-03` Independent validator-derived `S_auth` is authorization; Writer mutation reports are testimony.
- `DEC-1002-04` Phase-1 mixed lower-writer mutation is blocked pending separate transaction qualification.
- `DEC-1002-05` SIF/TEE raw field 2 remains blocked while semantics are unqualified.
- `RISK-1002-01` PR1004 is stacked on PR1002; any PR1002 head movement creates base drift that must be reconciled before review/merge progression.
- `DEBT-1002-01` Full repository execution for PR1004 remains NOT_RUN because the current runtime lacks a complete checkout/execution transport.

---

# Appendix A — expert handover questionnaire

1. From `cii-workspace-physical-file.js`, `cii-workspace-nodename.js`, and the independent validator, trace how original bytes become a qualified NODENAME TO/FROM span and why decoded text is not mutation authority.
2. Given Writer-reported set `B`, validator-derived `S_auth`, and actual diff set `D`, state the exact acceptance relationship and design a falsifier where `B` looks correct but an unrelated SIF pointer byte changes.
3. Explain why two operations requesting the same bytes in one physical NODENAME span can still be unsafe when an unselected alias owner exists; identify the required blocker and owner-set evidence.
4. Explain why Phase-1 cannot simply delegate Writer1A/1B APPLY operations and then patch NODENAME in the same transaction, even though the lower writers are individually qualified.
5. Identify the minimum authoritative evidence required before `SIF/Tee raw code (field 2)` can receive a Writer1C mutation token, and explain why pointer/block custody alone is insufficient.
