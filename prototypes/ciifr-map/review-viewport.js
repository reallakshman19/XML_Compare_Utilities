/** Clamp to local surface coordinates; never confuse viewport/client and popup offsets. */
export function clampedPopupRect(bounds, box, left = box.left - bounds.left, top = box.top - bounds.top) {
  const width = Math.min(Math.max(0, box.width), Math.max(0, bounds.width - 16));
  const height = Math.min(Math.max(0, box.height), Math.max(0, bounds.height - 16));
  return {width, height, left: Math.max(8, Math.min(bounds.width - width - 8, left)),
    top: Math.max(8, Math.min(bounds.height - height - 8, top))};
}

/** One persistent ledger/canvas subtree in normal and fullscreen modes. */
export function setupReviewViewport({byId, documentRef = document}) {
  const surface = byId('review-surface'), panel = byId('ledger-panel');
  const windowRef = documentRef.defaultView;
  let expanded = false, nativeOwned = false, drag = null, returnFocus = null;
  function clamp(left, top) {
    if (!expanded || panel.hidden) return;
    const bounds = surface.getBoundingClientRect(), box = panel.getBoundingClientRect();
    const rect = clampedPopupRect(bounds, box, left, top);
    panel.style.maxWidth = Math.max(0, bounds.width - 16) + 'px';
    panel.style.maxHeight = Math.max(0, bounds.height - 16) + 'px';
    if (box.width > rect.width) panel.style.width = rect.width + 'px';
    if (box.height > rect.height) panel.style.height = rect.height + 'px';
    panel.style.left = rect.left + 'px'; panel.style.top = rect.top + 'px';
    panel.style.right = 'auto'; panel.style.bottom = 'auto';
  }
  function popup(visible) {
    panel.hidden = expanded && !visible;
    byId('show-ledger').setAttribute('aria-expanded', String(!panel.hidden));
    if (expanded && visible) clamp();
  }
  function layout(value) {
    expanded = value;
    surface.classList.toggle('is-fullscreen', value);
    documentRef.body.classList.toggle('review-expanded', value);
    byId('toggle-fullscreen').textContent = value ? 'Exit fullscreen' : 'Fullscreen';
    byId('toggle-fullscreen').setAttribute('aria-pressed', String(value));
    for (const key of ['left', 'top', 'right', 'bottom', 'width', 'height', 'maxWidth', 'maxHeight']) panel.style[key] = '';
    drag = null; popup(true);
    if (value) byId('toggle-fullscreen').focus();
    else returnFocus?.focus();
  }
  async function toggle() {
    if (expanded) {
      if (documentRef.fullscreenElement === surface) {
        try { await documentRef.exitFullscreen(); }
        catch {
          if (documentRef.fullscreenElement === surface) {
            byId('toggle-fullscreen').textContent = 'Exit fullscreen (Esc)'; return;
          }
        }
      }
      nativeOwned = false; layout(false); return;
    }
    returnFocus = documentRef.activeElement; layout(true);
    try {
      if (surface.requestFullscreen) {
        await surface.requestFullscreen(); nativeOwned = true;
        if (!expanded && documentRef.fullscreenElement === surface) await documentRef.exitFullscreen();
      }
    } catch {
      if (documentRef.fullscreenElement === surface) {
        nativeOwned = true; layout(true);
        byId('toggle-fullscreen').textContent = 'Exit fullscreen (Esc)';
      }
    }
    clamp();
  }
  byId('toggle-fullscreen').addEventListener('click', () => { void toggle(); });
  byId('show-ledger').addEventListener('click', () => { popup(panel.hidden); if (!panel.hidden) panel.focus(); });
  byId('close-ledger').addEventListener('click', () => { popup(false); byId('show-ledger').focus(); });
  documentRef.addEventListener('fullscreenchange', () => {
    if (nativeOwned && !documentRef.fullscreenElement) { nativeOwned = false; layout(false); }
    else clamp();
  });
  documentRef.addEventListener('keydown', event => {
    if (event.key === 'Escape' && expanded && !documentRef.fullscreenElement) layout(false);
  });
  const handle = byId('ledger-handle');
  handle.addEventListener('pointerdown', event => {
    if (!expanded || event.button !== 0 || event.target.closest('button')) return;
    const box = panel.getBoundingClientRect(), bounds = surface.getBoundingClientRect();
    drag = {x: event.clientX, y: event.clientY, left: box.left - bounds.left, top: box.top - bounds.top};
    handle.setPointerCapture(event.pointerId); event.preventDefault();
  });
  handle.addEventListener('pointermove', event => {
    if (drag) clamp(drag.left + event.clientX - drag.x, drag.top + event.clientY - drag.y);
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture'])
    handle.addEventListener(name, () => { drag = null; });
  const Resize = windowRef?.ResizeObserver;
  const observer = Resize ? new Resize(() => clamp()) : null;
  observer?.observe(surface); observer?.observe(panel);
  windowRef?.addEventListener('resize', () => clamp());
  return {isExpanded: () => expanded, clamp};
}
