# CIIFR R3 local prototypes

Three separate local applications, imported byte-identically from existing ZIP deliveries. Private engineering inputs and generated outputs are excluded. Each app requires Python3.10+ and standard library only, binds to loopback and prints its actual URL. Run each from its own directory.

| Prototype | Launch | Purpose | Current boundary |
|---|---|---|---|
| [XMLv1.1](ciifr-xmlv11-f05/README.md) | `ciifr-xmlv11-f05/Start-XMLv11.cmd` | CII↔RichInputXML-P1.v1.1 conversion, inspection and byte/SHA comparison using pinned F05 modules | Owner/native acceptance and full frozen integration qualification NOT_RUN |
| [XMLv2 HOLD](ciifr-xmlv2-r3/00-READ-FIRST-HOLD.md) | `ciifr-xmlv2-r3/Start-XMLv2.cmd` | Independent RichInputXMLv2.1 converter/inspection snapshot | HOLD, unfinished; inherited README/source manifest contain stale engine-identity claims; read HOLD note and PACKAGE-SHA256 first |
| [BM2](ciifr-bm2-nodemap/README.md) | `ciifr-bm2-nodemap/Start-BM2.cmd` | Node number/name proposals, explicit inspection pairs and displacement before/proposed preview; uses XMLv1.1 F05 | Informational only; mapping NOT_ACCEPTED, basis NOT_VERIFIED, Apply/export DISABLED |

These additive opt-in prototypes leave the production UI and frozen P2/P2.1 unchanged. Discover/propose/unique matches do not authorize engineering identity. Source and target may differ in count, numbering and sequence; no approved correspondence is inferred. Future P2.5 requires explicit approved mapping and byte-scoped target export. Native CAESAR acceptance, engineering equivalence and final Owner software acceptance remain outstanding. P3 is deferred.

## Validation and provenance

CIIFR-R3-DELIVERY-MANIFEST.json identifies every imported member and exact source ZIP hash. Author-exposed tests are self-assessed; historical separate core reviews do not independently accept wrappers or held v2. Private actual-input evidence remains under OWNER_PRIVATE_REF:ciifr-r3-model-benchmarks-20261024. Current validation commands/results and continuation are in the PR work report. Draft publication does not authorize merge, deployment or engineering acceptance.
