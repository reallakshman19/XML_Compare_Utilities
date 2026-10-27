import {assertGeometrySceneCurrent} from './geo-scene.js';
import {resolveGeometryPick} from './geo-scene-pick.js';
import {createWorkbenchViewer} from '../../workbench3d/viewer/workbench-viewer.js';
import {createViewerFeedback, GEOMETRY_RGB} from './viewer-feedback.js';

const VIEWS = Object.freeze({Z: {XY: 'top', XZ: 'front', YZ: 'right', ISO: 'iso'},
  Y: {XY: 'front', XZ: 'top', YZ: 'right', ISO: 'iso'},
  X: {XY: 'right', XZ: 'front', YZ: 'top', ISO: 'iso'}});

/** Viewer consumes immutable evidence; it must never become correspondence authority. */
export function createGeoViewerBridge({host, session, onSelect, onError, onCameraState,
  makeViewer = createWorkbenchViewer}) {
  let viewer = null, generation = 0, scene = null, enabled = false, feedback = null;
  let selectedIds = [], mode = 'overlay', pendingCamera = null;
  const currentScene = () => assertGeometrySceneCurrent(session.current());
  const active = (id, snapshot) => {
    if (!enabled || id !== generation || scene !== snapshot) return false;
    try { return currentScene() === snapshot && currentScene().binding === snapshot.binding; }
    catch { return false; }
  };
  const getCameraState = () => {
    const snapshot = viewer?.getStateSnapshot?.();
    if (!viewer || snapshot?.runtimeRevision == null) return pendingCamera;
    return viewer.getNavigationState?.() || snapshot.navigationState || null;
  };
  function updateFeedback() {
    if (!viewer || !active(generation, scene)) return;
    feedback?.update({ids: selectedIds, mode});
    onCameraState?.(getCameraState());
  }
  function disable() {
    generation++; enabled = false; scene = null; pendingCamera = null;
    feedback?.dispose(); feedback = null;
    const prior = viewer; viewer = null;
    if (prior) prior.dispose();
    host.replaceChildren();
  }
  async function enable({mode: nextMode = 'overlay', projection = 'XZ', verticalAxis = 'Z', cameraState = null} = {}) {
    disable(); enabled = true; mode = nextMode; selectedIds = [];
    pendingCamera = cameraState && cameraState.verticalAxis !== verticalAxis ? {...cameraState, verticalAxis} : cameraState;
    const id = generation, snapshot = currentScene();
    let instance = null, projected = false;
    const projectWhenReady = () => {
      if (!instance || !viewer || id !== generation) return;
      if (!projected && instance.getStateSnapshot()?.runtimeRevision != null) {
        projected = true;
        if (pendingCamera && instance.restoreNavigationState) instance.restoreNavigationState(pendingCamera);
        else {
          instance.setVerticalAxis?.(verticalAxis);
          if (projection !== 'ISO') instance.toggleCameraType();
          instance.setStandardView((VIEWS[verticalAxis] || VIEWS.Z)[projection] || 'iso');
        }
        pendingCamera = null;
      }
      updateFeedback();
    };
    try {
      instance = await makeViewer(host, {
        onPick: pick => {
          if (!active(id, snapshot)) return;
          try {
            const object = resolveGeometryPick(snapshot, pick, currentScene().binding);
            onSelect(object ? {sourceRows: object.sourceRows, objectId: object.objectId,
              side: object.side, kind: object.kind, elementIndex: object.elementIndex,
              nodeId: object.nodeId} : {sourceRows: [], objectId: null});
          } catch (error) { onError(error); }
        },
        onRuntimeError: error => { if (active(id, snapshot)) onError(error); },
        onCameraChange: projectWhenReady, navigationPreset: 'VIEWER',
      });
      if (id !== generation || !enabled || currentScene() !== snapshot) {
        instance.dispose(); return false;
      }
      viewer = instance; scene = snapshot;
      viewer.setModels(snapshot.models); // SOURCE contains full R*p+t; extra translation stays zero.
      viewer.setModelColors?.(GEOMETRY_RGB);
      viewer.setSourceOpacity?.(.9);
      feedback = createViewerFeedback({host, viewer, scene});
      viewer.setMode(mode);
      viewer.fitAll();
      projectWhenReady();
      return true;
    } catch (error) {
      if (instance && viewer !== instance) instance.dispose();
      if (id === generation) disable();
      throw error;
    }
  }
  function setMode(nextMode) {
    mode = nextMode;
    if (viewer && active(generation, scene)) { viewer.setMode(mode); updateFeedback(); }
  }
  function setSelection(objectId, relatedIds = []) {
    if (!viewer || !active(generation, scene)) return;
    selectedIds = objectId ? [objectId, ...relatedIds] : [];
    viewer.setSelection(objectId, relatedIds);
    // Primary physical NODE is the pivot, not the bounds of every alternative.
    if (viewer.setPivotWorld && feedback) {
      const point = selectedIds.map(id => feedback.pointForId(id)).find(Boolean);
      viewer.setPivotWorld(point || feedback.center);
    }
    updateFeedback();
  }
  function restoreCameraState(state) {
    if (!viewer || !active(generation, scene)) return;
    if (viewer.getStateSnapshot()?.runtimeRevision == null) pendingCamera = state;
    else viewer.restoreNavigationState?.(state);
    updateFeedback();
  }
  function command(action, value) {
    if (!viewer || !active(generation, scene)) return;
    if (action === 'view') viewer.setStandardView(value);
    else if (action === 'fit') viewer.fitAll();
    else if (action === 'fit-selection') viewer.fitSelection();
    else if (action === 'pivot') {
      if (viewer.setPivotWorld && feedback) viewer.setPivotWorld(
        selectedIds.map(id => feedback.pointForId(id)).find(Boolean) || feedback.center);
      else viewer.setPivotToSelection();
    }
    else if (action === 'previous') viewer.previousView();
    else if (action === 'zoom') viewer.zoomBy(value);
    else if (action === 'orbit') viewer.orbitBy(...value);
    else if (action === 'projection') viewer.toggleCameraType();
    else if (action === 'vertical-axis') viewer.setVerticalAxis?.(value);
    updateFeedback();
  }
  return {enable, disable, setMode, setSelection, command, getCameraState, restoreCameraState,
    isActive: () => Boolean(viewer && enabled), isCurrent: () => Boolean(scene && active(generation, scene))};
}
