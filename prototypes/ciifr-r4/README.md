# CIIFR R4 S1 — frozen-R3 byte-identical XMLv2 prototype

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
private-file testing remain NOT_RUN. No merge, release, or transfer authority.
