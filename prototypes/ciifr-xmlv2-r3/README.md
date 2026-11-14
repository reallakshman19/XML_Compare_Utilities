# CIIFR XMLv2 local prototype

Run **Start-XMLv2.cmd** on Windows, or `python -B server.py --open-browser` with Python 3.10+. No third-party packages or internet connection are required. Keep the terminal running; Ctrl+C stops the service. It binds only to 127.0.0.1 on a free port.

1. Select an authorized CII file and click **Create XMLv2**. Inspect the actual sections, records, rows, fields and relationships. Download XML if desired.
2. Click **Reconstruct CII** to use the generated XML. The comparison uses the original uploaded CII bytes. Download reconstructed CII and verification JSON.
3. An existing XML can also be loaded directly. Reconstruction requires only that XML and the independent engine. Without an original baseline, comparison is explicitly NOT_RUN. To compare existing XML, select the original CII first, then select XML.

Files are limited to 16 MiB each. The local backend processes inputs in memory; XML validation uses a closed temporary file deleted after loading. No customer examples are bundled. File changes clear old outputs; conversion results are bound to the current selection. The browser does not reformat output bytes. Text in the hierarchy is escaped and children load in batches of 100. Search highlights only already-loaded nodes.

The vendored engine is the byte-identical F10 repair-r3 candidate, schema RichInputXMLv2.1, profile CII-V14-ASCII-CRLF-B001. It supports the observed ASCII/CRLF grammar and rejects unsupported populated sections/layouts. Preservation of lexical source fields makes unchanged round trips exact. Integer-zero signs remain lexical when untouched; edited integers are canonical; real signed zero retains its separate sign semantics. Review SOURCE-MANIFEST.json for identity.

This prototype provides conversion and read-only inspection. It supplies no mapping, engineering approval, transfer or Apply operation. Exact bytes on the qualified fixture do not establish native CAESAR acceptance or general P2.5 readiness. B014 full frozen integration qualification and Owner engineering acceptance remain NOT_RUN. P2/P2.1 are unchanged.

The HTTP adapter rejects foreign Host/Origin, cross-site requests, arbitrary paths and oversized bodies. It has no remote upload service, CORS or external assets. It is a local single-user prototype; other processes under the same local account remain within the existing local trust boundary.

Authorship: unchanged engine by prior coder, independent scoped Oracle Windows reassessment; server/service/browser assets authored by Oracle 01a16c60 under the Owner's named implementation assignment. Separate read-only review supplements self-tests and is not final Owner acceptance. Private review evidence is retained outside this code-only directory.
