/** DOM wiring for the explicit large-model threshold and Draft scope controls. */

import { readLargeModelThreshold, writeLargeModelThreshold } from './topology-edit-scope-model.js';

export function wireTopologyLargeModelControls(root, controller, listen, onError) {
  const input = root.querySelector('[data-ttv-large-model-threshold]');
  if (input) input.value = String(readLargeModelThreshold(root.ownerDocument.defaultView?.localStorage));
  listen(root.querySelector('[data-ttv-edit-change-scope]'), 'click', async () => {
    try { await controller.changeEditScope(root); } catch (error) { onError(error); }
  });
  listen(input, 'change', (event) => {
    const threshold = writeLargeModelThreshold(root.ownerDocument.defaultView?.localStorage, event.target.value);
    event.target.value = String(threshold);
    const status = root.querySelector('[data-ttv-edit-status]');
    if (status) {
      status.textContent = `Large-model threshold set to ${threshold}; reopen or change Draft scope to apply it.`;
      status.setAttribute('data-status', 'ready');
    }
  });
}

