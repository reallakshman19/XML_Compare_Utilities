/** Product responsiveness policy and visible observations for Revision Compare WebGL. */
import { deepFreeze } from './revision-contract-utils.js';

export const REVISION_VIEWER_RESPONSIVENESS_SCHEMA = 'RevisionViewerResponsiveness.v1';
const MIB = 1024 * 1024;

export const REVISION_VIEWER_DEFAULT_RESPONSIVENESS_POLICY = deepFreeze({
  policyId: 'revision-webgl-responsiveness/v1',
  samplingResolutionMs: 250,
  bands: [
    { bandId: 'FINE', maximumDrawablesExclusive: 3000, sceneObservedMaxMs: 1500, firstReadyMaxMs: 2000, fitSelectedMaxMs: 75, heapGrowthMaxBytes: 128 * MIB },
    { bandId: 'BALANCED', maximumDrawablesExclusive: 12000, sceneObservedMaxMs: 3500, firstReadyMaxMs: 4500, fitSelectedMaxMs: 125, heapGrowthMaxBytes: 256 * MIB },
    { bandId: 'COARSE', maximumDrawablesExclusive: null, sceneObservedMaxMs: 7000, firstReadyMaxMs: 9000, fitSelectedMaxMs: 250, heapGrowthMaxBytes: 512 * MIB },
  ],
});

function positive(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) throw new RangeError(`${label} must be positive.`);
  return number;
}
function band(value, index) {
  const maximum = value.maximumDrawablesExclusive == null ? null : positive(value.maximumDrawablesExclusive, `bands[${index}].maximumDrawablesExclusive`);
  return Object.freeze({
    bandId: String(value.bandId ?? '').trim().toUpperCase(),
    maximumDrawablesExclusive: maximum,
    sceneObservedMaxMs: positive(value.sceneObservedMaxMs, `bands[${index}].sceneObservedMaxMs`),
    firstReadyMaxMs: positive(value.firstReadyMaxMs, `bands[${index}].firstReadyMaxMs`),
    fitSelectedMaxMs: positive(value.fitSelectedMaxMs, `bands[${index}].fitSelectedMaxMs`),
    heapGrowthMaxBytes: positive(value.heapGrowthMaxBytes, `bands[${index}].heapGrowthMaxBytes`),
  });
}
export function createRevisionViewerResponsivenessPolicy(value = REVISION_VIEWER_DEFAULT_RESPONSIVENESS_POLICY) {
  if (!Array.isArray(value?.bands) || !value.bands.length) throw new TypeError('Responsiveness policy bands are required.');
  const bands = value.bands.map(band);
  if (!bands.every((item) => item.bandId)) throw new TypeError('Every responsiveness band requires a bandId.');
  if (bands.at(-1).maximumDrawablesExclusive != null) throw new TypeError('The final responsiveness band must be unbounded.');
  return deepFreeze({
    policyId: String(value.policyId ?? '').trim() || 'revision-webgl-responsiveness/custom',
    samplingResolutionMs: positive(value.samplingResolutionMs, 'samplingResolutionMs'),
    bands,
  });
}
function selectBand(policy, drawableCount) {
  return policy.bands.find((item) => item.maximumDrawablesExclusive == null || drawableCount < item.maximumDrawablesExclusive);
}
function finite(value) { return Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : null; }
function timingMetric(value, limit, elapsed, terminalFailure) {
  const measured = finite(value);
  if (measured != null) return { status: measured <= limit ? 'PASS' : 'FAIL', value: measured, limit };
  if (terminalFailure || finite(elapsed) > limit) return { status: 'FAIL', value: finite(elapsed), limit };
  return { status: 'PENDING', value: null, limit };
}
function fitMetric(evidence, limit) {
  const count = Math.max(0, Math.trunc(Number(evidence?.fitSelectedCount) || 0));
  const value = finite(evidence?.lastFitSelectedMs);
  if (!count || value == null) return { status: 'PENDING', value: null, limit, count };
  return { status: value <= limit ? 'PASS' : 'FAIL', value, limit, count };
}
function memoryMetric(observation, limit) {
  if (!observation?.available) return { status: 'UNAVAILABLE', value: null, limit, usedBytes: null };
  const value = finite(observation.peakGrowthBytes) ?? 0;
  return { status: value <= limit ? 'PASS' : 'FAIL', value, limit, usedBytes: finite(observation.usedBytes) };
}
function disposition(scene, metrics) {
  if (scene.requestedBackend !== 'WEBGL') return 'INACTIVE';
  if ([metrics.scene.status, metrics.firstReady.status, metrics.fitSelected.status, metrics.memory.status].includes('FAIL')) return 'NOT_QUALIFIED';
  if (scene.status !== 'READY' || [metrics.scene.status, metrics.firstReady.status, metrics.fitSelected.status].includes('PENDING')) return 'PENDING';
  return 'QUALIFIED';
}
function messageFor(result) {
  if (result.disposition === 'INACTIVE') return 'Select 3D (WebGL) to measure responsiveness.';
  if (result.disposition === 'NOT_QUALIFIED') return 'One or more observed responsiveness limits were exceeded.';
  if (result.disposition === 'QUALIFIED' && result.metrics.memory.status === 'UNAVAILABLE') return 'Timing limits passed; browser heap telemetry is unavailable and was not inferred.';
  if (result.disposition === 'QUALIFIED') return 'Observed WebGL responsiveness is within the active product policy.';
  if (result.metrics.fitSelected.status === 'PENDING' && result.sceneStatus === 'READY') return 'Select a difference and use Fit selected to complete the disposition.';
  return 'Waiting for the WebGL scene to become ready.';
}
function policyDisclosure(policy) {
  const bands = policy.bands.map((item) => `${item.bandId}: drawables ${item.maximumDrawablesExclusive == null ? 'unbounded' : `< ${item.maximumDrawablesExclusive}`}, scene ≤ ${item.sceneObservedMaxMs} ms, first ready ≤ ${item.firstReadyMaxMs} ms, fit selected ≤ ${item.fitSelectedMaxMs} ms, heap growth ≤ ${Math.round(item.heapGrowthMaxBytes / MIB)} MiB`).join('; ');
  return `Product responsiveness policy ${policy.policyId}. Sampling resolution ${policy.samplingResolutionMs} ms. ${bands}. Memory is sampled only when the browser exposes performance.memory. These observations do not alter renderer, engineering, topology, comparison, persistence, or export authority.`;
}
export function revisionViewerResponsivenessModel(scene, viewerEvidence, observations = {}, policyValue) {
  const policy = createRevisionViewerResponsivenessPolicy(policyValue);
  const drawableCount = Math.max(0, Math.trunc(Number(scene?.expected?.total) || 0));
  const activeBand = selectBand(policy, drawableCount);
  const terminalFailure = ['FAILED', 'BLOCKED'].includes(scene?.status);
  const metrics = deepFreeze({
    scene: timingMetric(observations.sceneRuntimeObservedMs, activeBand.sceneObservedMaxMs, observations.elapsedMs, terminalFailure),
    firstReady: timingMetric(observations.firstReadyMs, activeBand.firstReadyMaxMs, observations.elapsedMs, terminalFailure),
    fitSelected: fitMetric(viewerEvidence, activeBand.fitSelectedMaxMs),
    memory: memoryMetric(observations.memory, activeBand.heapGrowthMaxBytes),
  });
  const result = {
    schema: REVISION_VIEWER_RESPONSIVENESS_SCHEMA,
    policyId: policy.policyId,
    sceneStatus: scene?.status ?? 'INACTIVE',
    bandId: activeBand.bandId,
    drawableCount,
    disposition: disposition(scene ?? {}, metrics),
    metrics,
    message: '',
    disclosure: policyDisclosure(policy),
  };
  result.message = messageFor(result);
  return deepFreeze(result);
}
export function readRevisionViewerMemory(performanceRef = globalThis.performance) {
  const memory = performanceRef?.memory;
  const usedBytes = finite(memory?.usedJSHeapSize);
  const limitBytes = finite(memory?.jsHeapSizeLimit);
  if (usedBytes == null) return deepFreeze({ available: false, usedBytes: null, limitBytes: null });
  return deepFreeze({ available: true, usedBytes, limitBytes });
}
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}
function formatMs(value) { return finite(value) == null ? 'Pending' : `${Math.round(Number(value))} ms`; }
function formatMemory(value) { return finite(value) == null ? 'Unavailable' : `${(Number(value) / MIB).toFixed(1)} MiB`; }
function fact(label, value, attribute, status = '') {
  return `<div><dt>${escapeHtml(label)}</dt><dd ${attribute} ${status ? `data-status="${escapeHtml(status.toLowerCase())}"` : ''}>${escapeHtml(value)}</dd></div>`;
}
export function revisionViewerResponsivenessMarkup(model) {
  const metric = model.metrics;
  return `<section class="revc-performance-status" data-revc-performance-status data-status="${escapeHtml(model.disposition.toLowerCase())}"><header><div><span>WEBGL PERFORMANCE</span><b>Observed responsiveness</b><span class="revc-info-icon" tabindex="0" role="img" aria-label="Responsiveness policy and authority boundary" title="${escapeHtml(model.disclosure)}">ⓘ</span></div><strong data-revc-performance-disposition data-status="${escapeHtml(model.disposition.toLowerCase())}">${escapeHtml(model.disposition)}</strong></header><dl>${fact('Size band', model.bandId, 'data-revc-performance-band')}${fact('Drawables', model.drawableCount, 'data-revc-performance-drawables')}${fact('Scene completion', `${formatMs(metric.scene.value)} / ${metric.scene.limit} ms`, 'data-revc-performance-scene', metric.scene.status)}${fact('First ready', `${formatMs(metric.firstReady.value)} / ${metric.firstReady.limit} ms`, 'data-revc-performance-ready', metric.firstReady.status)}${fact('Fit selected', `${formatMs(metric.fitSelected.value)} / ${metric.fitSelected.limit} ms`, 'data-revc-performance-fit', metric.fitSelected.status)}${fact('Fit samples', metric.fitSelected.count, 'data-revc-performance-fit-count')}${fact('Heap used', formatMemory(metric.memory.usedBytes), 'data-revc-performance-heap')}${fact('Peak heap growth', `${formatMemory(metric.memory.value)} / ${formatMemory(metric.memory.limit)}`, 'data-revc-performance-memory', metric.memory.status)}</dl><p data-revc-performance-message>${escapeHtml(model.message)}</p></section>`;
}
function setText(root, selector, value) { const element = root?.querySelector?.(selector); if (element) element.textContent = String(value); }
export function applyRevisionViewerResponsiveness(root, model) {
  let host = root?.querySelector?.('[data-revc-performance-status]');
  if (!host) {
    root?.querySelector?.('[data-revc-scene-status]')?.insertAdjacentHTML?.('afterend', revisionViewerResponsivenessMarkup(model));
    host = root?.querySelector?.('[data-revc-performance-status]');
  }
  if (!host) return false;
  host.setAttribute('data-status', model.disposition.toLowerCase());
  const dispositionNode = host.querySelector('[data-revc-performance-disposition]');
  if (dispositionNode) { dispositionNode.textContent = model.disposition; dispositionNode.setAttribute('data-status', model.disposition.toLowerCase()); }
  const metric = model.metrics;
  setText(host, '[data-revc-performance-band]', model.bandId);
  setText(host, '[data-revc-performance-drawables]', model.drawableCount);
  setText(host, '[data-revc-performance-scene]', `${formatMs(metric.scene.value)} / ${metric.scene.limit} ms`);
  setText(host, '[data-revc-performance-ready]', `${formatMs(metric.firstReady.value)} / ${metric.firstReady.limit} ms`);
  setText(host, '[data-revc-performance-fit]', `${formatMs(metric.fitSelected.value)} / ${metric.fitSelected.limit} ms`);
  setText(host, '[data-revc-performance-fit-count]', metric.fitSelected.count);
  setText(host, '[data-revc-performance-heap]', formatMemory(metric.memory.usedBytes));
  setText(host, '[data-revc-performance-memory]', `${formatMemory(metric.memory.value)} / ${formatMemory(metric.memory.limit)}`);
  setText(host, '[data-revc-performance-message]', model.message);
  return true;
}
export const REVISION_VIEWER_RESPONSIVENESS_CSS = `
.revc-view-column{grid-template-rows:auto auto auto auto minmax(0,1fr)}
.revc-performance-status{display:grid;gap:7px;padding:8px 10px;border-bottom:1px solid #203550;background:#081827}.revc-performance-status>header{display:flex;align-items:center;justify-content:space-between;gap:10px}.revc-performance-status>header>div{display:flex;align-items:center;gap:7px}.revc-performance-status>header span:first-child{color:#60a5fa;font:700 10px/1.2 ui-monospace,monospace;letter-spacing:.08em}.revc-performance-status>header b{font-size:11px}.revc-performance-status>header strong{font:700 10px/1.2 ui-monospace,monospace}.revc-performance-status dl{margin:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1px;background:#203550}.revc-performance-status dl div{min-width:0;padding:6px 7px;background:#0b1d2e}.revc-performance-status dt{font-size:8px;text-transform:uppercase;color:#7893ac}.revc-performance-status dd{margin:2px 0 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#d6e4f2;font:10px/1.3 ui-monospace,monospace}.revc-performance-status p{margin:0;color:#9fb4c9;font-size:10px}.revc-performance-status [data-status=qualified],.revc-performance-status [data-status=pass]{color:#5eead4}.revc-performance-status [data-status=pending],.revc-performance-status [data-status=unavailable],.revc-performance-status [data-status=inactive]{color:#fbbf24}.revc-performance-status [data-status=not_qualified],.revc-performance-status [data-status=fail]{color:#fb7185}@media(max-width:980px){.revc-performance-status dl{grid-template-columns:repeat(2,minmax(0,1fr))}}
`;
