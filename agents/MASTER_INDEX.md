# Agent Work Index

Live GitHub state is authoritative over this snapshot. Detailed implementation history remains in each `agents/PR<NUMBER>_workreport.md`.

| Work | Mission | State | Authority / scope | Exact next action |
|---|---|---|---|---|
| PR1010 | One-preimage Writer 1A + 1B + 1C composite transaction | DRAFT / ACTIVE | Compose only previously qualified writer families from one untouched TARGET; explicit 1A/1B policy custody; 1C original-byte custody; cross-family overlap veto; one final byte patch | Execute exact branch regressions/full npm/browser when runtime is available; do not merge without owner authorization |
| PR1009 | Writer 1C V11 SIF Phase-2B exact-field mutation | MERGED 2026-08-20 · `d63e8c59` | Existing V11 SIF pointer/block; slot1/2 item3 ii and item4 io; finite >=1; finite equal Type; same-code engineer attestation; independent byte anti-drift | Preserve these gates inside PR1010 and all future Writer1C work |
| PR1008 | Writer 1C exact ELEMENT/NODENAME custody hardening | MERGED 2026-08-20 · `cd09968c` | Exact parsed-index + physical 15-row block + FROM/TO mutation custody; endpoint fallback read-only only; shared-span arbitration | Preserve authority in all Writer1C/composite work |
| PR1006 | Writer 1C SIF/TEE Version-11 field qualification | MERGED 2026-08-20 · `430b2b0e` | Vendor-source-qualified item3/item4 ii/io positions and edition/layout gates | Historical source authority for PR1009 |
| PR1004 | Writer 1C NODENAME byte-custody implementation | MERGED 2026-08-20 · `692be3fd` | Existing-pointer NODENAME fixed-field COPY; one-preimage byte patch; independent authorization | Historical foundation |
| PR1002 | Writer authority roadmap | MERGED 2026-08-20 · `77fecdc` | Original TARGET bytes; independent authorization; Writer testimony is not authority; Writer2/3 boundaries | Historical authority contract |
| PR1001 | Explicit APPLY / EXCLUDE transfer-scope custody | MERGED 2026-08-19 · `5a5fa0ae` | Source/target hash + operation-set custody | Historical |
| PR992 | Target Writer 1B qualified fields | MERGED 2026-08-19 · `168d21bd` | Qualified fixed fields and existing restraint slice | Standalone Writer1B remains unchanged by PR1010 |
| PR991 | Target Writer 1A | MERGED 2026-08-19 · `edf297f7` | Initial fixed-field writer slice | Standalone Writer1A remains unchanged by PR1010 |

## Current Writer 1C authority after PR1009

```text
original TARGET byte stream
 -> exact physical ELEMENT / auxiliary custody
 -> explicit APPLY scope
 -> qualified field/context gates
 -> independently derived authorized spans
 -> equal-width byte patch
 -> re-intake
 -> independent structural / semantic / byte assurance
```

NODENAME physical binding remains:

```text
parsed ELEMENT index == physical 15-row block index
AND parsed FROM == physical FROM
AND parsed TO == physical TO
```

V11 SIF production slice remains exactly:

```text
slot1 item3 ii -> r0f2 -> [28,41)
slot1 item4 io -> r0f3 -> [41,54)
slot2 item3 ii -> r5f2 -> [28,41)
slot2 item4 io -> r5f3 -> [41,54)
```

with existing pointer/block only, explicit finite current/proposed SIF >=1.0, finite equal tee Type, exact slot-node correspondence, and `ENGINEER_ATTESTED_SAME_ACTIVE_PIPING_CODE` context.

## PR1010 composite authority

PR1010 does **not** add new engineering semantics. It composes already-qualified Writer1A, Writer1B and Writer1C claims under one physical transaction:

```text
untouched TARGET
 |-- Writer1A/1B dry-run from original text
 |-- Writer1C dry-run from original byte-custodied document

all claims
 -> prove each preimage against untouched TARGET
 -> preserve explicit Writer1A / Writer1B / Writer1C authority identity
 -> reject cross-family same-span ownership
 -> reject partial overlaps
 -> patch one original byte vector once
 -> validate each component against original
 -> validate final actual byte diff inside authorized union
```

Definitions:

```text
S_1A   = qualified Writer1A physical claim spans
S_1B   = qualified Writer1B physical claim spans
S_1C   = qualified Writer1C physical claim spans
S_auth = disjoint authorized union after arbitration
D      = actual changed-byte indices
PASS   => D subset S_auth
```

Cross-family same-span claims are a blocker even when the requested postimage is identical. Same-family identical claims may canonicalize where that writer family's own authority already permits aliasing.

## Writer2 boundary remains unchanged

Still not authorized by PR1010:

```text
record creation/deletion outside already-qualified Writer1B restraint slots
SIF block creation/deletion
pointer allocation/reindexing
CONTROL/cardinality mutation
new neutral-file field semantics
new SIF editions/fields
```

## Validation truth

```text
PR1009 merge / main grounding                    PASS
PR1010 branch ancestry                           PASS_GIT_COMPARE
PR1010 source scope                              PASS_GIT_COMPARE
isolated composite orchestration logic           PASS_ISOLATED_PRE_FINAL_REFINEMENT
latest PR1010 synthetic tests                     AUTHORED_NOT_RUN_ENVIRONMENT
inherited Writer1A/1B/1C regressions              NOT_RUN_ENVIRONMENT
full npm test                                     NOT_RUN_ENVIRONMENT
browser product flow                              NOT_RUN_ENVIRONMENT
```

Exact repository execution remains blocked in the current session by `github.com` DNS resolution failure. No unexecuted regression is represented as PASS.

See `agents/PR1010_workreport.md`, `agents/status/PR1010.yaml`, and `agents/claims/PR1010.yaml`.
