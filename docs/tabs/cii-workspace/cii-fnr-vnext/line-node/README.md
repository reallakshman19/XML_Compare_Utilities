# CII VNext Tab 2: independent Line Number + Node Name planner

Public synchronous named export: `planLineNodeRules(request)` from `./index.js`.
It returns `CiiFnrVnext.Proposals.v1` and **never mutates inputs or writes a file**.
`targetBytes` and `originalTargetSha256` are mandatory. `sourceBytes` is optional
and contributes observational context only; numeric SOURCE/TARGET node IDs are
never equated. `tab` must be `LINE_NODE`.

Rule example:

```js
{
  id: 'row-1',
  line: { mode: 'regex', pattern: '^([A-Z]+)-(\\d+)/B2$', flags: 'i',
          family: 'PL-001', replace: '$1-$2/B3' },
  node: { mode: 'literal', value: 'PS-010', endpoint: 'FROM', replace: 'PS-011' }
}
```

`line` and `node` are optional independently but at least one must exist.
Each selector has independent `mode: 'literal'|'regex'`, explicit `flags`
(regex allows only `i,m,s,u`), and optional `replace`. At least one selected
field must have `replace`. `node.endpoint` must be `FROM`, `TO`, or `EITHER`.
Literal comparisons and regex captures must match the **entire** trimmed field.
`line.family`, when supplied, is required to match the *full* line family base
(the whole label before the final `/B<number>`), never only the suffix.

`options.weights = {line:70,node:30}` changes explanatory rank only. When
both selectors are specified **both must match**. No score authorizes a HOLD.
Each row includes `MATCH`, `HOLD`, or `NO_MATCH` observation with cause,
actual capture groups and physical pointer/line provenance.

The planner accepts independently inspected CAESAR II neutral files v11 and
v14, 15-record `ELEMENTS` blocks, offset +10 line text with 7X,I5,1X,A
prefix, offset +13 sixth integer pointer and one-based `NODENAME` rows.
The `NODENAME` fields are `[2,28)` FROM and `[28,53)` TO, relative to
record start. The line claim includes the *entire* existing line-record body;
new declared length and trailing ASCII padding preserve byte count and newline.
Unsupported record layouts, length growth beyond original physical capacity,
malformed labels, invalid/unsafe regex, and ambiguous edits are held.

Disconnected duplicate line selectors, competing endpoint identities, partial
shared-pointer replacements, overlapping rules and missing mandatory selectors
never yield PROPOSED claims. For an aliased field, all physical owners must be
selected with identical replacement, with one deduplicated claim; node identity
ambiguity remains a separate HOLD. No mechanism exists for pointer cloning.

Test: `node --test tests/cii-fnr-vnext-line-node.test.mjs` at repo root.
Synthetic fixtures are labelled SIMULATED and do not substitute for private
original GLRD input receipts or independent Oracle qualification. No existing
Find & Replace/Method C module is imported. The Agent 1 writer remains the
only approved downstream byte patcher; never apply this planner's claims alone.
