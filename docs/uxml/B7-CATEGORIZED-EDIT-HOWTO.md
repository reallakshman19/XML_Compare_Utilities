# B7 · Edit a Categorized InputXML value and patch the original bytes

**Where:** XCU → InputXML Workspace → **4 Create Categorized XML** → **B7 · Edit Categorized values → patch original InputXML**. This is a separate, source-bound editor. The older **Categorized XML Conversion** controls above it are compatibility conversion, not a verified source-byte patch.

## How to use

1. Choose **Original InputXML** and select a local CAESAR II InputXML file. B7 reads its **bytes locally**, measures SHA-256, checks strict S3, generates the unchanged S4.0 Categorized view, then requires source-bound S4.1 admission. No file contents are sent over the network or saved in localStorage. Malformed/refused input shows the refusal code and plain-language reason, without a download.
2. Edit the **Categorized text** directly in the B7 textarea. For example change an existing `<DIAMETER>114.299995</DIAMETER>` to `<DIAMETER>127.125</DIAMETER>` within `SectionDimensionBlock`. The nine authorized one-to-one paths are `NameBlock.FROM_NAME/TO_NAME/NAME`, `RouteGeometryBlock.DELTA_X/Y/Z`, `SectionDimensionBlock.DIAMETER/WALL_THICK/INSUL_THICK`; the source attribute must already exist and be projected. Edit just the visible leaf: **do not edit OriginalElement CDATA by hand**. Derived, line-owned, merged, unknown, identity, UNITS or structural edits are refused. Use **Reset to baseline** to discard the editor changes.
3. Press **Check patch-back**. The exact S4.2 slice-2 patcher runs with the pinned original source, unchanged baseline and edited text. The table shows **physical row, source record key, exact tag/attribute, old value, new value, and original byte range**. A mapped text value is reported as written exactly as typed, not silently rounded. `FROM_NAME` or `TO_NAME` labels also used by other nodes produce a **non-blocking warning**.
4. **Download patched original** is enabled **only** after a successful S4.2 `ok:true` / `parity:'EQUAL'` on the current editor/source revision. The filename gains `-patched` before `.xml`. The download payload is a copy of the **original S4.2 result.bytes**, *not* the Categorized text, a reconstructed XML file, or a text-mode save. All unchanged original bytes, including BOM, EOL, XML header, comments, attribute order and other records, remain untouched.
5. To keep editing, inspect **Regenerated Categorized view**, then press **Continue editing from here**. This makes S4.0 of the patched bytes the next baseline and refreshes all derived values. You must Check again before downloading another patch.

**Textarea line endings:** Browsers normalize visible textarea newlines. The B7 editor restores the S4.0 baseline's exact LF/CRLF separator sequence before Check when the line count is unchanged, so CDATA source snapshots are not silently normalized. Structural line insertion/removal is not accommodated and remains subject to refusal. The original uploaded byte array is never normalized or rewritten for this adjustment.

**Every change, Reset, new file load, or newer Check invalidates the previous download immediately.** An older asynchronous Check cannot release bytes after the source/editor revision changed. A refusal shows its exact code with one-line explanation and keeps download disabled.

## Refusal codes, limits and review

The panel has an explanation for every live `UXML_CATEGORIZED_PATCH_REFUSALS` and S4.1 reader code, plus strict S3 errors. Common examples are `S42_UNMAPPED_OR_DERIVED_PROJECTION_EDIT`, `S42_S40_PROJECTION_MISMATCH`, `S42_SHARED_EXTERNAL_EDIT_REFUSED`, `S42_ORIGINAL_SHA_MISMATCH`, `S42_UNITS_EDIT_REFUSED`, `S42_SOURCE_OFFSET_NOT_EXACT`, and `S42_PARITY_FAILED`. There is **no force/download-anyway option**.

**Conservative review disposition:** The rare combination “consistent SIF snapshot edit in one physical row *plus* a mapped projection edit in another physical row” may continue to refuse under the existing slice-2 rules. B7 does **not** widen patcher acceptance to resolve that without a separately approved proof and new independent tests. Other SIF owner rules remain unchanged. The unused legacy `S42_DERIVED_OR_LINE_PROJECTION_EDITED` constant was retired; this changes no acceptance condition.

**Scope/authority:** No UI Apply, XML reverse conversion, automatic engineering solution, tolerances, CLOS change or topology fix. B7 is in-memory only until a user explicitly requests the verified byte download. S4.2 is the sole writer authority. Browser qualification uses only public GRE, PLB314, mock and BM_CII files, with LF/CRLF byte checks. Native Windows and private Owner file trials are separate qualifications.

## B8 Categorized editable coverage (Owner Decision A, 3 Nov 2026)
The **Mapped source value** picker labels each visible eligible field **Editable** or
**Read-only**. Its value box changes exactly that leaf in the Categorized editor;
**Check patch-back** is still mandatory. The advanced textarea can display any XML,
but it does **not** authorize every possible text change. Unsupported changes produce
a refusal table naming each detected element row or Line, tag, code and reason.
A refusal always disables Download; there is no override.

**Element fields** (only explicitly present source attributes):
`NameBlock.FROM_NAME`, `NameBlock.TO_NAME`, `NameBlock.NAME`,
`RouteGeometryBlock.DELTA_X`, `DELTA_Y`, `DELTA_Z`,
`SectionDimensionBlock.DIAMETER`, `WALL_THICK`, `INSUL_THICK`.
S4.0 synthesizes `NameBlock.NAME` from the element key if the source omitted
`NAME`: that display is **read-only** and attempts to create a source attribute
refuse `S42_SOURCE_ATTRIBUTE_OMITTED_OR_DERIVED` with element row and tag.
A `DELTA_Y` edit is not intrinsically unsafe; S3 must still accept the patched
delta graph. Graph conflicts refuse `S42_SOURCE_GRAPH_CONFLICT` with row and tag.

**Line-scoped ProcessBlock fields** mapped exactly to their same-named
`PIPINGELEMENT` attributes:
`TEMP_EXP_C1` through `TEMP_EXP_C9`, `PRESSURE1` through `PRESSURE9`,
`HYDRO_PRESSURE`, `INSUL_DENSITY`, `FLUID_DENSITY`,
`REFRACTORY_DENSITY`, `REFRACTORY_THK`, `CLADDING_DEN`,
`CLADDING_THK`, `INSUL_CLAD_UNIT_WEIGHT`, `INSUL_CLAD_UNIT_WEIGH`.

**Line-scoped MaterialBlock fields** mapped to same-named source attributes:
`MATERIAL_NUM`, `MATERIAL_NAME`, `CORR_ALLOW`, `MODULUS`,
`HOT_MOD1` through `HOT_MOD9`, `POISSONS`, `PIPE_DENSITY`,
`MILL_TOL_PLUS`, `MILL_TOL_MINUS`, `SEAM_WELD`.

The unchanged S4.0 converter picks the **first nonempty/non-`-1.0101`**
source value per Line and field. A successful B8 edit patches **every**
source element in that Line that explicitly holds an agreeing non-sentinel
value; missing attributes and sentinel carry-forward rows are left byte-for-byte
unchanged. If meaningful explicit values disagree, the displayed first value
is not a pure collapse, so edit refuses `S42_LINE_DERIVED_OR_DISAGREEING_VALUES`.
Every written source attribute is a separate `changes[]` row, with old/new text
and byte offsets; S4.0(patched) must echo the requested leaf exactly. Strict
S3/S4.1 and the original-byte S4.2 writer still gate final parity EQUAL.

**Global AllowableStress is read-only.** S4.0 globally harvests each
`ALLOWABLESTRESS` stanza and repeats it in every line's
`MaterialBlock.AllowableStressBlock`, without a unique Line owner. An edit
refuses `S42_GLOBAL_SHARED_STANZA_READ_ONLY` with the Line and
`ALLOWABLESTRESS` tag, together with other offending edits. No silent global
update, inverse converter, guessed line ownership, or engineering override.
An ownership-aware global editor is a separate Owner/Oracle follow-up.

**B7 follow-up controls:** Require exactly `ok === true`, not merely truthy.
Continue Editing does not add `-patched` repeatedly and stages rebinding
before replacing the current source; refused rebind preserves the loaded
source. A changed editor line-break count refuses
`B7_EDITOR_LINE_STRUCTURE_CHANGED` rather than attempting mixed-CRLF
restoration. The “written exactly as typed” label only comes from the patch
engine's `writtenExactlyAsTyped` evidence, not a UI field-name regex.
The refusal map covers the added B8 codes. Release-last revision and
original SHA/editor snapshot gates remain in force.

**DELTA_Y public regression diagnosis (exact-head S3/S4.1):** On the BM_CII public first visible `DELTA_Y +1` case, the original S4.1 baseline is accepted; the mutated candidate fails unchanged strict S3 with `INPUT_XML_DELTA_PATH_CONFLICT`. S4.1 then refuses that candidate as `CATEGORIZED_ORIGINAL_S3_REFUSED`. B8 names the refusal `S42_SOURCE_GRAPH_CONFLICT` with the element row and `DELTA_Y` tag, preserving `bytes:null` and the strict gate. This is a delta-path consistency conflict, not numeric formatting. The other three public sample candidates return EQUAL. No S3/S4.0/S4.1 rule is bypassed.


### B8 repair round 1 — classification and shared source safety
An **Editable** option is no longer inferred merely from a visible XML leaf. The
source-bound engine classifies each existing leaf against the original SHA,
S4.0 exact baseline and S4.1 record binding. Line values are checked against
**every** meaningful explicit holder, omitted/`-1.0101` carry-forward
records, source text agreement, and any later different Line reached by
the carry chain. Delta fields are checked against unchanged **strict S3**
candidate graph admission. For speed, these are **classification preflights**
and do not replay every full original-byte transaction during file load.
**Check patch-back** still runs the exact complete S4.2 writer, S3 key
equality and S4.1 parity for the actual typed value and any combinations.
No Download is released from a classification or a failed Check.

A Line A `PRESSURE1="10"` followed by Line B's omitted or
`PRESSURE1="-1.0101"` receives
`S42_CROSS_LINE_CARRY_FORWARD_REFUSED` if Line A is edited: B would
otherwise silently inherit the new physical value despite having no
visible S4.0 pressure leaf. A meaningful explicit Line B holder breaks
that chain, including when B's value is numerically equal to A's old
value. Different explicit holder texts such as `5.0` and `5`
refuse with a **source-format difference** reason even though their
numbers are equal. The UI explains that Material edits refuse when
different physical elements on one Line hold different material values.

A refusal table combines all detectable Line and Element leaf errors,
including shared AllowableStress, missing/derived values, malformed typed
text and inconsistent source holders, each with Line/physical row and tag.
**Written exactly as typed** comes from the actual written recordKey,
tag and decoded value on a successful original-byte patch — matching
another row's field is not sufficient. The original remains untouched
after every refusal.
