import assert from 'assert';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

class SimpleElement {
  constructor(name) { this.nodeName = name; this.localName = name; this._attributes = new Map(); this.children = []; this._textContent = ''; }
  getAttribute(name) { return this._attributes.has(name) ? this._attributes.get(name) : null; }
  setAttribute(name, value) { this._attributes.set(name, String(value)); }
  appendChild(child) { this.children.push(child); return child; }
  get textContent() { return this.children.length ? this.children.map((child) => child.textContent).join('') : this._textContent; }
}
class SimpleDocument {
  constructor(rootElement) { this.documentElement = rootElement; }
  getElementsByTagName(name) {
    const wanted = String(name).toUpperCase();
    const out = [];
    const visit = (node) => { if (String(node.localName || node.nodeName).toUpperCase() === wanted) out.push(node); for (const child of node.children || []) visit(child); };
    if (this.documentElement) visit(this.documentElement);
    return out;
  }
}
function parseAttributes(attrText, element) {
  const pattern = /([A-Za-z_][\w:.-]*)\s*=\s*"([^"]*)"/g;
  let match;
  while ((match = pattern.exec(attrText))) element.setAttribute(match[1], match[2]);
}
function parseXml(xmlText) {
  const tokenPattern = /<[^>]+>|[^<]+/g;
  const stack = [];
  let rootElement = null;
  let token;
  while ((token = tokenPattern.exec(String(xmlText).replace(/^\s*<\?xml[^>]*>\s*/i, '')))) {
    const part = token[0];
    if (!part.trim() || part.startsWith('<!--') || part.startsWith('<?')) continue;
    if (part.startsWith('</')) { stack.pop(); continue; }
    if (!part.startsWith('<')) { if (stack.length) stack[stack.length - 1]._textContent += part; continue; }
    const selfClosing = /\/\>\s*$/.test(part);
    const body = part.slice(1, selfClosing ? -2 : -1).trim();
    const nameMatch = body.match(/^([^\s/>]+)/);
    if (!nameMatch) continue;
    const element = new SimpleElement(nameMatch[1]);
    parseAttributes(body.slice(nameMatch[1].length), element);
    if (!rootElement) rootElement = element;
    if (stack.length) stack[stack.length - 1].appendChild(element);
    if (!selfClosing) stack.push(element);
  }
  return new SimpleDocument(rootElement);
}

globalThis.DOMParser = class { parseFromString(text) { return parseXml(text); } };

function elementXml(fromNode, toNode, lengthMm, index, rev2 = false) {
  const attrs = [
    `FROM_NODE="${fromNode}"`,
    `TO_NODE="${toNode}"`,
    `DELTA_X="${Number(lengthMm).toFixed(3)}"`,
    'DELTA_Y="0.000"',
    'DELTA_Z="0.000"',
    'DIAMETER="219.100"',
    'WALL_THICK="8.180"',
    'LINE_ID="L-5D-DASH"',
    `NAME="${rev2 ? 'REV2' : 'REV1'}-${index}"`,
  ].join(' ');
  if (index === 2) return `    <PIPINGELEMENT ${attrs}>\n      <RESTRAINT TYPE="9" NAME="GUIDE-${index}"/>\n    </PIPINGELEMENT>`;
  return `    <PIPINGELEMENT ${attrs}/>`;
}
function inputXmlRev1() {
  return `<?xml version="1.0"?>\n<CAESARII XML_TYPE="Input"><PIPINGMODEL NAME="DASH-REV1">\n${elementXml(10, 20, 100, 1)}\n${elementXml(20, 30, 150, 2)}\n${elementXml(30, 40, 200, 3)}\n</PIPINGMODEL></CAESARII>`;
}
function inputXmlRev2() {
  return `<?xml version="1.0"?>\n<CAESARII XML_TYPE="Input"><PIPINGMODEL NAME="DASH-REV2">\n${elementXml(1010, 1020, 100, 1, true)}\n${elementXml(1020, 1030, 150, 2, true)}\n${elementXml(1030, 1040, 200, 3, true)}\n</PIPINGMODEL></CAESARII>`;
}

(async () => {
  const { compareInputXmlTopologyWithDashboard } = await import(pathToFileURL(path.join(root, 'tabs/model-converters/xml-cii-inputxml-topology-dashboard-core.js')).href);
  const result = compareInputXmlTopologyWithDashboard(inputXmlRev1(), inputXmlRev2(), {
    lengthToleranceMm: 6,
    shortElementToleranceMm: 6,
    minCandidateScore: 35,
    useDiameterRatioEvidence: true,
    useNameEvidence: true,
    useAnchorCoordinateEvidence: true,
  });

  assert.equal(result.mode, 'element-wise-canonical-path-aligned-configurable-evidence-with-topology-dashboard');
  assert.equal(result.frameSolution.schema, 'CiiCoordinateFrameSolution.v1');
  assert.ok(['PATH_RELATIVE_TOPOLOGY_FRAME', 'TRANSLATION_ONLY'].includes(result.frameSolution.mode));
  assert.equal(result.nodeRemap.schema, 'CiiInputXmlNodeRemapLedger.v1');
  assert.ok(result.nodeRemap.summary.mappedNodeCount >= 4);
  assert.ok(result.nodeRemap.rows.some((row) => row.sourceNode === '10' && row.targetNode === '1010'));
  assert.equal(result.topologyDashboard.schema, 'CiiInputXmlTopologyDashboard.v1');
  assert.equal(result.topologyDashboard.summary.mappedNodes, result.nodeRemap.summary.mappedNodeCount);
  assert.ok(result.topologyDashboard.frameRows.length >= 1);
  assert.ok(result.topologyDashboard.nodeRemapRows.length >= 4);
  console.log('5D InputXML topology dashboard wrapper checks passed.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
