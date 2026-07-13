import assert from 'node:assert/strict';
import {
  PIPELINE_CAD_FALLBACK_STORAGE_KEY,
  PIPELINE_CAD_LEGACY_CANVAS_STORAGE_KEY,
  PIPELINE_CAD_RENDERER_CANVAS,
  PIPELINE_CAD_RENDERER_STORAGE_KEY,
  PIPELINE_CAD_RENDERER_SVG,
  applyPipelineCadRendererPolicy,
  handlePipelineCadRuntimeFailure,
  persistPipelineCadRenderer,
  requestPipelineCadRenderer,
  resolvePipelineCadRenderer,
} from '../tabs/pipeline-3d-model/pipeline-3d-model-cad-runtime-policy.js';

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem(key) { return map.has(key) ? map.get(key) : null; },
    setItem(key, value) { map.set(key, String(value)); },
    removeItem(key) { map.delete(key); },
    snapshot() { return Object.fromEntries(map); },
  };
}

{
  const storage = memoryStorage();
  assert.equal(resolvePipelineCadRenderer({ storage, location: { search: '' } }), PIPELINE_CAD_RENDERER_CANVAS);
  assert.equal(applyPipelineCadRendererPolicy({ storage, location: { search: '' } }), PIPELINE_CAD_RENDERER_CANVAS);
  assert.equal(storage.getItem(PIPELINE_CAD_RENDERER_STORAGE_KEY), 'canvas');
  assert.equal(storage.getItem(PIPELINE_CAD_LEGACY_CANVAS_STORAGE_KEY), '1');
}

{
  const storage = memoryStorage({ [PIPELINE_CAD_RENDERER_STORAGE_KEY]: 'canvas' });
  assert.equal(resolvePipelineCadRenderer({ storage, location: { search: '?pipelineCadRenderer=svg' } }), PIPELINE_CAD_RENDERER_SVG);
  assert.equal(resolvePipelineCadRenderer({ storage, location: { search: '?pipelineCadCanvas=0' } }), PIPELINE_CAD_RENDERER_SVG);
}

{
  const storage = memoryStorage({ [PIPELINE_CAD_RENDERER_STORAGE_KEY]: 'svg', [PIPELINE_CAD_LEGACY_CANVAS_STORAGE_KEY]: '1' });
  assert.equal(resolvePipelineCadRenderer({ storage, location: { search: '' } }), PIPELINE_CAD_RENDERER_SVG);
  persistPipelineCadRenderer('canvas', storage);
  assert.equal(resolvePipelineCadRenderer({ storage, location: { search: '' } }), PIPELINE_CAD_RENDERER_CANVAS);
}

{
  const storage = memoryStorage({ [PIPELINE_CAD_RENDERER_STORAGE_KEY]: 'canvas', [PIPELINE_CAD_FALLBACK_STORAGE_KEY]: 'old' });
  const sessionStorage = memoryStorage();
  let navigated = '';
  requestPipelineCadRenderer('svg', {
    storage,
    sessionStorage,
    location: { href: 'https://example.test/app?pipelineCadRenderer=canvas&x=1' },
    navigate(url) { navigated = url; },
  });
  assert.equal(storage.getItem(PIPELINE_CAD_RENDERER_STORAGE_KEY), 'svg');
  assert.equal(storage.getItem(PIPELINE_CAD_LEGACY_CANVAS_STORAGE_KEY), null);
  assert.equal(storage.getItem(PIPELINE_CAD_FALLBACK_STORAGE_KEY), null);
  assert.match(navigated, /x=1/);
  assert.doesNotMatch(navigated, /pipelineCadRenderer/);
}

{
  const storage = memoryStorage({ [PIPELINE_CAD_RENDERER_STORAGE_KEY]: 'canvas', [PIPELINE_CAD_LEGACY_CANVAS_STORAGE_KEY]: '1' });
  const sessionStorage = memoryStorage();
  let reloads = 0;
  assert.equal(handlePipelineCadRuntimeFailure(new Error('ordinary failure'), { storage, sessionStorage, reload: () => { reloads += 1; } }), false);
  assert.equal(handlePipelineCadRuntimeFailure(new Error('PipelineCad workspace initialization failed'), { storage, sessionStorage, reload: () => { reloads += 1; } }), true);
  assert.equal(storage.getItem(PIPELINE_CAD_RENDERER_STORAGE_KEY), 'svg');
  assert.equal(storage.getItem(PIPELINE_CAD_LEGACY_CANVAS_STORAGE_KEY), null);
  assert.match(storage.getItem(PIPELINE_CAD_FALLBACK_STORAGE_KEY), /workspace initialization failed/);
  assert.equal(reloads, 1);
  handlePipelineCadRuntimeFailure(new Error('PipelineCad repeated failure'), { storage, sessionStorage, reload: () => { reloads += 1; } });
  assert.equal(reloads, 1);
}

console.log('pipeline-3d-model CAD runtime policy tests passed');
