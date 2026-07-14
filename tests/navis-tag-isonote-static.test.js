import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const utilityTab = readFileSync('tabs/navis-tag-isonote/navis-tag-isonote-tab.js', 'utf8');
const utilityView = readFileSync('tabs/navis-tag-isonote/navis-tag-isonote-ui-view.js', 'utf8');
const utilitiesRegistry = readFileSync('tabs/psnm-utility-tab.js', 'utf8');

assert.match(utilityTab, /Navis Tag to ISONOTE/);
assert.match(utilityTab, /JSON Hierarchy/);
assert.match(utilityTab, /Identity Node Trace/);
assert.match(utilityView, /Support ISONOTE/);
assert.match(utilityView, /data-nti-config="tableIdentityColumns"/);
assert.match(utilityView, /data-nti-config="jsonIdentityPaths"/);
assert.match(utilityView, /data-nti-config="jsonPositionPaths"/);
assert.match(utilitiesRegistry, /installNavisTagIsonoteUtilityTile/);
assert.match(utilitiesRegistry, /mountNavisTagIsonote/);

console.log('navis-tag-isonote static tests passed');
