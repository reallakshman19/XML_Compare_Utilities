# PS Family Clash Audit Benchmark Readiness

This document records which benchmark requirements are currently automated and which remain planned.

## Automated benchmark command

```bash
npm run test:ps-family
npm test
```

## Current automated coverage

| Benchmark area | Status | Automated evidence |
|---|---|---|
| Parser correctness | Met | `tests/ps-family-clash-audit.test.js` validates XML row count, CSV header handling, Copy identity, pipe/branch parsing, and position parsing. |
| PS-11147 audit correctness | Met | `tests/ps-family-clash-audit.test.js` validates 17 expected, 11 clash rows, 7 found, 10 missing, 1 out-of-family, and 3 duplicate members. |
| POSFamily correctness | Met | `tests/ps-family-clash-audit.test.js` validates PS-12005 groups 3 element-detail rows into 1 POSFamily. |
| POS tolerance boundary | Met | `tests/ps-family-clash-audit.test.js` validates 25.000 mm remains in-family and 25.001 mm splits. |
| Export availability | Met | `tests/ps-family-clash-audit.test.js` and `tests/ps-family-clash-audit-config.test.js` validate CSV/JSON export content and export-button metadata. |
| Configurable source side / source family / tolerance | Met | `tests/ps-family-clash-audit-config.test.js` validates source side, source-family override, and POS tolerance settings. |
| File-input configuration | Met | `tests/ps-family-clash-audit-config.test.js` validates browser file metadata helpers and file input rendering. |
| Report-tab rendering | Met | `tests/ps-family-clash-audit-config.test.js` validates report tab configuration and independent report rendering. |

## Not yet automated

| Benchmark area | Status | Required next proof |
|---|---|---|
| Browser UI smoke | Planned | Add DOM-level test for mounting, file-input status updates, Run Audit, tab switching, and export button availability. |
| Medium/large performance | Planned | Add deterministic synthetic dataset generator and measure parser + engine + export time outside DOM rendering. |
| Snapshot stability | Planned | Add stable fixture snapshots for coverage CSV, source-vs-POSFamily CSV, and audit JSON. |
| Accessibility / keyboard navigation | Planned | Add focus-order and button-label checks for report tabs and export controls. |

## Current conclusion

The functional correctness benchmark identified for the PS-11147, PS-12005, POS tolerance, export, and configuration behavior is met by automated tests.

The complete benchmark program is not yet fully closed because browser UI smoke, large-data performance, and snapshot-stability gates are still planned.
