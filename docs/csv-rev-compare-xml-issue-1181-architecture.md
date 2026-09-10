# CSV Rev Compare (XML Based) — issue #1181 architecture freeze

Status: WP-001 architecture freeze

## Invariant

This feature is deliberately not a CSV row comparator. CSV/TSV/pasted tables are ingress and CSV/XLSX is egress only:

`REV table -> Table-to-Categorized-XML source parser -> governed support-revision profile -> categorized graph/XML -> XML lineage graph -> structured event ledger -> versioned remark policy -> revision CSV/XLSX + audit artifacts`

The generated categorized graph/XML is the engineering comparison authority. Source row ordinals are provenance only and are never identity keys.

## Existing authorities retained

The implementation reuses the following repository contracts instead of introducing competing implementations:

- `table-categorized-xml-source-parser.js` for delimiter detection, CSV quoting, source row IDs, duplicate-header preservation and stable `columnIds`.
- `table-categorized-xml-resolver-engine.js` for profile-bound field resolution from `rawByHeader` / `rawByColumnId`.
- `table-categorized-xml-graph-builder.js` for profile-driven hierarchy creation, including `many-per-row`.
- `table-categorized-xml-exporter.js` for XML, graph, profile and categorizer-audit serialization.
- `XmlCompareCandidatePairModel.js` concepts/records for bounded candidate evidence. Support-specific deterministic identity and topology stay in the support-revision lineage layer because common-support lineage is not globally one-to-one.
- `XmlCompareAnchorReviewPanel.js` approval-state vocabulary and review/transfer UX concepts; ambiguous support lineage is exposed as reviewable evidence rather than silently taking the highest score.
- `tabs/revision-compare/` stage/audit patterns for progress, difference evidence and immutable audit receipts. The generic Revision compare utility remains unchanged.
- `tabs/psnm-utility-tab.js` installer registry for the separate `CSV Rev Compare (XML Based)` tile.

No second CSV parser, hand-written replacement XML serializer, direct CSV row matcher, parallel generic candidate engine, second generic Revision Compare ledger, or remark-driven comparison is introduced.

## Categorizer extensions

Issue #1181 requires evidence shapes not fully expressible by the current scalar `many-per-row` implementation. The graph builder is extended generically rather than bypassed:

1. **Aligned parallel lists** — a `many-per-row` level may declare `parallelListResolvers`. The primary list determines the ordinary component slot count, but the maximum observed list length is retained. Missing aligned values remain blank, and unequal lengths generate an audit diagnostic instead of truncating evidence.
2. **Duplicate-column series** — a `many-per-row` level may declare a `columnSeries` selector. It iterates source columns by stable `columnId`/ordinal, preserving repeated headers such as `Fx`, `Fy`, `Fz`, and exposes column provenance on each generated node.

Both are generic profile capabilities. They are consumed by `support-revision-csv-xml/v1`; no support-specific parser is added.

## Governed support-revision graph

The custom profile owns the XML hierarchy:

- `SupportRevision` document root
- `SecondarySupport` grouped by normalized `CIVILSECONDARYSUPPORT` / family
- `SupportLocation` one per source row, with `sourceRowId` provenance
- semantic pipe, coordinate and source-attribute fields on the location
- `PrimarySupport` children emitted through aligned `many-per-row` component lists
- `Load` children emitted through duplicate-column series, with ordinal, stable `columnId`, original header and raw/numeric value

The feature may build derived immutable indexes over this categorized graph, but those indexes must retain node IDs and source refs and cannot consult the original table as a comparison authority.

## Identity and lineage precedence

Lineage is established before change classification. Evidence precedence is:

1. persistent primary-support reference set / exact persistent component reference
2. normalized family / legacy support identity relationships
3. normalized pipe identity and token compatibility
4. coordinate evidence after revision-frame normalization
5. component type multiset / other structural features

Member suffix is mutable metadata, not physical identity. An unchanged persistent reference with a changed member ID yields `PRIMARY_MEMBER_RENUMBERED`, not delete/add.

Candidate outcomes are `DETERMINISTIC`, `LIKELY`, `AMBIGUOUS`, `NO_MATCH`. A top score does not auto-resolve ambiguity when competing candidates remain within the governed ambiguity margin.

## Cardinality and common support

The lineage graph explicitly supports `1->1`, `1->0`, `0->1`, `1->N`, `N->1`, and `N->M`. Normal continuation uses one-to-one assignment where safe. Common-support topology is a structural exception built from generated graph evidence: shared legacy/pipe identity plus distinct reference sets, member-family ownership and normalized positions. Duplicate `PREV NAME`, `.1` suffixes, or repeated row text alone are insufficient.

## Coordinate frame

Coordinates are parsed into axis/direction/sign/magnitude/unit evidence. High-confidence persistent-reference matches are used to solve/validate a revision-level sign/frame transform. Raw text changes are classified independently from normalized position changes (`FORMAT_CHANGED`, `ROUNDING_ONLY`, `ACTUAL_POSITION_CHANGED`). Relocation requires normalized structural displacement; raw N/S/sign formatting cannot trigger it.

## Events and remarks

Comparison produces immutable typed events first. Events carry XML node IDs, source refs, before/after raw and normalized state, match method/reasons, persistent references, coordinate/load evidence, policy versions, audit status and `remarkEligible`.

`SUPPORT_REV_REMARKS_V1` projects approved events into deterministic tokens with fixed precedence and token deduplication. Target benchmark remarks are ignored by lineage/change detection and are usable only by tests as an output oracle. Hold-related automatic events/remarks are explicitly excluded.

## Outputs and traceability

Primary output is the later Support Report shape plus policy-required invalid/replacement/tombstone rows. Audit outputs include comparison JSON, both generated XML documents, both categorized graphs, profile JSON and an XLSX audit sheet when XLSX export is available.

Every generated remark records this chain:

`remark -> remark token -> event -> lineage edge/candidate evidence -> categorized XML node -> sourceRef -> original row/stable columnId`

## Work packages

- WP-001: repository authority inspection and this architecture freeze
- WP-002: governed support revision profile + categorizer `many-per-row` extensions
- WP-003: dual table -> XML/graph pipeline
- WP-004: XML identity/candidate adaptation + reviewable ambiguity records
- WP-005: coordinate parsing/frame normalization
- WP-006: component/location/family lineage graph
- WP-007: common-support topology/cardinality
- WP-008: component/load comparison + typed event ledger
- WP-009: `SUPPORT_REV_REMARKS_V1`
- WP-010: CSV/XLSX and audit artifacts
- WP-011: separate Utilities tile and staged workflow
- WP-012: owner-benchmark tests, negative controls and regression qualification

No merge is part of this work; delivery is through a focused draft PR for owner review.
