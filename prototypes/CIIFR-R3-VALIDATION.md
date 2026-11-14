# CIIFR R3 draft-publication validation

Tested basis: byte-identical imported payloads in CIIFR-R3-DELIVERY-MANIFEST.json, based on main8fea0491ca4ca85565132a81f1620f57fbc3014e. Executed on Windows using Python standard library and Node syntax checks. No production integration or engine repair was performed by this PR.

| Check | Status | Observation | Oracle and limitation |
|---|---|---|---|
| All71imported source members versus ZIP bytes/SHA | PASS | ARTIFACT_INSPECTION | Independent byte comparison, not functional acceptance |
| BM2 core `python -B -m unittest discover -s tests/node-transfer -v` | PASS35/35 | LOCAL_EXECUTION | Author-exposed regression; includes explicitly synthetic cases |
| BM2 actual-file `python -B tests/http_smoke.py --url <temporary-loopback> --source <private> --target <private> --reference <private> --artifacts <private-output>` | PASS46/46 | LOCAL_EXECUTION | Author-exposed API checks; literal/source-byte comparisons where specified, no approved engineering mapping |
| v1.1 `python -B tests/smoke.py --url <temporary-loopback> --input <private> --artifacts <private-output>` | PASS20/20 | LOCAL_EXECUTION | Actual original/reconstructed bytes and SHA independently compared; HTTP tests remain author-exposed |
| v1.1 `tests/encoding_smoke.py` with private XML/input/report arguments | PASS10/10 | LOCAL_EXECUTION | Encoding/rejection regressions and actual original byte expectations |
| v1.1 `tests/edits_smoke.py` with private XML/input/report arguments | PASS5/5 | LOCAL_EXECUTION | Direct literal-source edit expectations and fail-closed negatives |
| Python compilation and each JS `node --check` / <300lines | PASS | LOCAL_EXECUTION | Syntax only; does not qualify held v2 functionality |
| Customer filename/private-path/Drive-link scan and private-payload exclusion | PASS | SOURCE_INSPECTION | Targeted publication scan and allowlisted source inventory, not a general security audit |
| XMLv2 full functional reassessment/finalization | NOT_RUN | NOT_OBSERVED | Owner HOLD persists; inherited README/source manifest are stale, corrected by first-read HOLD note |
| Actual frozen P2/P2.1 integration tree before/after qualification | NOT_RUN | NOT_OBSERVED | Isolated artifact preservation is narrower evidence |
| Full file-driven browser / native CAESAR / Owner acceptance | NOT_RUN | NOT_OBSERVED | No release, engineering-equivalence or P2.5-readiness claim |

Temporary test servers were stopped. Existing Owner localhost services were untouched. No private CII/XML, generated output, private child links or model identifiers are committed. Complete private execution evidence: OWNER_PRIVATE_REF:ciifr-r3-model-benchmarks-20261024. Independent review of this PR is pending; historical separate scoped reviews do not accept these wrappers or held v2.
