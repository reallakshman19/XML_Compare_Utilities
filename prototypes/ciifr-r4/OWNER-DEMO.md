# CIIFR R4 S1 — Owner-local demonstration (DRAFT, no transfer)

Requirements: Python 3.10+; no third-party packages. Download PR #163 branch
as an ordinary ZIP or clone the branch. Run commands from `prototypes/ciifr-r4`.
Never commit or send real CII, generated XML, reconstructed files, path names,
or private results to the public repository. This tool does not edit originals.

## Quick synthetic proof

```powershell
py -3 fixtures/make_synthetic.py
py -3 -m unittest discover -s tests -v
py -3 -m ciifr_r4 --input fixtures/synthetic_two_span.cii --out scratch-synthetic
```

Expected: 10 tests PASS, two elements, six pointer links, verified true,
zero changed bytes, source/output SHA-256
`9d07578793df16ec48c3a41b4bb2d82016b84b853c0ba03bfa57e3d76cbd79eb`.
The `--out` folder must not already exist; use a new path for each run.

## Owner private CII proof

```powershell
# Windows PowerShell: record independently trusted original checksum and size FIRST.
Get-FileHash -Algorithm SHA256 "C:\private\model.CII"
(Get-Item "C:\private\model.CII").Length

# Single-command local CII -> XMLv2 -> CII verification and read-only projections.
.\Start-R4.cmd "C:\private\model.CII" "C:\private\r4-run-001"

# XML-only, with NO original CII path given to the converter.
py -3 -m ciifr_r4 --xml "C:\private\r4-run-001\model.xmlv2.xml" --expected-sha256 YOUR_INDEPENDENT_SHA256 --expected-bytes YOUR_INDEPENDENT_SIZE --out "C:\private\r4-xml-only-001"
```

Inspect `roundtrip_report.json` and `hierarchy.json` in the first output folder.
Compare `reconstructed.CII` bytes and SHA to the original with your own tooling.
The `hierarchy.json` is **read-only and informational**; it is not a separate
serializer. The XML-only path must FAIL_CLOSED on wrong trusted size/hash and
must not create the target output folder. As a falsifier, use 64 zeros for hash
with a new output path and confirm nonzero exit and no successful artifacts.

Limitations: author-tested on Linux/Python 3.13.5 and wholly invented fixture only;
Owner native Windows, CAESAR-II import/engineering equivalence, independent
review and all real CII results are NOT_RUN in this delivery. The frozen baseline
covers the qualified observed B001 format only, not arbitrary CII dialects.
Output publication uses private adjacent staging and a final rename; do not race
two processes against the same destination path (not a concurrent CAS protocol).
No merge, release, or engineering transfer authority.
