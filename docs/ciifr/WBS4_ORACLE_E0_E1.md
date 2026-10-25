# CIIFR WBS 4.x — Oracle E0/E1 engineering framework (READ-ONLY)

Status: **ORACLE CONTRIBUTION / SELF-ASSESSED CANDIDATE**, NOT a production editor, independent engineering verdict, Writer/Apply approval, agent activation, or Owner merge decision.

Native work order: [CIIFR #167](https://github.com/reallakshman19/XML_Compare_Utilities/issues/167).
Owner's CIIFR Progress Page R4 candidate: [progress-page PR #15](https://github.com/reallakshman19/progress-page/pull/15) (draft until actually merged).
Pinned policy: [Progress Page](https://github.com/reallakshman19/Common/tree/a9491531fb98f6fd14bc486a4cc78ee4680cb1f5/skills/agent-work/progress-page) and [Contribution/Handoff](https://github.com/reallakshman19/Common/blob/a9491531fb98f6fd14bc486a4cc78ee4680cb1f5/skills/agent-work/CONTRIBUTION_HANDOFF.md).
Engineering spec: [Hexagon CAESAR II Basic Element Data](https://hexagonppm.fluidtopics.net/r/en-US/CAESAR-II-Users-Guide/15/337040), [v14 Auxiliary Element Data](https://hexagonppm.fluidtopics.net/r/en-US/CAESAR-II-Users-Guide/Version-14/1471418), plus the Owner's [v14 Neutral File starting page](https://docs.hexagonppm.com/r/en-US/CAESAR-II-Users-Guide/Version-14/337037). The Basic Element Data endpoint currently serves a version-15 page; its documented 53-slot contract is consistent with the inspected v14 input but needs v14-specific semantic qualification before editable release.

## Original Owner outcome and boundaries

The principal user outcome is **Find & Replace for ELEMENTS engineering properties and its physical Line Number/branch label, plus pointer-resolved RIGID Weight/Type**, while retaining NodeName as a separate special-purpose editor. The desired interface selects an engineering field and a physical element/branch scope, proposes exact before/after values, shows source evidence and byte addresses, requires deliberate approval, validates a *new copy*, and keeps TARGET0 immutable.

**Not authorized by E0/E1:** numeric edits, Apply/Export, broad Document text replacement, node renumbering, pointer construction/reindex, automatic XML/Geometry mapping, changing old v11/14 NodeName writer assumptions, or any release. Existing R3 Geometry is REVIEW_ONLY; P2/P2.1 frozen and P3 deferred.

## Three-layer CII data model (do not conflate identifiers)

1. **Element occurrence**: one `#$ ELEMENTS` member, addressed by its zero-based physical ordinal *in that file* and its original SHA. It has FROM/TO **node numbers**, nine lines of 53 real values, an element name, physical Line Number (branch label), line color/visibility, and three lines of 15 auxiliary **pointers**. The source-format real slots are `2X, 6G13.6` on each of the first eight lines and five values on the ninth (physical width 13 bytes per value, first at offset 2 of each line). Pointer slots are `2X, 6I13` (6+6+3). Original v14 observations match widths 80×8 and 67 for last real line, 80×2 and 41 for the last pointer line.
2. **Endpoint node**: FROM/TO node numbers are graph identities, repeated by many element incidences and across branches. Logical node-name aliases are *additional physical occurrences* in `#$ NODENAME` through pointer #12, not the same as endpoint numbers. A name change requires complete alias closure; a physical branch label does not confer sole ownership of an endpoint.
3. **Indexed auxiliary record**: each nonzero pointer references a section-local ordinal, not a node. **Pointer #2 -> `#$ RIGID`**. Each v14 RIGID record has two real slots, **Weight** and **Type**, in that order. Pointer `0` means **no record attached**, which is different from a valid attached Weight=0. Verify pointer range and all owners; sharing is *allowed in the read-only catalogue* and must be held or handled atomically by a later editor.

**Important gap:** the 53 documented real slots include density, temperature/thermal coefficient, elastic, and pressure properties, but **do not include a 'Material Number' real slot**. Do not expose a Material Number edit under an invented ELEMENTS real ordinal. Material identifiers and their exact physical section/encoding require a separate field-map proof before an editing field is enabled.

## Explicit real-slot groups and interpretation risks

| Slot(s) | Field semantics | E1 / editor policy |
| --- | --- | --- |
| 1,2 | FROM node, TO node | Parsed as integral endpoints; **not** available for E2 Find & Replace |
| 3–5 | Delta X/Y/Z | Raw numbers; unit and graph meaning must be checked before writer |
| 6–9 | Actual OD, wall, insulation thickness, corrosion allowance | Allow individual typed proposals *only after* source-field, units, width and numeric policy proof |
| 10–18 | Thermal expansion coefficients **or** temperatures 1–9 | Context-dependent meaning; do not label all values 'temperature' unconditionally |
| 19–27 | Pressures 1–9 | Engineering units/context verification |
| 28–36 | Cold modulus, Poisson ratio, pipe/insulation/fluid densities, mill tolerances, seam weld, hydro pressure | Typed field semantics, code/state meanings per slot |
| 37–45 | Hot elastic moduli 1–9 | Temperature-conditional physical units |
| 46–53 | wL factor, two FEATools orientation angles, cladding thickness/density, insulation+cladding weight/length, refractory thickness/density | Feature-specific semantics; not inferred from raw numeric token |

The reader preserves signed zero, exponent, `1E-10` and `9999.99` **lexemes** rather than treating them as universal empty/default values. The same numeric `0` may be meaningful as a genuine real value while pointer `0` means absence. **This is only a source-level catalogue, not a type-safe numeric replacement engine.**

## Source-backed physical fixture and provenance

The Owner-provided original remains **private**. This Oracle contribution ran an independent Python standard-library *read-only* scan of its bytes, checked SHA-256 equality first, then verified section/record counts, each real slot and each pointer physical width, and RIGID/NODENAME pointers against section counts. The scan did not rewrite or publish original bytes, original labels or raw values.

- Original length: **803,776 bytes**.
- SHA256: `5715c23f250d683a6c29ba84c2db9f01aae25788791317b99064c845bc2cdd57`.
- 22 section markers, 521 ELEMENTS × 15 data lines = 7,815 data lines; 521×53 = **27,613 numeric real slots**; 521×15 = **7,815 auxiliary pointer slots**.
- `#$ NODENAME`: **177** records; `#$ RIGID`: **156** records, 156 nonzero rigid pointer occurrences, 365 absent; this *one input* has zero shared and zero unreferenced RIGID indexes. This is **not** a universal uniqueness rule.
- E1 has no evidence of field-value unit equivalence, accepted importer semantics, or native CAESAR round-trip: **NOT_RUN**.

The checked input contains private model information. Only the hash and aggregate metadata above can leave the authorized custody environment. `readOnlyCatalog` in `tools/ciifr-wbs4/readonly-catalog.mjs` returns detailed in-memory values and names. **Never commit, display publicly or upload this object from a private input**. `publicInventory` deliberately emits aggregate counts without identifiers or field values.

## Read-only architecture contribution

- `tools/ciifr-wbs4/readonly-catalog.mjs`: independent field-address reader; supports only v14; returns exact `byteStart/byteEnd`, original numeric token, physical element ordinal, pointer ordinal/section/index and auxiliary record owners. It does not import the application writer, produce claims, mutate input, or export a postimage.
- `tests/ciifr-wbs4-readonly-catalog.test.mjs`: public invented bytes only; positive address tests and deliberately incorrect cases. Runs under Node's native `node:test` engine.
- `.github/workflows/ciifr-wbs4-e1-oracle.yml`: hosted checks for synthetic E1 and existing NodeName safeguards. A passing hosted test does not verify v14 unit/engineering meaning.

## Challenge table — expectation, rival interpretation and test

| ID | Correct source model / predicted outcome | Plausible wrong model | Discriminator |
| --- | --- | --- | --- |
| NC1 | 53 real fields in fixed 13-byte slots; 15 auxiliary pointer fields; physical offset and token retained | Split on whitespace or treat all 15 ELEMENTS lines as numerics | Two adjacent numeric slots without separating blank, plus byte-offset equality |
| NC2 | Pointer #2 is index of RIGID; zero pointer = absent | Zero pointer interpreted as weight 0 | Two-element fixture: attached Weight=0 vs unattached |
| NC3 | One physical RIGID record may have multiple owners | Every nonzero pointer is unique | Two elements referencing pointer 1; catalogue reports `sharedRecords: 1`; editor must HOLD or transact atomically |
| NC4 | Pointer out of bound or wrong CONTROL count fails | Clamp, ignore, create synthetic record | Bad pointer 2 with one RIGID record; contradictory section count |
| NC5 | Numeric slot format/width is not optional | Truncate or infer values from loose tokens | Delete one character; insert NaN; expect explicit malformed-field error |
| NC6 | Signed zero/near-zero lexemes survive read-only parse | Normalize all numeric zeros and tiny numbers to absent | `-0.000000E+00`, `1E-10`, explicit `0` |
| NC7 | Branch label is serialized element text, not graph/node identity | Auto-assign ownership of both endpoints to this branch | Cross-branch shared logical node (existing NodeName protects partial rename) |
| NC8 | SOURCE ordinal is a physical occurrence only; not cross-file engineering identity | Equal ordinal + geometry proximity grants permission | Reordered element/from-to drift rejects correspondence |
| NC9 | Material Number is **not** slot among the published 53 reals | Invent a material ordinal in E2 | Compare official 53-slot list to UI field catalog; do not authorize unknown section |

For NC1–NC6 the synthetic implementation contains code-level assertions; NC7–NC9 are broader integration/domain acceptance requirements for subsequent task slices.

## Stopping point, self-assessment and next actor

**Oracle contribution:** source model, independent private physical count/width/pointer check, public-safe read-only catalogue, synthetic counterexamples and durable handoff. **No product/app file edited.** These hypotheses, examples, tests, and any changed code are **author-contributed/SELF_ASSESSED** even if hosted CI is green. A distinct engineer/reviewer must assess the domain field mapping and proposed enabled edits before Writer/Apply can be approved.

**Exit criteria to issue an agent task:** exact-head synthetic test and retained NodeName checks green; source/byte contract readable from GitHub; private input transfer rules stated; selected next task and writer ownership clear relative to Geometry; parent Progress data/Oracle mode reconciled. Do not confuse an onboarding *prompt* with a live agent assignment.

Next authorized bounded task (if Oracle/Owner releases): **E1-FIELD-MAP-1**, source-backed read-only proof of each enabled field key's v14 ordinal/unit/semantic condition, physical Line Number field layout, RIGID record index/ownership cases, plus independent parser comparison and authentic private-input trial. **No writer, no UI add-on, no Apply, no CAESAR engineering PASS claim.** Then E2 first engineering field group may be planned.

Read the separately prepared [agent onboarding packet](WBS4_AGENT_ONBOARD_PACKET_DRAFT.md). It is **PREPARED, NOT SENT**.
