/** Non-authoritative DOM focus, caret and scroll retention across workspace rerenders. */
import { deepFreeze } from './revision-contract-utils.js';

const SCROLL_SELECTORS = Object.freeze(['.revc-body', '.revc-review-side']);
const STATIC_FOCUS = Object.freeze([
  Object.freeze({ selector: '[data-revc-queue-search]', kind: 'queueSearch' }),
  Object.freeze({ selector: '[data-revc-review-search]', kind: 'reviewSearch' }),
  Object.freeze({ selector: '[data-revc-decision-rationale]', kind: 'decisionRationale' }),
  Object.freeze({ selector: '[data-revc-review-note]', kind: 'reviewNote' }),
]);

function enabled(element) {
  return Boolean(element && !element.disabled && element.getAttribute?.('aria-disabled') !== 'true');
}

function selectionSnapshot(element) {
  if (!Number.isInteger(element?.selectionStart) || !Number.isInteger(element?.selectionEnd)) return null;
  return deepFreeze({
    start: element.selectionStart,
    end: element.selectionEnd,
    direction: element.selectionDirection ?? 'none',
  });
}

function keyedFocus(element) {
  if (element.matches?.('[data-revc-search]')) return { kind: 'scopeSearch', value: element.dataset.revcSearch };
  if (element.matches?.('[data-revc-branch-id]')) return { kind: 'branch', value: element.dataset.revcBranchId };
  if (element.matches?.('[data-revc-group]')) {
    return { kind: 'group', value: element.dataset.revcGroup, secondary: element.dataset.revcInclude };
  }
  const fixed = STATIC_FOCUS.find((item) => element.matches?.(item.selector));
  return fixed ? { kind: fixed.kind } : null;
}

function focusSnapshot(root) {
  const element = root?.ownerDocument?.activeElement;
  if (!element || !root.contains?.(element)) return null;
  const key = keyedFocus(element);
  if (!key) return null;
  return deepFreeze({ ...key, selection: selectionSnapshot(element) });
}

function scrollSnapshot(root) {
  return Object.freeze(SCROLL_SELECTORS.flatMap((selector) => {
    const element = root?.querySelector?.(selector);
    return element ? [deepFreeze({ selector, top: element.scrollTop, left: element.scrollLeft })] : [];
  }));
}

function findStatic(root, kind) {
  const item = STATIC_FOCUS.find((entry) => entry.kind === kind);
  return item ? root.querySelector(item.selector) : null;
}

function findKeyed(root, focus) {
  if (focus.kind === 'scopeSearch') {
    return [...root.querySelectorAll('[data-revc-search]')].find((item) => item.dataset.revcSearch === focus.value);
  }
  if (focus.kind === 'branch') {
    return [...root.querySelectorAll('[data-revc-branch-id]')].find((item) => item.dataset.revcBranchId === focus.value);
  }
  if (focus.kind === 'group') {
    return [...root.querySelectorAll('[data-revc-group]')].find((item) => item.dataset.revcGroup === focus.value
      && item.dataset.revcInclude === focus.secondary);
  }
  return findStatic(root, focus.kind);
}

function restoreSelection(element, selection) {
  if (!selection || typeof element?.setSelectionRange !== 'function') return;
  const length = String(element.value ?? '').length;
  element.setSelectionRange(Math.min(selection.start, length), Math.min(selection.end, length), selection.direction);
}

function restoreFocus(root, focus) {
  if (!focus) return false;
  const element = findKeyed(root, focus);
  if (!enabled(element)) return false;
  element.focus?.({ preventScroll: true });
  restoreSelection(element, focus.selection);
  return true;
}

function restoreScroll(root, scroll) {
  for (const position of scroll ?? []) {
    const element = root?.querySelector?.(position.selector);
    if (element) element.scrollTo?.({ top: position.top, left: position.left, behavior: 'auto' });
  }
}

export function captureRevisionCompareInteraction(root) {
  return deepFreeze({ focus: focusSnapshot(root), scroll: scrollSnapshot(root) });
}

export function restoreRevisionCompareInteraction(root, snapshot) {
  if (!snapshot) return false;
  const focused = restoreFocus(root, snapshot.focus);
  restoreScroll(root, snapshot.scroll);
  return focused;
}

export const _test = Object.freeze({
  enabled, findKeyed, focusSnapshot, keyedFocus, restoreFocus, restoreSelection, scrollSnapshot,
});
