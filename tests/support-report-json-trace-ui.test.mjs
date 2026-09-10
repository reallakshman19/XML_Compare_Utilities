import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { renderSupportReportJsonTrace } from '../tabs/support-steel-relationship-builder/support-report-view.js?v=20260910-support-report-json-trace-18';

test('Support Report panel exposes staged JSON import without creating a second model authority', () => {
  const addon = readFileSync('tabs/support-steel-relationship-builder/support-report-addon.js', 'utf8');
  assert.match(addon, /data-ssr-model-file/);
  assert.match(addon, /Staged JSON trace source/);
  assert.match(addon, /same combined staged-model source as the Input tab/i);
  assert.match(addon, /popup\.querySelector\('\[data-ssrb-input="model"\]'\)/);
  assert.doesNotMatch(addon, /data-ssr-model[^-]/);
  assert.match(addon, /Coordinate\/base-anchor identity matching is reserved/);
});

test('JSON trace view renders member identity, match basis, position basis and curated staged fields', () => {
  const report = { rows: [{
    civilSecondarySupport: 'PS-068(REF)', pipe: 'ASIM-LINE',
    evidence: { jsonTrace: { members: [{
      observedMemberId: '/SL-147.1', resolvedMemberId: '/PS-068.5', matchBasis: 'PREVIOUS_NAME_ALIAS',
      positionBasis: 'NATIVE_MEMBER_POSITION', positionGlobal: { x: 1, y: -2, z: 3 },
      attributeEvidence: { supportType: 'GUIDE', primarySupportReference: '=1/2', description: 'Pipe Guide', insulationThickness: '25mm' },
    }] } },
  }] };
  const html = renderSupportReportJsonTrace(report);
  assert.match(html, /Staged JSON trace/);
  assert.match(html, /\/SL-147\.1/);
  assert.match(html, /\/PS-068\.5/);
  assert.match(html, /PREVIOUS_NAME_ALIAS/);
  assert.match(html, /NATIVE_MEMBER_POSITION/);
  assert.match(html, /GUIDE/);
  assert.match(html, /=1\/2/);
  assert.match(html, /Pipe Guide/);
  assert.match(html, /25mm/);
});
