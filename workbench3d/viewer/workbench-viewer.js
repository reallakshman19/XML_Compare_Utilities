/**
 * workbench-viewer.js — the 3D viewer shell (Phases 2–3).
 *
 * The viewer never matches: it renders VisualGeometryModel.v1 plus a
 * status-by-objectId map derived from CompareAudit.v1 and reports picks back.
 * Three.js is loaded dynamically (importmap key first, CDN fallback) so the
 * rest of the workbench — and Node tests — never depend on it.
 */

const THREE_IMPORTS = Object.freeze(['three', 'https://esm.sh/three@0.160.0/build/three.module.js']);

/** Diff-status → render style. Single source of truth for viewer + legend. */
export const STATUS_STYLES = Object.freeze({
  MATCHED_UNCHANGED: { color: 0x22c55e, label: 'Matched / unchanged' },
  PROPERTY_CHANGED: { color: 0xeab308, label: 'Property changed' },
  GEOMETRY_CHANGED: { color: 0xf97316, label: 'Geometry changed' },
  MISSING_IN_TARGET: { color: 0xef4444, label: 'Missing in target' },
  NEW_IN_TARGET: { color: 0x3b82f6, label: 'New in target' },
  AMBIGUOUS: { color: 0xa855f7, label: 'Ambiguous' },
  SPLIT: { color: 0xec4899, label: 'Split' },
  MERGE: { color: 0xec4899, label: 'Merge' },
  CONSUMED: { color: 0xec4899, label: 'Consumed short' },
  CONFLICT: { color: 0x7f1d1d, label: 'Conflict / blocked' },
  TRANSFER_READY: { color: 0x06b6d4, label: 'Transfer ready' },
  GHOST: { color: 0x64748b, label: 'Source (ghost)' },
});

async function loadThree() {
  let lastError = null;
  for (const spec of THREE_IMPORTS) {
    try { return await import(spec); } catch (error) { lastError = error; }
  }
  throw new Error(`Three.js unavailable: ${lastError?.message ?? 'no import source worked'}`);
}

/** Minimal orbit controls: left-drag rotate, wheel dolly, right/shift-drag pan. */
function attachOrbitControls(THREE, camera, dom, onChange) {
  const target = new THREE.Vector3();
  const spherical = new THREE.Spherical().setFromVector3(camera.position.clone().sub(target));
  let dragging = null;
  let lastX = 0; let lastY = 0;
  const apply = () => {
    spherical.phi = Math.max(0.05, Math.min(Math.PI - 0.05, spherical.phi));
    spherical.radius = Math.max(1, spherical.radius);
    camera.position.setFromSpherical(spherical).add(target);
    camera.lookAt(target);
    onChange();
  };
  const onPointerDown = (e) => {
    dragging = (e.button === 2 || e.shiftKey) ? 'pan' : 'rotate';
    lastX = e.clientX; lastY = e.clientY;
    dom.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX; const dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    if (dragging === 'rotate') {
      spherical.theta -= dx * 0.006;
      spherical.phi -= dy * 0.006;
    } else {
      const panScale = spherical.radius * 0.0016;
      const right = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0).multiplyScalar(-dx * panScale);
      const up = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 1).multiplyScalar(dy * panScale);
      target.add(right).add(up);
    }
    apply();
  };
  const onPointerUp = () => { dragging = null; };
  const onWheel = (e) => {
    e.preventDefault();
    spherical.radius *= e.deltaY > 0 ? 1.12 : 1 / 1.12;
    apply();
  };
  const onContext = (e) => e.preventDefault();
  dom.addEventListener('pointerdown', onPointerDown);
  dom.addEventListener('pointermove', onPointerMove);
  dom.addEventListener('pointerup', onPointerUp);
  dom.addEventListener('wheel', onWheel, { passive: false });
  dom.addEventListener('contextmenu', onContext);
  apply();
  return {
    target,
    spherical,
    setView(position, lookAt) {
      target.copy(lookAt);
      spherical.setFromVector3(position.clone().sub(lookAt));
      apply();
    },
    dispose() {
      dom.removeEventListener('pointerdown', onPointerDown);
      dom.removeEventListener('pointermove', onPointerMove);
      dom.removeEventListener('pointerup', onPointerUp);
      dom.removeEventListener('wheel', onWheel);
      dom.removeEventListener('contextmenu', onContext);
    },
  };
}

export async function createWorkbenchViewer(container, { onPick } = {}) {
  const THREE = await loadThree();
  let host = container; // reassigned by reattach() when the tab re-renders its DOM
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x0b1220);
  renderer.setScissorTest(false);
  host.appendChild(renderer.domElement);
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.display = 'block';

  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 0.85));
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
  keyLight.position.set(1, 2, 1.5);
  scene.add(keyLight);
  const grid = new THREE.GridHelper(10000, 20, 0x1f2a3d, 0x142033);
  scene.add(grid);
  const axes = new THREE.AxesHelper(800);
  scene.add(axes);

  const camera = new THREE.PerspectiveCamera(55, 1, 1, 1e7);
  camera.position.set(2500, 2200, 2500);

  const sourceGroup = new THREE.Group();
  const targetGroup = new THREE.Group();
  scene.add(sourceGroup, targetGroup);

  const meshIndex = new Map(); // objectId -> mesh[]
  const materialPool = new Map();
  let mode = 'overlay';
  let sourceOpacity = 0.32;
  let statusFilter = null; // Set of statuses or null
  let isolation = null; // Set of objectIds or null
  let statusByObjectId = new Map();
  let disposed = false;

  const material = (colorHex, ghost) => {
    const key = `${colorHex}:${ghost ? 'g' : 's'}`;
    if (!materialPool.has(key)) {
      materialPool.set(key, new THREE.MeshStandardMaterial({
        color: colorHex,
        transparent: ghost,
        opacity: ghost ? sourceOpacity : 1,
        roughness: 0.55,
        metalness: 0.08,
        depthWrite: !ghost,
      }));
    }
    return materialPool.get(key);
  };

  function clearGroup(group) {
    for (const child of [...group.children]) {
      group.remove(child);
      child.geometry?.dispose?.();
    }
  }

  function segmentMesh(seg, mat, modelId, radiusScale) {
    const start = new THREE.Vector3(...seg.start);
    const end = new THREE.Vector3(...seg.end);
    const dir = end.clone().sub(start);
    const length = Math.max(dir.length(), 0.001);
    const radius = Math.max((seg.radiusMm || 25) * radiusScale, 4);
    const geometry = new THREE.CylinderGeometry(radius, radius, length, 12, 1);
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.position.copy(start.clone().add(end).multiplyScalar(0.5));
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    mesh.userData = { objectId: seg.objectId, modelId, kind: seg.kind, pathId: seg.pathId };
    return mesh;
  }

  function markerMesh(marker, modelId) {
    const isAnchor = String(marker.kind).startsWith('ANCHOR');
    const geometry = isAnchor
      ? new THREE.OctahedronGeometry(34)
      : new THREE.SphereGeometry(30, 12, 10);
    const colors = { RIGID: 0xf59e0b, BEND: 0x8b5cf6, SIF: 0x14b8a6, RESTRAINT: 0x22d3ee, HANGER: 0x22d3ee };
    const color = isAnchor ? 0x94a3b8 : (colors[marker.kind] ?? 0xcbd5e1);
    const mesh = new THREE.Mesh(geometry, material(color, modelId === 'source'));
    mesh.position.set(...marker.position);
    mesh.userData = { objectId: marker.objectId, modelId, marker: marker.kind };
    return mesh;
  }

  let models = { source: null, target: null, registrationTranslation: [0, 0, 0] };

  function rebuild() {
    clearGroup(sourceGroup);
    clearGroup(targetGroup);
    meshIndex.clear();
    const register = (id, mesh) => {
      if (!id) return;
      if (!meshIndex.has(id)) meshIndex.set(id, []);
      meshIndex.get(id).push(mesh);
    };
    const build = (visual, group, modelId) => {
      if (!visual) return;
      for (const seg of visual.segments) {
        const status = statusByObjectId.get(seg.objectId);
        const ghost = modelId === 'source' && (!status || ['MATCHED_UNCHANGED', 'PROPERTY_CHANGED', 'GEOMETRY_CHANGED'].includes(status));
        const style = ghost ? STATUS_STYLES.GHOST : (STATUS_STYLES[status] ?? STATUS_STYLES.GHOST);
        const mesh = segmentMesh(seg, material(style.color, ghost), modelId, 1);
        mesh.userData.status = status ?? null;
        mesh.userData.ghost = ghost;
        group.add(mesh);
        register(seg.objectId, mesh);
      }
      for (const marker of visual.markers) {
        const mesh = markerMesh(marker, modelId);
        group.add(mesh);
        register(marker.objectId, mesh);
      }
    };
    build(models.source, sourceGroup, 'source');
    build(models.target, targetGroup, 'target');
    sourceGroup.position.set(...(models.registrationTranslation ?? [0, 0, 0]));
    applyVisibility();
    render();
  }

  function applyVisibility() {
    const visible = (mesh) => {
      const { objectId, status, ghost, modelId } = mesh.userData;
      if (isolation && objectId && !isolation.has(objectId)) return false;
      if (isolation && !objectId) return false;
      if (mode === 'diff-only') {
        if (modelId === 'source' && ghost) return false;
        if (!status || status === 'MATCHED_UNCHANGED') return modelId === 'target' ? false : !ghost;
      }
      if (statusFilter && status && !statusFilter.has(status)) return false;
      if (statusFilter && !status && !mesh.userData.marker) return false;
      return true;
    };
    for (const group of [sourceGroup, targetGroup]) {
      for (const mesh of group.children) mesh.visible = visible(mesh);
    }
    sourceGroup.visible = mode !== 'target-only';
  }

  // ── render loop (on-demand; rAF with timeout fallback so throttled or
  //    occluded tabs still paint) ─────────────────────────────────────────
  let renderQueued = false;
  function render() {
    if (renderQueued || disposed) return;
    renderQueued = true;
    let ran = false;
    const run = () => {
      if (ran) return;
      ran = true;
      renderQueued = false;
      if (disposed) return;
      const width = host.clientWidth || 800;
      const height = host.clientHeight || 480;
      renderer.setSize(width, height, false);
      if (mode === 'side-by-side') {
        renderer.setScissorTest(true);
        camera.aspect = (width / 2) / height;
        camera.updateProjectionMatrix();
        // left: source only
        targetGroup.visible = false; sourceGroup.visible = true;
        renderer.setViewport(0, 0, width / 2, height);
        renderer.setScissor(0, 0, width / 2, height);
        renderer.render(scene, camera);
        // right: target only
        sourceGroup.visible = false; targetGroup.visible = true;
        renderer.setViewport(width / 2, 0, width / 2, height);
        renderer.setScissor(width / 2, 0, width / 2, height);
        renderer.render(scene, camera);
        sourceGroup.visible = true;
        renderer.setScissorTest(false);
      } else {
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setViewport(0, 0, width, height);
        renderer.render(scene, camera);
      }
    };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
    setTimeout(run, 50);
  }

  const controls = attachOrbitControls(THREE, camera, renderer.domElement, render);
  const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(render) : null;
  resizeObserver?.observe(host);

  // ── picking ────────────────────────────────────────────────────────────
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let downAt = null;
  renderer.domElement.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('click', (event) => {
    if (downAt && Math.hypot(event.clientX - downAt[0], event.clientY - downAt[1]) > 5) return; // drag, not click
    const rect = renderer.domElement.getBoundingClientRect();
    let x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    if (mode === 'side-by-side') x = (x < 0 ? (x + 0.5) : (x - 0.5)) * 2; // remap half-viewport
    pointer.set(x, y);
    raycaster.setFromCamera(pointer, camera);
    const candidates = [...sourceGroup.children, ...targetGroup.children].filter((m) => m.visible && m.userData.objectId);
    const hit = raycaster.intersectObjects(candidates, false)[0];
    if (hit && onPick) onPick({ objectId: hit.object.userData.objectId, modelId: hit.object.userData.modelId, status: hit.object.userData.status });
  });

  function boundsOf(ids) {
    const box = new THREE.Box3();
    let any = false;
    const include = (group) => {
      for (const mesh of group.children) {
        if (!mesh.userData.objectId) continue;
        if (ids && !ids.has(mesh.userData.objectId)) continue;
        box.expandByObject(mesh);
        any = true;
      }
    };
    include(sourceGroup);
    include(targetGroup);
    return any ? box : null;
  }

  function fitBox(box) {
    if (!box) return;
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3()).length() || 1000;
    const dir = new THREE.Vector3(1, 0.8, 1).normalize();
    controls.setView(center.clone().add(dir.multiplyScalar(size * 0.9 + 200)), center);
  }

  return {
    /**
     * Move the canvas into a freshly rendered host element. The tab re-renders
     * its HTML on file load; without this the canvas stays parented to dead DOM
     * and the viewer area shows blank.
     */
    reattach(nextHost) {
      if (!nextHost || nextHost === host || disposed) return;
      resizeObserver?.disconnect();
      host = nextHost;
      host.appendChild(renderer.domElement);
      resizeObserver?.observe(host);
      render();
    },
    setModels(next) {
      models = { ...models, ...next };
      rebuild();
    },
    setStatuses(map) {
      statusByObjectId = map instanceof Map ? map : new Map(Object.entries(map ?? {}));
      rebuild();
    },
    setMode(nextMode) { mode = nextMode; applyVisibility(); render(); },
    getMode() { return mode; },
    setSourceOpacity(value) {
      sourceOpacity = Math.max(0.05, Math.min(1, Number(value)));
      for (const [key, mat] of materialPool) {
        if (key.endsWith(':g')) { mat.opacity = sourceOpacity; mat.needsUpdate = true; }
      }
      render();
    },
    setStatusFilter(statuses) {
      statusFilter = statuses && statuses.size ? new Set(statuses) : null;
      applyVisibility(); render();
    },
    isolate(objectIds) {
      isolation = objectIds && objectIds.size ? new Set(objectIds) : null;
      applyVisibility(); render();
      if (isolation) fitBox(boundsOf(isolation));
    },
    fitAll() { fitBox(boundsOf(null)); },
    fitObject(objectId) { fitBox(boundsOf(new Set([objectId]))); },
    setStandardView(view) {
      const box = boundsOf(null);
      if (!box) return;
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3()).length() || 1000;
      const dirs = { top: [0, 1, 0.001], front: [0, 0.001, 1], side: [1, 0.001, 0], iso: [1, 0.8, 1] };
      const d = new THREE.Vector3(...(dirs[view] ?? dirs.iso)).normalize();
      controls.setView(center.clone().add(d.multiplyScalar(size * 0.95 + 200)), center);
    },
    render,
    dispose() {
      disposed = true;
      resizeObserver?.disconnect();
      controls.dispose();
      clearGroup(sourceGroup);
      clearGroup(targetGroup);
      for (const mat of materialPool.values()) mat.dispose();
      materialPool.clear();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
