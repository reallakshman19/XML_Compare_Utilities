# U2a · Transfer planner in UXML terms

Lane L2, XCU base 8409590f36b641bfc755809e27f2e46d315300f2. Owner route D4: PSI116 → UXML → mapping/transfer → PSI116 → CII. Read-only planner; never write PSI116. Use pinned xmlspan kit and shared Map validator. Invented data only. Plan Node/NodeName, Node/Weight, Node/OutsideDiameter, Node/WallThickness, Node/CorrosionAllowance, Node/InsulationThickness and Branch/Temperature, Branch/Pressure, Branch/FluidDensity, Branch/MaterialNumber, Branch/InsulationDensity. Return U1 edit refs, before/after, diagnostics and summary. Mapping lineNo is [TBA]. Optional OD gate; repeated names resolved by a single OD-to-NB table or explicit popup choices. Branch splits withheld. CLI plan with items, bore, choices and optional JSON output.

## Tests
- T1: same files, zero edits.
- T2: two weight edits, exact before/after.
- T3: one branch Temperature edit; conflicting branch values give U2_BRANCH_FIELD_SPLIT, no edit.
- T4: repeated name on distinct bores resolves.
- T5: same name/same bore ambiguous until choices; only selected nodes.
- T6: optional OD gate refuses mismatch.
- T7: all plan rows have lineNo [TBA].

M1 ignore bore (T4 red); M2 plan before choices (T5 red); M3 permit branch split (T3 red). B1 41 branches × 40 nodes, all items, median <2 s. No browser, no writes to XML, no changes outside this folder.
