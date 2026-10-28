# PR214 — Option B P0 XML Compare authority separation

**WORK_INTENT:** IMPLEMENT · **CRITICALITY:** ENGINEERING_CRITICAL  
**PR:** https://github.com/reallakshman19/XML_Compare_Utilities/pull/214  
**STATE:** DRAFT, implementation committed, independent review and CI pending  
**AUTHORITY:** User instruction "proceed fix" within previously selected Option B; no merge authority  
**BASE MAIN:** `7b4a95bd18262e29b83eddc88fca41720585b5ef` (checked at branch creation)
**BRANCH:** `fix/xml-compare-option-b-p0-20261028`

## Handover in 60 seconds

First implementation of Option B P0. `linkExactIsoNotePairs()` no longer writes engineering audit links to transfer `approvedMatchSet`. Instead, `createIsoNoteAuditIdentityLinks()` creates read-only links independently of the canvas state. `applyXmlCompareCanvasAction()` requires an explicit approvalContext for individual, bulk, or pending-connector approvals, and applies `guardCompositeApprovalAction` at the state transition. The tab supplies document-scoped policy/records or an explicit generic scope.

The PR is **not merged** and should not be merged without CI and review.

## Protected invariants

- **H1:** No ISO audit action may change `approvedMatchSet`, `matchDecisions`, transfer state, canvas selections, pending previews or AIM. Audit links must be `IDENTITY_VERIFIED_NOT_TRANSFER_APPROVED` and separate from approval state.
- **H2:** Approval reducers fail closed without explicit context and reject unresolved, wrong-pipeline, same-partition and mixed-validity batch cases under ISO policy.
- **PR209 identity:** Full support ID + normalized pipeline, noncanonical IDs review-only, no `NODE_NUM` identity substitution, `/DATUM` normalization preserved.
- **Generic non-ISO:** Existing explicit candidate approvals remain available with `approvalContext: { scoped: false }`.
- **No engineering mutation:** Gap/restraint rules, transfer application and export algorithms, source XML/geometry and production deployment procedures remain unchanged.

## Source-grounded diagnosis and falsifier

**Previous wrong boundary:** `linkExactIsoNotePairs` reset canvas state then passed exact audit candidates to `bulk-approve-candidate-pairs`; the generic reducer also accepted approval actions without domain context. **Falsifier:** new audit still changes the approved match set, or direct reducer accepts a wrong-pipeline candidate or an uncontextualized approval.

## Changed-file ledger

- `xml-compare/XmlCompareIsoNoteAuditIdentityLinks.js` and `docs/xml-compare/XmlCompareIsoNoteAuditIdentityLinks.js`: new read-only exact link projection with original row references.
- `xml-compare/XmlCompareCanvasStateController.js` and `docs/xml-compare/XmlCompareCanvasStateController.js`: mandatory approval context and reducer-level guard; invalid approval returns unchanged approval set plus blocking log.
- `tabs/xml-compare-tab.js` and `docs/tabs/xml-compare-tab.js`: use audit link collection, preserve AIM/canvas, pass loaded-document scoped context into reducer.
- `tests/xml-compare-iso-note-direct-compare.test.js`: audit-only regression and missing-context denial replacing obsolete audit-approval assertion.
- `tests/xml-compare-option-b-p0-boundaries.test.js`: individual, bulk, pending, missing-context, valid ISO, generic and audit evidence checks.
- `tests/xml-compare-approved-connector-workflow.test.js`, `tests/xml-compare-readiness-gated-transfer-workflow.test.js`, `tests/xml-compare-state-backed-transfer-stage.test.js`: explicitly scoped generic approval tests.
- `package.json`: includes the new test in the existing XML script.
- `agents/PR214_workreport.md`: this recovery/handover record.

## Upstream/downstream analysis

Upstream source parser, ISO identity adapter, policy and source ROW/provenance unchanged. Audit outputs retain exact pair count without creating transfer authorization. Downstream generic transfer still consumes `ApprovedMatchSet` only for true application approvals. No change to transfer plans or patched XML, although generic connector tests need explicit scope context.

## Validation ledger

- Source inspection / code + branch changes: **PASS (SOURCE_INSPECTION)**, pending complete CI.
- Full XML and Table qualification: **NOT_RUN (LOCAL)**, GitHub CI requested by PR; full XML has documented pre-existing startup build-stamp exception.
- ISO Chromium test: **NOT_RUN (LOCAL)**, GitHub CI requested.
- Real original engineering rows: **NOT_RUN**, repo test uses synthetic 2,778/819 reference; cannot claim independent real-file replay.
- Production deployed JavaScript: **NOT_RUN**; docs mirror source was written alongside production source.

## Risk/issues and next actions

**Highest risk:** Compatibility with test or external callers invoking the reducer directly without `approvalContext`. Any affected generic caller must be migrated to explicit generic context; do not weaken fail-closed behavior.

**Known residual debt:** Current generic caller may supply an explicit generic context; enforce source-role scope from trusted workspace at the application boundary. Dataset snapshots, aggregate gap semantics, cross-run lineage, full live UI qualification remain separate Option B P1 items.

**CI:** Observe PR214 checks at exact PR head; classify failures as introduced, pre-existing or unknown. Do not state unobserved PASS.

**Coordination:** PR213 is documentation-only and does not overlap product paths. No other open XML/ISO implementation PR was found during initial overlap scan. Refresh at next checkpoint.

**Patch/backups:** All existing files were updated through GitHub with blob SHA precondition, not overwritten indiscriminately. Each new file has no preimage and may be removed only after verifying it has not been subsequently changed. The repository's local `.agent-worklogs` and `utils/backup.cjs` cannot run in this connector-only environment, so a complete local reversal ledger is **NOT_AVAILABLE**; do not claim it exists.

**Undo:** Use file-level review of the PR diff against the base with SHA confirmation. Create a new reviewed corrective commit, not destructive repository reset.

**EXACT_NEXT_ACTION:** Check latest PR214 CI, inspect full diff and confirm no source-role, XML or transfer semantics changed; fix only introduced failures; have independent engineer review P0 invariants, then request PR review. No merge unless authorized.
