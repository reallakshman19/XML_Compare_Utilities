# CIIFR G1 linked-pick inspection framework

Scope: existing WBS3.1/G1/M13, native XCU issue #180. This source-only tool is stacked on draft PR183 and its PR181 XML preview base.

## What matters
The Owner must be able to inspect every candidate SOURCE row connected to a selected TARGET node. The existing SVG selection path chooses just the first row on target reuse, while PR183 exports complete typed links. This tool independently recomputes those links from the candidate ledger and rejects incomplete associations.

Input is an exported CIIFR.XmlGeometryPreview.v1 JSON containing viewerScene, candidates.rows, original measured XML graph SHA values and an epoch. NODE identifiers and ELEMENT record indices are different identities. The output marks physical identity and Writer eligibility false.

## Next two connected tasks
First, an authorized G1 UI builder connects existing SVG and WebGL picks to the complete row set, using the existing viewer and checking session binding against current input after callbacks. Test target reuse, stale callbacks, switching/disposal and true served browser interaction. An offline export is not a live-binding proof.

Second, separately qualify G2 topology PR182 against actual PR181 graphs and preserve alternative candidates, collisions and Manual/OR/AND differences. Neither G2 nor Element WBS4 is implemented here.

## Limits
Eight local author-created synthetic Node tests, including executed CLI, passed. Full repository checkout, original-file browser/GPU test, independent review and native engineering acceptance were NOT_RUN. This new-only review tool does not edit Method C, renderers, application, exports, Writer, product routes, Common Cycle or Progress Page.

Sources: XCU #180, draft PR183, merged Common PR514. All performance or ROI benefits are prospective, not measured.