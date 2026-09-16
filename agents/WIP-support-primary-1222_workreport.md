# WIP-support-primary-1222 workreport

WORK_ITEM: github:reallaksh19/XML_Compare_Utilities#1222  
RELATED_TYPICALITY_ISSUE: #1179  
CHAIN: SUPPORT-PRIMARY-1222  
BRANCH: feature/support-primary-assembly-graph  
PR: 1223  
BASE_MAIN: 242fc1b1df7e398b64e15a1fd3e2f87d1ff5b581  
CURRENT_ENDPOINT: EP-SUPPORT-PRIMARY-1222-0025  
LATEST_MATERIAL_LEG: LEG-013  
LATEST_PRODUCT_MATERIAL_HEAD: efecd8f7cf90e4d5b2dd9d264064f37c3cf50140  
TECHNICAL_DISPOSITION: HOLD_DRAFT_EXTERNAL_QUALIFICATION  
MERGE_AUTHORITY: OWNER_ONLY  
MERGE_AUTHORIZED: FALSE

## Mission

Move Support Report from flat tolerance-driven inference to an auditable hierarchy:

`zone -> PS/SL family -> Primary Support Assembly -> count/recovery -> structural + relationship + axis typicality -> TypicalityConsensusV1 -> governed publication`.

Optional Clash-within-Supports XML supplies PS/SL member connectivity only. It does not replace #1216 Support/Steel carrier/steel producer authority.

## Material history

### LEG-001 — explicit Primary Support Assembly topology
`SupportPrimaryRelationshipBundle.v1`, deterministic assembly IDs, numeric members countable, DATUM/reference symbolic/non-countable, support-member edges retained without mandatory pipe context, user wording `Multiple primary support`.

### LEG-002 — topology/location reconciliation
Explicit, geometry-only, partial, conflict and symbolic assignments. Unsupported relationship schemas have no authority.

### LEG-003 — family count projection
`TOTAL SUPPORT POINTS ON SECONDARY` consumes distinct countable assembly IDs. Explicit components may deduplicate geometry groups or add unobserved explicit assemblies. Ambiguity cannot reduce below legacy geometry evidence.

### LEG-004 — exact zone scope + current relationship XML
Searchable two-column Primary/piping-support and Secondary/support zone selectors using exact ancestor identity; optional current Clash-within-Supports input.

### LEG-005 — conservative orphan recovery
Second pass only. Defaults: enabled, 1.0× axial, 2.0× lateral, Same Family/PIPE/Bore ON, unique target mandatory. Explicit/partial/conflict/symbolic assignments immutable; missing enabled-gate evidence fails closed; provisional pairing requires reciprocal uniqueness.

### LEG-006 — release hardening
Production-named shared axis/bore exports, popup-scoped config, multi-popup build lease, count provenance, nested module-cache hardening.

### LEG-007 — `RELATIONSHIP_TOPOLOGY_V1`
Independent family matcher with `MATCH | NO_MATCH | REVIEW | UNAVAILABLE`. Missing explicit authority is `UNAVAILABLE`; partial authority is `REVIEW`; relationship-only evidence cannot promote structural rejection.

### LEG-008 — `AXIS_TYPICALITY_V1`
Independent intrinsic matcher using DN-normalized axial/lateral spacing, unsigned intra-model relative-axis angles, traversal count, locations-per-traversal and return multiplicity. Raw global axis vectors are not compared across XMLs. Partial evidence -> REVIEW; insufficient evidence -> UNAVAILABLE; axis-only evidence cannot promote structural rejection.

### LEG-009 — symmetric reference relationship input
Optional reference Clash-within-Supports input with scope independently derived from deepest exact reference ancestry. Current-area selections are never reused on the reference side; no exact reference zone => zero topology authority.

### LEG-010 — Column 22/23 publication governance
`SupportReportTypicalityPublication.v1` publishes Column 22 only for final `TYPICAL`; REVIEW/conflict/AMBIGUOUS/NO_MATCH/secondary-only candidates are withheld. `SupportReportTypicalityRowAudit.v1` independently preserves structural, relationship, axis, consensus/final and publication evidence. Trace/Debug advance to v4; Owner operational report columns stay unchanged.

### LEG-011 — traversal-safety authority fix
Release review found provisional geometry orphan recovery could cross known different traversals and undermine the PS-12877 return/revisit invariant. Final count authority now applies:

```text
ORPHAN_RECOVERED_GEOMETRY + DIFFERENT_TRAVERSAL
  -> ORPHAN_UNRESOLVED
     DIFFERENT_TRAVERSAL_GEOMETRY_RECOVERY_WITHHELD
```

Explicit assembly evidence remains the stronger permitted override. A >=3-point PS-12877-style regression was added.

### LEG-012 — qualification/cache attempt
No product mutation. Actions reruns still received no runner/steps. The large addon cache change was deferred rather than blindly reconstructed.

### LEG-013 — robust cache verification + blocker classification
The cache blocker was removed using a proof-gated temporary branch instead of an unverified production replacement.

- exact addon source reconstructed from bounded reads all reporting blob `c356f0081e4e7157b5b1bd8a59b77e10771976dc`;
- temporary branch `verify/leg013-cache-token` created from clean feature head;
- addon change only adds `count=20260915-support-primary-traversal-safety-1` to the engine import;
- verification commit `86224f50380e22b6eb5f53a4e7da449f2f855fef`;
- GitHub compare proved exactly one changed file, 1 addition / 1 deletion;
- feature branch fast-forwarded to that verified commit;
- bootstrap now adds `traversalSafety=20260915-support-primary-traversal-safety-1` to the addon import;
- engine already imports counting with the same traversal-safety token;
- `tests/support-primary-release-hardening.test.mjs` asserts the complete bootstrap -> addon -> engine -> counting token route.

No matcher, count-policy, orphan-eligibility, or Column 22 publication semantics changed in LEG-013.

Three temporary control-plane scratch files were accidentally created and immediately deleted while selecting the branch-creation tool. They produced no product-file delta and are recorded transparently in `LEG-013.md`. The verification branch remains because the connector does not expose branch-ref deletion.

## Protected benchmark/oracle ledger

| Family / control | Expected | Disposition |
|---|---:|---|
| PS-11167 | 6 | synthetic explicit-topology controls committed; real relationship source absent |
| PS-11236 | 4 | synthetic explicit-unobserved + DATUM controls committed; real relationship source absent |
| PS-12060 | 1 | existing real 1885 first-pass benchmark; exact execution NOT_RUN |
| PS-12877 | 4 | existing real 1885 benchmark + cross-traversal authority guard; exact execution NOT_RUN |
| PS-12860 | 6 | existing real 1885 first-pass benchmark; exact execution NOT_RUN |
| PS-12120 | 14 | existing real 1885 first-pass benchmark; exact execution NOT_RUN |
| PS-11168 -> PS-14168 | positive structural typicality | structural matcher protected; exact execution NOT_RUN |

## Authority / contract audit

PASS by source/material review:
- `main` unchanged; branch ahead-only/behind 0;
- #1216 Support/Steel producer authority untouched;
- first-pass bore-axis grouping constants/traversal decisions unchanged;
- DATUM/reference nodes non-countable;
- partial/conflicting explicit evidence cannot reduce below legacy geometry evidence;
- provisional geometry cannot override known traversal separation for final count;
- explicit topology remains the permitted stronger override;
- structural, relationship and axis matchers remain separately auditable;
- secondary channels cannot promote structural rejection/ambiguity;
- Column 22 publishes final `TYPICAL` only;
- `support-report-contract.js`, `support-report-export.js`, `support-report-xlsx.js` remain outside PR #1223, preserving Owner operational report column identity/order;
- Trace/Debug v4 is diagnostic-only versioning;
- current/reference relationship scopes remain independent;
- cache route now explicitly reaches traversal-safe counting;
- no unresolved PR review threads at LEG-013 closeout.

## Validation truth

Latest product material head: `efecd8f7cf90e4d5b2dd9d264064f37c3cf50140`.

Automatically triggered exact-head Actions:
- qualification run `35043776094`
  - focused-node `104629105069`: completed/failure, `runner_id=0`, `steps=[]`;
  - browser `104629105169`: completed/failure, `runner_id=0`, `steps=[]`;
- ZIP run `35043776109`
  - benchmark `104629105083`: completed/failure, `runner_id=0`, `steps=[]`.

Job-log retrieval for focused-node returns BlobNotFound because no job log exists. Workflow source remains a conventional `ubuntu-latest` checkout/setup-node/test definition. Therefore repository execution is **NOT_RUN**, not product FAIL. This is classified as external runner-allocation/account/repository infrastructure; do not mutate correct product/test logic to chase it.

## Real 1835 relationship input search

Repository/default-branch code search, branch search, commit search, benchmark-directory inspection and #1222 issue-comment inspection found no real 1835 Clash-within-Supports/support-to-support XML, no attachment link, and no `PS-11167.11` fixture.

`benchmarks/1835.zip` remains the existing primary Support Report archive rather than the required support-to-support relationship source.

Real PS-11167/PS-11236 relationship qualification therefore remains NOT_RUN due missing authoritative Owner input. Synthetic controls remain implementation regression evidence only.

## Reviews / merge state

PR COMMENT reviews include:
- LEG-007 `5212200167`;
- LEG-008 `5212752129`;
- LEG-009 `5212927412`;
- LEG-010 `5213502126`;
- LEG-011 `5213748178`;
- LEG-012 `5217444302`;
- LEG-013 `5217561622`.

No approval/request-changes review; no unresolved threads. Merge authority remains Owner-only and merge authorized FALSE.

## Current disposition

Known product/cache blockers: **NONE**.  
Source/material architecture: **PASS**.  
Executable qualification: **BLOCKED_EXTERNALLY / NOT_RUN**.  
Real relationship benchmark: **BLOCKED_BY_MISSING_OWNER_INPUT**.  
PR disposition: **HOLD_DRAFT** until qualification gates are satisfied.

## EXACT_NEXT_ACTION

Do not reopen algorithms for the two external blockers. Obtain an executing trusted qualification path (restore GitHub-hosted runner allocation or use a trusted connected/local checkout) and run focused Node/browser/1885 ZIP controls on product head `efecd8f7...`. Separately pin the real 1835 support-to-support XML when available and run PS-11167=6 / PS-11236=4 qualification. Then repeat release-readiness. Mark-ready and merge remain separate Owner-authorized transitions.