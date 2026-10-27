import {registerMethodC} from '../../tabs/cii-workspace/cii-workspace-method-c-registration.js';
import {findMethodCCandidates, validateXYZTolerance} from '../../tabs/cii-workspace/cii-workspace-method-c-candidates.js';
import {methodCSvgScene} from '../../tabs/cii-workspace/cii-workspace-method-c-svg.js';
import {readXmlGraph} from './xml-intake.js';
import {createGeometryScene} from './geo-scene.js';

export function createPreviewSession({read = readXmlGraph} = {}) {
  const state = {epoch: 0, graphs: {SOURCE: null, TARGET: null}, pending: new Set(),
    tokens: {SOURCE: 0, TARGET: 0}, anchors: [], projection: 'XZ',
    tolerance: {x: 100, y: 100, z: 100}, result: null, selected: null};
  const invalidate = () => { state.epoch++; state.result = null; };
  async function load(side, bytes, name) {
    if (!['SOURCE','TARGET'].includes(side)) throw new Error('XML_SIDE_INVALID');
    const token = ++state.tokens[side];
    invalidate(); state.graphs[side] = null; state.anchors = []; state.pending.add(side);
    try {
      const graph = await read(await bytes, {member: side + ':' + name});
      if (state.tokens[side] !== token) return false;
      state.graphs[side] = graph;
      return true;
    } catch (error) {
      if (state.tokens[side] !== token) return false;
      throw error;
    } finally { if (state.tokens[side] === token) state.pending.delete(side); }
  }
  function configure({tolerance = state.tolerance, projection = state.projection} = {}) {
    invalidate();
    validateXYZTolerance(tolerance);
    if (!['XZ','YZ','XY','ISO'].includes(projection)) throw new Error('PROJECTION_INVALID');
    state.tolerance = {...tolerance}; state.projection = projection;
  }
  function addAnchor(source, target) {
    invalidate();
    if (!state.graphs.SOURCE || !state.graphs.TARGET || state.pending.size) throw new Error('BOTH_XML_FILES_REQUIRED');
    if (state.anchors.length >= 32) throw new Error('PREVIEW_ANCHOR_LIMIT_32');
    const anchors = [...state.anchors, {source: String(source).trim(), target: String(target).trim()}];
    registerMethodC(state.graphs.SOURCE, state.graphs.TARGET, anchors);
    state.anchors = anchors;
  }
  function removeAnchor(index) { invalidate(); state.anchors = state.anchors.filter((_, i) => i !== index); }
  function run() {
    invalidate();
    const source = state.graphs.SOURCE, target = state.graphs.TARGET;
    if (!source || !target || state.pending.size) throw new Error('BOTH_XML_FILES_REQUIRED');
    if (!state.anchors.length) throw new Error('MANUAL_ANCHOR_REQUIRED');
    if (source.nodes.length * target.nodes.length > 5000000) throw new Error('PREVIEW_PAIR_WORK_LIMIT_5000000');
    const transform = registerMethodC(source, target, state.anchors);
    if (!transform.rotation || !transform.translation) throw new Error(transform.status);
    const candidates = findMethodCCandidates(source, target, transform, state.tolerance);
    const scene = methodCSvgScene({source, target, transform, candidates, projection: state.projection});
    const result = {source, target, transform, candidates, scene, projection: state.projection,
      epoch: state.epoch, evidenceMode: 'MANUAL_POSE_METHOD_C_XML_PREVIEW'};
    result.viewerScene = createGeometryScene(result);
    state.result = result;
    return result;
  }
  function current() {
    if (!state.result || state.result.epoch !== state.epoch || state.pending.size)
      throw new Error('XML_PREVIEW_EXPORT_STALE_OR_INCOMPLETE');
    return state.result;
  }
  return {state, load, configure, addAnchor, removeAnchor, run, current, invalidate};
}
