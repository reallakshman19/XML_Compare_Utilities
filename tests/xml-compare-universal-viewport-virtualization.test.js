import assert from 'node:assert/strict';
import {
  calculateUniversalVirtualWindow,
  moveUniversalVirtualIndex,
  universalRevealScrollTop,
  universalVirtualTotalHeight,
} from '../xml-compare/universal-categorizer/universal-viewport-virtual-window.js';

const first = calculateUniversalVirtualWindow({ count: 20_000, rowHeight: 34, viewportHeight: 420, scrollTop: 0, overscan: 8 });
const middle = calculateUniversalVirtualWindow({ count: 20_000, rowHeight: 34, viewportHeight: 420, scrollTop: 340_000, overscan: 8 });
const last = calculateUniversalVirtualWindow({ count: 20_000, rowHeight: 34, viewportHeight: 420, scrollTop: 680_000, overscan: 8 });
assert.equal(first.start, 0);
assert.ok(middle.start > 9_000 && middle.end < 11_000);
assert.equal(last.end, 20_000);
assert.ok([first, middle, last].every((window) => window.rendered <= 250));
assert.equal(universalVirtualTotalHeight(20_000, 34), 680_000);
assert.ok(universalRevealScrollTop({ index: 19_999, rowHeight: 34, viewportHeight: 420, scrollTop: 0 }) > 679_000);
assert.equal(moveUniversalVirtualIndex(10, 'ArrowDown', 20_000), 11);
assert.equal(moveUniversalVirtualIndex(10, 'Home', 20_000), 0);
assert.equal(moveUniversalVirtualIndex(10, 'End', 20_000), 19_999);
console.log('xml-builder viewport virtual-window tests passed');
