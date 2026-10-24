# CIIFR R4 draft coding structure (handoff scaffold)
Parent charter: https://github.com/reallakshman19/XML_Compare_Utilities/issues/158

The Oracle has produced a **locally runnable but not merged** PoC ZIP, `CIIFR_R4_STANDALONE_WORKPACK.zip`, for the Builder handoff in the Owner's chat; verify bytes after receipt. Do not claim this draft PR itself contains an integrated runnable app yet.

```text
ciifr-r4/
  baseline_r3/
    engine.py             # frozen R3 B001 lexer/XML writer
    profile.py            # frozen field/section profile
  ciifr_r4/
    core.py               # unedited hard roundtrip, separate XML-only trusted gate, read-only engineering index
    cli.py                # command-line runner; fresh outputs only; failures nonzero
    __main__.py
  fixtures/
    make_synthetic.py     # truly invented two-element CII with nonzero typed pointers
    synthetic_two_span.cii
  tests/
    test_r4.py            # synthetics, negative malformed pointer/line ending/tampering
  benchmarks/
    LOCAL_RESULTS.json    # locality/scope-labelled timings and exact byte status
  docs/
    CONCEPT.md
    WORK_PLAN.md
  assignments/
    BUILDER_S1.md
    REVIEWER_S1_S2.md
```

Expected local commands, run in the unpacked PoC folder:
```bash
python -m unittest discover -s tests -v
python -m ciifr_r4 --input fixtures/synthetic_two_span.cii --out scratch-synthetic
python -m ciifr_r4 --xml scratch-synthetic/model.xmlv2.xml --expected-sha256 9d07578793df16ec48c3a41b4bb2d82016b84b853c0ba03bfa57e3d76cbd79eb --expected-bytes 12051 --out scratch-xml-only
python -m ciifr_r4 --input PATH_TO_OWNER_PRIVATE_CII --out scratch-private
```

Public synthetic baseline: 12,051 bytes and SHA-256 `9d07578793df16ec48c3a41b4bb2d82016b84b853c0ba03bfa57e3d76cbd79eb`. Protected fixture bytes must never be posted here. The R3 engine/profile are intended to be imported unchanged into the builder's draft PR; do not silently re-engineer them. S2 uses one source-linked model; nodes can appear under multiple engineering line labels. Preserve accurate record ownership.

Status: **foundation/spec scaffold**, not a release. Local Oracle-generated PoC was self-tested; independent review, Owner native demo, merged integration remain NOT_RUN.
