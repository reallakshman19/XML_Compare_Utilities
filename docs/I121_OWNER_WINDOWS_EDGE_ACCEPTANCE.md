# I121 — Owner Windows Edge local acceptance kit

**Goal:** reproduce the original S1/S2/S3/T generic Writer2 UI route on the actual Owner Windows machine, with SHA-bound files and the **committed** `docs/` Worker UI. This provides reproducible automated evidence; it does **not** issue an Owner sign-off, independently approve P2, or qualify physical BOUND/Apply.

## Safe isolated checkout

Use a fresh clone so this does not disturb another engineer's work. Requires Windows 10/11, installed Microsoft Edge, Git, Node.js 22 or newer and npm.

```powershell
git -c core.autocrlf=false clone https://github.com/reallakshman19/XML_Compare_Utilities.git XML_I121_Edge_Check
cd XML_I121_Edge_Check
git fetch origin refs/pull/133/head:refs/heads/i121-owner-edge-qa
git switch i121-owner-edge-qa

powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\i121-owner-edge-acceptance.ps1
```

Optional: append `-HeadfulInspect` to observe the first automated Inspect session in visible Edge. The other tests may still use headless Edge. Neither mode exercises an independently approved S1 physical base.

The script requires a clean tracked checkout, verifies all four original `Benchmark/*.CII` SHA-256 values against the frozen originals, checks Edge and Node versions, installs pinned npm dependencies if necessary, and runs three tests **in the real Microsoft Edge channel**:

1. Committed Writer2 real S1/S2/S3/T Inspect, native dedicated worker usage, source custody, heartbeat, immutable Method C evidence and B0/C0.
2. Post-Inspect 2/3 physical-base gate and TARGET-replacement evidence revocation.
3. Original-file Method C A-only Run after Inspect, 57 evidence rows, NODE 4060 segment-only, no BOUND/Apply; limited heartbeat samples are diagnostic only.

**Fail closed:** missing Edge or fixture, SHA mismatch (including Windows CRLF transformation), missing Worker, stale evidence, unauthorized Compare/Apply, or any failing test produces nonzero exit and an evidence receipt with failure reason. There is no fallback to using a different browser or making up a physical match.

## Evidence and interpretation

After completion, the script writes an evidence folder and ZIP under `test-results/i121-owner-edge-local/<UTC timestamp>`. It includes a machine-readable `receipt.json` (Git SHA, Edge/OS/Node versions, actual fixture hashes, per-test pass/fail) and test logs. The four original CII files themselves are **not** copied into the ZIP. Inspect local logs for personal paths or other sensitive information before sharing. Publish the tested commit, ZIP or selected receipt and notes on [Issue #121](https://github.com/reallakshman19/XML_Compare_Utilities/issues/121).

Automated test PASS is **not the same as Owner acceptance**. The Owner should additionally observe their actual problem with the same files and UI: confirm no "page is unresponsive" dialog, selection changes cancel stale activity, Inspect and comparison controls respond to input, and all derived identities remain traceable. Record subjective responsiveness, browser version, console errors and observed start/end times. Only an independently validated physical S1↔T base can unlock legitimate full Compare→Review→Transfer testing; do **not** invent an anchor to make the automation green. Method C A-only read-only geometry does not authorize BOUND or Writer2 Apply.

## Immutable authority and remaining gates

- Review exact implementation [draft PR #132](https://github.com/reallakshman19/XML_Compare_Utilities/pull/132), QA [draft PR #133](https://github.com/reallakshman19/XML_Compare_Utilities/pull/133), independent-review workpack [Issue #134](https://github.com/reallakshman19/XML_Compare_Utilities/issues/134), and [BuddyRunner G1 final](https://github.com/reallakshman19/XML_Compare_Utilities/issues/121#issuecomment-6251903599).
- The `docs/` committed Worker result is `inspection` only; newer PR107-owned `tabs/` consumes `{inspection,preparedSession}` and is **not** tested or edited here.
- A separate qualified independent P2 reviewer must read original sources and submit their verdict. Owner decides actual local Edge acceptance, post-Inspect full-workflow acceptance, PR stack merge order and deployment. All remain HOLD unless explicitly approved.

**Status to report accurately:** `LOCAL_EDGE_AUTOMATED=PASS|FAIL|NOT_RUN`; `OWNER_INTERACTIVE=ACCEPTED|REJECTED|NOT_RUN`; `P2=PASS|NEEDS_WORK|FAIL|NOT_RUN`; `FULL_PHYSICAL_COMPARE=NOT_RUN` until a genuine reviewed S1 base exists. Do not collapse these into one green label.
