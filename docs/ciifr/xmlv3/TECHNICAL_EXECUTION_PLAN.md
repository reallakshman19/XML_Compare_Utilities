# XMLv3 - Corrected technical execution plan

State: XV3_1B_IMPLEMENTED_SELF_ASSESSED / TESTS_19_PASS / XV3_7_NOT_RUN / NOT_DISPATCHED.

Execution update: primary Oracle/Coder01a1746f implemented the scoped reader/CLI boundary. New intake7 PASS3.553s and original12 PASS112.041s, zero failures/errors/skips; exact source/splice identities preserved. Current candidate/logs/recovery: .agent-worklogs/20261026_1904_xmlv3-intake-01a1746f/ and checkpoint8. The design card below is the retained pre-implementation basis; do not redispatch completed XV3-1B. Next assistance is non-author review of this implemented candidate.
26 October 2026, Asia/Dubai. Baseline: checkpoint7 and its assistance clarification. Engineering PR Delivery is withdrawn, including A1-A5/adoption requirements; substantive validation, native backups, local patch ledgers and actual authority boundaries remain.

Primary: XMLv3 Oracle/Coder01a1746f-74ee-74d1-aad3-9c5ff090df59 retains responsibility for architecture, scope, integration, validation, Owner reporting and completing the XMLv3 task. Agents assist with bounded implementation or independent assessment and return work to the primary. Owner engineering acceptance is separate.

## Sequence and source anchors

1. XV3-1B: an assisting Coder implements bounded XML file intake.
2. XV3-7 partial: a non-author Independent Reviewer assesses the integrated, frozen final candidate. Review follows implementation and primary validation; it does not examine a moving intermediate tree.

Working location: D:/CodeD/XML_Compare_Utilities/prototypes/ciifr-xmlv3/. Current code path is xmlv3/cli.py:main -> Path.read_bytes -> xmlv3/core.py:load_xml -> typed Storage/pinned writer -> exclusive publisher. The whole input is currently allocated before load_xml checks MAX_XML=150000000. This is a pre-read resource-boundary defect; the schema and engineering model need no change for this card.

Current source/authority: agents/WIP-CIIFR-XMLV3-01a1746f_workreport.md checkpoint8. Latest implementation/candidate hashes and recovery receipts: .agent-worklogs/20261026_1904_xmlv3-intake-01a1746f/. Earlier corrected-brief ledger remains historical design evidence. Existing full12-test evidence stays in .agent-worklogs/20261026_1742_xmlv3-regression-01a1746f/. That100.746s/exit0 run is inherited baseline evidence; the current implementation has its own7+12 PASS logs in the latest ledger. Future code changes still need their own results.

XMLv2 HOLD: PR157 head a67487023bcafc13d68b62dbfc9bb74c61b3c64c. Pinned engine SHA b2bb8ed87440e46f72833424cacd82e6605c47f372f146deec749ad2bb0ee264; profile SHA8d2c2123bce98a387d00a3aeca69c8e5dea6b3831e29f65e7760f6a5694204b2. Preserve these actual bytes. Workspace has no.git; branch, merge base and dirty state UNKNOWN. Resolve actual overlap/custody before future implementation, without restarting project onboarding.

Private input: OWNER_PRIVATE_REF:ciifr-xmlv2-primary-20261024,803776 bytes/SHA5715c23f250d683a6c29ba84c2db9f01aae25788791317b99064c845bc2cdd57. Verify authorized access; keep the original read-only and generated CII/XML in verified explicit private scratch. No private model payload belongs in a relay or product tree.

## XV3-1B - controlled implementation scope

Allowed paths:

| File | Change |
|---|---|
| prototypes/ciifr-xmlv3/xmlv3/cli.py | Replace reads only for inspect, to-cii and edit-diameter |
| prototypes/ciifr-xmlv3/xmlv3/intake.py | NEW bounded-reader helper |
| prototypes/ciifr-xmlv3/tests/test_intake.py | NEW real-file boundary and labeled short-read/fault tests |
| prototypes/ciifr-xmlv3/README.md | Actual intake behavior and limitations |
| docs/ciifr/xmlv3/HIGH_RISK_ITEMS.md | Actual resolved boundary and residual limitations |

Keep core.py, guards.py, views.py, baseline.py, publisher, schema, existing12-test expectations, all held XMLv2/P2/P2.1 and Geometry/E1 files unchanged. Keep Python/standard-library runtime and writer. Do not impose the XML cap on CII commands verify/to-xml; a CII input budget is a separate policy. No new dependency, structural edits, property transfer, unit transforms or alias propagation.

### Reader contract and design sketch

Unbuffered FileIO.read can return a short read before EOF. A single read(limit+1) therefore cannot establish that the whole file was read or that it is within the limit. Continue after short reads. Accept only on an actual empty-byte EOF read; reject when limit+1 bytes have been observed. Nonblocking/no-data returns must fail clearly rather than be mistaken for EOF.

The bound is cumulative bytes consumed from input <= limit+1, with each read request <= the remaining budget. Do not describe the sum of requested capacities as the bound: a short read can leave part of a request unfilled. No unbounded read() call is permitted.

This is a documentation design sketch, not an implemented helper:

```python
from pathlib import Path

from .core import MAX_XML


def read_bounded_xml(path: Path, *, limit: int = MAX_XML) -> bytes:
    if limit < 0:
        raise ValueError("limit must be nonnegative")
    budget = limit + 1
    data = bytearray()
    with path.open("rb", buffering=0) as stream:
        while len(data) < budget:
            chunk = stream.read(min(64 * 1024, budget - len(data)))
            if chunk is None:
                raise OSError("XMLv3 input read would block")
            if chunk == b"":
                return bytes(data)
            data.extend(chunk)
    raise ValueError("XMLv3 input exceeds 150 MB")
```

Preserve the existing core exception exactly: ValueError('XMLv3 input exceeds 150 MB'). The unchanged entrypoint prints `XMLv3: XMLv3 input exceeds 150 MB` to stderr and exits2. Do not edit core.py or tidy its existing diagnostic in this card. Other filesystem errors retain the existing OSError -> exit2 path.

Do not rely on stat for acceptance. Growth visible before the reader observes EOF is counted against the same budget. This does not create an atomic filesystem snapshot or detect growth after observed EOF. MAX_XML is an input-byte cap, not a peak process-memory/RSS or elapsed-time limit: bytearray growth, bytes conversion and XML parsing can allocate additional memory. Preserve these limits in the delivered README.

### Required checks before freezing

Define input basis, expected result and oracle before executing checks. Record STATUS=PASS/FAIL/NOT_RUN/NOT_APPLICABLE, observation and oracle class. Keep simulated/derived evidence labeled.

| Helper test, explicit limit64 | Expected |
|---|---|
| Empty real file | Return empty bytes; existing XML validator handles validity later |
|63 bytes | Return all original63 bytes exactly |
|64 bytes | Return all64 bytes; observe EOF before accepting |
|65 bytes | Reject with exact size error |
|1024 bytes | Reject after at most65 actual input bytes consumed |
| Growth64 ->65 after earlier stat but before observed EOF | Reject; stat cannot authorize acceptance |
| Short first read, total63/64 bytes | Continue and return all exact bytes, not a prefix |
| Short first read, total65/1024 bytes | Continue and reject, not accept the short prefix |

Use real underlying files for ordinary boundaries. Instrumented short reads/growth/would-block/fault conditions must say SIMULATED. Record actual consumed bytes and each request against the remaining budget. The small helper limit is an explicit test parameter; production MAX_XML stays150000000.

For actual CLI checks, create a150000001-byte input only in verified explicit private scratch (sparse if supported, ordinary otherwise). Include invalid XML syntax so the observed size diagnostic distinguishes pre-parse rejection from parser failure. Independently exercise inspect, to-cii and edit-diameter: exit2, exact size diagnostic, no published output or leftover temporary file. Repeat against an existing bystander destination and prove its complete bytes/SHA unchanged. Check invalid/same-path cases under the retained source/destination contract where applicable. Clean only this task's verified scratch paths.

Rerun the existing12 tests on the frozen private original:12 passed, zero failures/errors/skips. Prove unchanged XML-only reconstructed bytes, length and SHA; exact literal diameter edit at [5147,5160) remains b' 2.540000E+02', post-SHA331e5053e3d73660875828ed7b9efdeeba74652b02057f7f1158ad9e9ef853fb, all bystanders unchanged. Original and protected file identities must match before/after; allowed implementation changes are captured in the new final manifest rather than falsely required to match their pre-edit hashes.

Primary personally reconciles and validates the returned scope. A passing author's log alone is not the primary's execution or the independent review. Preserve real failures/NOT_RUN and all native preimages/patches. Stop this card and return the smallest isolated problem if it needs a protected source/core/writer/schema/runtime/engineering-policy change, missing private access or conflicting writer custody.

## XV3-7 partial - non-author final-candidate assessment

Role: non-author Independent Reviewer, product files read-only. Disclose authorship/exposure and exact candidate. Receive an actual final hash manifest, source/custody references and private scratch access. No silent repairs. A correction returns to the primary and requires a new freeze plus review of the affected scope.

Personally verify final candidate/pinned hashes, actual intake byte bound, original reconstruction and literal-splice edit. The independent checker uses actual downloaded/created bytes, not the production equality assertion. This minimal example has private-path placeholders that must be resolved through authorized custody:

```python
from hashlib import sha256
from pathlib import Path

original = Path("PRIVATE_ORIGINAL").read_bytes()
roundtrip = Path("PRIVATE_ROUNDTRIP").read_bytes()
assert len(roundtrip) == len(original)
assert roundtrip == original
assert sha256(roundtrip).hexdigest() == sha256(original).hexdigest()
```

For the edit, independently derive the field offset from the qualified raw row layout, specify the13-byte literal before using the production writer, and compare the complete expected splice. Check both equal length and unchanged prefix/suffix. Reusing a production formatter as the expected-value generator is not independent evidence.

Inspect Branch(Line No.) -> Element -> Node storage/reference ownership and choose one fresh source-grounded falsifier beyond the existing12. For example, a single physical Node Name field referenced through distinct nodes/element paths must preserve physical ownership and expose conflicts/ambiguity under the actual source rule; do not invent automatic alias propagation or additional writable values from presentation alone. If that source rule is unavailable, mark the affected check NOT_RUN with reason SOURCE_BLOCKED and leave its ownership claim unqualified.

Review conclusions are per claim:

- Observed counterexample to a defined guarantee: FAIL for that guarantee; return exact reproduction and minimal correction proposal.
- Missing source/access/execution: NOT_RUN (with SOURCE_BLOCKED or actual reason); affected claim unqualified.
- Completed qualified verification: PASS only for the listed candidate/scope/input basis.
- Report completion, partial technical PASS and overall acceptance are separate. A discrepancy or source block cannot become a blanket PASS. Verified intake/fidelity checks may still pass while a different ownership claim remains open.

Required return: exact hashes, commands/environment, custody/input basis, independent expectations, actual observations, failures/NOT_RUN and one next action. Primary makes the technical integration/disposition within its grant; Owner engineering/release acceptance remains reserved. Native CAESAR, full engineering-field coverage and broad grammar are not inferred from this review.

## Source gaps and protected boundaries

E1 F3_SOURCE_BLOCKED is the v14 CONTROL surplus/trailing-field native admissibility question. Preserve completed E1 F1/F2 and all15 pointer guards; do not reopen R2. It is not a blanket block on XMLv3 work.

XV3-3 is broader operation-by-operation qualification of CONTROL counts, MISC material ordering/packing, NOZZLES/HANGERS allocations/defaults/GUIDs and structural create/delete/reindex transitions. Structural generation is not implemented or qualified by this plan. Existing count/material validation and source work with a genuine new authoritative basis remain distinct from F3. Neither the F3 question nor broader XV3-3 work blocks XV3-1B.

Do not repeat the completed unsuccessful F3 search without a new source/access path. A native importer contrast requires its own actual authorization/custody. Geometry, transfer/Target_enriched.CII, shared Writer integration, merge and deployment remain outside both cards.

## Assistance, return route and exact next action

The primary retains responsibility throughout. Assisting Coder and reviewer identities remain NOT_ASSIGNED/UNKNOWN; this document creates no task, agent, message, timer or publication. Use one writer per actual file scope if execution is later authorized. Return to Oracle/Coder01a1746f-74ee-74d1-aad3-9c5ff090df59 for reconciliation, integration and validation.

For an actual Oracle-agent transaction, use the Owner-selected Common artifact route under actual publication/send authority. Keep private payloads in authorized custody and separate publication, recipient byte verification, technical readback and Owner acceptance. The current routine only prepares this local brief and its recovery records.

Archived XV3-1B assistance brief (implemented by primary; do not redispatch):

> Assist primary XMLv3 Oracle/Coder01a1746f on XV3-1B only within the listed files and actual scoped task authorization. Primary retains architecture, integration, validation and reporting responsibility. Read checkpoint7, this corrected card and actual candidate hashes on demand. Fix pre-read XML intake using EOF-aware bounded reads, cumulative consumed bytes <= MAX_XML+1 and the exact existing ValueError/exit2 diagnostic. Preserve core/schema/writer/pins, existing tests and private original. Return a scoped patch, native backups, unique local ledger/undo, real-file and labeled short-read evidence, actual CLI negatives and fresh12/12 regression. Report failures and unqualified claims honestly. Do not expand into CII budgets, structural CONTROL/MISC, Geometry, transfer, dispatch or publication.

Exact next action: primary uses the corrected XV3-1B card for actual authorized bounded assistance, reconciles the return, validates and freezes the integrated candidate, then obtains non-author review of that exact result. XV3-1B implementation and its new tests are complete for the stated scope; XV3-7 non-author review remains NOT_RUN and dispatch remains NOT_DONE.
