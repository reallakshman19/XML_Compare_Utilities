/** Validate inspector inputs and dispatch one explicit topology edit operation. */

import { cleanText } from './topology-validator-values.js';

function requiredNumber(inspector, selector, label) {
  const value = inspector.querySelector(selector)?.value?.trim();
  if (!value) throw new Error(`${label} is required.`);
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError(`${label} must be a finite number.`);
  return number;
}

function readPosition(inspector, prefix) {
  return Object.fromEntries(['x', 'y', 'z'].map((axis) => [axis,
    requiredNumber(inspector, `[data-ttv-edit-${prefix}="${axis}"]`, `${prefix} ${axis.toUpperCase()}`)]));
}

/** Dispatch one validated operation through the controller command callback. */
export async function dispatchTopologyEditOperation(input) {
  const nodes = input.selection.filter((row) => row.kind === 'node');
  const edges = input.selection.filter((row) => row.kind === 'edge');
  if (input.operation === 'MERGE') { if (nodes.length !== 2) throw new Error('Merge requires exactly two selected nodes; the second node is retained.'); await input.execute('MERGE_NODES', { sourceNodeId: nodes[0].id, targetNodeId: nodes[1].id }); return; }
  if (input.operation === 'BRIDGE') { if (nodes.length !== 2) throw new Error('Bridge requires exactly two selected nodes.'); if (!input.contextEdgeId) throw new Error('Bridge requires an explicit engineering context edge.'); await input.execute('BRIDGE_GAP', { fromNodeId: nodes[0].id, toNodeId: nodes[1].id, contextEdgeId: input.contextEdgeId }); return; }
  if (input.operation === 'DELETE') { if (edges.length !== 1) throw new Error('Delete requires exactly one selected edge.'); await input.execute('DELETE_EDGE', { edgeId: edges[0].id }); return; }
  if (input.operation === 'SPLIT') { if (edges.length !== 1) throw new Error('Split requires exactly one selected edge.'); await input.execute('SPLIT_EDGE', { edgeId: edges[0].id, fraction: requiredNumber(input.inspector, '[data-ttv-edit-split-fraction]', 'Split fraction') }); return; }
  if (input.operation === 'DISCONNECT') { if (edges.length !== 1) throw new Error('Disconnect requires exactly one selected edge.'); const endpoint = cleanText(input.inspector.querySelector('[data-ttv-edit-disconnect-endpoint]')?.value) || 'FROM'; await input.execute('DISCONNECT_ENDPOINT', { edgeId: edges[0].id, endpoint }); return; }
  if (input.operation === 'MOVE_EXACT') { if (nodes.length !== 1) throw new Error('Exact XYZ requires exactly one selected node.'); await input.execute('MOVE_NODE', { nodeId: nodes[0].id, position: readPosition(input.inspector, 'coordinate') }); return; }
  if (input.operation === 'ADD') { if (nodes.length !== 1) throw new Error('Add straight element requires exactly one selected start node.'); if (!input.contextEdgeId) throw new Error('Add straight element requires an explicit engineering context edge.'); await input.execute('ADD_STRAIGHT_ELEMENT', { fromNodeId: nodes[0].id, toPosition: readPosition(input.inspector, 'target'), contextEdgeId: input.contextEdgeId }); return; }
  throw new RangeError(`Unsupported edit operation ${input.operation}.`);
}
