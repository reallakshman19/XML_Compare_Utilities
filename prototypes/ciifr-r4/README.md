# CIIFR R4 S1 + S2-VIEW-1 — frozen R3 and offline hierarchy

**DRAFT / not accepted.** This standalone package reuses the original R3 B001
baseline_r3/engine.py and baseline_r3/profile.py byte-for-byte as shipped in the Oracle
workpack (handoff SHA d85d7ede9abc4381fe636a85b22c9ba9449a860fa8fd0420d267eb1fde13c9cb).
No real CII fixture, source-model paths, or engineering transfer are published.

- ciifr_r4/core.py: original source-faithful adapter, trusted SHA/size XML-only gate, read-only line/element/node hierarchy.
- ciifr_r4/cli.py: one-command CLI, output written to private staging then published only when all writes succeed.
- fixtures/make_synthetic.py: wholly invented 12,051-byte CII; reproducible SHA 9d07578793df16ec48c3a41b4bb2d82016b84b853c0ba03bfa57e3d76cbd79eb.
- tests: 7 supplied tests and 3 additional CLI fail-closed tests.
- Start-R4.cmd and OWNER-DEMO.md: Owner-local Windows demonstration.

From prototypes/ciifr-r4, using Python 3.10+ (standard library only):

    python fixtures/make_synthetic.py
    python -m unittest discover -s tests -v
    python -m ciifr_r4 --input fixtures/synthetic_two_span.cii --out scratch-synthetic
    python -m ciifr_r4 --xml scratch-synthetic/model.xmlv2.xml --expected-sha256 9d07578793df16ec48c3a41b4bb2d82016b84b853c0ba03bfa57e3d76cbd79eb --expected-bytes 12051 --out scratch-xml-only

The XML-only gate requires an independently trusted original byte count and SHA;
it never treats XML self-reported metadata as sufficient. Existing output paths
are rejected; stage data are removed on failure. Destination publication is a
rename, not a concurrent compare-and-swap operation: do not race writers.
The read-only hierarchy is not a serializer. P2/P2.1 files remain untouched.
Native Owner Windows, CAESAR engineering equivalence, independent review, and
private-file testing on this new trace head remains NOT_RUN. No merge, release, or transfer authority.

## S2 offline hierarchy (same one-command launch)

On successful private local `Start-R4.cmd` or Python `--input` conversion, the fresh
output directory contains `hierarchy.html` beside `hierarchy.json` and the original
roundtrip report. Double-click the HTML locally: no web server, external script,
network fetch, or editable source/export operation is needed.

Choose a line, expand its ordered elements, source lexemes and physical CII rows,
material ID (UNKNOWN external catalog), and auxiliary pointer-linked components.
Switch to nodes to see endpoint occurrences plus owner-qualified auxiliary-only
references, not global node-number inheritance; switch to raw source units for
original labels/factors only. Blank line labels remain the literal empty key.
RIGID and REDUCER stay with their owning element. The viewer is not
engineering/CAESAR qualification and cannot modify CII bytes.

Run `python -m unittest discover -s tests -v` for all 20 synthetic tests.
The file:// double-click behavior still needs an Owner native-Windows trial;
Chromium's interactive DOM test in a sandboxed environment passed, but direct
file:// navigation was blocked by the test environment's administrator.
GLRD private original is NOT_RUN.

## S2-TRACE-1 (read-only source address layer)

The offline source table exposes **Open source** for each field: SECTION, XML
Record ID/index, XML Row ordinal, original physical CII row, 1-based row-local
field slot and exact lexeme. Equal-valued neighboring fields have distinct
addresses; the model never looks up an address by numeric value. Each nodal
event exposes its auxiliary **source_anchor** and separate owning-element
**pointer_source**. Endpoints and material references have source anchors too.

Physical CII byte/column offsets: UNKNOWN (not derived). Engineering/CAESAR
semantic correctness: NOT VERIFIED. No reclassification, writer or export added.
Five additional synthetic tests cover repeated source tokens, shared-line node
ownership and first/second auxiliary field positions.
