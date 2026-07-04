import { loadStickyState, state, setActiveTab } from './state.js';
import { RuntimeEvents } from '../contracts/runtime-events.js';
import { emit, on } from './event-bus.js';
import { hideLoading } from './loading.js';
import { initDevDebugWindow } from '../debug/dev-debug-window.js';

export const STANDALONE_APP = Object.freeze({
  id: 'xml-compare-utilities',
  name: 'XML Compare Utilities',
  subtitle: 'XML Compare and Utilities',
  defaultTab: 'xml-compare',
});

const TAB_VISIBILITY_URL = new URL('../config/tab-visibility.json', import.meta.url).href;
const APP_ICON_URL = new URL('../assets/app-icon.svg?v=standalone-1', import.meta.url).href;
const ACTIVE_TAB_STORAGE_KEY = 'xml-compare-utilities.activeTabId';
const TAB_ID_ALIASES = new Map([
  ['xml-compare', 'xml-compare'],
  ['psnm-utility', 'psnm-utility']
]);
const TAB_ICON_SVGS = Object.freeze({
  cube: '<path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z"/><path d="M4 7.5 12 12l8-4.5M12 12v9"/>',
  pipe: '<path d="M4 15h6a4 4 0 0 0 4-4V5"/><path d="M14 5h5"/><circle cx="4" cy="15" r="1.5"/><circle cx="19" cy="5" r="1.5"/>',
  convert: '<path d="M5 7h12l-3-3M17 17H5l3 3"/><path d="M17 7 14 10M5 17l3-3"/>',
  exchange: '<path d="M4 8h12l-3-3M20 16H8l3 3"/><path d="M16 8h4v8M8 16H4V8"/>',
  gear: '<path d="M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Z"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>',
  support: '<path d="M5 19h14M8 19l4-12 4 12M9.4 15h5.2"/><path d="M7 7h10"/>',
  map: '<path d="M4 6l5-2 6 2 5-2v14l-5 2-6-2-5 2V6Z"/><path d="M9 4v14M15 6v14"/>',
  xml: '<path d="m8 8-4 4 4 4M16 8l4 4-4 4M13 6l-2 12"/>',
  compare: '<path d="M7 5h10M7 19h10M8 5v14M16 5v14"/><path d="M4 9h7M13 15h7"/>',
  tool: '<path d="M14.5 5.5 18 2l4 4-3.5 3.5"/><path d="M15 6 5 16l-1 4 4-1L18 9"/>',
  json: '<path d="M8 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2"/><path d="M16 5h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-2"/><path d="M10 8l-2 8M14 8l2 8M11 12h2"/>',
});

export const STANDALONE_TABS = Object.freeze([
  { id: 'xml-compare', label: 'XML Compare', icon: 'compare', load: () => import('../tabs/xml-compare-tab.js?v=20260704-enrichment-derived-1').then((module) => pickRenderer(module, 'renderXmlCompareTab', 'xml-compare')) },
  { id: 'psnm-utility', label: 'Utilities', icon: 'tool', load: loadPsnmUtilityRenderer }
]);
const TAB_GROUPS = Object.freeze([
  { label: 'XML', ids: [
  "xml-compare"
] },
  { label: 'Utilities', ids: [
  "psnm-utility"
] }
]);
let activeTabDestroy = null;
let appDestroy = null;

function cleanupActiveTab() {
  if (!activeTabDestroy) return;
  try { activeTabDestroy(); } catch (error) { console.warn('Tab cleanup failed', error); }
  activeTabDestroy = null;
}

function hideStartupOverlay() {
  try { hideLoading(); } catch {}
  const overlay = document.getElementById('app-loading-overlay');
  if (!overlay) return;
  overlay.classList.remove('is-visible');
  overlay.setAttribute('aria-hidden', 'true');
}

function pickRenderer(module, exportName, tabId) {
  const renderer = module?.[exportName];
  if (typeof renderer !== 'function') throw new Error(`Tab ${tabId} did not export renderer ${exportName}`);
  return renderer;
}

async function loadPsnmUtilityRenderer() {
  await Promise.allSettled([
    import('../tabs/psnm-utility/psnm-ui-p2-enhancements.js?v=standalone-1'),
    import('../tabs/psnm-utility/psnm-phase4c-hardening.js?v=standalone-1'),
    import('../tabs/psnm-utility/psnm-phase4d-persistence.js?v=standalone-1'),
  ]);
  return import('../tabs/psnm-utility-tab.js?v=standalone-1').then((module) => pickRenderer(module, 'renderPSNM_UtilityTab', 'psnm-utility'));
}

function createAppShell(root) {
  root.innerHTML = '';
  const shell = document.createElement('div');
  shell.className = 'app-shell';
  const nav = document.createElement('nav');
  nav.className = 'app-nav';
  nav.setAttribute('aria-label', 'Application tabs');
  const content = document.createElement('main');
  content.className = 'app-content';
  shell.append(nav, content);
  root.appendChild(shell);
  return { nav, content };
}

async function visibleTabs() {
  try {
    const response = await fetch(TAB_VISIBILITY_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const config = await response.json();
    const hidden = new Set(Array.isArray(config?.hiddenTabs) ? config.hiddenTabs : []);
    return STANDALONE_TABS.filter((tab) => !hidden.has(tab.id));
  } catch {
    return STANDALONE_TABS;
  }
}

function renderNav(nav, tabs, activeId) {
  nav.innerHTML = `
    <div class="app-brand">
      <img src="${APP_ICON_URL}" alt="" width="34" height="34">
      <div><strong>${STANDALONE_APP.name}</strong><small>${STANDALONE_APP.subtitle}</small></div>
    </div>
    <div class="app-nav-groups">
      ${TAB_GROUPS.map(group => {
        const items = tabs.filter(tab => group.ids.includes(tab.id));
        if (!items.length) return '';
        return `<section><h3>${group.label}</h3>${items.map(tab => tabButton(tab, tab.id === activeId)).join('')}</section>`;
      }).join('')}
    </div>`;
}

function tabButton(tab, active) {
  return `<button class="app-tab-btn ${active ? 'is-active' : ''}" data-tab-target="${tab.id}" type="button"><svg viewBox="0 0 24 24" aria-hidden="true">${TAB_ICON_SVGS[tab.icon] || TAB_ICON_SVGS.tool}</svg><span>${tab.label}</span></button>`;
}

async function mountTab(content, tab) {
  cleanupActiveTab();
  content.innerHTML = '<div class="tab-loading">Loading ' + tab.label + '...</div>';
  const renderer = await tab.load();
  const destroy = await renderer(content, state);
  activeTabDestroy = typeof destroy === 'function' ? destroy : null;
}

async function switchToTab(tabId, tabs, nav, content) {
  const resolvedId = TAB_ID_ALIASES.get(tabId) || tabId;
  const tab = tabs.find(t => t.id === resolvedId) || tabs[0];
  if (!tab) return;
  setActiveTab(tab.id);
  try { localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, tab.id); } catch {}
  renderNav(nav, tabs, tab.id);
  await mountTab(content, tab);
}

export async function init(root) {
  const tabs = await visibleTabs();
  const { nav, content } = createAppShell(root);
  loadStickyState();
  initDevDebugWindow();
  const stored = (() => { try { return localStorage.getItem(ACTIVE_TAB_STORAGE_KEY); } catch { return ''; } })();
  const initial = TAB_ID_ALIASES.get(stored) || stored || STANDALONE_APP.defaultTab;
  const handleClick = (event) => {
    const btn = event.target.closest('[data-tab-target]');
    if (btn) switchToTab(btn.dataset.tabTarget, tabs, nav, content);
  };
  nav.addEventListener('click', handleClick);
  const offRuntime = on(RuntimeEvents.TAB_CHANGE_REQUESTED, ({ tab }) => switchToTab(tab, tabs, nav, content));
  const onWindowSwitch = (event) => switchToTab(event.detail?.tabId, tabs, nav, content);
  window.addEventListener('app:switch-tab', onWindowSwitch);
  appDestroy = () => {
    nav.removeEventListener('click', handleClick);
    window.removeEventListener('app:switch-tab', onWindowSwitch);
    offRuntime();
    cleanupActiveTab();
  };
  await switchToTab(initial, tabs, nav, content);
  hideStartupOverlay();
  return appDestroy;
}

export function destroy() {
  if (appDestroy) appDestroy();
  appDestroy = null;
}
