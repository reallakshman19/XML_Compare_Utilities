/** Display-only host: the workbench owns its inputs, A/B/C state and evidence. */
export function geometryWorkbenchUrl(moduleUrl = import.meta.url) {
  const path = new URL(moduleUrl).pathname;
  const relative = path.includes('/docs/tabs/cii-workspace/cii-fnr-vnext/ui/')
    ? '../../../../../prototypes/ciifr-map/index.html'
    : '../../../../prototypes/ciifr-map/index.html';
  return new URL(relative, moduleUrl).href;
}

export function renderGeometryTab(panel, visible) {
  if (!panel) return;
  panel.hidden = !visible;
  if (!visible) return;
  const url = geometryWorkbenchUrl();
  panel.querySelector('[data-ciifr-geo-open]').href = url;
  const frame = panel.querySelector('[data-ciifr-geo-frame]');
  // Retain the document across tab switches, including loaded files and pins.
  if (!frame.getAttribute('src')) frame.setAttribute('src', url);
}
