# PR1059 Work Report — Writer2 W2 A exact public runtime

## Handover in 60 seconds

PR #1059 continues the exact W2 A runtime gate from merged PR #1058 on `main@9685a2f41ec2b5a5c170762816702fefe90e18a7`. W2.34 and W2 C0 remain inherited PASS. W2 A remains NOT_RUN until the unchanged committed `tests/cii-workspace-writer2-restraint-product-routing.test.js` executes through the normal public `applyCiiWorkspaceTargetWriter2()` import graph with every admitted repository file verified by exact Git blob identity.

On 2026-08-27 the owner instructed `ok fix them` after the V11/V14 fixed-FORTRAN cross-check identified one concrete release-hardening defect: `tabs/cii-workspace/cii-workspace-v14-writer2-fixed-field-authority.js` accepted lexically REAL tokens such as `3.000000`, `3.000000E+00`, and `3.000000D+00` in Writer2-owned `I13` count/pointer coordinates whenever they were numerically integral. `3D_Converters` had already demonstrated that lexical REAL substitution in an `I13` slot can violate the CAESAR fixed-FORTRAN reader contract even when width and numeric value look acceptable. The owner instruction is therefore recorded as bounded production mutation authority for the lexical-I13 gate only; it does not authorize bypassing W2 A or widening CREATE/topology authority.

The fix is now implemented: changed Writer2-owned V14 count/pointer fields must match lexical integer syntax `[+-]?\d+`. A focused falsifier was added. A reconstructed local preimage run demonstrates the old integer parser returns `3` for decimal/scientific REAL spellings and therefore fails the new falsifier; the patched reconstructed logic passes. Exact branch checkout execution remains NOT_RUN because direct Git/GitHub network access from the execution container is unavailable.

Historical W2 A recovery remains unchanged: merged PR #1054 recorded a prior sparse mirror of 54 exact repository JS files with 31 unresolved static modules; execution reached missing `tabs/cii-workspace/cii-workspace-auxiliary.js` and no authored assertion failed. That mirror is not retained and is not current runtime evidence.

## Ground truth

- repository: `reallaksh19/XML_Compare_Utilities`
- base: `main@9685a2f41ec2b5a5c170762816702fefe90e18a7`
- branch: `agent/cii-writer2-w2a-runtime-closure`
- PR: #1059 draft/open
- predecessor: PR #1058 merged at `9685a2f41ec2b5a5c170762816702fefe90e18a7`
- W2 A test blob: `9922377ddeda86fc9167d65f33c97095346e79fa`
- public entrypoint: `applyCiiWorkspaceTargetWriter2`
- owner bounded write authorization: 2026-08-27 `ok fix them`
- merge authority: OWNER_ONLY / not granted

## Implemented hardening — V14 lexical I13

### Diagnosis

Preimage production blob:

```text
tabs/cii-workspace/cii-workspace-v14-writer2-fixed-field-authority.js
fc97ddd7fd5645e46c70a722c7f96f17dc7ae188
```

The preimage `integerValue()` used a general REAL-capable numeric regex and then accepted any finite value within `1e-9` of an integer. Consequently:

```text
3               -> 3
3.000000        -> 3          WRONG FOR I13 AUTHORITY
3.000000E+00    -> 3          WRONG FOR I13 AUTHORITY
3.000000D+00    -> 3          WRONG FOR I13 AUTHORITY
3.5             -> null
```

The engineering/fixed-format invariant is lexical, not merely numerical:

```text
CONTROL rows 1-3 use 2X,6I13
Writer2-owned CONTROL count positions therefore require integer lexical tokens.
Writer2-owned ELEMENT auxiliary-pointer positions are likewise integer fields.
```

### Patch

`NUMBER_RX` was replaced by a dedicated lexical integer gate:

```js
const INTEGER_RX = /^[+-]?\d+$/;
```

and `integerValue()` now rejects decimal and exponent spellings before numeric conversion.

New focused falsifier:

```text
tests/cii-workspace-v14-writer2-i13-lexical.test.js
```

It proves both the helper behavior and complete count/pointer transactions:

- plain/signed/zero-padded integer tokens remain accepted;
- `3.000000`, `3.000000E+00`, `3.000000D+00`, and fractional tokens are rejected;
- CONTROL row1/field4 NONAM written as a decimal REAL is rejected even when NODENAME cardinality and pointer movement otherwise agree;
- ELEMENT row14/field6 NODENAME pointer written in scientific REAL notation is rejected even when the matching CONTROL/cardinality transaction otherwise agrees.

### Negative assurance

This hardening does **not** change:

- fixed field widths;
- CONTROL coordinate authority;
- ELEMENT pointer coordinate authority;
- V14 NODENAME=1 / RESTRAINT=24 / SIF&TEES=14 cardinality units;
- pointer range rules;
- cardinality correlation;
- V11/V14 bridge semantics;
- SIF item 15/16 semantic mapping;
- CREATE authority;
- Writer3 topology;
- parser/converter behavior outside this V14 Writer2 authority gate.

## Current changed-file ledger

```text
agents/PR1059_workreport.md
agents/claims/PR1059.yaml
agents/status/PR1059.yaml
tabs/cii-workspace/cii-workspace-v14-writer2-fixed-field-authority.js
tests/cii-workspace-v14-writer2-i13-lexical.test.js
```

No workflow file, benchmark, frozen upstream converter, topology Writer, or generic parser was changed.

## Current validation ledger

| Gate | Status | Observation | Oracle / evidence | Notes |
|---|---|---|---|---|
| W2.34 focused bridge/export | PASS inherited | prior exact runtime | predecessor evidence | unchanged |
| W2 C0 exact 14-file route/export | PASS inherited | prior exact runtime | predecessor evidence | unchanged |
| preimage lexical-I13 falsifier | FAIL as expected | LOCAL_EXECUTION_RECONSTRUCTED | exact preimage `integerValue()` logic | decimal/scientific REAL returns integer 3 |
| patched lexical-I13 falsifier | PASS | LOCAL_EXECUTION_RECONSTRUCTED | focused new test + patched logic | exact repository checkout not available |
| branch source patch inspection | PASS | SOURCE_INSPECTION | GitHub connector | surgical lexical gate only |
| exact branch Node execution of new test | NOT_RUN | NOT_OBSERVED | none | direct Git checkout unavailable |
| W2 A exact public runtime | NOT_RUN | NOT_OBSERVED | exact graph reconstruction required | unchanged committed test |
| W2 B retained-real V11 | NOT_RUN | NOT_OBSERVED | none | blocked until W2 A PASS |
| generated/native V14 browser gates | NOT_RUN | NOT_OBSERVED | none | later stage |
| release freeze | NOT_READY | SOURCE/STATE | required gates incomplete | no NOT_RUN promotion |

No reconstructed execution is represented as exact branch runtime.

## Runtime/environment boundary

Direct native Git access from the current execution container was rechecked and remains unavailable:

```text
git ls-remote https://github.com/reallaksh19/XML_Compare_Utilities.git HEAD
fatal: Could not resolve host: github.com
```

The GitHub connector provides exact file/blob access but no repository/archive materialization endpoint. Therefore a full exact W2 A checkout still requires connector-mediated file reconstruction or a runtime with native repository access.

## W2 A continuation rule

```text
exact complete ESM graph
-> Git-blob verify every admitted repository file
-> run unchanged committed W2 A test
-> first authored runtime/assertion failure = genuine W2 A FAIL
-> clean authored completion = W2 A PASS
-> only W2 A PASS permits W2 B promotion
```

No stub, import rewrite, partial-core substitution, lossy bridge, workflow-based substitute, or reconstructed PASS is permitted.

## Exact next action

Continue W2 A dependency closure from current branch/main truth. If exact repository materialization becomes available, run:

```text
node tests/cii-workspace-writer2-restraint-product-routing.test.js
```

against the exact admitted graph. Otherwise continue connector-mediated dependency reconstruction, beginning from the historical frontier `tabs/cii-workspace/cii-workspace-auxiliary.js`, while retaining exact Git blob custody. Do not modify additional production Writer behavior unless the exact runtime exposes a reproducible authored failure.

## Appendix A — takeover qualification

1. Trace the W2 A test through `applyCiiWorkspaceTargetWriter2()` to RESTRAINT composite dispatch and the independent complete-postimage validator.
2. Explain why dependency/module-not-found is NOT_RUN rather than product FAIL, and identify the first condition that converts the gate to FAIL.
3. Prove CONTROL row1/field4 NONAM custody is distinct from row2/field4 RESTRAINT block-count authority, and explain why lexical `I13` is stricter than numerical integrality.
4. Identify all Writer2 CREATE/topology boundaries that must remain blocked during W2 A and this hardening.
5. Give the exact next module/blob materialization state and the minimal response if the first authored assertion fails.
