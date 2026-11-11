# SSRB Schema / Provenance Authority Audit 0003

Chain: `SUPPORT-STEEL-1216`  
Issue: #1216  
Program: #1215  
Audit basis main: `c7d4afa4c2bab4528c6d499e9ceabe058e376348`  
Observed PR #1219 head before this audit: `4ee399a1f4b3fd4a86d3fa21783d36bc19e72a14`  
Observation class: source inspection only  
Engineering benchmark status: **NOT_RUN unless explicitly stated otherwise**

## Purpose

Close the remaining P0 schema/alias and emitted-provenance inventory without changing producer behavior. This artifact classifies the actual Support/Steel producer contract, facade/capability aliases, downstream capability use and provenance surfaces so that later behavior work cannot accidentally treat aliases as independent engineering authorities.

## Canonical producer and facades

`support-steel-evidence-bundle.js` is the base canonical orchestrator. It normalizes `combinedInput`/legacy staged input, feeds the relationship engine, then composes carrier resolution, carrier attachment, carrier topology and carrier-to-structure path evidence. The root contract remains `SupportSteelRelationshipBundle.v1`.

`support-steel-restraint-evidence-bundle.js` is an enriched facade over that base builder. It exports the same `buildSupportSteelRelationshipBundle` symbol and preserves the same root `schema`, then adds local-frame/restraint-function capabilities. It is **not** a second Support/Steel relationship engine. However, two payload capability profiles can therefore advertise the same root schema and exported function name.

Consumer split on the inspected basis:

- Support Report imports the base producer facade and performs report projection only.
- PS/SL native audit imports the restraint-enriched facade and exposes subordinate schema fields for carrier/local-frame/restraint capabilities.
- PS/SL still declares its generic source seam as `RELATIONSHIP_BUNDLE` / `SupportSteelRelationshipBundle.v1`.

## Frozen schema inventory

| Layer | Schema | Role |
|---|---|---|
| Root relationship bundle | `SupportSteelRelationshipBundle.v1` | public producer seam |
| Structural analytical geometry | `SupportSteelAnalyticalGeometry.v1` | structural geometry evidence |
| Support member chain | `SupportMemberChainBundle.v1` | member-chain / structural-terminal evidence |
| Support member geometry | `SupportMemberAnalyticalGeometry.v1` | support member geometry |
| Carrier resolution | `SupportCarrierResolution.v1` | member-to-carrier identity/context |
| Carrier catalog | `SupportCarrierCatalog.v1` | physical carrier / branch source records |
| Carrier attachment | `SupportCarrierAttachmentBundle.v1` | analytical member-to-carrier attachment |
| Carrier geometry | `SupportCarrierAnalyticalGeometry.v1` | carrier geometry |
| Carrier topology catalog | `SupportCarrierTopologyCatalog.v1` | typed components/ports/references |
| Carrier topology | `SupportCarrierTopologyBundle.v1` | fail-closed component continuity |
| Carrier-to-structure path | `SupportCarrierToStructurePathBundle.v1` | composite carrier→support→structure path |
| Carrier local frame | `SupportCarrierLocalFrame.v1` | restraint coordinate frame |
| Restraint function | `SupportRestraintFunctionBundle.v1` | analytical restraint capability |

No second independently authoritative Support/Steel root contract was found on the inspected source basis.

## Alias classification

### Capability facade alias

The base and restraint-enriched facades expose the same root `SupportSteelRelationshipBundle.v1` and same builder symbol while the enriched facade adds subordinate capabilities. Classification:

`CONTRACT_CAPABILITY_ALIAS_RISK`

This is currently diagnosable through subordinate schema fields (`carrierLocalFrameSchema`, `restraintFunctionSchema`, etc.), but there is no explicit top-level profile/revision/capability discriminator.

### Ingress compatibility aliases

`combinedInput`, legacy `stagedInput`, and separate `supportInput` / `steelInput` are ingress compatibility forms. They do not establish separate producer contracts. Combined staged input remains the production-shaped authority target for this recovery.

### Projection compatibility source

`PipeSupportProjectionBundle.v1` is accepted by carrier catalog/topology catalog adapters. It is a compatibility/projection input shape, not a replacement for the combined staged production source.

### Vocabulary aliases

Source keys and types such as `TUBE → PIPE`, `BEND → ELBOW`, carrier reference variants, structural reference variants and port-reference variants are source-normalization vocabulary aliases, not duplicate schemas.

## Provenance / authority matrix

| Evidence layer | Authority / provenance | Fail-closed semantics |
|---|---|---|
| Family→steel relationship | `STAGED_JSON_RELATIONSHIP_ENGINE`; `evidenceClass: INFERRED`; semantic `INFERRED_STRUCTURAL_RELATIONSHIP` | explicit/spatial/shared-owner resolution; ambiguity and unresolved retained; analytical proximity is not physical-contact proof |
| Support member chain | `STAGED_JSON_MEMBER_GEOMETRY_ENGINE`; analytical edges plus explicit/reference evidence | symbolic DATUM/STRUCTURAL_REFERENCE excluded from physical contact; nearby candidates remain clearance-only |
| Carrier identity | semantic `SUPPORT_MEMBER_TO_AUTHORITATIVE_CARRIER_OBJECT`; resolved physical edges use `AUTHORITATIVE_CONTEXT` | explicit/hierarchy/unique-branch resolution; ambiguity/context-only/unresolved remain visible; contact still `NOT_PROVEN` |
| Carrier attachment | semantic `SUPPORT_MEMBER_TO_CARRIER_ANALYTICAL_ATTACHMENT`; accepted edges `evidenceClass: ANALYTICAL` | contact candidate vs clearance vs unresolved geometry is preserved |
| Carrier topology | semantic `FAIL_CLOSED_CARRIER_COMPONENT_CONTINUITY`; explicit/exact/small-gap bases | ambiguous connections/disconnected components remain exceptions; accepted edge rows do not carry a uniform source/class/schema envelope |
| Carrier→structure path | semantic `CARRIER_TO_SUPPORT_TO_STRUCTURE_ANALYTICAL_PATH`; composite edge-ID/basis chain | complete path requires carrier identity + connected topology + analytical attachment + member-chain/terminal evidence; incomplete stages remain path exceptions |
| Restraint | member geometry in carrier frame + complete path; analytical restraint direction candidates | unresolved/ambiguous frame/path/function states remain explicit; vertical-pipe lateral direction is deterministic but not engineering-authoritative |

### Complete-path custody

A complete `SupportCarrierToStructurePathBundle.v1` path explicitly depends on:

`AUTHORITATIVE_CARRIER_IDENTITY → CONNECTED_CARRIER_TOPOLOGY → ANALYTICAL_SUPPORT_TO_CARRIER_ATTACHMENT → ANALYTICAL_SUPPORT_MEMBER_CHAIN (or attached terminal) → ANALYTICAL_SUPPORT_TO_STRUCTURE_TERMINAL`.

Small-gap topology repair is separately identified as audited repair evidence rather than silently equivalent to exact topology.

## Export provenance audit

The family relationship/member-chain CSV surfaces expose source/class/schema provenance more explicitly than later carrier/topology/path/restraint exports. Carrier-resolution/attachment exports expose identity/status/basis but not the same uniform provenance envelope. Topology, complete-path and restraint exports are largely evidence-ID/basis/status oriented.

This is an auditability/schema-uniformity issue, not proof that the underlying engineering result is wrong.

## Declared architecture gaps

- `P-GAP-001 CONTRACT_CAPABILITY_ALIAS_RISK` — base and restraint facades share root schema and builder symbol despite different payload capability profiles; no explicit top-level capability profile discriminator.
- `P-GAP-002 TOPOLOGY_EDGE_PROVENANCE_FIELDS_NONUNIFORM` — topology connection edges/exports lack the common `evidenceSource` / `evidenceClass` / `sourceSchema` envelope used on stronger provenance surfaces.
- `P-GAP-003 PATH_PROVENANCE_COMPOSITE_BY_REFERENCE` — complete paths are auditable through referenced edge IDs and relationship bases, but path records do not expose one uniform provenance envelope.
- `P-GAP-004 SUPPORT_REPORT_CARRIER_ATTRIBUTE_LABEL_AMBIGUITY` — `AUTHORITATIVE_CARRIER_ATTRIBUTE` proves the selected record's attribute source, not carrier-identity resolution; identity authority remains distinguishable by resolved carrier evidence.
- `P-GAP-005 EXPORT_PROVENANCE_SURFACE_NONUNIFORM` — relationship/member-chain export provenance is richer and structurally different from carrier/topology/path/restraint export provenance.

These gaps are follow-up architecture concerns. This audit does **not** authorize a behavior/schema migration in #1216 without executable qualification and explicit scope.

## CI execution-surface audit

The exact #1219 branch currently has **zero GitHub Actions workflow runs**. Existing workflows do not provide a PR execution path for `tests/support-steel-authority-contract.test.js`:

- Pages deployment runs on `main` push/manual dispatch, not as the producer PR qualification.
- Support Report typicality workflows are path-scoped to Support Report surfaces.
- topology workflows are scoped to topology-specific files/tests.

Repository policy separately forbids workflow mutation unless explicitly authorized. Therefore the absence of a producer check is a real CI coverage hole, not permission to edit CI just to create a green status.

```text
producer contract execution = NOT_RUN
existing matching PR execution surface = NONE_OBSERVED
workflow mutation = NOT_AUTHORIZED
producer behavior mutation = BLOCKED
```

## Disposition

- `TASK-002 schema inventory`: **COMPLETE_SCHEMA_AND_ALIAS_AUDIT_WITH_CAPABILITY_ALIAS_RISK**.
- `TASK-003 authority/provenance matrix`: **COMPLETE_PROVENANCE_MATRIX_WITH_DECLARED_GAPS**.
- `TASK-004 downstream consumer boundary`: remains **COMPLETE_CONSUMER_BOUNDARY_WITH_PROVENANCE_FOLLOWUP**.
- P0 read-only architecture discovery is complete enough to isolate the remaining gate as executable qualification/release authority rather than unknown producer ownership.
- No production JS, tolerance, workflow, oracle, Support Report behavior or PS/SL behavior changed in this audit.
- Engineering tests, performance and deployed-browser qualification remain NOT_RUN/BLOCKED; no source-inspection result is promoted to PASS.
