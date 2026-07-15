import { cleanText, objectRecord, asArray } from './topology-validator-values.js';

let active3dViewer = null;

export async function render3dViewer(elements, viewModel, selectedKey, selectCallback) {
  let container = elements.svgHost.querySelector('.ttv-3d-container');
  if (!container) {
    elements.svgHost.innerHTML = `
      <div class="ttv-3d-container" style="position:absolute; inset:0; width:100%; height:100%;">
        <div class="ttv-3d-canvas-host" style="position:absolute; inset:0; width:100%; height:100%;"></div>
        <div class="ttv-3d-overlay" style="position:absolute; top:12px; left:12px; display:flex; flex-direction:column; gap:6px; z-index:10;">
          <button type="button" class="ttv-3d-btn" data-action="fit" title="Fit Model">🏠 Fit</button>
          <button type="button" class="ttv-3d-btn" data-action="top" title="Top View (XY)">🔝 Top</button>
          <button type="button" class="ttv-3d-btn" data-action="front" title="Front View (XZ)">🔲 Front</button>
          <button type="button" class="ttv-3d-btn" data-action="side" title="Side View (YZ)">🔳 Side</button>
          <button type="button" class="ttv-3d-btn" data-action="iso" title="Isometric View">🧊 Iso</button>
        </div>
      </div>
    `;
    container = elements.svgHost.querySelector('.ttv-3d-container');
    const canvasHost = container.querySelector('.ttv-3d-canvas-host');
    const overlay = container.querySelector('.ttv-3d-overlay');

    const { createWorkbenchViewer } = await import('../../workbench3d/viewer/workbench-viewer.js');

    active3dViewer = await createWorkbenchViewer(canvasHost, {
      onPick: (pick) => {
        if (pick?.objectId) {
          const objectKey = Object.keys(viewModel.selectionLookup.byObjectKey).find(key => {
            return key.endsWith(`:${pick.objectId}`) || key === pick.objectId;
          });
          if (objectKey) {
            selectCallback(objectKey);
          } else {
            selectCallback('');
          }
        } else {
          selectCallback('');
        }
      }
    });

    const customStyles = {
      'source-route': { colorInt: 0x64748b, alpha: 0.9, label: 'Source Route' },
      'source-ambiguous': { colorInt: 0xa855f7, alpha: 1, label: 'Ambiguous Route' },
      'canonical-edge': { colorInt: 0x22d3ee, alpha: 1, label: 'Canonical Edge' },
      'invalid': { colorInt: 0xef4444, alpha: 1, label: 'Invalid / Blocked' },
      'junction': { colorInt: 0xfacc15, alpha: 1, label: 'Junction' },
      'pointFeature': { colorInt: 0xf472b6, alpha: 1, label: 'Point Feature' },
      'boundary': { colorInt: 0xef4444, alpha: 1, label: 'Boundary' },
      'node': { colorInt: 0x475569, alpha: 0.7, label: 'Node' },
      'support': { colorInt: 0x94a3b8, alpha: 0.6, label: 'Support' }
    };
    active3dViewer.setStatusStyles(customStyles);

    overlay.querySelectorAll('.ttv-3d-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        if (action === 'fit') active3dViewer.fitAll();
        else active3dViewer.setStandardView(action);
      });
    });
  }

  const canvasHost = container.querySelector('.ttv-3d-canvas-host');
  active3dViewer.reattach(canvasHost);

  const visualModel = build3dVisualGeometryModel(viewModel);

  const statusMap = new Map();
  const issueIds = new Set(asArray(viewModel.issues).flatMap((row) => asArray(objectRecord(row).canonicalIds)).map(cleanText));
  for (const issueId of issueIds) {
    statusMap.set(issueId, 'invalid');
  }
  for (const component of viewModel.sourceComponents) {
    const isAmbiguous = cleanText(component.disposition) === 'BLOCK_AMBIGUOUS';
    const key = component.sourceEntityId || component.sourcePath;
    if (issueIds.has(component.objectKey)) {
      statusMap.set(key, 'invalid');
    } else {
      statusMap.set(key, isAmbiguous ? 'source-ambiguous' : 'source-route');
    }
  }
  for (const edge of viewModel.canonicalEdges) {
    if (issueIds.has(edge.id)) {
      statusMap.set(edge.id, 'invalid');
    } else {
      statusMap.set(edge.id, 'canonical-edge');
    }
  }
  for (const junction of viewModel.junctions) {
    statusMap.set(junction.id, issueIds.has(junction.id) ? 'invalid' : 'junction');
  }
  for (const pf of viewModel.pointFeatures) {
    statusMap.set(pf.id, issueIds.has(pf.id) ? 'invalid' : 'pointFeature');
  }
  for (const boundary of viewModel.boundaries) {
    statusMap.set(boundary.id, issueIds.has(boundary.id) ? 'invalid' : 'boundary');
  }

  active3dViewer.setStatuses(statusMap);
  active3dViewer.setModels({
    source: visualModel,
    target: { segments: [], markers: [], bounds: visualModel.bounds }
  });

  if (selectedKey) {
    const selObj = objectRecord(objectRecord(viewModel.selectionLookup).byObjectKey)[selectedKey];
    const objectId = selObj?.id || selObj?.sourceEntityId || selObj?.sourcePath || selectedKey;
    active3dViewer.setSelection(objectId, []);
  } else {
    active3dViewer.setSelection('', []);
  }

  if (!container.dataset.initialized) {
    active3dViewer.fitAll();
    container.dataset.initialized = 'true';
  }
}

export function select3dObject(objectKey) {
  if (!active3dViewer) return;
  const objectId = objectKey.includes(':') && !objectKey.startsWith('source:')
    ? objectKey.split(':').pop()
    : objectKey;
  active3dViewer.setSelection(objectId, []);
  if (objectId) {
    active3dViewer.fitObject(objectId);
  }
}

export function dispose3dViewer() {
  if (active3dViewer) {
    active3dViewer.dispose();
    active3dViewer = null;
  }
}

function build3dVisualGeometryModel(viewModel) {
  const segments = [];
  const markers = [];
  const nodeMap = new Map(viewModel.canonicalNodes.map((n) => [cleanText(n.id), n]));

  if (viewModel.visibility.source !== false) {
    for (const component of viewModel.sourceComponents) {
      if (cleanText(component.componentCategory) === 'SUPPORT') continue;
      const positions = objectRecord(component.positions);
      const start = positions.APOS;
      const end = positions.LPOS;
      const POS = positions.POS;
      if (start && end) {
        const key = component.sourceEntityId || component.sourcePath;
        const radiusMm = component.attributes.DIAMETER ? Number(component.attributes.DIAMETER) / 2 : 25;
        const pathId = component.sourceBranch;
        const type = cleanText(component.type);
        const category = cleanText(component.componentCategory);

        if (POS && (type === 'ELBO' || type === 'BEND' || category === 'ELBO/BEND')) {
          segments.push({
            objectId: key,
            start: [start.x, start.y, start.z],
            end: [POS.x, POS.y, POS.z],
            radiusMm,
            kind: 'source-route',
            pathId,
          });
          segments.push({
            objectId: key,
            start: [POS.x, POS.y, POS.z],
            end: [end.x, end.y, end.z],
            radiusMm,
            kind: 'source-route',
            pathId,
          });
        } else {
          segments.push({
            objectId: key,
            start: [start.x, start.y, start.z],
            end: [end.x, end.y, end.z],
            radiusMm,
            kind: 'source-route',
            pathId,
          });
        }
      }
    }
  }

  if (viewModel.visibility.canonical !== false) {
    const showReferenceConnections = viewModel.visibility.referenceConnections === true;
    for (const edge of viewModel.canonicalEdges) {
      const fromNode = nodeMap.get(cleanText(edge.fromNodeId));
      const toNode = nodeMap.get(cleanText(edge.toNodeId));
      if (fromNode && toNode) {
        segments.push({
          objectId: edge.id,
          start: [fromNode.position.x, fromNode.position.y, fromNode.position.z],
          end: [toNode.position.x, toNode.position.y, toNode.position.z],
          radiusMm: edge.diameterMm ? edge.diameterMm / 2 : 30,
          kind: 'canonical-edge',
        });
      }
    }
  }

  if (viewModel.visibility.canonical !== false) {
    for (const node of viewModel.canonicalNodes) {
      markers.push({
        objectId: node.id,
        kind: 'NODE',
        position: [node.position.x, node.position.y, node.position.z],
        nodeId: node.id,
        sizeMm: 24,
      });
    }
  }

  if (viewModel.visibility.junctions !== false) {
    for (const junction of viewModel.junctions) {
      markers.push({
        objectId: junction.id,
        kind: 'ANCHOR_JUNCTION',
        position: [junction.position.x, junction.position.y, junction.position.z],
        nodeId: junction.nodeId,
        sizeMm: 50,
        isObjectMarker: true,
      });
    }
  }

  if (viewModel.visibility.pointFeatures !== false) {
    for (const pf of viewModel.pointFeatures) {
      markers.push({
        objectId: pf.id,
        kind: 'NODE',
        position: [pf.position.x, pf.position.y, pf.position.z],
        nodeId: pf.nodeId,
        sizeMm: 40,
        isObjectMarker: true,
      });
    }
  }

  if (viewModel.visibility.boundaries !== false) {
    for (const boundary of viewModel.boundaries) {
      markers.push({
        objectId: boundary.id,
        kind: 'NODE',
        position: [boundary.position.x, boundary.position.y, boundary.position.z],
        nodeId: boundary.nodeId,
        sizeMm: 50,
        isObjectMarker: true,
      });
    }
  }

  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  const include = (point) => {
    for (let i = 0; i < 3; i += 1) {
      if (point[i] < min[i]) min[i] = point[i];
      if (point[i] > max[i]) max[i] = point[i];
    }
  };
  for (const seg of segments) { include(seg.start); include(seg.end); }
  for (const marker of markers) include(marker.position);
  const bounds = Number.isFinite(min[0]) ? { min, max } : { min: [0,0,0], max: [0,0,0] };

  return {
    contract: 'VisualGeometryModel.v1',
    modelId: 'topology-3d',
    unit: 'mm',
    segments,
    markers,
    bounds,
  };
}
