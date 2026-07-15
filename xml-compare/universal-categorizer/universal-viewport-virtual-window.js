export const UNIVERSAL_VIRTUAL_WINDOW_SCHEMA = 'universal-viewport-virtual-window/v1';
export const DEFAULT_UNIVERSAL_ROW_HEIGHT = 34;
export const DEFAULT_UNIVERSAL_OVERSCAN = 8;
export const MAX_UNIVERSAL_RENDERED_ROWS = 250;

const freeze = (value) => Object.freeze(value);
const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

export function universalVirtualTotalHeight(count, rowHeight = DEFAULT_UNIVERSAL_ROW_HEIGHT) {
  return Math.max(0, Math.floor(finite(count))) * Math.max(1, finite(rowHeight, DEFAULT_UNIVERSAL_ROW_HEIGHT));
}

export function calculateUniversalVirtualWindow(input = {}) {
  const count = Math.max(0, Math.floor(finite(input.count)));
  const rowHeight = Math.max(1, finite(input.rowHeight, DEFAULT_UNIVERSAL_ROW_HEIGHT));
  const viewportHeight = Math.max(rowHeight, finite(input.viewportHeight, rowHeight));
  const overscan = Math.max(0, Math.floor(finite(input.overscan, DEFAULT_UNIVERSAL_OVERSCAN)));
  const maxRows = Math.max(1, Math.floor(finite(input.maxRows, MAX_UNIVERSAL_RENDERED_ROWS)));
  const firstVisible = clamp(Math.floor(Math.max(0, finite(input.scrollTop)) / rowHeight), 0, Math.max(0, count - 1));
  const visibleCount = Math.max(1, Math.ceil(viewportHeight / rowHeight));
  let start = Math.max(0, firstVisible - overscan);
  let end = Math.min(count, start + Math.min(maxRows, visibleCount + overscan * 2));
  if (end === count) start = Math.max(0, end - Math.min(maxRows, visibleCount + overscan * 2));
  return freeze({
    schema: UNIVERSAL_VIRTUAL_WINDOW_SCHEMA,
    count,
    rowHeight,
    viewportHeight,
    overscan,
    start,
    end,
    rendered: Math.max(0, end - start),
    offset: start * rowHeight,
    totalHeight: universalVirtualTotalHeight(count, rowHeight),
    firstVisible,
  });
}

export function universalRevealScrollTop(input = {}) {
  const index = Math.max(0, Math.floor(finite(input.index)));
  const rowHeight = Math.max(1, finite(input.rowHeight, DEFAULT_UNIVERSAL_ROW_HEIGHT));
  const current = Math.max(0, finite(input.scrollTop));
  const viewport = Math.max(rowHeight, finite(input.viewportHeight, rowHeight));
  const top = index * rowHeight;
  const bottom = top + rowHeight;
  if (top < current) return top;
  if (bottom > current + viewport) return Math.max(0, bottom - viewport);
  return current;
}

export function moveUniversalVirtualIndex(currentIndex, key, count) {
  const size = Math.max(0, Math.floor(finite(count)));
  if (!size) return -1;
  const current = clamp(Math.floor(finite(currentIndex, 0)), 0, size - 1);
  if (key === 'Home') return 0;
  if (key === 'End') return size - 1;
  if (key === 'ArrowUp') return Math.max(0, current - 1);
  if (key === 'ArrowDown') return Math.min(size - 1, current + 1);
  return current;
}

function virtualRowHeight(base, view) {
  return clamp(Math.max(1, finite(base, DEFAULT_UNIVERSAL_ROW_HEIGHT)) * Math.max(.5, finite(view?.zoomY, 1)), 22, 80);
}

export function createUniversalVirtualController(options = {}) {
  const surface = options.surface;
  const spacer = surface?.querySelector?.('[data-uxc-virtual-spacer]');
  const content = surface?.querySelector?.('[data-uxc-viewport-content]');
  if (!surface || !spacer || !content) throw new TypeError('Virtual controller requires surface, spacer and content.');
  const identityFor = options.identityFor;
  const renderRows = options.renderRows;
  if (typeof identityFor !== 'function' || typeof renderRows !== 'function') throw new TypeError('Virtual controller requires identityFor() and renderRows().');
  const abort = new AbortController();
  let rows = [];
  let ids = [];
  let byId = new Map();
  let selectedId = '';
  let relatedIds = new Set();
  let focusId = '';
  let view = { zoomX: 1, zoomY: 1, panX: 0, panY: 0 };
  let frame = null;
  let destroyed = false;
  let lastWindow = calculateUniversalVirtualWindow();

  function renderNow() {
    if (destroyed) return lastWindow;
    const rowHeight = virtualRowHeight(options.rowHeight, view);
    const adjustedTop = Math.max(0, surface.scrollTop - finite(view.panY));
    lastWindow = calculateUniversalVirtualWindow({
      count: rows.length,
      rowHeight,
      viewportHeight: surface.clientHeight || 420,
      scrollTop: adjustedTop,
      overscan: options.overscan,
      maxRows: options.maxRows,
    });
    spacer.style.height = `${lastWindow.totalHeight}px`;
    content.style.setProperty('--uxc-row-height', `${rowHeight}px`);
    content.style.transformOrigin = '0 0';
    content.style.transform = `translate(${finite(view.panX)}px,${lastWindow.offset + finite(view.panY)}px) scaleX(${Math.max(.05, finite(view.zoomX, 1))})`;
    content.innerHTML = renderRows(rows.slice(lastWindow.start, lastWindow.end), {
      start: lastWindow.start,
      rowHeight,
      selectedId,
      relatedIds,
    });
    surface.setAttribute('aria-rowcount', String(rows.length));
    surface.dataset.uxcRenderedRows = String(lastWindow.rendered);
    surface.dataset.uxcMaximumRendered = String(Math.max(Number(surface.dataset.uxcMaximumRendered || 0), lastWindow.rendered));
    surface.dataset.uxcVirtualTotal = String(rows.length);
    const empty = surface.querySelector('[data-uxc-empty-results]');
    if (empty) empty.hidden = rows.length > 0;
    if (focusId) content.querySelector(`[${options.idAttribute}="${cssValue(focusId)}"]`)?.focus?.({ preventScroll: true });
    options.onWindowChange?.(lastWindow, getScrollAnchor());
    return lastWindow;
  }

  function schedule() {
    if (frame != null || destroyed) return;
    frame = requestAnimationFrame(() => { frame = null; renderNow(); });
  }

  function getScrollAnchor() {
    const item = rows[lastWindow.firstVisible];
    return freeze({ id: item ? identityFor(item, lastWindow.firstVisible) : '', offset: surface.scrollTop - lastWindow.firstVisible * lastWindow.rowHeight });
  }

  function reveal(id, focus = false) {
    const index = byId.get(String(id));
    if (!Number.isInteger(index)) return false;
    const rowHeight = virtualRowHeight(options.rowHeight, view);
    surface.scrollTop = universalRevealScrollTop({
      index,
      rowHeight,
      scrollTop: surface.scrollTop,
      viewportHeight: surface.clientHeight || 420,
    });
    if (focus) focusId = String(id);
    renderNow();
    return true;
  }

  function applyScrollAnchor(anchor = {}) {
    const index = byId.get(String(anchor.id || ''));
    if (!Number.isInteger(index)) return false;
    const rowHeight = virtualRowHeight(options.rowHeight, view);
    surface.scrollTop = Math.max(0, index * rowHeight + finite(anchor.offset));
    renderNow();
    return true;
  }

  surface.addEventListener('scroll', schedule, { signal: abort.signal, passive: true });
  surface.addEventListener('click', (event) => {
    const row = event.target.closest?.(`[${options.idAttribute}]`);
    if (row) options.onActivate?.(row.getAttribute(options.idAttribute), { focus: false });
  }, { signal: abort.signal });
  surface.addEventListener('keydown', (event) => {
    if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    const row = event.target.closest?.(`[${options.idAttribute}]`);
    const currentId = row?.getAttribute(options.idAttribute) || selectedId || ids[0];
    const currentIndex = Math.max(0, byId.get(currentId) ?? 0);
    const nextIndex = moveUniversalVirtualIndex(currentIndex, event.key, rows.length);
    const nextId = ids[nextIndex];
    if (!nextId) return;
    event.preventDefault();
    focusId = nextId;
    options.onActivate?.(nextId, { focus: true });
    reveal(nextId, true);
  }, { signal: abort.signal });

  const controller = {
    setProjection(nextRows = []) {
      rows = Array.isArray(nextRows) ? nextRows : [];
      ids = rows.map((row, index) => String(identityFor(row, index)));
      byId = new Map(ids.map((id, index) => [id, index]));
      surface.scrollTop = Math.min(surface.scrollTop, Math.max(0, universalVirtualTotalHeight(rows.length, virtualRowHeight(options.rowHeight, view)) - (surface.clientHeight || 420)));
      return renderNow();
    },
    setSelection(next = {}) {
      selectedId = String(next.selectedId || '');
      relatedIds = new Set(next.relatedIds || []);
      return renderNow();
    },
    setViewTransform(next = {}) { view = { ...view, ...next }; return renderNow(); },
    reveal,
    applyScrollAnchor,
    getScrollAnchor,
    rows: () => rows,
    ids: () => ids,
    metrics: () => freeze({ ...lastWindow, maximumRendered: Number(surface.dataset.uxcMaximumRendered || lastWindow.rendered) }),
    destroy() {
      if (destroyed) return false;
      destroyed = true;
      abort.abort();
      if (frame != null) cancelAnimationFrame(frame);
      frame = null;
      content.replaceChildren();
      return true;
    },
  };
  return Object.freeze(controller);
}

function cssValue(value) {
  return String(value).replaceAll('\\', '\\\\').replaceAll('"', '\\"');
}

export const _test = freeze({ clamp, virtualRowHeight, cssValue });
