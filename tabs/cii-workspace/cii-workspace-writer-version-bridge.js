import {
  applyCiiWorkspaceTargetWriter2,
  createCiiWorkspacePreview,
  inspectCiiWorkspaceModels,
} from './cii-workspace-core.js';
import { ciiWorkspaceArtifactBundle } from './cii-workspace-export.js';
import {
  ciiByteStringToBytes,
  ciiBytesEqual,
  ciiBytesToByteString,
  ciiSha256,
  convertCiiNeutralVersionLossless,
  detectCiiNeutralVersion,
} from './cii-workspace-v11-v14-converter.js';

function sideInput(input, side) {
  return input?.[`${side}Bytes`] ?? input?.[`${side}Text`];
}
function withoutSideText(input, side, bytes) {
  const next = { ...(input || {}) };
  delete next[`${side}Text`];
  next[`${side}Bytes`] = bytes;
  return next;
}
function frozenAudit(audit) {
  return audit ? Object.freeze({ ...audit }) : null;
}

async function normalizeSideToV11(value, fileName, side, cryptoRef) {
  const version = detectCiiNeutralVersion(value);
  if (version === 11) {
    const sourceSha256 = await ciiSha256(value, cryptoRef);
    return Object.freeze({
      side,
      originalVersion: 11,
      normalizedVersion: 11,
      normalizedBytes: value,
      sourceSha256,
      normalizedSha256: sourceSha256,
      normalizeAudit: null,
      roundTripAudit: null,
      exactRoundTrip: true,
    });
  }
  const down = await convertCiiNeutralVersionLossless(value, 11, { fileName, cryptoRef });
  const up = await convertCiiNeutralVersionLossless(down.outputBytes, 14, { fileName, cryptoRef });
  if (!ciiBytesEqual(value, up.outputBytes)) {
    throw new Error(`CII_VERSION_BRIDGE_${side}_BASELINE_ROUNDTRIP_NOT_EXACT`);
  }
  return Object.freeze({
    side,
    originalVersion: 14,
    normalizedVersion: 11,
    normalizedBytes: down.outputBytes,
    sourceSha256: down.sourceSha256,
    normalizedSha256: down.targetSha256,
    normalizeAudit: frozenAudit(down.audit),
    roundTripAudit: frozenAudit(up.audit),
    exactRoundTrip: true,
  });
}

async function normalizePairInput(input, options = {}) {
  const sourceValue = sideInput(input, 'source');
  const targetValue = sideInput(input, 'target');
  if (sourceValue == null || targetValue == null) throw new Error('CII_VERSION_BRIDGE_SOURCE_TARGET_REQUIRED');
  const source = await normalizeSideToV11(sourceValue, input?.sourceFileName || 'source.cii', 'SOURCE', options.cryptoRef);
  const target = await normalizeSideToV11(targetValue, input?.targetFileName || 'target.cii', 'TARGET', options.cryptoRef);
  let normalizedInput = withoutSideText(input, 'source', source.normalizedBytes);
  normalizedInput = withoutSideText(normalizedInput, 'target', target.normalizedBytes);
  return Object.freeze({ source, target, normalizedInput });
}

function bridgeSideEvidence(side) {
  return Object.freeze({
    originalVersion: side.originalVersion,
    normalizedVersion: 11,
    originalSha256: side.sourceSha256,
    normalizedSha256: side.normalizedSha256,
    exactBaselineRoundTrip: side.exactRoundTrip,
    normalizeAudit: side.normalizeAudit,
    roundTripAudit: side.roundTripAudit,
  });
}

function buildVersionBridgeEvidence(source, target) {
  return Object.freeze({
    schema: 'CIIWorkspaceWriterVersionBridge.v1',
    mode: source.originalVersion === 11 && target.originalVersion === 11 ? 'DIRECT_V11' : 'LOSSLESS_V14_VIA_V11',
    source: bridgeSideEvidence(source),
    target: bridgeSideEvidence(target),
    conversionSource: Object.freeze({
      repository: 'reallaksh19/3D_Converters',
      commit: 'ca8d391ac5f829f53bebb3c37adf0547c34a67b4',
      policy: 'FROZEN_BYTE_IDENTICAL_PYTHON_ENGINE_ALLOW_LOSSY_FALSE',
    }),
  });
}

function assertNormalizedIntakeHashes(result, source, target, context) {
  const sourceHash = result?.sourceDocument?.contentSha256 ?? result?.source?.contentSha256;
  const targetHash = result?.targetDocument?.contentSha256 ?? result?.target?.contentSha256;
  if (sourceHash !== source.normalizedSha256) {
    throw new Error(`CII_VERSION_BRIDGE_${context}_SOURCE_NORMALIZED_HASH_MISMATCH`);
  }
  if (targetHash !== target.normalizedSha256) {
    throw new Error(`CII_VERSION_BRIDGE_${context}_TARGET_NORMALIZED_HASH_MISMATCH`);
  }
}

export async function inspectCiiWorkspaceModelsWithVersionBridge(input, options = {}) {
  const normalized = await normalizePairInput(input, options);
  const inspection = await inspectCiiWorkspaceModels(normalized.normalizedInput, options);
  assertNormalizedIntakeHashes(inspection, normalized.source, normalized.target, 'INSPECTION');
  return Object.freeze({
    ...inspection,
    versionBridge: buildVersionBridgeEvidence(normalized.source, normalized.target),
  });
}

export async function createCiiWorkspacePreviewWithVersionBridge(input, options = {}) {
  const normalized = await normalizePairInput(input, options);
  const versionBridge = buildVersionBridgeEvidence(normalized.source, normalized.target);
  const preview = await createCiiWorkspacePreview(normalized.normalizedInput, options);
  assertNormalizedIntakeHashes(preview, normalized.source, normalized.target, 'PREVIEW');
  const audit = Object.freeze({ ...preview.audit, versionBridge });
  const result = { ...preview, versionBridge, audit };
  result.artifacts = ciiWorkspaceArtifactBundle(result);
  return Object.freeze(result);
}

async function normalizeCurrentTarget(preview, targetInput, options = {}) {
  const bridge = preview?.versionBridge;
  if (!bridge) throw new Error('CII_VERSION_BRIDGE_PREVIEW_REQUIRED');
  const expected = Number(bridge.target?.originalVersion);
  const actual = detectCiiNeutralVersion(targetInput);
  if (actual !== expected) throw new Error(`CII_VERSION_BRIDGE_TARGET_VERSION_MISMATCH:${expected}:${actual}`);
  if (actual === 11) return Object.freeze({ bytes: targetInput, audit: null });

  const down = await convertCiiNeutralVersionLossless(targetInput, 11, {
    fileName: preview?.targetDocument?.fileName || 'target.cii',
    cryptoRef: options.cryptoRef,
  });
  if (bridge.target?.originalSha256 && down.sourceSha256 !== bridge.target.originalSha256) {
    throw new Error('CII_WRITER_2_STALE_ORIGINAL_V14_TARGET_HASH');
  }
  if (bridge.target?.normalizedSha256 && down.targetSha256 !== bridge.target.normalizedSha256) {
    throw new Error('CII_WRITER_2_STALE_NORMALIZED_V11_TARGET_HASH');
  }
  const up = await convertCiiNeutralVersionLossless(down.outputBytes, 14, {
    fileName: preview?.targetDocument?.fileName || 'target.cii',
    cryptoRef: options.cryptoRef,
  });
  if (!ciiBytesEqual(targetInput, up.outputBytes)) throw new Error('CII_VERSION_BRIDGE_TARGET_BASELINE_ROUNDTRIP_NOT_EXACT');
  return Object.freeze({ bytes: down.outputBytes, audit: frozenAudit(down.audit) });
}

export async function applyCiiWorkspaceTargetWriter2WithVersionBridge(preview, targetInput, options = {}) {
  const bridge = preview?.versionBridge;
  if (!bridge) throw new Error('CII_VERSION_BRIDGE_PREVIEW_REQUIRED');
  const normalized = await normalizeCurrentTarget(preview, targetInput, options);
  const v11Result = await applyCiiWorkspaceTargetWriter2(preview, normalized.bytes, options);
  if (Number(bridge.target?.originalVersion) === 11) {
    return Object.freeze({
      ...v11Result,
      versionBridgeValidation: Object.freeze({
        schema: 'CIIWorkspaceWriterVersionBridgeValidation.v1',
        status: 'PASS',
        path: 'DIRECT_V11',
      }),
    });
  }

  if (typeof v11Result.byteString !== 'string') throw new Error('CII_VERSION_BRIDGE_V11_POSTIMAGE_BYTES_REQUIRED');
  const v11PostimageBytes = ciiByteStringToBytes(v11Result.byteString);
  const upgraded = await convertCiiNeutralVersionLossless(v11PostimageBytes, 14, {
    fileName: v11Result.fileName,
    cryptoRef: options.cryptoRef,
  });
  if (v11Result.modifiedTargetSha256 && upgraded.sourceSha256 !== v11Result.modifiedTargetSha256) {
    throw new Error('CII_VERSION_BRIDGE_V11_POSTIMAGE_SHA_MISMATCH');
  }
  const proof = await convertCiiNeutralVersionLossless(upgraded.outputBytes, 11, {
    fileName: v11Result.fileName,
    cryptoRef: options.cryptoRef,
  });
  if (!ciiBytesEqual(v11PostimageBytes, proof.outputBytes)) {
    throw new Error('CII_VERSION_BRIDGE_MODIFIED_ROUNDTRIP_NOT_EXACT');
  }
  const outputText = new TextDecoder('utf-8').decode(upgraded.outputBytes);
  return Object.freeze({
    ...v11Result,
    text: outputText,
    byteString: ciiBytesToByteString(upgraded.outputBytes),
    byteLength: upgraded.outputBytes.byteLength,
    sourceTargetSha256: bridge.target.originalSha256 || v11Result.sourceTargetSha256,
    modifiedTargetSha256: upgraded.targetSha256,
    versionBridgeValidation: Object.freeze({
      schema: 'CIIWorkspaceWriterVersionBridgeValidation.v1',
      status: 'PASS',
      path: 'V14_LOSSLESS_VIA_V11',
      baselineExactRoundTrip: true,
      modifiedExactRoundTrip: true,
      originalTargetSha256: bridge.target.originalSha256,
      normalizedTargetSha256: bridge.target.normalizedSha256,
      v11PostimageSha256: upgraded.sourceSha256,
      modifiedTargetSha256: upgraded.targetSha256,
      downgradeAudit: normalized.audit,
      upgradeAudit: frozenAudit(upgraded.audit),
      proofAudit: frozenAudit(proof.audit),
      v11WriterValidation: v11Result.validation,
    }),
  });
}
