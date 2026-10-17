// Read-only native CII Workspace adapter: original intake authority, not normalized Writer2.
import { intakeCiiWorkspaceDocument } from './cii-workspace-intake.js';
import { ciiPhysicalFileBytes } from './cii-workspace-physical-file.js';
import { buildOriginalGraphFromBytes, sha256RawBytes } from './cii-workspace-method-c-original-geometry.js';
import { mountMethodC } from './cii-workspace-method-c-ui.js';

function nativeMember(document, side) {
  if (!document || document.side !== side) throw new Error('METHOD_C_NATIVE_DOCUMENT_SIDE_MISMATCH');
  if (!document.physicalFile || document.byteAuthority !== 'ORIGINAL_BYTES')
    throw new Error('METHOD_C_NATIVE_ORIGINAL_BYTES_REQUIRED');
  const fileName = String(document.fileName || '');
  if (!/\.cii$/i.test(fileName)) throw new Error('METHOD_C_NATIVE_CII_FILENAME_REQUIRED');
  if (!/^[a-f0-9]{64}$/i.test(document.contentSha256 || ''))
    throw new Error('METHOD_C_NATIVE_DOCUMENT_HASH_REQUIRED');
  return fileName.replace(/\.cii$/i, '');
}
export async function graphFromNativeCiiDocument(document,{side,cryptoRef=globalThis.crypto}={}){
  const member = nativeMember(document,side);
  const bytes = ciiPhysicalFileBytes(document.physicalFile);
  if (!(bytes instanceof Uint8Array) || !bytes.length) throw new Error('METHOD_C_NATIVE_NO_PHYSICAL_BYTES');
  const verifiedSha=await sha256RawBytes(bytes,cryptoRef);
  if (verifiedSha!==document.contentSha256.toLowerCase())
    throw new Error('METHOD_C_NATIVE_DOCUMENT_SHA_MISMATCH');
  if (document.byteLength!==bytes.length)
    throw new Error('METHOD_C_NATIVE_BYTE_LENGTH_MISMATCH');
  const graph = await buildOriginalGraphFromBytes({bytes,member,expectedSha256:verifiedSha,cryptoRef});
  if (document.summary?.elementCount !== graph.edges.length)
    throw new Error('METHOD_C_NATIVE_ELEMENT_COUNT_DISAGREEMENT');
  if (document.summary?.nodeCount != null && document.summary.nodeCount !== graph.nodes.length)
    throw new Error('METHOD_C_NATIVE_NODE_COUNT_DISAGREEMENT');
  return graph;
}
export async function prepareMethodCNativePair({
  sourceDocument,targetDocument,cryptoRef=globalThis.crypto,
}={}){
  if(!sourceDocument||!targetDocument)throw new Error('METHOD_C_NATIVE_PAIR_REQUIRED');
  if(sourceDocument===targetDocument)throw new Error('METHOD_C_NATIVE_SAME_DOCUMENT_REJECTED');
  const [source,target]=await Promise.all([
    graphFromNativeCiiDocument(sourceDocument,{side:'SOURCE',cryptoRef}),
    graphFromNativeCiiDocument(targetDocument,{side:'TARGET',cryptoRef}),
  ]);
  if(source.sha256===target.sha256)throw new Error('METHOD_C_NATIVE_DUPLICATE_FILE_BYTES');
  return {source,target,sourceDocument,targetDocument,
    authority:'ORIGINAL_NATIVE_CII_BYTES_READ_ONLY',
    writerEligible:false,physicalIdentityQualified:false};
}
export async function intakeMethodCNativePair({
  sourceBytes,targetBytes,sourceFileName='SOURCE.CII',targetFileName='TARGET.CII',
  cryptoRef=globalThis.crypto,
}={}){
  if(sourceBytes==null||targetBytes==null)throw new Error('METHOD_C_NATIVE_INPUT_BYTES_REQUIRED');
  const [sourceDocument,targetDocument]=await Promise.all([
    intakeCiiWorkspaceDocument(sourceBytes,sourceFileName,{side:'SOURCE',cryptoRef}),
    intakeCiiWorkspaceDocument(targetBytes,targetFileName,{side:'TARGET',cryptoRef}),
  ]);
  return prepareMethodCNativePair({sourceDocument,targetDocument,cryptoRef});
}
export async function mountMethodCFromNativeWorkspace(container,documents,options={}){
  if(!container?.querySelector)throw new Error('METHOD_C_NATIVE_CONTAINER_REQUIRED');
  const prepared=await prepareMethodCNativePair({...documents,cryptoRef:options.cryptoRef});
  const ui=mountMethodC(container,{source:prepared.source,target:prepared.target});
  return {...ui,readOnly:true,nativeIntake:true,
    originalSHAs:[prepared.source.sha256,prepared.target.sha256],
    writerEligible:false};
}
