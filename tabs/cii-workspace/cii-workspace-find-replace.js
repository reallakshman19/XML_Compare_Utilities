/*
 * CII Find & Replace UI Shell
 *
 * v14 priority:
 * - isolated UI entry/panel model
 * - no mutation of existing compare pipeline
 * - no direct CII/XML write
 * - proposal, preview and validation modules plug in separately
 */

export function createFindReplaceAction() {
  return Object.freeze({
    id: 'cii-find-replace',
    label: 'Find & Replace',
    icon: 'replace',
    version: 'v14',
    action: 'open',
  });
}

export function renderFindReplacePanel() {
  return `
    <section class="cii-find-replace-panel" data-ciiw-find-replace-panel>
      <header>
        <h2>Find & Replace</h2>
        <span>v14</span>
      </header>

      <fieldset class="mode-selector">
        <legend>Scope</legend>
        <label><input type="radio" name="cii-find-replace-scope" value="DOCUMENT" checked> Entire Document</label>
        <label><input type="radio" name="cii-find-replace-scope" value="ELEMENT"> Element Basis</label>
        <label><input type="radio" name="cii-find-replace-scope" value="BLOCK"> Block Basis</label>
      </fieldset>

      <div class="input-area">
        <button type="button" data-ciiw-find-replace-load>Load CSV</button>
        <button type="button" data-ciiw-find-replace-preview disabled>Preview</button>
        <button type="button" data-ciiw-find-replace-apply disabled>Apply</button>
      </div>

      <div class="validation-status" aria-live="polite" data-ciiw-find-replace-status>
        Source Hash: Pending<br>
        Matches: Pending<br>
        Validation: Pending
      </div>

      <div class="preview-area" data-ciiw-find-replace-preview-area>
        <table>
          <thead>
            <tr><th>#</th><th>Scope</th><th>Find</th><th>Replace</th><th>Status</th></tr>
          </thead>
          <tbody data-ciiw-find-replace-preview-body>
            <tr><td colspan="5">Load CSV or reviewed CII changes to build a preview.</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  `;
}
