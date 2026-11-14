# CIIFR R3 — BM2 node-map inspection prototype

Private local prototype, 24 October 2026. Python 3.10+; standard library only.

## Start and use

1. Extract the complete package into a private folder.
2. Double-click `Start-BM2.cmd`, or run `python -B server.py --open-browser`.
3. The console prints the actual loopback URL. Keep that process running.
4. Select the authorized **Source CII** and **Target CII**. Optionally select the **BM2 reference CII**.
5. Select NUMBER, NAME, BOTH or EITHER and click **Inspect models**.
6. Review the catalogues and proposed pairs. Select inspection pairs, or add an explicit manual pair. Select independent source and target vectors and DX/DY/DZ components, then request the preview.

Selections are informational; selecting a checkbox does not approve engineering correspondence. A unique name or matching number is evidence for a proposal, not engineering identity. The optional BM2 reference audits name-field byte differences only. It is not a displacement-transfer oracle.

The page displays actual before/proposed values and reasons for blocked cells. Changed files, pair selection, vectors or components invalidate applicable results; late responses are discarded. Inspection JSON can be saved privately. **Node-transfer Apply and CII export are disabled**, including in the HTTP API and inherited CLI. No CII/XML download is produced by this application.

## Scope and safeguards

- Uses the eight pinned XMLv1.1 F05 converter files unchanged. This is not the XMLv2 engine.
- Catalogues element endpoint nodes and qualified displacement-only nodes; this is not a complete generic catalogue of every auxiliary node family.
- Proposals use all aliases when checking uniqueness. Conflicting aliases cannot establish a unique NAME match. Inspection pairs must exist and be one-to-one.
- Scientific displacement formatting preserves exact no-op tokens. Changed values use the pinned F05 convention and reject inexact or overflowing representations. Both-zero transfers preserve the target zero spelling and sign under the existing plan policy.
- Input digests, implementation identities and inspection choices bind each preview. No Owner mapping, coordinate-basis approval or vector equivalence is fabricated.
- Local backend validates fresh input bytes using the pinned reader. Unit/IZUP metadata must agree for a preview; this check alone does not prove a common physical coordinate basis.
- Only translation components DX/DY/DZ are exposed. No rotations, coordinate transforms, branch transfer, element-block transfer or engineering export is enabled.
- Bind address is `127.0.0.1`; no network assets or third-party libraries. Host/origin checks, static asset allowlist, 16 MiB per input and 64 MiB request limit apply. Uploaded files are briefly copied to local temporary files and removed after processing. There is no automatic public upload or model-content logging.

No P2/P2.1 files, original converter distribution or existing converter prototype were modified. Integration into a repository and native CAESAR acceptance remain outstanding.

## Validation and attribution

The author is Oracle `01a16c60`, acting as scoped implementation author under the Owner's BM2 grant. Author-run checks are self-assessed; a separate read-only agent challenged the core changes and wrapper. Neither is Owner acceptance.

- 35 core tests passed, including the original 27 and eight focused alias/format regression tests.
- 46 actual-input HTTP/format checks passed, including all 18 finite nonzero displacement no-ops, stale digests, invalid pairs and unavailable export routes.
- Three actual input models passed exact XMLv1.1 byte/SHA round trips in the prior review; the final wrapper revalidates each supplied model before use.
- Initial real-browser page rendering was observed. Automated file-driven browser workflow and Owner/native CAESAR acceptance are NOT_RUN; Owner must select the private files manually.

The current three real models do not prove correctness for every possible node count or ordering. Broader coverage and explicitly approved correspondence remain necessary before enabling a transfer writer. Source and Target contain differences beyond pure node renumbering. See `QUALIFICATION.md` for limits and `SOURCE-MANIFEST.json` for source identities.

## Reproduce checks

```powershell
python -B -m unittest discover -s tests/node-transfer -p 'test_*.py' -q
python -B tests/http_smoke.py --url http://127.0.0.1:PORT --source PRIVATE_SOURCE.CII --target PRIVATE_TARGET.CII --reference PRIVATE_BM2.CII --artifacts PRIVATE_RESULTS
```

The HTTP smoke's counts are explicitly scoped to the reviewed three-file benchmark, not universal model constraints. Private engineering inputs and generated outputs are excluded from the code package. Stop the local server with Ctrl+C. A later restart may choose a different port; use the printed URL.
