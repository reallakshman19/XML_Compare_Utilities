import { parseTable1 } from './pipeline-3d-model-geometry.js?v=20260711-collinear-1';
import {
  framesFromTable1,
  parseTable2Paste,
  parseTable3Paste,
} from './pipeline-3d-model-table-paste-parser.js?v=20260716-table-paste-1';
import {
  SAMPLE_TABLE_2_PASTE_MULTISHEET,
  SAMPLE_TABLE_3_PASTE_MULTISHEET,
} from './pipeline-3d-model-table-paste-samples.js?v=20260716-table-paste-samples-1';
import {
  installPipelineProfilePropagation,
} from './pipeline-3d-model-profile-propagation-runtime.js?v=20260719-table2-elevation-authority-1';
import { installPipelineElasticBendSettingsUi } from './pipeline-3d-model-elastic-bend-ui.js?v=20260721-p3d-meta-phase1-2';

const STYLE_ID = 'pipeline-3d-model-table-paste-style';
const PATCHED = new WeakSet();

function ensureStyle(doc = globalThis.document) {
  if (!doc || doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = STYLE_ID;
  style.textContent = '.p3d-table-paste{display:grid;gap:10px}.p3d-table-paste textarea{min-height:150px;font-family:ui-monospace,monospace}.p3d-table-paste-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}@media(max-width:800px){.p3d-table-paste-grid{grid-template-columns:1fr}}';
  doc.head.appendChild(style);
}

export function installPipeline3dTablePasteAddon(container) {
  if (!container || PATCHED.has(container)) return null;
  PATCHED.add(container);
  ensureStyle(container.ownerDocument);
  installPipelineProfilePropagation(container, {
    parseTable1,
    framesFromTable1,
    parseTable2Paste,
    parseTable3Paste,
    samples: {
      table2: SAMPLE_TABLE_2_PASTE_MULTISHEET,
      table3: SAMPLE_TABLE_3_PASTE_MULTISHEET,
    },
  });
  const dialog = container.querySelector('[data-p3d-dialog]');
  if (dialog) installPipelineElasticBendSettingsUi(dialog);
  return () => PATCHED.delete(container);
}
