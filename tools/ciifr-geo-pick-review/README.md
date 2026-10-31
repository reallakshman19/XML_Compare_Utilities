# XML G1 linked-pick read-only inspector

From an exported PR183 `CIIFR.XmlGeometryPreview.v1` JSON, run:

```sh
node tools/ciifr-geo-pick-review/cli.mjs ./preview.json TARGET NODE 90
node tools/ciifr-geo-pick-review/cli.mjs ./preview.json TARGET ELEMENT 4
node --test tools/ciifr-geo-pick-review/tests.mjs
```

Prints `CIIFR.GeometryPickReview.v1` JSON to stdout. No source edits, output file, network, external package or renderer. The `picked.objectId` retains the original side/member/measured-XML-SHA/kind/local-ID tuple. The report includes **all** linked SOURCE rows, underlying candidate rows and reused TARGET conflict evidence; malformed or missing associations are errors, not guessed matches.

This is an **offline exported snapshot**, not a live pick callback: a saved scene binding does not prove it is current. The next authorized UI builder must check PR183's live scene binding and integrate the real SVG/GPU selection and conflict drawer. Selection never approves physical engineering correspondence, transfers data or enables Writer/TARGET1.

Node 90 and element 4 in the examples are illustrative synthetic IDs. See [FRAMEWORK.md](FRAMEWORK.md) and [ONBOARDING_PLAN.md](ONBOARDING_PLAN.md).