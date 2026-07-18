/** Exact AmbiguityDecisionLedger.v1 export and import without source payloads. */
import { assertJsonSafe, deepFreeze } from './revision-contract-utils.js';
import { sha256Text } from './revision-hash.js';
import { assertValidDecisionLedger, DECISION_LEDGER_SCHEMA } from './revision-decision-contracts.js';
import { reattachDecisionLedger } from './revision-decision-ledger.js';

function prohibitedPayload(value) {
  const text = JSON.stringify(value);
  const tokens = ['inputxml-managed-stage', 'differenceRows', 'visualModels', 'segments', 'markers', 'rankedEvidence'];
  return tokens.find((token) => text.includes(`"${token}"`)) ?? null;
}
export function createDecisionLedgerExport(ledger) {
  if (!ledger) throw new Error('Decision ledger is unavailable.');
  assertJsonSafe(ledger, DECISION_LEDGER_SCHEMA); const prohibited = prohibitedPayload(ledger);
  if (prohibited) throw new Error(`Decision ledger contains prohibited payload ${prohibited}.`);
  return ledger;
}
async function rationaleHashErrors(ledger, cryptoRef) {
  const errors = [];
  for (const item of ledger.decisions) if (await sha256Text(item.rationale, cryptoRef) !== item.rationaleHash) errors.push(`${item.differenceId} has a tampered rationale hash.`);
  for (const event of ledger.events) if (await sha256Text(event.rationale, cryptoRef) !== event.rationaleHash) errors.push(`${event.eventId} has a tampered rationale hash.`);
  return errors;
}
export async function parseDecisionLedgerJson(text, audit, importedAt, cryptoRef) {
  let value;
  try { value = JSON.parse(String(text)); } catch (error) { throw new SyntaxError(`Decision ledger JSON is invalid: ${error.message}`); }
  const ledger = deepFreeze(value); assertValidDecisionLedger(ledger, audit);
  const hashErrors = await rationaleHashErrors(ledger, cryptoRef); if (hashErrors.length) throw new TypeError(`Invalid AmbiguityDecisionLedger.v1: ${hashErrors.join(' ')}`);
  const prohibited = prohibitedPayload(ledger); if (prohibited) throw new TypeError(`Decision ledger contains prohibited payload ${prohibited}.`);
  return ledger.status === 'STALE' ? reattachDecisionLedger(ledger, audit, importedAt) : ledger;
}
export const _test = Object.freeze({ prohibitedPayload, rationaleHashErrors });
