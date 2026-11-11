# CIIFR_GEO G2 — pose-free topology / Boolean evidence prototype

**Scope:** WBS 3.2 / M14 / [XCU #177](https://github.com/reallakshman19/XML_Compare_Utilities/issues/177). Author: Oracle code contributor, **SELF_ASSESSED**. Pure source-only CLI, no VNext UI integration, no Writer or accepted NodeMap. Designed to consume the serializable `previewEvidence().graphs.source/target` objects from isolated [PR181](https://github.com/reallakshman19/XML_Compare_Utilities/pull/181), once exported. Not a new parser or GPU viewer.

## Run

```sh
node tools/ciifr-geo-g2/cli.mjs <PR181-export-json> [hypotheses.json] [Manual|Topology|OR|AND] > review.json
node --test tests/ciifr-geo-g2.test.mjs
```

The first input is `{"graphs":{"source":{...},"target":{...}}}` with measured XML `sha256` or `xmlSha256`, `nodes` with endpoint `id`, and `edges` with real `from`, `to` and signed `[dx,dy,dz]` vectors. Graph hashes are caller-supplied; the CLI **does not re-hash raw XML bytes**. Do not promote `claimedCii` metadata to authority. Hypotheses (optional) are `{ "sourceSha256":"<measured SOURCE XML SHA>", "targetSha256":"<measured TARGET XML SHA>", "manual":[{"source":"1","target":"A"}], "coordinate":[...] }`. For any external hypothesis rows both input hashes are **required** and checked. A `kind:"SEGMENT"` coordinate witness stays in `nonNodeEvidence`, not an invented target NODE.

**Signature:** incident degree + sorted incident edge length rounded to 0.001 mm + neighboring degree. This is independent of global pose, direction and node labels, but not independent of **length scale, topology segmentation or roundoff**. It can produce false negative zero-candidate rows, duplicate candidates, and coincidental singleton candidates; no result qualifies physical identity. The fixed 2 million node-pair work bound fails closed. The reported `spatialResidual` is always `NOT_EVALUATED`; post-pose residual must come from an independent Method C step, not this source algorithm.

**Modes:** Manual = A (user anchors) union C (registered coordinate hypotheses), Topology = T, OR = Manual union T, AND = Manual intersection T. The JSON retains `allEvidence` with role tags/witnesses, selected `included`, `excluded`, `conflicts` (source alternatives/target collisions/AND exclusion), `nonNodeEvidence`, per-source topology counts and measured input-hash binding. `qualifiedNodeMap=[]`, `physicalIdentityQualified=false`, `writerEligible=false` in all modes. No file write other than caller-directed stdout redirection.

**Evidence:** Author ran the included 7 focused Node tests, with independent source truth for the intended *behavior* from WBS3.2 #177; synthetic graphs are manufactured and are **not** S1/T engineering qualification. Tests cover rotation, ambiguity, target collision, negative AND, segment-only, invalid/stale SHA, work cap. Browser, actual PR181 integration, original S1/T real graph, native CAESAR and independent reviewer remain **NOT_RUN**. External source assets/ES modules are not bundled here.

**Next useful step:** an independently capable integrator/reviewer tests the CLI on *actual exported* PR181 graphs with known SOURCE/TARGET SHA, then adds UI adapters without changing G1 Method C/Three.js/Normal/Writer. In that integration, verify stale browser epochs, hash scopes, error-handling, memory and the real S3910 multiple-topology-candidate witness; separate source-only functional evidence from acceptance.
