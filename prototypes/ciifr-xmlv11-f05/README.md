# CIIFR XMLv1.1 local prototype

Double-click **Start-XMLv11.cmd**, or run `python -B server.py --open-browser` with Python 3.10+. No third-party dependencies, installation or internet connection are required. The local service binds only to 127.0.0.1 on a free port. Keep its terminal open; Ctrl+C stops it.

1. Select an authorized original CII. Click **Create XMLv1.1** and inspect the actual `CAESARII → PIPINGMODEL → SECTIONS → SECTION → PIPINGELEMENT/Record` hierarchy. Download the XML if wanted.
2. Click **Reconstruct CII**. This uses the generated XML and compares the resulting bytes with the uploaded original. Download the CII and verification JSON.
3. Existing XMLv1.1 can be reconstructed by itself. Without an original CII baseline, comparison is explicitly NOT_RUN. To compare existing XML with an original, select CII first and XML second.

The eight engine modules are unchanged from the independently reviewed F05 code-only candidate (SHA-256 `e7901a79fdbd9dd992923303b33fb0d3e2d0d0550826a6ad363ea8a8847150cf`). They match the supplied full private package. SOURCE-MANIFEST.json records exact module hashes. This adapter retains the schema `RichInputXML-P1.v1.1`; it does not replace it with XMLv2.

This is a qualified Version-14 converter, not a claim to support every possible CII populated section. Unsupported forms fail closed. Earlier v1.1 XML missing mandatory VERSION gap metadata must be regenerated using this F05 reader. Lexical metadata preserves unchanged spelling, line terminators and padding; typed XML values govern reconstruction. Source original/replay payloads are not embedded.

The local HTTP interface screens DTD/entities before XML parsing, including UTF16 markup. Canonical UTF8 inspection XML is separate from output CII bytes. Files are limited to16MiB; generated XML above that limit is rejected. Inputs stay in memory. Foreign Host/Origin, cross-site requests, unknown routes and oversized bodies are rejected. Local processes under the same account remain within the existing local trust boundary. The bundled original CLI modules remain unchanged; HTTP guards are adapter behavior.

The interface supports conversion and read-only hierarchy inspection, with lazy batches of100children. Search highlights loaded nodes only. Endpoint-node counts mean distinct element endpoint values, not a completeness assessment of all auxiliary nodes. File changes invalidate results/downloads; late responses are discarded. Verification JSON contains hashes/counts/results, not the full XML payload.

No mapping, Apply, property transfer or engineering acceptance is provided. P2/P2.1 files are untouched. Full frozen integration V11-10, native CAESAR and final Owner acceptance remain NOT_RUN. Current backend tests are self-assessment of the newly authored wrapper, separate from the prior independent F05 engine review. File-driven browser tests remain NOT_RUN following a declined browser upload permission; no workaround was used.

Authorship: adapter/server/UI by Oracle01a16c60 under the Owner's scoped implementation assignment; engine by the prior v1.1 coder with retained review evidence. Customer inputs and generated XML/CII are excluded from this code-only directory and archive.

See QUALIFICATION.md for executed checks and limits. Reproduce local checks with tests/smoke.py (--url, --input, --artifacts), tests/encoding_smoke.py (--url, --xml, --input, --report), and tests/edits_smoke.py (same four arguments). Supply authorized private originals/generated XML externally; keep artifacts outside this code-only directory.
