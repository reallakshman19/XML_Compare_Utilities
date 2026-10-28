// Shared run-state bridge for the PS Mapping modal extensions.
// All renderers consume the same completed resolver result; tab changes,
// downloads and display toggles must not execute the mapping engine again.
let current = null;

export function publishPsMappingState(state) {
  current = state || null;
}

export function readPsMappingState() {
  return current;
}

export function readPsMappingResult() {
  return current?.result || null;
}

export function releasePsMappingState(state) {
  if (current === state) current = null;
}
