import assert from 'assert';
import fs from 'fs';
import { _test as workspaceUi } from '../tabs/inputxml-workspace/inputxml-workspace-tab.js';

const workspaceRender = workspaceUi.renderPopup(workspaceUi.defaultState());
assert.ok(workspaceRender.includes('1 Clean XML / Table to CleanXML'), 'Workspace should expose CleanXML as Tab 1.');
assert.ok(workspaceRender.includes('2 InputXML Enrichment'), 'Workspace should expose InputXML Enrichment as Tab 2.');
assert.ok(workspaceRender.includes('3 XML to InputXML'), 'Workspace should expose XML to InputXML as Tab 3.');
assert.ok(workspaceRender.includes('DTXR'), 'CleanXML Tab 1 should include the DTXR subtab.');

const psnmUtilityTab = fs.readFileSync('F:\\CODE-5\\XML_Compare_Utilities\\tabs\\psnm-utility-tab.js', 'utf8');
assert.ok(psnmUtilityTab.includes('installInputXmlWorkspaceTile'), 'Utilities tab should install InputXML Workspace tile.');

const panel5c = fs.readFileSync('F:\\CODE-5\\XML_Compare_Utilities\\tabs\\model-converters\\xml-cii-topology-5c-panel.js', 'utf8');
assert.ok(panel5c.includes('state.consumeDuplicateNodes = false;'), 'InputXML_Topo should disable duplicate consuming.');
assert.ok(panel5c.includes('state.enableShortFillers = false;'), 'InputXML_Topo should disable <50mm fillers.');
assert.ok(panel5c.includes('state.enableRayFillers = false;'), 'InputXML_Topo should disable ray fillers.');
assert.ok(panel5c.includes('state.splitRayMidspanHits = false;'), 'InputXML_Topo should disable ray mid-span splitting.');

const workflowShell = fs.readFileSync('F:\\CODE-5\\3D_Converters\\tabs\\model-converters\\WorkflowShell.js', 'utf8');
const workflowBridge = fs.readFileSync('F:\\CODE-5\\3D_Converters\\tabs\\model-converters\\xml-cii-workflow-bridge.js', 'utf8');
assert.ok(!workflowShell.includes("id: 'topology'"), 'Old XML->CII workflow should not expose 5B Topology.');
assert.ok(!workflowShell.includes("id: 'xml-to-inputxml'"), 'Old XML->CII workflow should not expose 5C XML->InputXML.');
assert.ok(!workflowBridge.includes('renderXmlCiiTopology5BPanel'), 'Old workflow bridge should not import/render 5B.');
assert.ok(!workflowBridge.includes('renderXmlCiiTopology5CPanel'), 'Old workflow bridge should not import/render 5C.');

console.log('InputXML Workspace static contract checks passed.');
