/*
 * CII Find & Replace v14 panel markup.
 *
 * Direct file overwrite authority is intentionally absent. A qualified
 * TARGET1 must pass an explicit Apply-to-new-copy gate before download.
 */

export function createFindReplaceAction() {
  return Object.freeze({
    id: 'cii-find-replace',
    label: 'Find & Replace',
    icon: '↔',
    version: 'v14',
    action: 'open',
  });
}

export function renderFindReplacePanel() {
  return `
    <section class="ciifr-workspace" data-ciifr-workspace>
      <header class="ciifr-header">
        <div>
          <h2><span aria-hidden="true">↔</span> CII Find &amp; Replace <small>V14</small></h2>
          <p>CSV or manual-table replacement with mandatory preview, approval and TARGET0 validation.</p>
        </div>
        <button type="button" data-ciifr-close>Close</button>
      </header>

      <main class="ciifr-main">
        <section class="ciifr-intake-grid">
          <article class="ciifr-card">
            <h3>1. Target CII v14</h3>
            <label>Target file
              <input type="file" accept=".cii,text/plain" data-ciifr-target>
            </label>
            <p data-ciifr-target-meta>No target loaded.</p>
          </article>

          <article class="ciifr-card">
            <h3>2. Scope and CSV</h3>
            <fieldset class="ciifr-scope">
              <legend>Replacement scope</legend>
              <label><input type="radio" name="ciifr-scope" value="DOCUMENT" checked data-ciifr-scope> Entire document</label>
              <label><input type="radio" name="ciifr-scope" value="ELEMENT" data-ciifr-scope> Element basis</label>
              <label><input type="radio" name="ciifr-scope" value="BLOCK" data-ciifr-scope> Block basis</label>
            </fieldset>
            <label>CSV file
              <input type="file" accept=".csv,text/csv" data-ciifr-csv>
            </label>
            <p data-ciifr-csv-meta>No CSV loaded. Manual rows may be entered below.</p>
          </article>
        </section>

        <section class="ciifr-card ciifr-manual">
          <div class="ciifr-section-head">
            <div><h3>3. Manual table entry</h3><p>Uses the same operation contract as CSV rows.</p></div>
            <button type="button" data-ciifr-add-row>Add row</button>
          </div>
          <div class="ciifr-entry-grid">
            <label data-ciifr-range-field>From
              <input type="number" min="0" step="1" data-ciifr-from>
            </label>
            <label data-ciifr-range-field>To
              <input type="number" min="0" step="1" data-ciifr-to>
            </label>
            <label data-ciifr-block-field>Block
              <select data-ciifr-block>
                <option value="NODENAME">NODE NAME</option>
                <option value="DISPLACEMENT">DISPLACEMENT</option>
                <option value="FORCE" disabled>FORCE — qualification pending</option>
              </select>
            </label>
            <label>Find Text
              <input type="text" data-ciifr-find>
            </label>
            <label>Replace Text
              <input type="text" data-ciifr-replace>
            </label>
            <label>Expected matches <small>(optional)</small>
              <input type="number" min="0" step="1" data-ciifr-expected>
            </label>
          </div>
        </section>

        <section class="ciifr-card">
          <div class="ciifr-section-head">
            <div><h3>4. Preview and approval</h3><p>CSV rows are always shown here before validation.</p></div>
            <div class="ciifr-actions">
              <button type="button" data-ciifr-approve-all disabled>Approve all reviewable</button>
              <button type="button" data-ciifr-reset disabled>Reset decisions</button>
            </div>
          </div>
          <div class="ciifr-table-wrap">
            <table class="ciifr-table">
              <thead>
                <tr><th>#</th><th>Source</th><th>Scope</th><th>Owner</th><th>Find</th><th>Replace</th><th>Status</th><th>Decision</th></tr>
              </thead>
              <tbody data-ciifr-preview-body>
                <tr><td colspan="8">Load CSV or add a manual row.</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="ciifr-card">
          <div class="ciifr-section-head">
            <div>
              <h3>5. Validate, Apply to New Copy, and Download</h3>
              <p>Validate TARGET1 first, then explicitly Apply it to a new output copy. TARGET0 is never overwritten.</p>
            </div>
            <div class="ciifr-actions">
              <button type="button" data-ciifr-validate disabled>Validate &amp; Preview</button>
              <button type="button" data-ciifr-apply disabled title="Releases only the validated TARGET1 as a new copy">Apply to New Copy</button>
              <button type="button" data-ciifr-download disabled>Download Modified CII</button>
              <button type="button" data-ciifr-export-audit disabled>Export Audit JSON</button>
            </div>
          </div>
          <div class="ciifr-status" aria-live="polite" data-ciifr-status>Load a CII v14 target and replacement rows.</div>
          <dl class="ciifr-kpis">
            <div><dt>Source hash</dt><dd data-ciifr-source-hash>—</dd></div>
            <div><dt>Claims</dt><dd data-ciifr-claims>0</dd></div>
            <div><dt>Target hash</dt><dd data-ciifr-target-hash>—</dd></div>
            <div><dt>Qualification</dt><dd data-ciifr-qualification>Pending</dd></div>
          </dl>
          <details>
            <summary>Qualified TARGET1 preview</summary>
            <pre class="ciifr-postimage" data-ciifr-postimage-preview>No qualified postimage yet.</pre>
          </details>
        </section>
      </main>
    </section>
  `;
}
