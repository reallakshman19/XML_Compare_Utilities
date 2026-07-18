import {
  createSequentialWorkspacePackage,
  restoreSequentialWorkspacePackage,
  sequentialWorkspacePackageFingerprint,
} from './sequential-workspace-package.js';
import { validateSequentialWorkspaceApplicationReceipt } from './sequential-workspace-application-receipt.js';

function cloneJson(value) { return JSON.parse(JSON.stringify(value)); }
function validatedReceipts(values = []) {
  return Object.freeze(values.map((receipt, index) => validateSequentialWorkspaceApplicationReceipt(receipt, index)));
}

export function createSequentialWorkspacePackageWithReceipts(options = {}) {
  const base = createSequentialWorkspacePackage(options);
  const receipts = validatedReceipts(options.applicationReceipts || []);
  const { packageFingerprint: ignored, ...payload } = cloneJson(base);
  void ignored;
  const withReceipts = { ...payload, applicationReceipts: cloneJson(receipts) };
  return Object.freeze({
    ...withReceipts,
    packageFingerprint: sequentialWorkspacePackageFingerprint(withReceipts),
  });
}

export function serializeSequentialWorkspacePackageWithReceipts(options = {}) {
  return JSON.stringify(createSequentialWorkspacePackageWithReceipts(options), null, 2);
}

export function restoreSequentialWorkspacePackageWithReceipts(input) {
  const raw = typeof input === 'string' ? JSON.parse(input) : cloneJson(input);
  const restoration = restoreSequentialWorkspacePackage(raw);
  const applicationReceipts = validatedReceipts(raw.applicationReceipts || []);
  return Object.freeze({ ...restoration, applicationReceipts });
}
