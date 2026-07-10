import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { _test as workspaceUi } from '../tabs/inputxml-workspace/inputxml-workspace-tab.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');

const workspaceRender = workspaceUi.renderPopup(workspaceUi.defaultState());
assert.ok(workspaceRender.includes('1 Clean XML / Table to CleanXML'), 'Workspace should expose CleanXML as Tab 1.');
assert.ok(workspaceRender.includes('2 InputXML Enrichment'), 'Workspace should expose InputXML Enrichment as Tab 2.');
assert.ok(workspaceRender.includes('3 XML to InputXML'), 'Workspace should expose XML to InputXML as Tab 3.');
assert.ok(workspaceRender.includes('DTXR'), 'CleanXML Tab 1 should include the DTXR subtab.');

const psnmUtilityTab = fs.readFileSync(path.join(repoRoot, 'tabs', 'psnm-utility-tab.js'), 'utf8');
assert.ok(psnmUtilityTab.includes('installInputXmlWorkspaceTile'), 'Utilities tab should install InputXML Workspace tile.');

const panel5c = fs.readFileSync(path.join(repoRoot, 'tabs', 'model-converters', 'xml-cii-topology-5c-panel.js'), 'utf8');
assert.ok(panel5c.includes('state.consumeDuplicateNodes = false;'), 'InputXML_Topo should disable duplicate consuming.');
assert.ok(panel5c.includes('state.enableShortFillers = false;'), 'InputXML_Topo should disable <50mm fillers.');
assert.ok(panel5c.includes('state.enableRayFillers = false;'), 'InputXML_Topo should disable ray fillers.');
assert.ok(panel5c.includes('state.splitRayMidspanHits = false;'), 'InputXML_Topo should disable ray mid-span splitting.');

console.log('InputXML Workspace static contract checks passed.');
