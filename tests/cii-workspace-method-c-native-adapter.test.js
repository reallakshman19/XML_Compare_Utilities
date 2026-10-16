import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';
import { intakeCiiWorkspaceDocument } from '../tabs/cii-workspace/cii-workspace-intake.js';
import { ciiPhysicalFileBytes } from '../tabs/cii-workspace/cii-workspace-physical-file.js';
import { graphFromNativeCiiDocument, prepareMethodCNativePair,
  intakeMethodCNativePair } from '../tabs/cii-workspace/cii-workspace-method-c-native-adapter.js';
import { registerMethodC } from '../tabs/cii-workspace/cii-workspace-method-c-registration.js';
import { findMethodCCandidates } from '../tabs/cii-workspace/cii-workspace-method-c-candidates.js';
const raw=async member=>readFile(new URL('../Benchmark/'+member+'.CII',import.meta.url));
const expectSha={
  S1:'9a9cb14db4c13f5aac41cc74a60e7e528722eb5003d09f07192762ab6bfb1a2b',
  T:'abfa3ffc9281fe75d4170b2d885d554cb1f120dadedae7c7ab609548b63cc060',
};
async function docs(){
  const [s,t]=await Promise.all([raw('S1'),raw('T')]);
  return Promise.all([
    intakeCiiWorkspaceDocument(s,'S1.CII',{side:'SOURCE',cryptoRef:webcrypto}),
    intakeCiiWorkspaceDocument(t,'T.CII',{side:'TARGET',cryptoRef:webcrypto}),
  ]);
}
test('native CII intake original file documents adapt to unchanged Method C signed geometry',async()=>{
 const [sourceDocument,targetDocument]=await docs();
 assert.equal(sourceDocument.byteAuthority,'ORIGINAL_BYTES');
 assert.equal(targetDocument.byteAuthority,'ORIGINAL_BYTES');
 assert.equal(sourceDocument.contentSha256,expectSha.S1);
 assert.equal(targetDocument.contentSha256,expectSha.T);
 const beforeS=Buffer.from(ciiPhysicalFileBytes(sourceDocument.physicalFile));
 const beforeT=Buffer.from(ciiPhysicalFileBytes(targetDocument.physicalFile));
 const ready=await prepareMethodCNativePair({sourceDocument,targetDocument,cryptoRef:webcrypto});
 assert.equal(ready.authority,'ORIGINAL_NATIVE_CII_BYTES_READ_ONLY');
 assert.equal(ready.source.nodes.length,57);
 assert.equal(ready.target.nodes.length,1619);
 assert.equal(ready.target.components[ready.target.nodeIndex.get('875').component].length,767);
 const pose=registerMethodC(ready.source,ready.target,[{source:'3910',target:'875'}]);
 const candidates=findMethodCCandidates(ready.source,ready.target,pose);
 assert.equal(candidates.nearSourceCount,41);
 assert.equal(ready.writerEligible,false);
 assert.equal(ready.physicalIdentityQualified,false);
 assert.deepEqual(Buffer.from(ciiPhysicalFileBytes(sourceDocument.physicalFile)),beforeS);
 assert.deepEqual(Buffer.from(ciiPhysicalFileBytes(targetDocument.physicalFile)),beforeT);
});
test('native original raw input round trip must not normalize, infer or invoke Writer2',async()=>{
 const pair=await intakeMethodCNativePair({sourceBytes:await raw('S1'),
   targetBytes:await raw('T'),sourceFileName:'S1.CII',targetFileName:'T.CII',cryptoRef:webcrypto});
 assert.equal(pair.source.sha256,expectSha.S1);
 assert.equal(pair.target.sha256,expectSha.T);
 assert.equal(pair.sourceDocument.physicalFile.byteAuthority,'ORIGINAL_BYTES');
 assert.equal(pair.targetDocument.physicalFile.byteAuthority,'ORIGINAL_BYTES');
 assert.equal(pair.sourceDocument.contentSha256,pair.source.sha256);
 assert.equal(pair.targetDocument.contentSha256,pair.target.sha256);
});
test('RED: native bridge must reject altered physical-byte evidence and wrong sides',async()=>{
 const [sourceDocument,targetDocument]=await docs();
 await assert.rejects(graphFromNativeCiiDocument(sourceDocument,{side:'TARGET',cryptoRef:webcrypto}),
   /METHOD_C_NATIVE_DOCUMENT_SIDE_MISMATCH/);
 const changed={...sourceDocument,contentSha256:'0'.repeat(64)};
 await assert.rejects(graphFromNativeCiiDocument(changed,{side:'SOURCE',cryptoRef:webcrypto}),
   /METHOD_C_NATIVE_DOCUMENT_SHA_MISMATCH/);
 const missing={...sourceDocument,physicalFile:null};
 await assert.rejects(graphFromNativeCiiDocument(missing,{side:'SOURCE',cryptoRef:webcrypto}),
   /METHOD_C_NATIVE_ORIGINAL_BYTES_REQUIRED/);
 const renamed={...sourceDocument,fileName:'S1.XML'};
 await assert.rejects(graphFromNativeCiiDocument(renamed,{side:'SOURCE',cryptoRef:webcrypto}),
   /METHOD_C_NATIVE_CII_FILENAME_REQUIRED/);
 await assert.rejects(prepareMethodCNativePair({
   sourceDocument,targetDocument:sourceDocument,cryptoRef:webcrypto
 }),/METHOD_C_NATIVE_SAME_DOCUMENT_REJECTED/);
});
test('RED: native bridge refuses reencoded-text custody and invalid summary count',async()=>{
 const [sourceDocument]=await docs();
 const asText={...sourceDocument,byteAuthority:'REENCODED_TEXT_COMPATIBILITY'};
 await assert.rejects(graphFromNativeCiiDocument(asText,{side:'SOURCE',cryptoRef:webcrypto}),
   /METHOD_C_NATIVE_ORIGINAL_BYTES_REQUIRED/);
 const wrongCount={...sourceDocument,summary:{...sourceDocument.summary,elementCount:999}};
 await assert.rejects(graphFromNativeCiiDocument(wrongCount,{side:'SOURCE',cryptoRef:webcrypto}),
   /METHOD_C_NATIVE_ELEMENT_COUNT_DISAGREEMENT/);
});
