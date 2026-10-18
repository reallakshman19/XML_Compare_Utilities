/**
 * Issue #126: mount A-only Method C within native Writer2 without editing
 * PR #107-owned correspondence, review or Writer2 mutation modules.
 * Reads the original browser File objects selected by the Owner once.
 */
import { ciiSha256 } from './cii-workspace-v11-v14-converter.js';
import { ciiSourceSetSha256 } from './cii-workspace-source-set.js';
import {
  CII_MS_SOURCE_SET_SHA256, CII_MS_TARGET_SHA256,
} from './cii-workspace-multisource-nodename-authority.js';
import { mountMethodCWriter2ABridge } from './cii-workspace-method-c-writer2-bridge.js';

const sourceShas = Object.freeze({
  S1: '9a9cb14db4c13f5aac41cc74a60e7e528722eb5003d09f07192762ab6bfb1a2b',
  S2: '7ec48b76b65eedfd5ecc9c8e8feca1a45dd8c83721a68b53aa0db3363e6d27fd',
  S3: 'c2143b31c482158ac5514d2709406c14a9179e656277c654e932bb845d090caa',
});
const sourceIdBySha = new Map(Object.entries(sourceShas).map(([id, sha]) => [sha, id]));
const exactFileRefs = (sourceInput, targetInput) => [
  ...Array.from(sourceInput?.files || []), ...Array.from(targetInput?.files || []),
];
const sameFiles = (a,b) => a.length === b.length && a.every((file,i) => file === b[i]);

/** The matching Writer2 File selections are original-byte custody, not JSON exports. */
export async function captureWriter2MethodCOriginals(sourceFiles, targetFiles,
  cryptoRef = globalThis.crypto) {
  if (sourceFiles.length !== 3 || targetFiles.length !== 1)
    throw new Error('METHOD_C_REQUIRES_THREE_ORIGINAL_SOURCES_AND_ONE_TARGET');
  const entries = await Promise.all([...sourceFiles, ...targetFiles].map(async file => {
    if (!/\.cii$/i.test(file?.name || '')) throw new Error('METHOD_C_ORIGINAL_CII_REQUIRED');
    const bytes = new Uint8Array(await file.arrayBuffer());
    return { bytes, fileName: file.name, originalSha256: await ciiSha256(bytes, cryptoRef) };
  }));
  const sources = entries.slice(0,3).map(member => ({
    ...member, sourceId: sourceIdBySha.get(member.originalSha256) || '',
  }));
  if (new Set(sources.map(s => s.sourceId)).size !== 3 || sources.some(s => !s.sourceId))
    throw new Error('METHOD_C_UNKNOWN_OR_DUPLICATE_SOURCE_SHA');
  sources.sort((a,b) => a.sourceId.localeCompare(b.sourceId));
  if (entries[3].originalSha256 !== CII_MS_TARGET_SHA256)
    throw new Error('METHOD_C_TARGET_ORIGINAL_SHA_MISMATCH');
  const sourceSetSha256 = await ciiSourceSetSha256(sources, cryptoRef);
  if (sourceSetSha256 !== CII_MS_SOURCE_SET_SHA256)
    throw new Error('METHOD_C_SOURCE_SET_SHA_MISMATCH');
  return {sources,targetBytes:entries[3].bytes,
    targetOriginalSha256:entries[3].originalSha256,sourceSetSha256};
}

/** Mount current Writer2 first. Adds only a read-only sibling in its real panels. */
export function mountMethodCWriter2NativeShell(container, options, mountExistingWriter2) {
  if (typeof mountExistingWriter2 !== 'function')
    throw new Error('METHOD_C_EXISTING_WRITER2_MOUNT_REQUIRED');
  const core = mountExistingWriter2(container, options);
  const sourceInput = container.querySelector('[data-ciiw-source]');
  const targetInput = container.querySelector('[data-ciiw-target]');
  const inspect = container.querySelector('[data-ciiw-inspect]');
  if (!sourceInput || !targetInput || !inspect) return core;
  let epoch = 0, disposed = false, custody = null;
  const bridge = mountMethodCWriter2ABridge(container, {cryptoRef:options?.cryptoRef,
    getCustody:() => custody && sameFiles(custody.refs,
      exactFileRefs(sourceInput,targetInput)) ? custody.value : null,
  });
  const invalidate = reason => {epoch += 1;custody=null;bridge.invalidate(reason);};
  const onFileChange = () => invalidate('INVALIDATED — Writer2 original input changed');
  const onInspect = () => {
    invalidate('INVALIDATED — Writer2 original files are being re-inspected');
    const run = epoch, sourceFiles = Array.from(sourceInput.files || []);
    const targetFiles = Array.from(targetInput.files || []);
    const refs = [...sourceFiles,...targetFiles];
    void captureWriter2MethodCOriginals(sourceFiles,targetFiles,options?.cryptoRef)
      .then(value => {
        if(!disposed && epoch===run && sameFiles(refs,
          exactFileRefs(sourceInput,targetInput))) custody={refs,value};
      })
      .catch(() => { if(!disposed && epoch===run) custody=null; });
  };
  sourceInput.addEventListener('change',onFileChange);
  targetInput.addEventListener('change',onFileChange);
  inspect.addEventListener('click',onInspect,true);
  return {...core,destroy() {
    disposed=true;
    sourceInput.removeEventListener('change',onFileChange);
    targetInput.removeEventListener('change',onFileChange);
    inspect.removeEventListener('click',onInspect,true);
    bridge.destroy();core?.destroy?.();
  }};
}
