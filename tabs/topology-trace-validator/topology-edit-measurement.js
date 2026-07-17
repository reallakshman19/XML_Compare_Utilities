/**
 * Click-to-measure state and presentation for the topology 3D editor.
 *
 * Inputs are finite model-space millimetre coordinates and a viewer exposing
 * setMeasurement(points). Outputs are the independent line/point overlay and
 * a segment/total-distance table. Invalid points raise instead of falling back.
 */

let measurementViewer = null;
let measurementHost = null;
let measurementPoints = [];
let measurementActive = false;

const vectorLength = (vector) => Math.hypot(vector[0], vector[1], vector[2]);
const vectorSubtract = (left, right) => left.map((value, index) => value - right[index]);

/** Format model-space millimetres without hiding engineering precision. */
export function formatTopologyMeasurement(lengthMm) {
  if (!Number.isFinite(lengthMm)) throw new TypeError('Measurement length must be finite.');
  return lengthMm >= 1000 ? `${(lengthMm / 1000).toFixed(3)} m` : `${lengthMm.toFixed(1)} mm`;
}

function measurementLengths() {
  return measurementPoints.slice(1)
    .map((point, index) => vectorLength(vectorSubtract(point, measurementPoints[index])));
}

function renderMeasurementPanel() {
  const panel = measurementHost?.querySelector('[data-ttv-measure-panel]');
  if (!panel) return;
  const lengths = measurementLengths();
  const total = lengths.reduce((sum, length) => sum + length, 0);
  panel.hidden = !measurementActive && measurementPoints.length === 0;
  panel.querySelector('[data-ttv-measure-state]').textContent = measurementActive
    ? 'Click component surfaces to add points' : 'Measurement paused';
  panel.querySelector('[data-ttv-measure-total]').textContent = formatTopologyMeasurement(total);
  panel.querySelector('[data-ttv-measure-count]').textContent = `${measurementPoints.length} point${measurementPoints.length === 1 ? '' : 's'}`;
  panel.querySelector('[data-ttv-measure-segments]').innerHTML = lengths.length
    ? lengths.map((length, index) => `<tr><th>S${index + 1}</th><td>${formatTopologyMeasurement(length)}</td></tr>`).join('')
    : '<tr><td colspan="2">No segments yet.</td></tr>';
}

/** Bind the current viewer and host without discarding an in-progress polyline. */
export function bindTopologyMeasurement(viewer, host) {
  if (typeof viewer?.setMeasurement !== 'function' || !host?.querySelector) {
    throw new TypeError('Measurement binding requires a viewer and DOM host.');
  }
  measurementViewer = viewer;
  measurementHost = host;
  const clearButton = host.querySelector('[data-ttv-measure-clear]');
  if (clearButton) clearButton.onclick = clearTopologyMeasurement;
  syncTopologyMeasurement();
}

/** Add an exact GPU-picked surface point to the current measurement. */
export function addTopologyMeasurementPoint(point) {
  if (!Array.isArray(point) || point.length !== 3 || !point.every((value) => Number.isFinite(Number(value)))) {
    throw new TypeError('Measure requires a finite 3D surface point.');
  }
  measurementPoints = [...measurementPoints, point.map(Number)];
  syncTopologyMeasurement();
}

/** Show or pause the measurement UI without discarding collected points. */
export function setTopologyMeasurementActive(active) {
  measurementActive = active === true;
  renderMeasurementPanel();
}

/** Clear measurement state and its independent viewer overlay. */
export function clearTopologyMeasurement() {
  measurementPoints = [];
  syncTopologyMeasurement();
}

/** Re-apply the overlay after the viewer rebuilds its topology models. */
export function syncTopologyMeasurement() {
  measurementViewer?.setMeasurement(measurementPoints);
  renderMeasurementPanel();
}

/** Release viewer/DOM references and discard the polyline during editor disposal. */
export function resetTopologyMeasurement() {
  measurementPoints = [];
  measurementActive = false;
  measurementViewer?.setMeasurement([]);
  measurementViewer = null;
  measurementHost = null;
}
