import { UNIVERSAL_XML_CATEGORIZER_BUTTON_ATTR, UNIVERSAL_XML_CATEGORIZER_POPUP_ATTR, renderUniversalXmlCategorizerShellHtml } from '../xml-compare/universal-categorizer/universal-xml-categorizer-shell.js';

export const XML_COMPARE_UNIVERSAL_CATEGORIZER_RUNTIME_SCHEMA = 'xml-compare-universal-categorizer-runtime/v1-shadow';

const BUTTON_SELECTOR = `[${UNIVERSAL_XML_CATEGORIZER_BUTTON_ATTR}]`;
const POPUP_SELECTOR = `[${UNIVERSAL_XML_CATEGORIZER_POPUP_ATTR}]`;
let runtimeInstalled = false;

export function openUniversalXmlCategorizer(doc = globalThis.document) {
  if (!doc?.body) return false;
  closeUniversalXmlCategorizer(doc);
  doc.body.insertAdjacentHTML('beforeend', renderUniversalXmlCategorizerShellHtml());
  return true;
}

export function closeUniversalXmlCategorizer(doc = globalThis.document) {
  const popup = doc?.querySelector?.(POPUP_SELECTOR);
  if (!popup) return false;
  popup.remove();
  return true;
}

export function universalXmlCategorizerActionFromTarget(target) {
  if (target?.closest?.(BUTTON_SELECTOR)) return 'open';
  if (target?.closest?.('[data-universal-categorizer-close]')) return 'close';
  if (target?.matches?.(POPUP_SELECTOR)) return 'close';
  return '';
}

export function installUniversalXmlCategorizerRuntime(doc = globalThis.document) {
  if (runtimeInstalled || !doc?.addEventListener) return false;
  runtimeInstalled = true;
  doc.addEventListener('click', universalCategorizerClickHandler, { capture: true });
  return true;
}

function universalCategorizerClickHandler(event) {
  const action = universalXmlCategorizerActionFromTarget(event.target);
  if (!action) return;
  event.preventDefault?.();
  if (action === 'open') openUniversalXmlCategorizer(event.target.ownerDocument || globalThis.document);
  else closeUniversalXmlCategorizer(event.target.ownerDocument || globalThis.document);
}

installUniversalXmlCategorizerRuntime();

export const _test = Object.freeze({ BUTTON_SELECTOR, POPUP_SELECTOR, universalCategorizerClickHandler });
