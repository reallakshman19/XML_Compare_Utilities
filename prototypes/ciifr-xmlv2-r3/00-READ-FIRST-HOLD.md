# XMLv2 local prototype — HOLD snapshot

This archive preserves the existing local prototype without product-code changes. It is an unfinished, unaccepted snapshot for private local use. Packaging does not lift the Owner HOLD or authorize further development, release, P2.5 transfer, or engineering acceptance.

Extract the whole folder, then run Start-XMLv2.cmd on Windows. Python 3.10+ is required; the launcher tries the bundled local Python and then Python on PATH. The launcher prints the actual loopback URL. No private CII/XML inputs are included.

IMPORTANT CORRECTION TO THE INHERITED README AND SOURCE-MANIFEST.json: the local engine has a later DTD screening guard change. The inherited statements claiming the entire engine is byte-identical to F10 repair-r3 are stale. SOURCE-MANIFEST.json is retained unchanged as historical provenance, not a current checksum inventory. PACKAGE-SHA256.json records the bytes actually packaged.

Final documentation/source-manifest reconciliation, patch-ledger completion, full final regression readback, and final runnable qualification remain unfinished. Previously reported scoped checks are historical evidence and have not been rerun for this packaging request. Native CAESAR import, full P2/P2.1 integration qualification, P2.5 transfer readiness, and Owner acceptance remain NOT_RUN. Frozen P2/P2.1 and the source directory are unchanged by packaging.

The separate v1.1 and BM2 deliveries retain their own qualification boundaries. This is not a replacement for either engine.
