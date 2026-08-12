# DOCX to Markdown utility

`scripts/docx_to_markdown.py` converts the readable Word body of a DOCX file to deterministic Markdown using only the Python standard library.

It opens the DOCX as a ZIP package, reads `word/document.xml`, walks top-level Word paragraphs and tables in document order, maps `Heading1` through `Heading6` to Markdown headings, preserves tabs and line/page breaks, and retains table text including nested tables. No Office application, OCR, Pandoc, or third-party Python package is required.

## Usage

Faithful table structure using HTML tables inside Markdown:

```bash
python scripts/docx_to_markdown.py input.docx --output output.md --table-format html --stats-json
```

Compact table transcription using tab-separated rows:

```bash
python scripts/docx_to_markdown.py input.docx --output output.md --table-format tsv --stats-json
```

The default table format is `html`.

## Integrity gates

The converter can fail closed when a controlled source or generated artifact does not match an expected identity:

```bash
python scripts/docx_to_markdown.py input.docx \
  --output output.md \
  --expected-git-blob-sha <40-character-git-blob-sha> \
  --expected-output-sha256 <64-character-sha256> \
  --stats-json
```

The reported statistics include:

- DOCX byte count;
- `word/document.xml` byte count and ZIP CRC32;
- source Git blob SHA-1;
- generated Markdown SHA-256 and byte count;
- top-level paragraph and table counts;
- count of non-empty Word text nodes;
- selected table rendering mode.

The Git blob identity is calculated using Git's canonical `blob <size>\0<bytes>` hashing rule, so it can be compared directly with a repository blob SHA.

## EI AVIFF conversion provenance

This utility captures the conversion logic used to recover the controlled EI AVIFF worked-examples DOCX that was later saved to `3D_Converters/docs/`.

That controlled source was identified as:

- repository: `reallaksh19/Common`;
- commit: `fb549185b9b27edc2379734240320a85c5bef9f6`;
- path: `Energy-Institute-AVIFF---Worked-Examples.doc.docx`;
- Git blob SHA: `ceee15ed5f7f320045d5f3979024e2e8664613f2`.

For source-review work, prefer `--table-format html` because it retains table and colspan structure. Use `--table-format tsv` when a compact, text-oriented transcription is more useful.

## Focused validation

Run the standalone standard-library test:

```bash
python tests/docx_to_markdown_test.py
```

The test creates a minimal DOCX package in a temporary directory and verifies heading conversion, tabs/line/page breaks, nested table text, HTML colspan output, compact TSV output, deterministic hashes, and fail-closed source-hash validation.
