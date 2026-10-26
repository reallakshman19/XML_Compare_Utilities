/** One persistent ledger/canvas subtree in normal and fullscreen modes. */
export function setupReviewViewport({byId, documentRef = document}) {
  const surface = byId('review-surface'), panel = byId('ledger-panel');
  let expanded = false, nativeOwned = false, drag = null, returnFocus = null;
  function popup(visible) {
    panel.hidden = expanded && !visible;
    byId('show-ledger').setAttribute('aria-expanded', String(!panel.hidden));
  }
  function layout(value) {
    expanded = value;
    surface.classList.toggle('is-fullscreen', value);
    documentRef.body.classList.toggle('review-expanded', value);
    byId('toggle-fullscreen').textContent = value ? 'Exit fullscreen' : 'Fullscreen';
    byId('toggle-fullscreen').setAttribute('aria-pressed', String(value));
    panel.style.left = ''; panel.style.top = ''; panel.style.right = ''; panel.style.bottom = ''; drag = null;
    popup(true);
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
      // A cancelled pending entry may still become native fullscreen before exit refuses.
      if (documentRef.fullscreenElement === surface) {
        nativeOwned = true; layout(true);
        byId('toggle-fullscreen').textContent = 'Exit fullscreen (Esc)';
      }
    }
  }
  byId('toggle-fullscreen').addEventListener('click', () => { void toggle(); });
  byId('show-ledger').addEventListener('click', () => { popup(panel.hidden); if (!panel.hidden) panel.focus(); });
  byId('close-ledger').addEventListener('click', () => { popup(false); byId('show-ledger').focus(); });
  documentRef.addEventListener('fullscreenchange', () => {
    if (nativeOwned && !documentRef.fullscreenElement) { nativeOwned = false; layout(false); }
  });
  documentRef.addEventListener('keydown', event => {
    if (event.key === 'Escape' && expanded && !documentRef.fullscreenElement) layout(false);
  });
  const handle = byId('ledger-handle');
  handle.addEventListener('pointerdown', event => {
    if (!expanded || event.button !== 0 || event.target.closest('button')) return;
    const box = panel.getBoundingClientRect();
    drag = {x:event.clientX, y:event.clientY, left:box.left, top:box.top};
    handle.setPointerCapture(event.pointerId); event.preventDefault();
  });
  handle.addEventListener('pointermove', event => {
    if (!drag) return;
    const bounds = surface.getBoundingClientRect(), box = panel.getBoundingClientRect();
    panel.style.left = Math.max(0, Math.min(bounds.width - box.width, drag.left + event.clientX - drag.x)) + 'px';
    panel.style.top = Math.max(0, Math.min(bounds.height - 48, drag.top + event.clientY - drag.y)) + 'px';
    panel.style.right = 'auto'; panel.style.bottom = 'auto';
  });
  for (const name of ['pointerup','pointercancel','lostpointercapture'])
    handle.addEventListener(name, () => { drag = null; });
  return {isExpanded: () => expanded};
}
