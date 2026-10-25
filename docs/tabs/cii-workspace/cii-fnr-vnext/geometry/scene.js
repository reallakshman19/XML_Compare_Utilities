// Splits existing Method C's one original-witness scene into synchronized SVG views.
// Both retain the same millimetre viewBox and fixed-size panel dimensions.
export function pairedMethodCViews(scene, documentRef) {
  if (!scene?.svg || !scene.viewBox || !Number.isFinite(scene.viewBox.width)) throw new Error('METHOD_C_SCENE_REQUIRED');
  const parser = new DOMParser();
  const parsed = parser.parseFromString(scene.svg, 'image/svg+xml');
  if (parsed.querySelector('parsererror')) throw new Error('METHOD_C_SVG_PARSE_FAILED');
  const source = documentRef.importNode(parsed.documentElement, true);
  const target = documentRef.importNode(parsed.documentElement, true);
  for (const el of source.querySelectorAll('[data-kind="TARGET"], [data-layer="segment-projection"]')) el.remove();
  for (const el of target.querySelectorAll('[data-kind="SOURCE"]')) el.remove();
  source.setAttribute('aria-label', 'Original SOURCE physical NODE and ELEMENT geometry');
  target.setAttribute('aria-label', 'Original TARGET physical NODE and ELEMENT geometry');
  source.dataset.side = 'SOURCE'; target.dataset.side = 'TARGET';
  return {source, target, viewBox: [scene.viewBox.x, scene.viewBox.y, scene.viewBox.width, scene.viewBox.height]};
}

export function sharedViewBox(base, zoom, dx = 0, dy = 0) {
  if (!Array.isArray(base) || base.length !== 4 || !Number.isFinite(zoom) || zoom <= 0)
    throw new Error('INVALID_SHARED_METRIC_VIEW');
  const width = base[2] / zoom, height = base[3] / zoom;
  return [base[0] + (base[2] - width) / 2 + dx,
    base[1] + (base[3] - height) / 2 + dy, width, height];
}
