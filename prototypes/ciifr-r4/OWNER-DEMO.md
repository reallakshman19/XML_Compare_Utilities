# CIIFR R4 S1 + S2 — Owner-local demonstration (DRAFT, no transfer)

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

Expected: 20 tests PASS, two elements, six pointer links, verified true,
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

Inspect `roundtrip_report.json`, `hierarchy.json`, and new `hierarchy.html` in the first output folder.
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


## S2: local, read-only five-step demonstration

1. Check roundtrip report has `verified: true`, `byte_differences: 0` and identical
   SHA-256/size; measure the input independently where it matters.
2. Double-click `hierarchy.html` beside the report; select an engineering line
   (including an explicitly blank label if the private input has one).
3. Expand an element and inspect all 53 ordered source fields, lexemes, physical
   CII rows, material ID (external catalog UNKNOWN), and pointer-owned components.
4. Switch to Nodes / associations to inspect FROM/TO occurrences, source-qualified
   node names, restraints and connecting nodes, displacement, SIF/TEE and bend
   positions; shared node numbers do NOT inherit another line's events. RIGID /
   REDUCERS remain element-owned.
5. Compare displayed ownership/locations against `hierarchy.json` and ensure
   reading the HTML did not change original or reconstructed CII bytes.

The single launch command already writes `hierarchy.html` atomically with other
outputs: a failed HTML/report write creates no final result directory.
Never publish or attach private generated HTML, source JSON, XML, reconstructed
CII, or screenshots of real models.

S2 limits: GLRD-SYS-20-10.CII private model trial NOT_RUN by this builder.
OTM reported a prior S2 viewer run on the real model (CoordinatorLandingpage
#158 comment 6391103956); S2-TRACE-1 has NOT been privately retested here.
Owner Windows double-click and CAESAR engineering/native review NOT_RUN.
Local Linux Chromium verified DOM interaction via set_content, not file://
navigation (blocked by administrator policy). No S3 edits/transfer.

## S2-TRACE-1 — source field-slot proof (no new writer)

Run the existing launcher into a NEW output directory, check the zero-byte gate,
then open `hierarchy.html`. For two equal-valued fields on one physical CII row,
click **Open source** on each: compare unique XML record/row/field identity,
1-based **field ordinal within that physical row**, section, record index,
original lexeme and CII line. An identical numeric lexeme is not an address.

On Nodes / associations, expand a node event and use **Trace association
source slot** to locate its originating auxiliary field and **Trace owning
ELEMENTS pointer slot** for the separate pointer address. Owner/line qualification
still applies to repeated node numbers. No semantic/CAESAR mapping is certified;
column/byte offsets remain UNKNOWN, and sentinels/material/unit meanings must
not be inferred. Compare the same address fields with local `hierarchy.json`.
Keep all real-file outputs/screenshots private. R4 edit/transfer S3 remains HOLD.
