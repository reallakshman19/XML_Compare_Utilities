# CIIFR Project Home — Owner intent, CII architecture and next delivery

**Status:** Oracle-authored project concept and working model; SOURCE-GROUNDED / SELF_ASSESSED. Not a finished field editor, an independent CAESAR engineering qualification, or an Owner acceptance decision.

**Home entry:** [CIIFR WBS 4.x native issue #167](https://github.com/reallakshman19/XML_Compare_Utilities/issues/167) · [CII v14 Oracle technical framework](WBS4_ORACLE_E0_E1.md) · [prepared E1 agent onboarding](WBS4_AGENT_ONBOARD_PACKET_DRAFT.md).

**Protocol read:** [Common START_HERE.md](https://github.com/reallakshman19/Common/blob/d381021e755d63c48759983e29bfedc1c7edbb88/skills/agent-work/START_HERE.md) (read revision 25 October 2026), [process maps A–E](https://github.com/reallakshman19/Common/blob/d381021e755d63c48759983e29bfedc1c7edbb88/skills/agent-work/ENTRY_PROCESS_MAPS.md), [Project Home guide](https://github.com/reallakshman19/Common/blob/d381021e755d63c48759983e29bfedc1c7edbb88/skills/agent-work/PROJECT_HOME_GUIDE.md), [Artifact Relay](https://github.com/reallakshman19/Common/blob/d381021e755d63c48759983e29bfedc1c7edbb88/skills/agent-work/ARTIFACT_RELAY.md). Recheck `Common/main` at the time of actual agent dispatch.

## Owner's outcome and why this project exists

**Owner intent** (recorded as CIIFR Progress R4): extend the working *CII Find & Replace* experience beyond NodeName and support **physical ELEMENTS engineering fields**—FROM/TO as identity/inspection first, geometry, outside diameter, wall/thickness, temperatures, pressures and verified material properties—plus the **physical Line Number / branch label** and **pointer-indexed RIGID Weight** first, RIGID Type only with validated code semantics. These are typed, source-traceable engineering value changes, not global textual replacements.

**Expected real-user journey after E5**: upload unchanged TARGET0 (optional SOURCE as provenance only) → choose `Element Data`, `Line/Branch`, or `RIGID` field → set literal or typed matching rule and scope → inspect element ordinal, FROM/TO, section/field, RIGID pointer owners, original/proposed lexeme, source witness and exact byte span → individually approve or guarded Approve All → validate permitted offsets/units/sentinels/pointer relationships → build **new-copy TARGET1** with a changed-byte audit and untouched TARGET0 → independently reimport/inspect in CAESAR II. This journey is the **future outcome**, not present functionality.

**Present working reality**: existing NodeName Find & Replace code, source-mirrored served UI and its writer were merged by XCU PR #165; branch/NodeName tests returned 19/19 PASS at Oracle E1 framework head in [native CI 40169198664](https://github.com/reallakshman19/XML_Compare_Utilities/actions/runs/40169198664). No proof in this work of a live browser/importer trial. [Draft PR #168](https://github.com/reallakshman19/XML_Compare_Utilities/pull/168) only contributes a read-only E0/E1 physical catalogue, v14-oriented source explanation, six synthetic tests and prepared agent packet. No ELEMENTS or RIGID writer was shipped.

## Architecture and complexity decisions

```text
original bytes TARGET0 (immutable, SHA-bound)
  -> #$ VERSION + #$ CONTROL (format/cardinality)
  -> #$ ELEMENTS (physical element occurrences, 15 lines each)
       -> numeric field slots (53, typed; field-specific units/sentinels)
       -> element/physical Line Number label and metadata
       -> pointer slots (15, section-indexed)
            #2 -> #$ RIGID (Weight, Type; zero pointer = record absent)
            #12 -> #$ NODENAME (FROM/TO name aliases; logical-node closure)
  -> read-only field/address catalogue
  -> future typed proposals -> explicit review -> allowed-byte validator
  -> future TARGET1 new copy + diff + native engineering import check
```

**Element vs node vs pointer:** an ELEMENTS ordinal is a file-local physical occurrence; FROM/TO node numbers identify shared endpoint incidences; pointers are 1-based auxiliary record indexes, not node identifiers. A branch label belongs to the element and cannot prove sole endpoint ownership. A shared node may have name aliases in several physical records and branches. A RIGID record could have multiple element owners, even though the *one inventoried baseline* has unique RIGID pointers.

**Why a separate typed writer is essential:** the existing NodeName writer's `sameStructure` deliberately assumes unchanged ELEMENTS; bypassing it would remove the previous safety boundary. A future ELEMENTS/RIGID writer needs explicit sanctioned field identities, exact byte ranges, numeric representability/width/unit/sentinel policy, pointer-owner integrity, stale-plan rejection and independent postimage reparse. Approve All is only a decision convenience, never permission to skip validation or Owner engineering acceptance.

**Significant uncertainties:** the 53 documented real slots do not themselves contain a known Material Number field; no fabricated material ordinal may be exposed. Thermal coefficient/temperature semantics depend on format/application context. RIGID Type codes must be grounded before edits. Numerical zero, pointer zero, signed zero, near-zero and 9999.99 are not one universal sentinel. SOURCE element ordinal alone does not prove physical engineering correspondence.

## Grounding fixtures and custody (public-safe)

- Historical original v14 trial **803,776 bytes**, SHA-256 `5715c23f250d683a6c29ba84c2db9f01aae25788791317b99064c845bc2cdd57`; 22 sections, 521 ELEMENTS, 27,613 real numeric slots, 7,815 pointer slots, 177 NODENAME, 156 RIGID records. The Oracle's separate local read-only scan supports physical layout on those bytes, **not a new-agent verification or a native CAESAR semantic PASS**.
- Six fully invented tests in [E1 synthetic test source](../../tests/ciifr-wbs4-readonly-catalog.test.mjs) and their CI result in [run 40169198664](https://github.com/reallakshman19/XML_Compare_Utilities/actions/runs/40169198664) ground source-layout claims and contrary cases, not engineering field meaning.
- **Input relay status: NOT_REGISTERED / NOT_DELIVERED to an E1 agent.** The GitHub PR source is public and accessible subject to recipient checking, but the Owner's private original is not transferable through this chat. When a specific recipient/input is assigned, prefer task-scoped `Common/relay/AGENT_WORK/ciifr/E1-FIELD-MAP-1/` record with an exact public-safe commit/receipt, source WBS and expected output; protected bytes only in Owner-authorized custody with sanitized receipt, no child-file URL in public.
- Producer hash/report, relay registration, recipient retrieval and recipient SHA check remain **separate measured states**. Do not report `BYTES_VERIFIED` for a future agent from an Oracle's local digest.

## Roadmap, dependencies and next three connected tasks

| Task / WBS | Concrete slice and deliverable | Authority and evidence |
| --- | --- | --- |
| **1. E1-FIELD-MAP-1 / 4.1** | Independent v14 53-field ordinal/unit/sentinel and 15-pointer source map; complete RIGID #2 address and Line/Branch format; compare with the Oracle reader using independently derived expectations | New agent after actual binding, source/access checks, public-safe return; **READ_ONLY** |
| **2. E2-ONE-FIELD / 4.2** | Choose ONE engineering real field (such as verified outside diameter), implement typed before/after claims with byte-range and rounding/sentinel negatives; no general writer bypass | Explicit fresh release after E1 discrepancy/semantics challenge |
| **3. E3-RIGID-WEIGHT / 4.3** | Resolve nonzero pointer #2; bounded Weight proposals and ownership closure, contrasting 0 pointer with attached Weight=0 and shared index | Only after pointer/record validation and separate engineering review; Rigid Type deferred |

E4 Line Number/branch follows a separately qualified length and identity contract; E5 postimage/new-copy writer and native engineering import remain future; E6 FROM/TO graph renumbering, pointer creation/reindex, Geometry write, frozen P2/P2.1 and deferred P3 are outside E1.

**Current decision and ownership:** CIIFR Progress Page R4 was merged to `progress-page/main` via PR #15; Project Home viewer changes were merged via PR #16 (verify actual site display separately). XCU PR #168 is **DRAFT/UNMERGED**. `Common/main/oracle-cycles/ciifr/CURRENT.json` has not been found, so **CIIFR Cycle = NOT ACTIVE / NOT CONFIGURED**, not an executable `Cycle now` destination. The authorized Oracle can prepare a manual/native task under actual source authority; enabling a Cycle is an optional separate Owner-selected proposal, not a default prerequisite to useful E1 read-only work.

## Seven onboarding observations (not seven new approval gates)

**Owner intent; canonical sources; role/task; real access; protected boundaries; runnable evidence or NOT_RUN/BLOCKED; evidence return and one next actor.** Only the actual assigned recipient and current WBS acquire an observational readiness state; a prompt in GitHub is **PREPARED, NOT SENT**, and never proves recipient access or active execution. Native issue/task, applicable engineering protocol and existing engineering HOLDs control actual work. When applicable, v3.6 needs a real approved AIM label/plan/child issue; this project brief does not select that lifecycle by writing about it.

**Next observer:** Oracle reviews the PR #168 source-backed field map and has a suitably independent reader challenge semantics; then, when agent and transport are actually selected, issue E1-FIELD-MAP-1 under the verified role and record the precise relay/custody state. **No owner upload is requested until an authorized actor actually needs the protected bytes.**
