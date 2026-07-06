import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PSNM_UTILITY_LAYOUT_STABILIZER_SCHEMA, utilityLayoutCss } from '../tabs/psnm-utility-tab-layout-stabilizer.js';

assert.equal(PSNM_UTILITY_LAYOUT_STABILIZER_SCHEMA, 'psnm-utility-layout-stabilizer/v1');

const css = utilityLayoutCss();
assert.ok(css.includes('.psnm-utility-launcher-deck'));
assert.ok(css.includes('grid-template-columns:repeat(auto-fit,minmax(220px,1fr))'));
assert.ok(css.includes('[data-psmap-modal] .psmap-body'));
assert.ok(css.includes('.psnm-root .psmap-table-wrap'));
assert.ok(css.includes('@media(max-width:900px)'));

const stabilizerSource = readFileSync('tabs/psnm-utility-tab-layout-stabilizer.js', 'utf8');
assert.match(stabilizerSource, /data-psfa-open/);
assert.match(stabilizerSource, /data-psmap-action=\\"open\\"/);
assert.match(stabilizerSource, /data-psnm-utility-launcher-deck/);
assert.match(stabilizerSource, /MutationObserver/);

const utilityTabSource = readFileSync('tabs/psnm-utility-tab.js', 'utf8');
assert.match(utilityTabSource, /installPsnmUtilityLayoutStabilizer/);
assert.match(utilityTabSource, /psnm-utility-tab-layout-stabilizer\.js/);
assert.match(utilityTabSource, /destroyLayout/);

console.log('psnm-utility-layout-stabilizer tests passed');
