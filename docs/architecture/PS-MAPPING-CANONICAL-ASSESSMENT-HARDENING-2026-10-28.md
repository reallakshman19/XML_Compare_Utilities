# Detailed Concept Note — PS Mapping Canonical Assessment: Evidence, Invariants and Export Safety

**Date:** 28 October 2026  
**Status:** Implementation concept and acceptance specification; release gated by tests and engineering review  
**Scope:** PS Mapping Utility, Table-1C reference support requirements and Table-2 physical support inventory; canonical v25 reconciliation hardening.  
**Baseline:** The October 28 candidate export contains 1,928 rows and 107 columns: 1,542 real Table-2 components, 186 missing-support audit placeholders, and 200 synthetic missing-support proposals.

## 1. Executive decision

Adopt the MCDA-selected **Option C: Canonical Engineering Assessment**. Use one authoritative evidence-derived assessment per reference context. A matching physical component, completeness of node restraint coverage, and dimensional gap/clearance compliance are independent facts. Generate hardware proposals only from verified missing physical restraints, and actions only from final reconciled evidence. Reject invalid or duplicate proposed IDs, and never count generated proposals as physical evidence.

The baseline CSV exposes the following regression targets, which overlap and must not be summed: 23 synthetic proposals reported as selected/matched, 14 existing GUIDE or LINE STOP rows also reported missing, two confirmed unnecessary GUIDE proposals (Nodes 5790 and 6690), nineteen duplicate `0.X1` proposals, seven contradictory REST non-contact warnings, two LINE STOP gap false negatives despite populated model gap, and 42 matched real rows whose node-wide restraint package remains incomplete. These are defects of the *older export*, not necessarily current `main`.

**Important baseline update:** At concept-note revision, current `main` already implements foundational corrections in `diagnostics-v17.js`, `diagnostics-v20.js`, and `diagnostics-v25.js`, with `ps-mapping-canonical-assessment.test.mjs`. This hardening plan extends that baseline rather than duplicating those changes.

## 2. Engineering questions and independent judgments

| Independent assessment | Question | Authoritative evidence | Valid outcome |
|---|---|---|---|
| Mapping identity | Which reference node/support, line and DN belongs to this Table-2 row? | original model source ID, reference ID, line/DN and resolver's mapped identity | VALID / AMBIGUOUS / REJECTED |
| Physical restraint presence | Is the required REST/GUIDE/LINE_STOP component actually represented? | only real Table-2 component type and valid mapping identity | PRESENT / ABSENT / NOT PROVEN |
| Typed compliance | Is the existing component's measured gap/clearance compliant? | same physical model's original gap field + reference ISONOTE | EXACT / CONFLICT / MISSING_TABLE1 / MISSING_TABLE2 / NOT_APPLICABLE |
| Node package coverage | Which reference-required restraint types are backed by real components? | union of qualified physical contributors in same group | COMPLETE / PARTIAL / MISSING_ALL / NO_REQUIREMENTS |
| Synthetic proposal | Does an absent required type justify a new support ID? | finalized missing set plus validated unique reference identifier | REVIEW_ONLY proposal / MANUAL_IDENTITY_REVIEW / none |
| Corrective actions | What engineering work is justified? | final missing, extra, gap, mapping/identity exceptions | typed, provenance-linked actions |

A missing GUIDE gap is **not** a missing GUIDE. A `DO NOT REST [25 mm GAP]` requirement is a **non-contact clearance**, not an instruction to provide positive REST restraint. A WEAR PLATE by itself is an accessory, not proof of a REST restraint.

## 3. Canonical source identity and evidence

Immutable real physical evidence should carry:
- `modelSourceId = T2:<source row>`, model Support No, DTXR, original Support Gap, DN/bore, line family.
- Reference Support No and node; reference line, pipe size and derived DN; source ISONOTE and required restraint/gap declarations.
- Mapping evidence: PS/base relationship, line and bore comparison, `mapped`, ambiguity/duplicate-node context.
- Provenance for every transformed gap: source identifier, raw model gap, parsed numeric model value and reference gap.
- Separate `syntheticMissingSupport` source flag; a proposed ID must never imitate `T2:` provenance.

A reference support identifier of `0`, `PS-XXXX`, `UNKNOWN`, blank, or merged/multivalued identifiers is unsuitable for auto-numbering. A proposal ID cannot collide with any real model ID or a proposal in another context.

## 4. Canonical group identity

Default group key: normalized `(referenceSupportNo, referenceNode, referenceLineFamily, derivedDN)`; configuration may relax line-family *grouping* when evidence establishes an exact same-node/base/DN mapping, but never treats DN compatibility as optional. Preserve the original display identifier for export.

A candidate with a line/bore conflict, invalid physical source ID, ambiguous reference identity or unanchored suggestion cannot establish physical presence merely because its restraint text matches. Multiple resolved views of one Table-2 source ID count once. REST mentioned in a negated `DO NOT REST` ISONOTE never becomes an active required restraint.

## 5. Typed gap and clearance reconciliation

For an actual physical contributor, compare `GUIDE_GAP`, `LINE_STOP_GAP` or `REST_CLEARANCE` using the reference's typed value and the *same physical Table-2 row's* original Support Gap. Comparison is authoritative on every run, not only for a previous `*_MISSING_TABLE2` verdict. This prevents a previously `EXACT` row retaining that status if the model source is edited to a conflicting, blank or new gap value.

The comparison should be recomputed only where a typed comparison is applicable and the actual source provenance is known; never borrow a gap from a sibling support. Legacy warnings and actions about the same superseded gap verdict must be removed or replaced, preserving unrelated identity or engineering exceptions. A matched non-contact REST clearance clears obsolete generic `SUPPORT_CONFLICT`/`SUPPORT_MISSING_REST` warnings arising from negated REST, without converting it to active REST.

## 6. Coverage and node status

For each canonical group, compute `required`, `present`, `missing = required − present`, and `extra = present − required` over the restraint set `REST, GUIDE, LINE_STOP`. Do **not** derive physical presence from row `finalStatus` alone or a synthetic DTXR. Source types and identity decide presence; gaps determine compliance.

Expose a separate `nodeCoverageStatus` and explanatory `nodeCoverageNote`: `COVERED`, `PARTIAL`, `MISSING_ALL`, or `NO_REQUIRED_RESTRAINT`, with `REVIEW_REQUIRED` if identity/gap exceptions exist. `finalStatus=MATCHED` remains a *component mapping* status and must never be interpreted as complete node engineering acceptance. When node coverage is incomplete, `Needs Review` must not misleadingly remain NO on exported real rows; any exact warning text must be based on the canonical group.

## 7. Synthetic row construction and numbering

Generate proposals **only** for types in the reconciled missing set. Each proposal is nonphysical and must have `source=TABLE1C_MISSING_SUPPORT`, `syntheticMissingSupport=true`, `mapped=false`, `selected=false`, `eligible=false`, `autoSelectable=false`, `reviewRequired=true`, `finalStatus=SUPPORT_MISSING_REQUIRED`, and no real `modelSourceId`. Reset inherited source, confidence, and mapping fields in a dedicated constructor, not through unguarded object spreading.

Proposed `.Xn` IDs require a valid reference base and global uniqueness against physical and generated IDs. On any missing/placeholder/ambiguous reference identity or collision, suppress the ID and surface `MANUAL_REFERENCE_ID_REQUIRED` or `PROPOSED_SUPPORT_ID_COLLISION` without fabricating a number.

## 8. Invariants and publication gate

- **I01:** Synthetic rows are never chosen, mapped, eligible, or auto-mappable; source IDs cannot point to real Table-2 components.
- **I02:** A qualifying physical GUIDE/LINE STOP contributes presence irrespective of typed gap status.
- **I03:** `present ∩ missing = ∅`, and `missing = required − present` for every group.
- **I04:** No synthetic proposal of a restraint type already credited as physically present.
- **I05:** No repeated proposal ID across independent canonical groups; no `0.X1`, `PS-XXXX.Xn`, or other placeholder-derived ID.
- **I06:** Recomputing a source gap from the same `T2:n` identity changes the verdict and removes obsolete contradicted warning/action text.
- **I07:** A non-contact REST clearance may be EXACT, but never contributes positive REST coverage.
- **I08:** Component `MATCHED` is explicitly separate from node package completion and must not be exported as `Needs Review=NO` when node coverage is incomplete.
- **I09:** Every displayed node-wide action and proposal is derived from the canonical group, never copied from stale intermediate legacy rows.
- **I10:** Multiple result collections project the same canonical group assessment and preserve the public CSV basic-column ordering.

Violation of a safety invariant must produce explicit review/error evidence; no silent correction that invents hardware is permitted.

## 9. Implementation seams and migration plan

1. Retain the proven `v25` canonical stage as the single final postprocessor for `rows`, `candidateRows`, `outputRows`, `validatorRows` and `candidates`; preserve the `v2` public entrypoint.
2. Strengthen `normalizeDiagnostic` with typed, source-exact recomputation for every supported prior gap state.
3. Add explicit node coverage status, explanatory source-linked note, and review flag while retaining the component-level match.
4. Strengthen `enforceSynthetic` and global collision detection; export typed review-only proposal state.
5. Write a pure invariant validator and integrate its findings in test qualification. Do not turn a validation failure into a fabricated support recommendation.
6. Keep `tabs/` and `docs/tabs/` byte-identical; preserve all public CSV basic columns and introduce only additive internal detail fields.

Do not re-implement all `v3–v24` parsing layers in this PR. Their retirement should be a separate, regression-driven refactor after actual model-source parity is established.

## 10. Engineering acceptance fixtures

| Fixture | Required result |
|---|---|
| PS-123.1 Node 5790 and PS-126.1 Node 6690 | GUIDE physically present, gap review retained, no false `.X1` |
| SL-042.12 + SL-042.8 Node 20850 | both GUIDE and LINE_STOP credited independently of their gap verdict |
| SL-204.1 Node 1800 and SL-294.8 Node 2745 | source gap 20/10 mm yields `LINE_STOP_GAP_EXACT`; subsequent change to 5 mm yields `CONFLICT` |
| PS-075.8 Node 41790 | physical GUIDE remains present even if reference omits GUIDE gap |
| Seven REST-clearance examples | exact 25 mm non-contact verdict, no obsolete REST-missing/conflict warning |
| Synthetic from MATCHED representative | proposal non-selected/non-mappable and shown as review-only |
| Nineteen `0.X1` collision cases | no automatic support ID, manual identity review |
| Valid absence of GUIDE/STOP | missing type remains visible, proposed support permitted only with valid unique identity |
| Matched REST with required GUIDE absent | component remains MATCHED, node status PARTIAL, Needs Review YES |
| Source edit after previously exact gap | no stale exact result, matching source gap shown in output |

## 11. Validation, rollout and rollback

Run the existing canonical, markdown, reference-identity, REST-gap and source-parser tests, plus new typed gap revision, coverage-status, synthetic identity and invariant regressions in GitHub Actions. Run an end-to-end Chromium candidate/export smoke where available. Compare the new export against a fresh run of the **original input tables**, not against the stale October CSV as if it were raw source; retain exact `T2:n` and reference provenance for every difference.

Delivery is by branch and reviewable PR. GitHub Pages is updated only after the PR is explicitly merged and its deploy workflow succeeds. Rollback is the revert of the changed canonical stage and mirrored Pages modules. Human engineering sign-off remains necessary for actual hardware changes, unknown gaps and ambiguous reference identities.

## 12. Definition of done

The canonical output has zero false-positive additional GUIDE proposals for proven existing hardware; zero mapped synthetic rows; zero `0.X1` output collisions; correct typed gap recomputation following changes; separate component versus node-level verdicts; no contradictory stale REST warnings; passing Node/CI qualifications; and confirmed parity between application and Pages copies. The number of legitimate missing supports need not decrease to zero.
