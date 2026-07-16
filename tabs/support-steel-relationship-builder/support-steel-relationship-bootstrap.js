import { installSupportSteelRelationshipBuilderTile } from './support-steel-relationship-tab.js?v=20260716-ssrb-1';

const ROOT_SELECTOR = '.psnm-root';
const installedRoots = new WeakSet();
let observer = null;

export function mountSupportSteelRelationshipBuilder() {
  const doc = globalThis.document;
  if (!doc) return 0;
  let mounted = 0;
  for (const root of doc.querySelectorAll(ROOT_SELECTOR)) {
    if (installedRoots.has(root) || root.querySelector('[data-ssrb-open="1"]')) {
      installedRoots.add(root);
      continue;
    }
    const deck = root.querySelector('[data-psnm-utility-launcher-deck]') || root;
    installSupportSteelRelationshipBuilderTile(deck, {});
    installedRoots.add(root);
    mounted += 1;
  }
  return mounted;
}

export function installSupportSteelRelationshipBootstrap() {
  const doc = globalThis.document;
  if (!doc || observer) return () => {};
  mountSupportSteelRelationshipBuilder();
  observer = new MutationObserver(() => mountSupportSteelRelationshipBuilder());
  observer.observe(doc.documentElement, { childList: true, subtree: true });
  return () => {
    observer?.disconnect();
    observer = null;
  };
}

installSupportSteelRelationshipBootstrap();
