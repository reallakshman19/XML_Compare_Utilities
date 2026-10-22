/* Explicitly user-triggered, synthetic standalone VNext demo. No production data. */
export const DEMO_CSV = 'Find,Replace\r\nOLD-A,NEW-A\r\nOLD-B,NEW-B\r\n';

const fixedRow = (values) => values.map((value, index) => String(value).padStart(index ? 13 : 15, ' ')).join('');

export function makeDemoCii() {
  const title = 'LINE-DEMO';
  const lineLabel = ' '.repeat(7) + String(title.length).padStart(5, ' ') + ' ' + title.padEnd(67, ' ');
  const element = Array.from({ length: 15 }, (_, index) => {
    if (index === 0) return fixedRow(['100.0', '110.0', 120, 0, 0, 0]);
    if (index === 10) return lineLabel;
    if (index === 13) return fixedRow([0, 0, 0, 0, 0, 1]);
    return fixedRow([0, 0, 0, 0, 0, 0]);
  });
  return [
    '#$ VERSION', fixedRow([5, 14, 1252]),
    '#$ CONTROL', fixedRow([2, 0, 0, 1, 0, 0]),
    '#$ ELEMENTS', ...element,
    '#$ NODENAME', '  ' + 'OLD-A'.padEnd(26, ' ') + 'OLD-B'.padEnd(25, ' ')
  ].join('\r\n') + '\r\n';
}

function setInputFile(input, file) {
  const transfer = new DataTransfer();
  if (file) transfer.items.add(file);
  input.files = transfer.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function waitForText(element, predicate, description) {
  return new Promise((resolve, reject) => {
    let observer;
    const timer = setTimeout(() => {
      observer.disconnect();
      reject(new Error('Timed out waiting for ' + description));
    }, 8000);
    const check = () => {
      if (!predicate(element.textContent)) return;
      clearTimeout(timer);
      observer.disconnect();
      resolve();
    };
    observer = new MutationObserver(check);
    observer.observe(element, { childList: true, subtree: true, characterData: true });
    check();
  });
}

export function installDemoLoader(root = document.querySelector('[data-vnext-app]')) {
  const button = root?.querySelector('[data-load-demo]');
  if (!button) return;
  const status = root.querySelector('[data-demo-status]');
  button.addEventListener('click', async () => {
    if (button.disabled) return;
    button.disabled = true;
    status.textContent = 'Loading synthetic CII and CSV...';
    try {
      root.querySelector('[data-tab="NORMAL"]').click();
      setInputFile(root.querySelector('[data-file="source"]'), null);
      const targetInput = root.querySelector('[data-file="target"]');
      const targetMeta = root.querySelector('[data-meta="target"]');
      const targetName = 'CIIFR-DEMO-V14.CII';
      const loaded = waitForText(targetMeta,
        (text) => text.startsWith(targetName + ' |') && text.includes('SHA-256 '), 'demo TARGET0');
      setInputFile(targetInput, new File([makeDemoCii()], targetName, { type: 'application/octet-stream' }));
      await loaded;
      const imported = waitForText(root.querySelector('[data-status]'),
        (text) => text === 'Imported 2 CSV rows.', 'demo CSV import');
      setInputFile(root.querySelector('[data-file="csv"]'),
        new File([DEMO_CSV], 'CIIFR-DEMO-RULES.csv', { type: 'text/csv' }));
      await imported;
      status.textContent = 'Synthetic v14 CII and two CSV rules loaded. Click Generate proposals.';
    } catch (error) {
      status.textContent = 'Demo load failed: ' + (error?.message || String(error));
    } finally {
      button.disabled = false;
    }
  });
}

installDemoLoader();
