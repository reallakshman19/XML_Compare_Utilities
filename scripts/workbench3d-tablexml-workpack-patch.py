#!/usr/bin/env python3
from pathlib import Path

PATH = Path('workbench3d/ui/table-to-xml-tab.js')
source = PATH.read_text(encoding='utf-8')


def replace_once(text, before, after, label):
    count = text.count(before)
    if count != 1:
        raise RuntimeError(f'{label}: expected one anchor, found {count}')
    return text.replace(before, after, 1)

source = replace_once(
    source,
    "import { downloadFile } from '../apply/exporters.js';",
    "import { downloadFile } from '../apply/exporters.js';\nimport { tableXmlDiagnosticsPanelHtml, tableXmlDiagnosticsDownload } from './table-to-xml-diagnostics-view.js';",
    'diagnostics view import',
)
source = replace_once(
    source,
    '    <h3>5 · Generate NodeSet XML</h3>',
    '    <h3>5 · Generate NodeSet XML (comparison-only)</h3>\n    <p class="wb3d-muted">This output is <strong>nodeset/v1</strong> for Workbench3D node comparison. It is not CAESAR II InputXML and contains no PIPINGELEMENT records.</p>',
    'generate heading classification',
)
source = replace_once(
    source,
    '<button class="wb3d-btn" data-action="txml-download">Download</button>',
    '<button class="wb3d-btn" data-action="txml-download">Download NodeSet XML</button>',
    'download label',
)
source = replace_once(
    source,
    "    ${table.xml ? `<textarea readonly spellcheck=\"false\" style=\"min-height:140px\">${esc(table.xml.length > 200000 ? `${table.xml.slice(0, 200000)}\\n… truncated preview` : table.xml)}</textarea>` : ''}\n  </section>`;",
    "    ${table.xml ? `<textarea readonly spellcheck=\"false\" style=\"min-height:140px\">${esc(table.xml.length > 200000 ? `${table.xml.slice(0, 200000)}\\n… truncated preview` : table.xml)}</textarea>` : ''}\n    ${table.model?.diagnosticDocument ? tableXmlDiagnosticsPanelHtml(table.model.diagnosticDocument, tx.active) : ''}\n  </section>`;",
    'diagnostics panel render',
)
source = replace_once(
    source,
    '      <h3>Table to XML <span class="wb3d-muted">build source & target NodeSet XML from arbitrary node/support tables</span></h3>',
    '      <h3>Table → NodeSet XML (comparison-only) <span class="wb3d-muted">build source & target nodeset/v1 point-cloud XML for Workbench3D compare</span></h3>\n      <p class="wb3d-muted">This route does not generate or mutate CAESAR II InputXML.</p>',
    'section classification',
)
source = replace_once(
    source,
    "    table.model = buildNodeSetModel(table.parsed, table.mapping, customRules, `${tx.active}-table`);",
    "    table.model = buildNodeSetModel(table.parsed, table.mapping, customRules, `${tx.active}-table`, { side: tx.active });",
    'side-aware model build',
)
source = replace_once(
    source,
    "    if (table.xml) downloadFile(`${tx.active}-nodeset.xml`, table.xml, 'application/xml;charset=utf-8');",
    "    if (table.xml) downloadFile(`${tx.active}-nodeset-comparison.xml`, table.xml, 'application/xml;charset=utf-8');",
    'classified nodeset filename',
)
source = replace_once(
    source,
    "  if (action === 'txml-download') {\n    if (table.xml) downloadFile(`${tx.active}-nodeset-comparison.xml`, table.xml, 'application/xml;charset=utf-8');\n    return true;\n  }\n  return false;",
    "  if (action === 'txml-download') {\n    if (table.xml) downloadFile(`${tx.active}-nodeset-comparison.xml`, table.xml, 'application/xml;charset=utf-8');\n    return true;\n  }\n  if (action === 'txml-download-diagnostics') {\n    if (table.model?.diagnosticDocument) {\n      const artifact = tableXmlDiagnosticsDownload(table.model.diagnosticDocument, tx.active);\n      downloadFile(artifact.name, artifact.text, artifact.mime);\n    }\n    return true;\n  }\n  return false;",
    'diagnostics download action',
)
source = replace_once(
    source,
    "  const sourceModel = buildNodeSetModel(table.parsed, table.mapping, customRules, `rev-${revA}`, { revisionFilter: revA });\n  const targetModel = buildNodeSetModel(table.parsed, table.mapping, customRules, `rev-${revB}`, { revisionFilter: revB });",
    "  const sourceModel = buildNodeSetModel(table.parsed, table.mapping, customRules, `rev-${revA}`, { revisionFilter: revA, side: 'source' });\n  const targetModel = buildNodeSetModel(table.parsed, table.mapping, customRules, `rev-${revB}`, { revisionFilter: revB, side: 'target' });",
    'revision pair diagnostic sides',
)

PATH.write_text(source, encoding='utf-8')
print('Workbench3D TableXML UI patch applied.')
