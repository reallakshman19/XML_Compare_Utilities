import { installSupportSteelRelationshipBuilderTile } from './support-steel-relationship-tab.js?v=20260717-startup-cache-recovery-1';
import './support-restraint-function-addon.js?v=20260717-startup-cache-recovery-1';

const ROOT_SELECTOR = '.psnm-root';
const LAUNCHER_VERSION = 'startup-cache-recovery-1';
const installedRoots = new WeakSet();
let observer = null;

export function mountSupportSteelRelationshipBuilder() {
  const doc = globalThis.document;
  if (!doc) return 0;
  let mounted = 0;
  for (const root of doc.querySelectorAll(ROOT_SELECTOR)) {
    const existing = root.querySelector('[data-ssrb-open="1"]');
    const current = existing?.dataset?.ssrbVersion === LAUNCHER_VERSION;
    if (installedRoots.has(root) && current) continue;
    if (existing && !current) existing.remove();
    if (!root.querySelector('[data-ssrb-open="1"]')) {
      const deck = root.querySelector('[data-psnm-utility-launcher-deck]') || root;
      installSupportSteelRelationshipBuilderTile(deck, {});
      const currentLauncher = root.querySelector('[data-ssrb-open="1"]');
      if (currentLauncher) currentLauncher.dataset.ssrbVersion = LAUNCHER_VERSION;
      mounted += 1;
    }
    installedRoots.add(root);
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
