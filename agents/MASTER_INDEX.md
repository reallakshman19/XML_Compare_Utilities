# Agent Work Index

Live GitHub state is authoritative over this snapshot. Detailed implementation history remains in each `agents/PR<NUMBER>_workreport.md`.

| Work | Mission | State | Authority / scope | Exact next action |
|---|---|---|---|---|
| PR1013 | Writer 2 NODENAME product/core routing | DRAFT / ACTIVE | Explicit `writerVersion=2`; NODENAME CREATE/DELETE-only plan adapter; scope-bound Phase-4A readiness; Phase-4B apply/re-intake/validation; binary-authoritative export | Execute exact repo tests + browser/real-CII Writer2 flow; do not merge without owner authorization |
| PR1012 | Writer 2 Phase-4B NODENAME physical relocation | MERGED 2026-08-21 · `81ac1c91` | CONTROL.NONAM + exact ELEMENT NODENAME pointers + variable-length NODENAME payload; independent exact full-postimage validator | Reused unchanged by PR1013 product/core routing |
| PR1011 | Writer 2 Phase-4A NODENAME relocation planner | MERGED 2026-08-21 · `a450ab35` | Deterministic CREATE/DELETE allocation plan, row compaction, complete old→new pointer map and CONTROL.NONAM after-count | Reused unchanged by PR1013 readiness/apply path |
| PR1010 | One-preimage Writer 1A + 1B + 1C composite transaction | MERGED 2026-08-21 · `7c1b7df0` | Compose only qualified 1A/1B/1C claims from one untouched TARGET; component validation + independently reconstructed final authorization | Preserve Writer-1 authority; PR1013 does not alter it |
| PR1009 | Writer 1C V11 SIF Phase-2B exact-field mutation | MERGED 2026-08-20 · `d63e8c59` | Existing V11 SIF pointer/block; slot1/2 item3 ii and item4 io; finite >=1; finite equal Type; same-code engineer attestation; independent byte anti-drift | Preserve field/context gates |
| PR1008 | Writer 1C exact ELEMENT/NODENAME custody hardening | MERGED 2026-08-20 · `cd09968c` | Exact parsed-index + physical 15-row block + FROM/TO mutation custody; endpoint fallback read-only only; shared-span arbitration | Preserve exact physical custody in relocation work |
| PR1006 | Writer 1C SIF/TEE Version-11 field qualification | MERGED 2026-08-20 · `430b2b0e` | Vendor-source-qualified item3/item4 ii/io positions and edition/layout gates | Historical source authority for PR1009 |
| PR1004 | Writer 1C NODENAME byte-custody implementation | MERGED 2026-08-20 · `692be3fd` | Existing-pointer NODENAME fixed-field COPY; one-preimage byte patch; independent authorization | Historical foundation |
| PR1002 | Writer authority roadmap | MERGED 2026-08-20 · `77fecdc` | Original TARGET bytes; independent authorization; Writer testimony is not authority; Writer2/3 boundaries | Historical authority contract |
| PR1001 | Explicit APPLY / EXCLUDE transfer-scope custody | MERGED 2026-08-19 · `5a5fa0ae` | Source/target hash + operation-set custody | Historical |
| PR992 | Target Writer 1B qualified fields | MERGED 2026-08-19 · `168d21bd` | Qualified fixed fields and existing restraint slice | Production default remains Writer 1B |
| PR991 | Target Writer 1A | MERGED 2026-08-19 · `edf297f7` | Initial fixed-field writer slice | Historical lower-writer authority |

## Current writer authority stack

```text
Writer 1A
  fixed-cardinality qualified element/restraint fields

Writer 1B
  Writer-1A-compatible lower path + qualified extra fixed fields
  PRODUCT DEFAULT

Writer 1C
  one-original-preimage composite of qualified 1A/1B/1C claims
  existing NODENAME field overwrite
  selected existing V11 SIF ii/io fields

Writer 2 Phase-1
  NODENAME row CREATE / DELETE only
  pointer/cardinality-aware relocation
  variable-length physical rewrite
  full independent expected-postimage validation
```

Writer 3 remains topology mutation.

## Writer 1C / composite authority preserved

```text
untouched original TARGET
 |-- qualified Writer1A/1B claims from original text
 |-- qualified Writer1C NODENAME/SIF claims from original bytes

all claims
 -> exact original preimage proof
 -> preserve source-writer authority identity
 -> reject cross-family same-span or partial overlap
 -> patch one original byte vector once
 -> re-intake
 -> independent component validation
 -> independently reconstruct final authorized union
 -> actual changed bytes must remain inside that union
```

NODENAME physical binding remains:

```text
parsed ELEMENT index == physical 15-row block index
AND parsed FROM == physical FROM
AND parsed TO == physical TO
```

Endpoint fallback remains read-only.

## Writer 2 merged transaction authority

### Phase-4A — PR1011

Source-qualified layout:

```text
NODENAME row = 2X + FROM[26] + TO[25] = 53 characters
CONTROL line1 field4 = NONAM row count
ELEMENT row13 field6 = 1-based NODENAME pointer
```

Relocation plan:

```text
scoped CREATE/DELETE
 -> exact NODENAME/ELEMENT custody
 -> deterministic zero-pointer CREATE owner
 -> clear selected DELETE fields
 -> remove only fully blank rows
 -> compact retained rows
 -> oldPointer -> newPointer map
 -> append deterministic CREATE rows
 -> derive every changed ELEMENT pointer
 -> derive CONTROL.NONAM_after
```

Critical example:

```text
old pointers: 1,2,3
delete row 2
mapping: 1->1, 2->0, 3->2
```

The unrelated element whose pointer changes `3->2` is part of the relocation transaction and must have exact pointer-field custody.

### Phase-4B — PR1012

Only three physical replacement classes are authorized:

```text
CONTROL.NONAM fixed-width integer field
qualified ELEMENT NODENAME pointer fields
complete raw NODENAME payload span
```

Everything outside those replacements is copied verbatim from the original TARGET bytes.

Because CREATE/DELETE can shift downstream offsets, primary negative assurance is:

```text
untouched TARGET + bound transfer plan
 -> independently rebuild Phase-4A plan
 -> independently derive complete expected variable-length postimage

PASS only if actual post bytes == independent expected post bytes
```

Writer testimony never defines authorization.

## PR1013 product/core routing authority

Writer 2 is explicit only:

```text
writerVersion = 2
```

No option supplied continues to resolve to:

```text
Writer 1B
```

Writer-2 preview uses **base engineering deltas only**. It does not activate Writer-1B field augmentation, restraint-slot augmentation or Writer-1C SIF augmentation.

Writer-2 NODENAME routing matrix:

```text
SOURCE nonblank + TARGET blank       -> CREATE
SOURCE blank    + TARGET nonblank    -> DELETE
SOURCE nonblank + TARGET different   -> BLOCKED / Writer 1C overwrite territory
same values / both blank             -> KEEP
```

All other mutable families are blocked with:

`WRITER_2_PHASE1_NODENAME_ONLY`

Writer-2 availability requires at least one exact cardinality mutation:

```text
family == NODE_NAME
property == Node name / to-name
action in {CREATE, DELETE}
status == PREVIEW_READY
policyAuthority == CII_WRITER_2_NODENAME_RELOCATION
```

Unchanged/protected rows cannot satisfy availability.

After explicit APPLY/EXCLUDE scope binding:

```text
Phase-4A readiness
 -> Phase-4B byte write
 -> modified-byte re-intake
 -> independent Phase-4B validation
 -> Modified_<target>.cii binary export
```

Writer-2 output is exported from authoritative bytes, not re-encoded text.

## Writer 2 boundary still not crossed

Still not authorized:

```text
SIF/TEE 10-row block create/delete
hanger create/delete
HGRDAT construction
MISCEL_1 packed-array relocation
generic auxiliary-section insertion/deletion
node/element create/delete
connectivity changes
branch insertion
split/merge topology operations
```

Those require separate Writer-2 family qualification or Writer 3 as applicable.

## Current validation truth

```text
PR1012 merge / PR1013 base grounding                 PASS
PR1013 branch ancestry                               PASS_GIT_COMPARE
PR1013 changed-file scope                            PASS_GIT_COMPARE
exact Writer2 routing blob syntax/execution          PASS_ISOLATED_EXACT_WRITER2_ROUTING
CREATE / DELETE routing                              PASS_ISOLATED_EXACT_WRITER2_ROUTING
overwrite / non-node falsifiers                      PASS_ISOLATED_EXACT_WRITER2_ROUTING
KEEP/protected empty-availability falsifier          PASS_ISOLATED_EXACT_WRITER2_ROUTING
repository Writer2 product-routing regression         AUTHORED_NOT_RUN_ENVIRONMENT
inherited Writer1A/1B/1C regressions                 NOT_RUN_ENVIRONMENT
full npm test                                        NOT_RUN_ENVIRONMENT
browser Writer2 product flow                         NOT_RUN_ENVIRONMENT
real CII Writer2 export/re-intake                    NOT_RUN_ENVIRONMENT
```

The exact routing source executed in isolation matched Git blob `0748657f49956acaf01f5d0c9c0a205474f9a7bd` at execution time.

The execution container still cannot resolve `github.com` for a complete checkout. No unexecuted repository/browser test is represented as PASS.

See `agents/PR1013_workreport.md`, `agents/status/PR1013.yaml`, and `agents/claims/PR1013.yaml`.
