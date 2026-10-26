import {assertGeometrySceneCurrent} from './geo-scene.js';
import {resolveGeometryPick} from './geo-scene-pick.js';
import {createWorkbenchViewer} from '../../workbench3d/viewer/workbench-viewer.js';

const VIEWS = Object.freeze({XY: 'top', XZ: 'front', YZ: 'right', ISO: 'iso'});

/** Viewer consumes immutable evidence; it must never become correspondence authority. */
export function createGeoViewerBridge({host, session, onSelect, onError, makeViewer = createWorkbenchViewer}) {
  let viewer = null, generation = 0, scene = null, enabled = false;
  const currentScene = () => assertGeometrySceneCurrent(session.current());
  const active = (id, snapshot) => {
    if (!enabled || id !== generation || scene !== snapshot) return false;
    try { return currentScene() === snapshot && currentScene().binding === snapshot.binding; }
    catch { return false; }
  };
  function disable() {
    generation++;
    enabled = false;
    scene = null;
    const prior = viewer; viewer = null;
    if (prior) prior.dispose();
    host.replaceChildren();
  }
  async function enable({mode = 'overlay', projection = 'XZ'} = {}) {
    disable(); enabled = true;
    const id = generation, snapshot = currentScene();
    let instance = null, projected = false;
    const projectWhenReady = () => {
      if (projected || !instance || !viewer || id !== generation) return;
      if (instance.getStateSnapshot()?.runtimeRevision == null) return;
      projected = true;
      if (projection !== 'ISO') instance.toggleCameraType();
      instance.setStandardView(VIEWS[projection] || 'iso');
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
        onCameraChange: projectWhenReady,
        navigationPreset: 'VIEWER',
      });
      if (id !== generation || !enabled || currentScene() !== snapshot) {
        instance.dispose(); return false;
      }
      viewer = instance; scene = snapshot;
      viewer.setModels(snapshot.models); // SOURCE already contains full R*p+t, so translation remains [0,0,0].
      viewer.setMode(mode);
      viewer.fitAll(); // The Worker may complete after setModels; native fitAll defers until geometry exists.
      projectWhenReady(); // After fit, native camera distance yields correct orthographic frustum.
      return true;
    } catch (error) {
      if (instance && viewer !== instance) instance.dispose();
      if (id === generation) disable();
      throw error;
    }
  }
  function setMode(mode) { if (viewer) viewer.setMode(mode); }
  function setSelection(objectId, relatedIds = []) {
    if (!viewer || !active(generation, scene)) return;
    viewer.setSelection(objectId, relatedIds);
    // Native setSelection refreshes instance colours through applyConnectorVisibility().
  }
  function command(action, value) {
    if (!viewer || !active(generation, scene)) return;
    if (action === 'view') viewer.setStandardView(value);
    else if (action === 'fit') viewer.fitAll();
    else if (action === 'fit-selection') viewer.fitSelection();
    else if (action === 'pivot') viewer.setPivotToSelection();
    else if (action === 'previous') viewer.previousView();
    else if (action === 'zoom') viewer.zoomBy(value);
    else if (action === 'orbit') viewer.orbitBy(...value);
    else if (action === 'projection') viewer.toggleCameraType();
  }
  return {enable, disable, setMode, setSelection, command, isActive: () => Boolean(viewer && enabled),
    isCurrent: () => Boolean(scene && active(generation, scene))};
}
