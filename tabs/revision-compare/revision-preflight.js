/** Engineering compatibility preflight for the approved comparison basis. */

import { deepFreeze, frozenStrings } from './revision-contract-utils.js';
import { validateProjectDocument } from './revision-session-contracts.js';

function compatibility(left, right, label) {
  const a = left || 'UNKNOWN';
  const b = right || 'UNKNOWN';
  if (a === 'UNKNOWN' || b === 'UNKNOWN') return deepFreeze({ status: 'UNKNOWN', revA: a, revB: b, label });
  if (a !== b) return deepFreeze({ status: 'INCOMPATIBLE', revA: a, revB: b, label });
  return deepFreeze({ status: 'COMPATIBLE', revA: a, revB: b, label });
}

function compatibilityMessages(items, blockers, warnings) {
  for (const item of items) {
    if (item.status === 'INCOMPATIBLE') blockers.push(`${item.label} mismatch: ${item.revA} vs ${item.revB}.`);
    if (item.status === 'UNKNOWN') warnings.push(`${item.label} is not declared on both revisions.`);
  }
}

function intakeMessages(slot, label, blockers, warnings) {
  if (!slot?.document) { blockers.push(`${label} revision is not loaded.`); return; }
  blockers.push(...validateProjectDocument(slot.document).map((message) => `${label}: ${message}`));
  blockers.push(...(slot.blockers ?? []).map((message) => `${label}: ${message}`));
  warnings.push(...(slot.warnings ?? []).map((message) => `${label}: ${message}`));
}

function proposalMessages(proposal, blockers, warnings) {
  if (!proposal) { blockers.push('Branch scope proposal is unavailable.'); return; }
  blockers.push(...(proposal.validation?.errors ?? []));
  warnings.push(...(proposal.warnings ?? []));
}

export function revisionComparisonPreflight(revA, revB, proposal) {
  const blockers = [], warnings = [], notes = [];
  intakeMessages(revA, 'Rev A', blockers, warnings);
  intakeMessages(revB, 'Rev B', blockers, warnings);
  proposalMessages(proposal, blockers, warnings);

  const left = revA?.document;
  const right = revB?.document;
  const unitCompatibility = compatibility(left?.unit, right?.unit, 'Unit');
  const coordinateFrameCompatibility = compatibility(left?.coordinateFrame, right?.coordinateFrame, 'Coordinate frame');
  const verticalAxisCompatibility = compatibility(left?.verticalAxis, right?.verticalAxis, 'Vertical axis');
  compatibilityMessages([unitCompatibility, coordinateFrameCompatibility, verticalAxisCompatibility], blockers, warnings);

  if (left && right && left.sourceHash === right.sourceHash) notes.push('Rev A and Rev B file hashes are identical.');
  if (left && right && left.stagedSchema !== right.stagedSchema) warnings.push(`Staged schemas differ: ${left.stagedSchema} vs ${right.stagedSchema}.`);
  if (proposal && !proposal.commonBranches.length) warnings.push('No exact common branches were found.');

  return deepFreeze({
    status: blockers.length ? 'BLOCKED' : (left && right && proposal ? 'READY' : 'INCOMPLETE'),
    blockers: frozenStrings(blockers),
    warnings: frozenStrings(warnings),
    notes: frozenStrings(notes),
    compatibility: deepFreeze({ unitCompatibility, coordinateFrameCompatibility, verticalAxisCompatibility }),
  });
}
