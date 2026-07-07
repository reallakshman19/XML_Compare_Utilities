import { createLinewiseUniversalPreset, summarizeUniversalProfile } from './universal-xml-categorizer-contracts.js';

export const UNIVERSAL_XML_CATEGORIZER_SHELL_SCHEMA = 'universal-xml-categorizer-shell/v1-shadow';
export const UNIVERSAL_XML_CATEGORIZER_BUTTON_ATTR = 'data-xml-compare-universal-categorizer-open';
export const UNIVERSAL_XML_CATEGORIZER_POPUP_ATTR = 'data-xml-compare-universal-categorizer-popup';

const esc = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');

export function renderUniversalXmlCategorizerButtonHtml() {
  return `<button type="button" class="xml-compare-universal-categorizer-btn" ${UNIVERSAL_XML_CATEGORIZER_BUTTON_ATTR}>Universal XML Categorizer</button>`;
}

export function renderUniversalXmlCategorizerShellHtml(profile = createLinewiseUniversalPreset()) {
  const p = createLinewiseUniversalPreset(), summary = summarizeUniversalProfile(profile || p);
  return `<div class="universal-xml-categorizer-backdrop" ${UNIVERSAL_XML_CATEGORIZER_POPUP_ATTR}>${styleHtml()}<section class="universal-xml-categorizer-dialog" role="dialog" aria-modal="true" aria-label="Universal XML Categorizer"><header><div><h3>Universal XML Categorizer</h3><p>Shadow-mode recipe workspace: structure recipe + universal sideload attachments. Existing Line-wise and Table-to-Categorized workflows are unchanged.</p></div><button type="button" data-universal-categorizer-close>Close</button></header>${summaryHtml(summary)}<main>${recipeMapHtml(p)}${sideloadHtml(p)}${boundaryHtml()}</main></section></div>`;
}

function summaryHtml(summary) {
  const cards = [['Sources', summary.sources], ['Sideloads', summary.sideloadSources], ['Levels', summary.levels], ['Blocks', summary.blocks], ['Attachments', summary.attachments]];
  return `<div class="universal-categorizer-kpis">${cards.map(([k, v]) => `<div><b>${esc(v)}</b><small>${esc(k)}</small></div>`).join('')}</div>`;
}

function recipeMapHtml(profile) {
  return `<section class="universal-categorizer-card"><h4>Structure Recipe Builder bridge</h4><p>The Table-to-Categorized Structure Recipe Builder is the future owner of hierarchy. This launcher keeps the universal XML idea separate until the graph-first engine is approved.</p><div class="universal-categorizer-tree">${profile.levelDefinitions.map((level) => levelRow(level, profile, 0)).join('')}</div></section>`;
}

function levelRow(level, profile, depth) {
  const children = (level.children || []).map((id) => profile.levelDefinitions.find((item) => item.levelId === id)).filter(Boolean);
  return `<div class="universal-categorizer-level" data-depth="${depth}"><b>${esc(level.displayName)}</b><small>${blocksFor(profile, level.levelId).join(', ') || 'No blocks yet'}</small>${children.map((child) => levelRow(child, profile, depth + 1)).join('')}</div>`;
}

function blocksFor(profile, levelId) {
  return profile.blockDefinitions.filter((block) => block.attachToLevelId === levelId).map((block) => block.blockName);
}

function sideloadHtml(profile) {
  const rows = profile.sideloadAttachments.map((rule) => `<tr><td>${esc(rule.sourceId)}</td><td>${esc(rule.attachToLevelId)}</td><td>${esc(rule.blockName)}</td><td>${esc(rule.mode)}</td></tr>`).join('');
  return `<section class="universal-categorizer-card"><h4>Universal sideload attachment rules</h4><p>Each sideload source is treated as a source-to-graph attachment rule, not a hardcoded Line-wise textarea.</p><table><thead><tr><th>Source</th><th>Attach level</th><th>Create / enrich block</th><th>Mode</th></tr></thead><tbody>${rows}</tbody></table></section>`;
}

function boundaryHtml() {
  return `<section class="universal-categorizer-card is-boundary"><h4>Shadow-mode boundary</h4><ul><li>No existing converter, sideload, enrichment, graph, XML export, pivot, or canvas module is changed.</li><li>This dedicated launcher only proves the future contract and UI placement.</li><li>Next approval point: connect this shell to a graph-first recipe engine.</li></ul></section>`;
}

function styleHtml() {
  return `<style data-universal-categorizer-style>.universal-xml-categorizer-backdrop{position:fixed;inset:0;z-index:74;background:rgba(2,6,23,.72);display:grid;place-items:center}.universal-xml-categorizer-dialog{width:min(1120px,calc(100vw - 28px));height:min(780px,calc(100vh - 28px));display:grid;grid-template-rows:auto auto 1fr;border:1px solid #a78bfa;border-radius:18px;background:#0f172a;color:#dbeafe;overflow:hidden}.universal-xml-categorizer-dialog header{display:flex;justify-content:space-between;gap:12px;padding:14px;border-bottom:1px solid rgba(148,163,184,.18)}.universal-xml-categorizer-dialog h3,.universal-xml-categorizer-dialog h4{margin:0;color:#e0f2fe}.universal-xml-categorizer-dialog p,.universal-xml-categorizer-dialog li,.universal-xml-categorizer-dialog small{color:#94a3b8}.universal-xml-categorizer-dialog button{border:1px solid rgba(167,139,250,.48);border-radius:10px;background:#1e1b4b;color:#ede9fe;padding:8px 12px;font-weight:900}.universal-categorizer-kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;padding:10px 14px}.universal-categorizer-kpis div,.universal-categorizer-card{border:1px solid rgba(167,139,250,.24);border-radius:14px;background:rgba(30,27,75,.28);padding:12px}.universal-categorizer-kpis b,.universal-categorizer-kpis small{display:block}.universal-xml-categorizer-dialog main{display:grid;grid-template-columns:minmax(0,1fr) minmax(320px,.8fr);gap:12px;padding:14px;overflow:auto}.universal-categorizer-card.is-boundary{grid-column:1/-1}.universal-categorizer-tree{display:grid;gap:8px}.universal-categorizer-level{border-left:3px solid #a78bfa;padding:7px 8px;margin-left:calc(var(--depth,0)*12px);background:rgba(2,6,23,.24)}.universal-categorizer-level[data-depth="1"]{margin-left:18px}.universal-categorizer-level[data-depth="2"]{margin-left:36px}.universal-categorizer-level[data-depth="3"]{margin-left:54px}.universal-categorizer-level b,.universal-categorizer-level small{display:block}.universal-xml-categorizer-dialog table{width:100%;border-collapse:collapse}.universal-xml-categorizer-dialog th,.universal-xml-categorizer-dialog td{border-bottom:1px solid rgba(148,163,184,.15);padding:8px;text-align:left}@media(max-width:900px){.universal-xml-categorizer-dialog main,.universal-categorizer-kpis{grid-template-columns:1fr}}</style>`;
}

export const _test = Object.freeze({ summaryHtml, recipeMapHtml, sideloadHtml, boundaryHtml });
