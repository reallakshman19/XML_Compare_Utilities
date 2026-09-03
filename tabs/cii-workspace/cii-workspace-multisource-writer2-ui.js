import { mountCiiWorkspaceScopedEngineeringShell } from './cii-workspace-transfer-scope-ui.js';
import { inspectCiiWorkspaceSourceSetWithVersionBridge } from './cii-workspace-source-set.js';

function h(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

function selectedFiles(input) {
  return [...(input?.files || [])];
}

function sourceRows(files) {
  return files.map((file, index) => ({ sourceId: `S${index + 1}`, fileName: file.name, file }));
}

async function sourceInputs(files) {
  const rows = [];
  for (const row of sourceRows(files)) {
    rows.push({
      sourceId: row.sourceId,
      fileName: row.fileName,
      bytes: new Uint8Array(await row.file.arrayBuffer()),
    });
  }
  return rows;
}

function shortSha(value) {
  const text = String(value || '');
  return text.length > 20 ? `${text.slice(0, 12)}…${text.slice(-8)}` : text || '—';
}

export function ciiSourceSetCustodyMarkup(inspection) {
  const sourceSet = inspection?.sourceSet;
  const rows = sourceSet?.members || [];
  if (!sourceSet || !rows.length) return '<div class="ciiw-method-empty"><b>Source-set custody unavailable.</b></div>';
  return `<section class="ciiw-base-set" data-ciiw-source-set-custody="1"><header><div><b>Writer 2 multi-source custody</b><span>${h(rows.length)} independent SOURCE members · read-only intake</span></div><span class="ciiw-corroboration">WP-001</span></header><p><b>Source-set SHA-256:</b> <code>${h(sourceSet.sourceSetSha256)}</code></p><table class="ciiw-mini-grid"><thead><tr><th>ID</th><th>File</th><th>Version</th><th>Original SHA</th><th>Normalized SHA</th></tr></thead><tbody>${rows.map((row) => `<tr><td><b>${h(row.sourceId)}</b></td><td>${h(row.fileName)}</td><td>${h(row.originalVersion)} → ${h(row.normalizedVersion)}</td><td><code>${h(shortSha(row.originalSha256))}</code></td><td><code>${h(shortSha(row.normalizedSha256))}</code></td></tr>`).join('')}</tbody></table><p><b>TARGET original SHA:</b> <code>${h(inspection.versionBridge?.target?.originalSha256 || '—')}</code></p><p><b>Fail-closed boundary:</b> source custody is ready; multi-source Base Anchor/correspondence, transfer scope and Writer2 mutation remain blocked until WP-002+.</p></section>`;
}

function setManualDisabled(container, disabled) {
  const source = container.querySelector('[data-ciiw-source-anchors]');
  const target = container.querySelector('[data-ciiw-target-anchors]');
  if (source) source.disabled = disabled;
  if (target) target.disabled = disabled;
}

function setMultiSourceStatus(container, fileCount) {
  const status = container.querySelector('[data-ciiw-status]');
  if (!status) return;
  status.textContent = fileCount > 1
    ? `${fileCount} SOURCE CII files selected. Inspect source-set custody; multi-source correspondence is intentionally blocked until WP-002.`
    : 'Writer 2 supports one SOURCE normally; select multiple SOURCE files for WP-001 source-set custody inspection.';
}

function updateGate(container, sourceInput) {
  const count = selectedFiles(sourceInput).length;
  const multiSource = count > 1;
  const analyze = container.querySelector('[data-ciiw-analyze]');
  if (analyze) analyze.disabled = multiSource;
  setManualDisabled(container, multiSource);
  if (multiSource) setMultiSourceStatus(container, count);
}

export function mountCiiWriter2MultiSourceShell(container, options = {}) {
  const legacy = mountCiiWorkspaceScopedEngineeringShell(container, options);
  const sourceInput = container.querySelector('[data-ciiw-source]');
  const targetInput = container.querySelector('[data-ciiw-target]');
  const inspectButton = container.querySelector('[data-ciiw-inspect]');
  const analyzeButton = container.querySelector('[data-ciiw-analyze]');
  if (!sourceInput || !targetInput || !inspectButton || !analyzeButton) return legacy;

  sourceInput.multiple = true;
  let disposed = false;

  const onSourceChange = () => updateGate(container, sourceInput);
  const blockMultiSourceAnalyze = (event) => {
    if (selectedFiles(sourceInput).length <= 1) return;
    event.preventDefault(); event.stopImmediatePropagation();
    setMultiSourceStatus(container, selectedFiles(sourceInput).length);
  };
  const inspectMultiSource = async (event) => {
    const files = selectedFiles(sourceInput);
    if (files.length <= 1) return;
    event.preventDefault(); event.stopImmediatePropagation();
    const targetFile = selectedFiles(targetInput)[0];
    const status = container.querySelector('[data-ciiw-status]');
    const evidence = container.querySelector('[data-ciiw-method-evidence]') || container.querySelector('[data-ciiw-landmarks]');
    try {
      if (!targetFile) throw new Error('TARGET CII file is required.');
      if (status) status.textContent = `Inspecting ${files.length} independent SOURCE members through the frozen V11↔V14 bridge…`;
      const inspection = await inspectCiiWorkspaceSourceSetWithVersionBridge({
        sources: await sourceInputs(files),
        targetBytes: new Uint8Array(await targetFile.arrayBuffer()),
        targetFileName: targetFile.name,
      }, { cryptoRef: options.cryptoRef });
      if (disposed) return;
      if (evidence) evidence.innerHTML = ciiSourceSetCustodyMarkup(inspection);
      if (status) status.textContent = `Source-set custody READY: ${inspection.sourceSet.memberCount} members · ${inspection.sourceSet.sourceSetSha256}. Correspondence remains blocked until WP-002.`;
    } catch (error) {
      if (disposed) return;
      if (evidence) evidence.innerHTML = `<div class="ciiw-method-empty"><b>Source-set intake blocked</b><p>${h(error?.message || error)}</p></div>`;
      if (status) status.textContent = error?.message || String(error);
    }
  };

  sourceInput.addEventListener('change', onSourceChange);
  inspectButton.addEventListener('click', inspectMultiSource, true);
  analyzeButton.addEventListener('click', blockMultiSourceAnalyze, true);
  updateGate(container, sourceInput);

  return {
    ...legacy,
    destroy() {
      disposed = true;
      sourceInput.removeEventListener('change', onSourceChange);
      inspectButton.removeEventListener('click', inspectMultiSource, true);
      analyzeButton.removeEventListener('click', blockMultiSourceAnalyze, true);
      legacy.destroy();
    },
  };
}

export const _test = Object.freeze({ selectedFiles, sourceRows, shortSha, updateGate });
