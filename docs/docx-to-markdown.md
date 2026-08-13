# DOCX to Markdown utility

`scripts/docx_to_markdown.py` converts DOCX packages to deterministic Markdown using only the Python standard library.

The DOCX path now builds an OOXML package graph before parsing the Word body. It indexes package parts, content types and per-part relationships; resolves `word/styles.xml` inheritance and `word/numbering.xml`; walks paragraphs, tables and content controls in source order; and keeps external relationships as data without performing network fetches. No Office application, OCR, Pandoc, or third-party Python package is required.

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
- source SHA-256;
- generated Markdown SHA-256 and byte count;
- top-level paragraph and table counts;
- count of non-empty Word text nodes;
- selected table rendering mode;
- semantic schema and canonicalization versions;
- canonical options hash;
- package part, relationship, style, numbering-instance and content-type counts.

The Git blob identity is calculated using Git's canonical `blob <size>\0<bytes>` hashing rule, so it can be compared directly with a repository blob SHA.

## Semantic model and evidence

Issue #960 introduces `scripts/document_model.py` as the versioned semantic contract between source parsing and rendering. The existing `scripts/docx_to_markdown.py` entry point remains the compatibility wrapper; it parses into semantic paragraph, page-break, unsupported and table objects before rendering Markdown.

Deterministic evidence can be emitted without changing normal Markdown output:

```bash
python scripts/docx_to_markdown.py input.docx \
  --output output.md \
  --evidence output.evidence.json \
  --table-format html
```

Evidence contains the source SHA-256 and Git blob SHA, converter revision, semantic schema/canonicalization versions, profile/options identity, stable source-derived block IDs, DOCX part/index provenance, effective style/list metadata, hyperlink targets, table cell coordinates/spans, package metadata and stable diagnostics. Canonical evidence is serialized with sorted keys and contains no runtime timestamp or random UUID.

## OOXML package, styles and numbering

The primary `convert_docx_bytes()` path now resolves package context instead of treating `word/document.xml` as the whole document. `convert_document_xml()` remains available as a compatibility path for callers that intentionally supply only the main XML part; it cannot resolve package relationships, styles or numbering that are absent from that input.

Heading inference uses deterministic priority: direct `w:outlineLvl`, inherited style `w:outlineLvl`, then recognized `Heading1`-`Heading6` style identifiers/names. A large/bold formatting heuristic is intentionally not used. Style `w:basedOn` inheritance is retained in evidence.

Numbering resolves `numId -> w:num -> abstractNumId -> w:abstractNum -> ilvl`, including `startOverride` and level overrides. Markdown uses `-` for bullet levels and `1.` for ordered levels while evidence retains Word `numFmt`, `lvlText`, start and level so source semantics are not invented.

Paragraph parsing is child-order aware. Content controls (`w:sdt`) are expanded in place; external hyperlinks are rendered from relationship targets without fetching them; complex field instructions are suppressed while displayed field results are retained; and the current deliberate revision policy is **accepted** (`w:ins`/`w:moveTo` retained, `w:del`/`w:moveFrom` suppressed). Missing relationships/styles/numbering produce stable diagnostics rather than guessed values.

Logical table-grid reconstruction (`w:vMerge`, omitted cells and authoritative logical coordinates), full revision modes, notes/comments, image extraction, field-forensic evidence, headers/footers, PDF extraction and OCR remain subsequent issue #960 slices and must not be inferred as complete here.

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

The focused suite now covers the legacy byte-exact HTML/TSV outputs plus deterministic evidence, style inheritance, direct outline overrides, numbering/start overrides, package content types/root relationships, content-control order, hyperlink resolution, complex field display results, accepted revisions, symbols, missing-relationship diagnostics, unresolved-style behavior and ZIP path-traversal rejection.
