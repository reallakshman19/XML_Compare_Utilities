import json
import subprocess
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "docx_to_markdown.py"

DOCUMENT_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr><w:pStyle w:val="Heading1"/></w:pPr>
      <w:r><w:t>Example Heading</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>Alpha</w:t><w:tab/><w:t>Beta</w:t><w:br/><w:t>Gamma</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:br w:type="page"/><w:t>After page break</w:t></w:r>
    </w:p>
    <w:tbl>
      <w:tr>
        <w:tc>
          <w:tcPr><w:gridSpan w:val="2"/></w:tcPr>
          <w:p><w:r><w:t>A &amp; B</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:p><w:r><w:t>Outer</w:t></w:r></w:p>
          <w:tbl>
            <w:tr>
              <w:tc><w:p><w:r><w:t>Nested 1</w:t></w:r></w:p></w:tc>
              <w:tc><w:p><w:r><w:t>Nested 2</w:t></w:r></w:p></w:tc>
            </w:tr>
          </w:tbl>
        </w:tc>
      </w:tr>
    </w:tbl>
    <w:sectPr/>
  </w:body>
</w:document>
"""


def build_docx(path: Path):
    with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED) as package:
        package.writestr("word/document.xml", DOCUMENT_XML)


class DocxToMarkdownTest(unittest.TestCase):
    def run_converter(self, table_format: str, evidence: bool = False):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = root / "sample.docx"
            output = root / "sample.md"
            evidence_path = root / "sample.evidence.json"
            build_docx(source)
            command = [sys.executable, str(SCRIPT), str(source), "--output", str(output), "--table-format", table_format, "--stats-json"]
            if evidence:
                command.extend(["--evidence", str(evidence_path)])
            result = subprocess.run(command, check=True, capture_output=True, text=True)
            evidence_json = json.loads(evidence_path.read_text()) if evidence else None
            return output.read_text(encoding="utf-8"), json.loads(result.stdout), evidence_json

    def test_html_mode_preserves_order_breaks_and_table_structure(self):
        markdown, stats, _ = self.run_converter("html")
        self.assertIn("# Example Heading", markdown)
        self.assertIn("Alpha\tBeta\nGamma", markdown)
        self.assertIn("---\n\nAfter page break", markdown)
        self.assertIn('<td colspan="2">A &amp; B</td>', markdown)
        self.assertIn("Nested 1", markdown)
        self.assertIn("Nested 2", markdown)
        self.assertEqual(stats["tables"], 1)
        self.assertEqual(stats["nonempty_text_nodes"], 9)

    def test_tsv_mode_preserves_table_text_and_reports_hashes(self):
        markdown, stats, _ = self.run_converter("tsv")
        self.assertIn("A & B\tOuter Nested 1 | Nested 2", markdown)
        self.assertEqual(len(stats["source_git_blob_sha"]), 40)
        self.assertEqual(len(stats["output_sha256"]), 64)
        self.assertEqual(stats["table_format"], "tsv")

    def test_expected_source_hash_mismatch_fails_closed(self):
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / "sample.docx"
            build_docx(source)
            result = subprocess.run([sys.executable, str(SCRIPT), str(source), "--expected-git-blob-sha", "0" * 40], capture_output=True, text=True)
            self.assertEqual(result.returncode, 2)
            self.assertIn("source Git blob SHA mismatch", result.stderr)

    def test_evidence_is_versioned_and_traces_blocks(self):
        _, stats, evidence = self.run_converter("html", evidence=True)
        self.assertEqual(evidence["semanticSchemaVersion"], "1")
        self.assertEqual(evidence["canonicalizationVersion"], "1")
        self.assertEqual(evidence["optionsHash"], stats["options_hash"])
        self.assertEqual(evidence["blocks"][0]["provenance"]["paragraph_index"], 0)
        table = next(block for block in evidence["blocks"] if block["kind"] == "table")
        self.assertEqual(table["rows"][0][0]["columnSpan"], 2)
        self.assertEqual(table["rows"][0][0]["provenance"]["cell_index"], 0)

    def test_evidence_is_byte_deterministic(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = root / "sample.docx"
            build_docx(source)
            outputs = []
            for index in range(2):
                evidence = root / f"evidence-{index}.json"
                subprocess.run([sys.executable, str(SCRIPT), str(source), "--evidence", str(evidence)], check=True, capture_output=True, text=True)
                outputs.append(evidence.read_bytes())
            self.assertEqual(outputs[0], outputs[1])


if __name__ == "__main__":
    unittest.main()
