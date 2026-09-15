import assert from 'node:assert/strict';
import test from 'node:test';

import { _test as orphanUiTest } from '../tabs/support-steel-relationship-builder/support-primary-orphan-ui-addon.js';
import { SUPPORT_PRIMARY_ORPHAN_RECOVERY_DEFAULTS } from '../tabs/support-steel-relationship-builder/support-primary-orphan-recovery.js';

test('Support Report orphan recovery UI exposes governed defaults and fixed unique-target policy', () => {
  const html = orphanUiTest.renderOrphanRecoveryConfigCard();
  assert.match(html, /Conservative orphan recovery/);
  assert.match(html, /data-ssr-orphan-setting="enabled" checked/);
  assert.match(html, /data-ssr-orphan-setting="axialMultiplier"/);
  assert.match(html, /value="1"/);
  assert.match(html, /data-ssr-orphan-setting="lateralMultiplier"/);
  assert.match(html, /value="2"/);
  assert.match(html, /data-ssr-orphan-setting="requireSameFamily" checked/);
  assert.match(html, /data-ssr-orphan-setting="requireSamePipe" checked/);
  assert.match(html, /data-ssr-orphan-setting="requireSameBore" checked/);
  assert.match(html, /Require unique target:<\/b> Always on/);
  assert.match(html, /Different branch\/traversal nodes may be overridden only when Same Family, Same PIPE and Same Bore are all enabled and pass/);
  assert.equal(SUPPORT_PRIMARY_ORPHAN_RECOVERY_DEFAULTS.requireUniqueTarget, true);
});
