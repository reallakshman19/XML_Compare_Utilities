import assert from 'node:assert/strict';
import { buildStableXmlIdentity } from '../xml-compare/input/build-stable-xml-identity.js';

const item = buildStableXmlIdentity({ uid: 'a', componentGuid: 'G-1' }, { sourceId: 'A' });
assert.equal(item.identityBasis, 'guid');
assert.equal(item.identityConfidence, 1);
console.log('XML stable identity tests passed');
