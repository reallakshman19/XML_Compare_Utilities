// The UXML v2 support benchmarks (fixtures/uxml-v2-supports, README there): each model's input XML and staged JSON,
// relative to the repo root. BM2 and EF05 joined as public benchmarks on 16 Nov 2026 (Owner: "make all model public").
export const BENCH_SOURCES = Object.freeze({
  G30: ['fixtures/uxml-v2/golden-30.xml', 'fixtures/uxml-v2-supports/bench/golden-30_staged.json'],
  'G30-NOJSON': ['fixtures/uxml-v2/golden-30.xml', null],
  'G30-CUSTOM': ['fixtures/uxml-v2/golden-30.xml', 'fixtures/uxml-v2-supports/bench/golden-30_staged.json'],
  'RMS-BLOW-1': ['fixtures/uxml-v2-supports/bench/RMS-BLOW-1.xml', null],
  'ACTIVE-AUDIT': ['fixtures/uxml-v2-supports/bench/active-audit-ns.xml', 'fixtures/uxml-v2-supports/bench/active-audit.json'],
  BM2: ['fixtures/uxml-v2-supports/bench/BM2.xml', null],
  EF05: ['fixtures/uxml-v2-supports/bench/EF05.xml', null],
});
export const BENCHES = Object.freeze(Object.keys(BENCH_SOURCES));
/** The recorded calls of one group (core, engineering, ledger, config, substep) for every benchmark. */
export const recordingsOf = (group) => BENCHES.map((b) => `fixtures/uxml-v2-supports/core-calls/${b}.${group}-calls.json`);
