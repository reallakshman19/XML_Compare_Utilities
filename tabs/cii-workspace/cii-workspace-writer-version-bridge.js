import {
  applyCiiWorkspaceTargetWriter2,
  createCiiWorkspacePreview,
  inspectCiiWorkspaceModels,
} from './cii-workspace-core.js';
import {
  ciiBytesEqual,
  ciiBytesToByteString,
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

async function normalizeSideToV11(value, fileName, side) {
  const version = detectCiiNeutralVersion(value);
  if (version === 11) {
    return Object.freeze({
      side,
      originalVersion: 11,
      normalizedVersion: 11,
      normalizedBytes: value,
      sourceSha256: null,
      normalizeAudit: null,
      roundTripAudit: null,
      exactRoundTrip: true,
    });
  }
  const down = await convertCiiNeutralVersionLossless(value, 11, { fileName });
  const up = await convertCiiNeutralVersionLossless(down.outputBytes, 14, { fileName });
  if (!ciiBytesEqual(value, up.outputBytes)) {
    throw new Error(`CII_VERSION_BRIDGE_${side}_BASELINE_ROUNDTRIP_NOT_EXACT`);
  }
  return Object.freeze({
    side,
    originalVersion: 14,
    normalizedVersion: 11,
    normalizedBytes: down.outputBytes,
    sourceSha256: String(down.audit?.source_sha256 || ''),
    normalizeAudit: frozenAudit(down.audit),
    roundTripAudit: frozenAudit(up.audit),
    exactRoundTrip: true,
  });
}

async function normalizePairInput(input) {
  const sourceValue = sideInput(input, 'source');
  const targetValue = sideInput(input, 'target');
  if (sourceValue == null || targetValue == null) throw new Error('CII_VERSION_BRIDGE_SOURCE_TARGET_REQUIRED');
  const source = await normalizeSideToV11(sourceValue, input?.sourceFileName || 'source.cii', 'SOURCE');
  const target = await normalizeSideToV11(targetValue, input?.targetFileName || 'target.cii', 'TARGET');
  let normalizedInput = withoutSideText(input, 'source', source.normalizedBytes);
  normalizedInput = withoutSideText(normalizedInput, 'target', target.normalizedBytes);
  return Object.freeze({ source, target, normalizedInput });
}

export async function inspectCiiWorkspaceModelsWithVersionBridge(input, options = {}) {
  const normalized = await normalizePairInput(input);
  return inspectCiiWorkspaceModels(normalized.normalizedInput, options);
}

export async function createCiiWorkspacePreviewWithVersionBridge(input, options = {}) {
  const normalized = await normalizePairInput(input);
  const { source, target } = normalized;
  const preview = await createCiiWorkspacePreview(normalized.normalizedInput, options);
  return Object.freeze({
    ...preview,
    versionBridge: Object.freeze({
      schema: 'CIIWorkspaceWriterVersionBridge.v1',
      mode: source.originalVersion === 11 && target.originalVersion === 11 ? 'DIRECT_V11' : 'LOSSLESS_V14_VIA_V11',
      source: Object.freeze({
        originalVersion: source.originalVersion,
        normalizedVersion: 11,
        originalSha256: source.sourceSha256,
        exactBaselineRoundTrip: source.exactRoundTrip,
        normalizeAudit: source.normalizeAudit,
        roundTripAudit: source.roundTripAudit,
      }),
      target: Object.freeze({
        originalVersion: target.originalVersion,
        normalizedVersion: 11,
        originalSha256: target.sourceSha256,
        exactBaselineRoundTrip: target.exactRoundTrip,
        normalizeAudit: target.normalizeAudit,
        roundTripAudit: target.roundTripAudit,
      }),
      conversionSource: Object.freeze({
        repository: 'reallaksh19/3D_Converters',
        commit: 'ca8d391ac5f829f53bebb3c37adf0547c34a67b4',
        policy: 'FROZEN_BYTE_IDENTICAL_PYTHON_ENGINE_ALLOW_LOSSY_FALSE',
      }),
    }),
  });
}

async function normalizeCurrentTarget(preview, targetInput) {
  const bridge = preview?.versionBridge;
  if (!bridge) throw new Error('CII_VERSION_BRIDGE_PREVIEW_REQUIRED');
  const expected = Number(bridge.target?.originalVersion);
  const actual = detectCiiNeutralVersion(targetInput);
  if (actual !== expected) throw new Error(`CII_VERSION_BRIDGE_TARGET_VERSION_MISMATCH:${expected}:${actual}`);
  if (actual === 11) return Object.freeze({ bytes: targetInput, audit: null });

  const down = await convertCiiNeutralVersionLossless(targetInput, 11, { fileName: preview?.targetDocument?.fileName || 'target.cii' });
  if (bridge.target?.originalSha256 && String(down.audit?.source_sha256 || '') !== bridge.target.originalSha256) {
    throw new Error('CII_WRITER_2_STALE_ORIGINAL_V14_TARGET_HASH');
  }
  const up = await convertCiiNeutralVersionLossless(down.outputBytes, 14, { fileName: preview?.targetDocument?.fileName || 'target.cii' });
  if (!ciiBytesEqual(targetInput, up.outputBytes)) throw new Error('CII_VERSION_BRIDGE_TARGET_BASELINE_ROUNDTRIP_NOT_EXACT');
  return Object.freeze({ bytes: down.outputBytes, audit: frozenAudit(down.audit) });
}

export async function applyCiiWorkspaceTargetWriter2WithVersionBridge(preview, targetInput, options = {}) {
  const bridge = preview?.versionBridge;
  if (!bridge) throw new Error('CII_VERSION_BRIDGE_PREVIEW_REQUIRED');
  const normalized = await normalizeCurrentTarget(preview, targetInput);
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

  const upgraded = await convertCiiNeutralVersionLossless(v11Result.text, 14, { fileName: v11Result.fileName });
  const proof = await convertCiiNeutralVersionLossless(upgraded.outputBytes, 11, { fileName: v11Result.fileName });
  if (!ciiBytesEqual(v11Result.text, proof.outputBytes)) {
    throw new Error('CII_VERSION_BRIDGE_MODIFIED_ROUNDTRIP_NOT_EXACT');
  }
  const outputText = new TextDecoder('utf-8').decode(upgraded.outputBytes);
  return Object.freeze({
    ...v11Result,
    text: outputText,
    byteString: ciiBytesToByteString(upgraded.outputBytes),
    byteLength: upgraded.outputBytes.byteLength,
    sourceTargetSha256: bridge.target.originalSha256 || v11Result.sourceTargetSha256,
    modifiedTargetSha256: String(upgraded.audit?.target_sha256 || ''),
    versionBridgeValidation: Object.freeze({
      schema: 'CIIWorkspaceWriterVersionBridgeValidation.v1',
      status: 'PASS',
      path: 'V14_LOSSLESS_VIA_V11',
      baselineExactRoundTrip: true,
      modifiedExactRoundTrip: true,
      downgradeAudit: normalized.audit,
      upgradeAudit: frozenAudit(upgraded.audit),
      proofAudit: frozenAudit(proof.audit),
      v11WriterValidation: v11Result.validation,
    }),
  });
}
