// Lightweight DOM environment for testing ui/app.js in native Node.js

export class MockElement {
  constructor(tagName = 'div', attrs = {}) {
    this.tagName = tagName.toUpperCase();
    this.attributes = new Map();
    const self = this;
    this.dataset = new Proxy({}, {
      set(target, prop, value) {
        target[prop] = String(value);
        const attr = 'data-' + String(prop).replace(/([A-Z])/g, '-$1').toLowerCase();
        self.attributes.set(attr, String(value));
        return true;
      },
      get(target, prop) {
        return target[prop];
      }
    });
    this.classList = {
      _classes: new Set(),
      add: (c) => this.classList._classes.add(c),
      remove: (c) => this.classList._classes.delete(c),
      toggle: (c, force) => {
        if (force === undefined) {
          if (this.classList._classes.has(c)) this.classList._classes.delete(c);
          else this.classList._classes.add(c);
        } else if (force) this.classList._classes.add(c);
        else this.classList._classes.delete(c);
      },
      contains: (c) => this.classList._classes.has(c)
    };
    this.children = [];
    this.listeners = new Map();
    this.hidden = false;
    this.disabled = false;
    this._textContent = '';
    this._value = '';
    this.files = [];
    this.parentElement = null;

    for (const [k, v] of Object.entries(attrs)) {
      this.setAttribute(k, v);
    }
  }

  get textContent() { return this._textContent; }
  set textContent(v) { this._textContent = String(v); }

  get innerText() { return this._textContent; }
  set innerText(v) { this._textContent = String(v); }

  get value() { return this._value; }
  set value(v) { this._value = String(v); }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
    if (name.startsWith('data-')) {
      const camel = name.slice(5).replace(/-([a-z])/g, (_, l) => l.toUpperCase());
      this.dataset[camel] = String(value);
    }
  }

  getAttribute(name) { return this.attributes.get(name) || null; }
  removeAttribute(name) {
    this.attributes.delete(name);
    if (name.startsWith('data-')) {
      const camel = name.slice(5).replace(/-([a-z])/g, (_, l) => l.toUpperCase());
      delete this.dataset[camel];
    }
  }

  append(...nodes) {
    for (const n of nodes) {
      if (typeof n === 'string') {
        const textNode = new MockElement('span');
        textNode.textContent = n;
        textNode.parentElement = this;
        this.children.push(textNode);
      } else {
        n.parentElement = this;
        this.children.push(n);
      }
    }
  }

  replaceChildren(...nodes) {
    this.children = [];
    this.append(...nodes);
  }

  addEventListener(type, handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(handler);
  }

  async dispatchEvent(event) {
    event.target = event.target || this;
    let curr = this;
    while (curr) {
      const list = curr.listeners.get(event.type) || [];
      for (const h of list) {
        await h(event);
        if (event._propagationStopped) return;
      }
      curr = curr.parentElement;
    }
  }

  closest(selector) {
    let curr = this;
    while (curr) {
      if (curr.matches(selector)) return curr;
      curr = curr.parentElement;
    }
    return null;
  }

  matches(selector) {
    if (selector.startsWith('[')) {
      const m = /^\[([^=]+)(?:="?([^"]*)"?)?\]$/.exec(selector);
      if (m) {
        const attr = m[1], val = m[2];
        if (val === undefined) return this.attributes.has(attr);
        return this.getAttribute(attr) === val;
      }
    }
    if (selector.toLowerCase() === this.tagName.toLowerCase()) return true;
    return false;
  }

  querySelector(selector) {
    const all = this.querySelectorAll(selector);
    return all[0] || null;
  }

  querySelectorAll(selector) {
    const results = [];
    const walk = (el) => {
      for (const child of el.children) {
        if (child.matches(selector)) results.push(child);
        walk(child);
      }
    };
    walk(this);
    return results;
  }

  focus() {}
  click() {
    return this.dispatchEvent({ type: 'click', target: this, preventDefault() {}, stopPropagation() {} });
  }
}

export function createTestDom() {
  const root = new MockElement('body', { 'data-vnext-app': '' });

  // Tabs
  const nav = new MockElement('nav');
  const tabNormal = new MockElement('button', { 'data-tab': 'NORMAL', 'role': 'tab' });
  const tabLineNode = new MockElement('button', { 'data-tab': 'LINE_NODE', 'role': 'tab' });
  const tabGeom = new MockElement('button', { 'data-tab': 'GEOMETRY', 'role': 'tab' });
  const tabConfig = new MockElement('button', { 'data-tab': 'CONFIG', 'role': 'tab' });
  nav.append(tabNormal, tabLineNode, tabGeom, tabConfig);

  // Workspace
  const ws = new MockElement('div', { 'data-workspace': '' });
  const targetFile = new MockElement('input', { 'data-file': 'target', 'type': 'file' });
  const sourceFile = new MockElement('input', { 'data-file': 'source', 'type': 'file' });
  const csvFile = new MockElement('input', { 'data-file': 'csv', 'type': 'file' });
  const targetMeta = new MockElement('p', { 'data-meta': 'target' });
  const sourceMeta = new MockElement('p', { 'data-meta': 'source' });
  const panelTitle = new MockElement('h2', { 'data-panel-title': '' });
  const unavailable = new MockElement('div', { 'data-unavailable': '' });
  const rowsArea = new MockElement('div', { 'data-rows-area': '' });
  const btnRun = new MockElement('button', { 'data-run': '' });
  const btnResolve = new MockElement('button', { 'data-resolve': '' });
  const btnApproveNonconflict = new MockElement('button', { 'data-approve-nonconflict': '' });
  const btnUseResolved = new MockElement('button', { 'data-use-resolved': '' });
  const btnExportResolved = new MockElement('button', { 'data-export-resolved': '' });
  const btnExportCleanupReport = new MockElement('button', { 'data-export-cleanup-report': '' });
  const cleanupReport = new MockElement('details', { 'data-cleanup-report': '' });
  const cleanupCount = new MockElement('span', { 'data-cleanup-count': '' });
  const cleanupLog = new MockElement('pre', { 'data-cleanup-log': '' });
  const cleanupInputs = ['trim','collapseSpace','suffixOne','refSuffix','truncateTo','customPattern','customReplace']
    .map(key=>new MockElement('input', { 'data-cleanup': key }));
  for (const input of cleanupInputs) {
    input.checked = ['trim','suffixOne','refSuffix'].includes(input.dataset.cleanup);
    input.value = input.dataset.cleanup === 'truncateTo' ? '0' : '';
  }
  const btnApproveAll = new MockElement('button', { 'data-approve-all': '' });
  const btnValidate = new MockElement('button', { 'data-validate': '' });
  const btnApply = new MockElement('button', { 'data-apply': '' });
  const btnExport = new MockElement('button', { 'data-export': '' });
  const btnAudit = new MockElement('button', { 'data-audit': '' });
  const status = new MockElement('p', { 'data-status': '' });
  const hash1 = new MockElement('output', { 'data-hash1': '' });
  const claimCount = new MockElement('span', { 'data-claim-count': '' });
  const tbodyRules = new MockElement('tbody', { 'data-rules': '' });
  const tbodyProposals = new MockElement('tbody', { 'data-proposals': '' });
  const ulDiagnostics = new MockElement('ul', { 'data-diagnostics': '' });

  ws.append(targetFile, sourceFile, csvFile, targetMeta, sourceMeta, panelTitle, unavailable, rowsArea,
    btnRun, btnResolve, btnApproveAll, btnApproveNonconflict, btnUseResolved,
    btnExportResolved, btnExportCleanupReport, cleanupReport, cleanupCount, cleanupLog,
    ...cleanupInputs, btnValidate, btnApply, btnExport, btnAudit, status, hash1,
    claimCount, tbodyRules, tbodyProposals, ulDiagnostics);

  // Config area
  const configArea = new MockElement('section', { 'data-config-area': '' });
  const selConflict = new MockElement('select', { 'data-config': 'conflictPolicy' });
  const selUnapproved = new MockElement('select', { 'data-config': 'unapprovedPolicy' });
  const selApprovalMode = new MockElement('select', { 'data-config': 'approvalMode' });
  configArea.append(selConflict, selUnapproved, selApprovalMode);

  root.append(nav, ws, configArea);

  globalThis.document = {
    querySelector: (s) => (s === '[data-vnext-app]' ? root : root.querySelector(s)),
    querySelectorAll: (s) => root.querySelectorAll(s),
    createElement: (tag) => new MockElement(tag)
  };
  globalThis.URL = globalThis.URL || {};
  globalThis.URL.createObjectURL = () => 'blob:mock';
  globalThis.URL.revokeObjectURL = () => {};

  return { root, tabNormal, tabConfig, btnRun, btnResolve, btnApproveAll, btnApproveNonconflict, btnUseResolved, btnValidate, btnApply, btnExport, status, tbodyProposals, ulDiagnostics, selConflict, targetFile, sourceFile, csvFile, cleanupReport, cleanupLog };
}
