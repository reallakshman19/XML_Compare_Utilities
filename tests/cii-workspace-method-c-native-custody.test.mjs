import test from 'node:test';
import assert from 'node:assert/strict';
import {captureWriter2MethodCOriginals} from '../docs/tabs/cii-workspace/cii-workspace-method-c-writer2-native-shell.js';
const file = (name, text) => ({name, async arrayBuffer(){return new TextEncoder().encode(text).buffer;}});
test('requires exact three SOURCE files and one TARGET, never authorizes partial intake',async()=>{
  await assert.rejects(captureWriter2MethodCOriginals([],[]),/THREE_ORIGINAL_SOURCES_AND_ONE_TARGET/);
  await assert.rejects(captureWriter2MethodCOriginals([file('S1.CII','a')],[file('T.CII','t')]),/THREE_ORIGINAL_SOURCES_AND_ONE_TARGET/);
});
test('rejects wrong extension rather than treating CSV/JSON as original geometry',async()=>{
  await assert.rejects(captureWriter2MethodCOriginals([
    file('S1.csv','a'),file('S2.CII','b'),file('S3.CII','c')],[file('T.CII','t')]),/ORIGINAL_CII_REQUIRED/);
});
test('rejects unauthorized original SHA and duplicate/unknown source identities',async()=>{
  await assert.rejects(captureWriter2MethodCOriginals([
    file('S1.CII','a'),file('S2.CII','b'),file('S3.CII','c')],[file('T.CII','t')]),/UNKNOWN_OR_DUPLICATE_SOURCE_SHA/);
});
