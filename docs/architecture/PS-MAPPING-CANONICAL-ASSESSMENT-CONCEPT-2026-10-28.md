# Concept Note — Canonical PS Mapping Engineering Assessment (CPMEA)

**Status:** Proposed architecture and staged implementation specification  
**Date:** 28 October 2026  
**Affected utility:** PS Mapping Utility; Table-1C reference → Table-2 physical model candidate resolver  
**Evidence basis:** 1,928-row / 107-column \`ps-mapping-candidates-2026-10-28 (1).csv\` from \`reallakshman19/Common/relay/GENERATED/\`, plus current versioned resolver code.  
**Safety principle:** Exported engineering recommendations must be traceable to physical source records and cannot assert nonexistent hardware as matched.

## 1. Executive decision

Adopt the combined MCDA choice: **one canonical engineering assessment**, with explicit mapping identity, real physical restraint inventory, independent typed gap/clearance compliance, node-wide coverage, guarded synthetic proposals, and export invariants. Preserve existing public CSV columns for compatibility. Incrementally harden the current resolver, then retire overlapping legacy mutations after parity testing.

This is **not** a rule to suppress all missing-support outputs. Genuine shortages remain reportable; ambiguous identities and uncertain constraints must go to engineering review rather than fabricated hardware instructions.

## 2. Verified failure baseline

The October 28 candidate export contains **1,928 rows**, including **1,542 real Table-2 component rows**, **186 missing-support audit placeholders**, and **200 synthetic proposed support rows**. The audit found:

- **23 synthetic proposals marked MATCHED / chosen YES / auto-map YES**, even though no physical Table-2 component exists.
- **14 physical GUIDE/LINE STOP rows with their own restraint type also reported missing** by node coverage.
- **2 confirmed unnecessary GUIDE proposals**: \`/PS-123.1.X1\` at Node 5790 and \`PS-126.1.X1\` at Node 6690.
- **19 unrelated nodes assigned \`0.X1\`**, because zero reference support numbers were accepted as proposed ID bases.
- **7 \`REST_CLEARANCE_EXACT\` rows retaining \`SUPPORT_CONFLICT; SUPPORT_MISSING_REST\`**.
- **2 LINE STOP rows** (\`SL-204.1\`, \`SL-294.8\`) with a populated model gap matching the requirement, but exported as missing Table-2 gap. The pure typed comparator returns EXACT when supplied those values; the exact loss stage requires end-to-end source tracing.
- **42 real rows labeled MATCHED/needs-review NO while node-wide coverage remains incomplete**. This can be legitimate component matching but must not imply full-node engineering acceptance.

These categories overlap. Counts are a regression baseline for this exact export, not universally applicable totals.

## 3. Decision alternatives and rationale

**A — Physical-inventory-first seven-stage reconciliation:** clear engineering separation but less explicit control of legacy state propagation.

**B — Six-step coverage-first correction:** minimal repair sequence and good near-term execution safety, but still allows later versioned processors to overwrite mutually dependent diagnostics.

**C — Canonical assessment plus six-step migration:** preferred. The source data and validated mapping identity generate one authoritative node assessment. Public export statuses are projections of that assessment and checked against invariants. Adopt C with incremental implementation, rather than a wholesale parser rewrite.

## 4. Domain model and definitions

1. **Source identity:** immutable Table-2 source ID (\`T2:n\`), model PS number, source row; immutable Table-1 reference node/support ID, line family and DN. A proposal is not a Table-2 record.
2. **Mapping identity:** a model component is located in the correct Table-1 support context by exact/base PS relation and confirmed line/bore compatibility. Ambiguous multi-reference contexts and rejected line/bore identities must not provide coverage.
3. **Physical presence:** union of verified hardware categories \`REST\`, \`GUIDE\`, and \`LINE_STOP\` contributed by actual Table-2 component rows. A missing gap value never removes physically present GUIDE or LINE STOP hardware.
4. **Non-contact REST clearance:** \`DO NOT REST [25 mm GAP]\` requires a clearance condition, **not active REST restraint**. Model REST text with 25 mm separation may demonstrate the clearance without adding REST to active-restraint coverage.
5. **Typed compliance:** independent per-component verdicts \`GUIDE_GAP_EXACT/MISSING_TABLE1/MISSING_TABLE2/CONFLICT\`, \`LINE_STOP_GAP_*\`, \`REST_CLEARANCE_*\`. A numeric value is not a physical component. Unknown values remain review conditions; do not silently invent dimensions.
6. **Coverage:** \`required\`, \`present\`, \`missing = required − present\`, and \`extra = present − required\` computed within the same reference node/support/line/DN context, with clear distinction between component-level MATCHED and node-wide completion.
7. **Proposal:** a nonphysical, review-only output suggestion for a missing restraint type after coverage is finalized; cannot satisfy coverage, be chosen, auto-map, or be exported as an existing component.

Suggested canonical data shape:

\`\`\`js
{
  identity: { referenceSupportNo, node, lineFamily, dn },
  required: new Set(['GUIDE']),
  physical: [{ modelSourceId: 'T2:17', modelPsNo: 'PS-123.1', types: ['GUIDE'], identityValid: true }],
  present: new Set(['GUIDE']),
  missing: new Set(),
  clearance: [{ modelSourceId: 'T2:18', kind: 'REST_CLEARANCE', status: 'EXACT', requiredMm: 25, modelMm: 25 }],
  gaps: [{ modelSourceId: 'T2:17', kind: 'GUIDE', status: 'MISSING_TABLE2', requiredMm: 10, modelMm: null }],
  proposed: [], actions: ['Verify and specify GUIDE gap; required 10 mm'],
  exceptions: [], evidence: { sourceRefs: ['T2:17','T2:18'] }
}
\`\`\`

Canonical assessments need not be serialized verbatim into public output; existing columns remain derived views.

## 5. Evaluation sequence and authority

\`parse source → resolve identity → inventory real components → determine required and present restraints → evaluate typed gap & clearance → reconcile node coverage → propose only truly missing hardware → validate invariants → render CSV/UI\`.

**No stage may infer hardware from proposed rows or from \`MISSING GUIDE\` action text.** The proposed support \`.Xn\` is not a model-support identity. No later display/presentation stage may silently flip proposal eligibility or change node coverage.

When source contexts disagree, report \`IDENTITY_REVIEW_REQUIRED\` and retain the raw evidence; do not decide by string similarity alone.

## 6. Mandatory invariants (machine-enforced)

- **I01:** For any synthetic row, \`source=TABLE1C_MISSING_SUPPORT\`, \`syntheticMissingSupport=true\`, \`finalStatus=SUPPORT_MISSING_REQUIRED\` (or explicit identity review), \`mapped=false\`, \`selected=false\`, \`eligible=false\`, \`autoSelectable=false\`, \`reviewRequired=true\`. Its \`modelSourceId\` must not imitate a \`T2:n\` source.
- **I02:** If a valid real model GUIDE/LINE STOP component exists in the canonical group, its type appears in \`present\` even if a corresponding gap is missing or disagrees.
- **I03:** A missing-support proposal exists only if its type is in \`required − present\` and the group identity is valid, unambiguous, and suitable for numbering.
- **I04:** Placeholder support IDs (empty, \`0\`, \`PS-XXXX\`, aliases such as UNKNOWN, combined/multiple numbers) must not become \`.Xn\` IDs. Distinct groups must not accidentally share proposed IDs; collisions are review exceptions.
- **I05:** Exact non-contact REST clearance must not contribute positive REST coverage and must not retain \`SUPPORT_MISSING_REST\`/generic \`SUPPORT_CONFLICT\` warnings *when those warnings arise solely from REST prohibition*. Distinct proven conflicts remain reviewable.
- **I06:** Typed gap verdict must use the same selected physical Table-2 source ID and raw gap value that appear in the CSV. A populated, equal-valued LINE STOP gap cannot be reported as missing Table-2.
- **I07:** \`Matched physical component\` does not automatically mean \`node fully covered\`. Node-wide missing restraints must stay visible; \`Needs Review\` and group status explain any exceptions.
- **I08:** Proposed support numbers never collide with existing model identifiers or another proposal; if uniqueness cannot be established, leave the ID blank and require manual numbering.
- **I09:** Warnings, review actions, row verdicts, node coverage and synthetic results must be recomputed from the final canonical assessment before output; stale legacy phrases must not override settled evidence.

## 7. Proposal numbering policy

Strip at most one presentation-leading slash for canonical comparison; preserve original prefix in public display. Valid bases must be established reference support numbers, not \`0\`, \`0.0\`, \`XXXX\`, \`PS-XXXX\`, or unknown/multi-valued placeholders. Allocate \`.X1\`, \`.X2\` within one verified reference support context, checking existing physical and synthetic IDs. A collision triggers a numbering-review exception rather than silently reusing an ID. Distinct reference supports with overlapping textual bases must be distinguished by source identity or held for review.

For Node 5790, no GUIDE proposal is warranted because \`PS-123.1\` is present. For Node 6690, the same rule applies. A real gap-data correction remains appropriate.

## 8. Reconciliation of type and clearance

Typed restraint extraction must normalize \`STOP\`, \`LINE STOP\`, and \`Directional Anchor On Shoe\` into \`LINE_STOP\`, and suppress negated REST (\`DO NOT REST\`) as a positive required restraint. Model \`WEAR PLATE\` is an accessory, not proof of active REST; wear-plate-only records may map as components but cannot contribute restraint coverage. Validate support type using actual DTXR/physical description plus confirmed reference context, not merely an inherited \`matchedTypes\` array.

A REST clearance exact verdict coexists with positive GUIDE/LINE STOP coverage but never asserts positive REST restraint. If a real contact support violates non-contact constraints, report that separately.

## 9. Root-cause containment in current versioned implementation

- \`v17\`: decouple recognized physical-component contribution from gap-review acceptance; verify base/exact PS identity, line, DN and source provenance.
- \`v20\`: use a dedicated synthetic constructor with explicit values and identity validation; never carry over selected/eligible/mapped/match status or matched types.
- \`v4\`: trace model-to-row selection and ensure typed comparison consumes the actual model \`supportGapRaw\` with source identity; preserve explanatory evidence and avoid fabricating a missing-gap verdict.
- Final reconciliation: provide an authoritative postcondition guard for every output collection (\`rows\`, \`outputRows\`, \`candidateRows\`, \`candidates\`, \`validatorRows\`) and reject contradictory exports. Avoid independent re-invention of actions across views.

Longer term, fold redundant \`v3…v24\` postprocessors into one clearly tested assessment service, but do not change all parsing and matching semantics in a single high-risk release.

## 10. Validation plan and fixtures

**Unit tests:** negated REST vs REST clearance; positive GUIDE/STOP presence with missing/exact gap; wear plate exclusion; valid/missing IDs; synthetic state; duplicate ID collision; node-wise action generation; gap source parity.

**Regression fixtures:** Node 5790 \`PS-123.1\`; Node 6690 \`PS-126.1\`; Node 20850 \`SL-042.12\` / \`SL-042.8\`; Node 1800 \`SL-204.1\`; Node 2745 \`SL-294.8\`; Node 41790 \`PS-075.8\`; exact REST clearance set; 19 \`0.X1\` reference identity cases; legitimate uncovered GUIDE/REST/STOP.

**Full export:** re-run 841-row reference and full model source (rather than using the previously generated CSV as resolver input). Assert zero selected synthetic rows, zero false missing restraints for verified existing components, zero \`0.X1\` collisions, zero gap false negatives when model gap is present, and no stale REST-only warning. Compare original and new output by real Table-2 source ID and reference key; flag every changed model identity.

**Browser and CI:** run Node regressions plus a Chromium source-to-candidate export smoke test. Validate \`tabs/\` and \`docs/tabs/\` parity, export repeatability, and no duplicate synthetic rows on repeated runs.

## 11. Delivery and rollback

Separate the concept and implementation in one reviewable PS Mapping PR. Preserve the existing public CSV schema and normal import/export flows; introduce new evidence fields only additively. Keep \`main\` and live GitHub Pages untouched until CI and engineering acceptance. Roll back by reverting the specific PR if canonical validation introduces unexpected mapping shifts; retain fixture comparisons and diagnostic logs.

**Acceptance gate:** zero contradictions on the verified test set; genuine missing supports still reported; synthetic rows never appear as chosen model components; verified gap/clearance values survive to export; no identifier collisions; all source-to-export evidence traceable. Engineering acceptance of restraint semantics remains a required human sign-off.
