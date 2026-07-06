export const TABLE_CATEGORIZED_PIVOT_AGGREGATORS_SCHEMA = 'table-categorized-pivot-aggregators/v1';

export function aggregatePivotValues(entries = [], valueSpec = {}) {
  const aggregate = String(valueSpec.aggregate || 'count');
  const values = entries.map((entry) => entry?.value).filter((value) => !isBlank(value));
  const sourceRefs = unique(entries.flatMap((entry) => entry?.sourceRefs || []));
  const diagnostics = [];
  if (aggregate === 'count') return result(values.length, sourceRefs, diagnostics);
  if (aggregate === 'countDistinct') return result(unique(values.map(asText)).length, sourceRefs, diagnostics);
  if (aggregate === 'first') return result(values.length ? asText(values[0]) : '', sourceRefs, diagnostics);
  if (aggregate === 'last') return result(values.length ? asText(values[values.length - 1]) : '', sourceRefs, diagnostics);
  if (aggregate === 'list') return result(values.map(asText), sourceRefs, diagnostics);
  if (aggregate === 'listDistinct') return result(unique(values.map(asText)), sourceRefs, diagnostics);
  return numericAggregate(aggregate, values, sourceRefs, diagnostics, valueSpec);
}

function numericAggregate(aggregate, values, sourceRefs, diagnostics, valueSpec) {
  const nums = [];
  for (const value of values) {
    const parsed = parseNumeric(value);
    if (parsed == null) diagnostics.push(diag('pivot_non_numeric_value', `${aggregate} ignored non-numeric value for ${valueSpec.fieldId}: ${value}.`, valueSpec.fieldId));
    else nums.push(parsed);
  }
  if (!nums.length) return result('', sourceRefs, diagnostics);
  if (aggregate === 'sum') return result(nums.reduce((a, b) => a + b, 0), sourceRefs, diagnostics);
  if (aggregate === 'min') return result(Math.min(...nums), sourceRefs, diagnostics);
  if (aggregate === 'max') return result(Math.max(...nums), sourceRefs, diagnostics);
  if (aggregate === 'average') return result(nums.reduce((a, b) => a + b, 0) / nums.length, sourceRefs, diagnostics);
  diagnostics.push(diag('pivot_aggregate_unknown', `Unknown aggregate ${aggregate}.`, valueSpec.fieldId));
  return result('', sourceRefs, diagnostics);
}

function parseNumeric(value) {
  const text = asText(value).trim();
  if (!text) return null;
  const match = text.match(/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)/);
  if (!match) return null;
  const number = Number(match[0]);
  return Number.isFinite(number) ? number : null;
}

function result(value, sourceRefs, diagnostics) {
  return Object.freeze({ value, sourceRefs: Object.freeze(sourceRefs), diagnostics: Object.freeze(diagnostics) });
}
function isBlank(value) { return String(value ?? '').trim() === ''; }
function asText(value) { return String(value ?? ''); }
function unique(values = []) { return [...new Set(values.filter((value) => String(value ?? '') !== ''))]; }
function diag(code, message, ref = '') { return Object.freeze({ severity: 'WARNING', status: 'PASS', code, message, ref }); }
