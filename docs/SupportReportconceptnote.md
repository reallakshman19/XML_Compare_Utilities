# Support Report Builder — Concept Note and Evidence Architecture

**Document:** `docs/SupportReportconceptnote.md`  
**Issue:** `#1154`  
**Current architecture:** Support Report addon inside **Support / Steel Relationship Builder**  
**Primary inputs:** Navisworks Support Report clash XML + optional combined staged-model JSON  
**Output contract:** Owner 21-column A:U Support Report CSV/XLSX contract

## 1. Mission

Build an auditable Support Report from Navisworks line-to-secondary-support clash evidence and enrich it with native model evidence without fabricating engineering data.

The report must answer four separate questions:

1. Which pipe is supported by which secondary PS/SL family?
2. At how many distinct physical support locations does that pipe meet that secondary support?
3. Which primary-support members and native attributes are proven by the staged model?
4. What evidence and fallback basis produced each report value?

## 2. Authority model

Authority is deliberately split.

| Evidence | Authority | Not authority for |
|---|---|---|
| Navisworks clash XML | pipe ↔ secondary-family relationship, observed primary member token, branch/line path, clash point | complete native membership, engineering attributes |
| Combined staged-model JSON | current PS/SL member identity, native attributes, native position, ownership/line context, carrier evidence | expected workbook values |
| Owner XLSX benchmark | output schema and expected result for a qualified benchmark | staged-model engineering source |

No output workbook cell may be fed back into production as native source data.

## 3. Report row grain is location-aware

The row grain is:

```text
secondarySupportFamilyId + fullLineTag + reportLocationCluster
```

A pipe may therefore appear more than once under the same secondary family when Navisworks proves physically separate support locations.

### 3.1 Report-location clustering

`reportLocationCluster` is built from clash points in global millimeters.

Current default reporting tolerance:

```text
locationMergeToleranceMm = 50
```

This tolerance is **only a report-row clustering tolerance**. It is not the Support/Steel analytical member-contact, carrier-contact or topology tolerance.

Rows whose clash points are within the same 50 mm location component remain one report row. Distinct components produce distinct rows.

### 3.2 Real benchmark controls

**PS-12154 — same physical location:**

`/PS-12154.5` and `/PS-12154.2` occur on pipe `ASIM-1885-2"-D8810003-11441T3-PP-01`, on `/PS-12154-BAR-7`, with clash points approximately 38.4 mm apart. They remain one report row:

```text
/PS-12154.2, /PS-12154.5
```

No multiple-location remark is emitted.

**PS-12120 — multiple physical locations:**

Pipe `/ASIM-1885-2"-P8810365-31441C4-HT-01` appears at five materially distinct clash locations, including pairs separated by 300 mm and additional substantially separated locations. It must produce five report rows. Each split row carries exactly:

```text
Pipe supported at multiple locations
```

The complete PS-12120 benchmark contains 19 clash rows and resolves to 14 location-aware report rows across 9 pipes. `ASIM-1885-4"-W8810126-31441C4-01` is also a valid multi-location pipe and resolves to two report rows. This remark describes row splitting by physical location; it is not triggered merely because two primary-support members share one row.

## 4. Duplicate evidence versus multiple locations

These concepts must stay separate:

- repeated clash evidence for the same member/line/location is duplicate evidence and may be deduplicated;
- REST/GUIDE or other multiple primary members at the same report location belong in one member list;
- the same pipe at separate location clusters produces separate report rows.

`TOTAL SUPPORT POINTS ON SECONDARY` follows the final location-aware report-row count for the secondary family.

## 5. Family-name mismatch and rename trace

A clash may prove a member token whose family does not match the secondary family, such as observed `/SL-147.1` under secondary `PS-068`.

The row is retained because the secondary-side clash evidence determines the report family relationship. The observed identity is never silently rewritten.

Preferred staged-model resolution order:

1. current member ID exact match;
2. explicit previous-name alias from the staged member (`PREV-NAME`, `PREV_NAME`, equivalent normalized key);
3. unresolved clash-only identity.

If a staged current member explicitly declares the observed old ID as its previous name, the current member becomes `PIPING PRIMARY SUPPORT`, the old identity is preserved in `PREV NAME`, and the JSON trace records `PREVIOUS_NAME_ALIAS`.

If no authoritative rename evidence exists, the observed member remains and the report carries a visible family-mismatch/rename-required remark. The application never invents the new PS number.

## 6. Staged JSON Trace

The Support Report dialog accepts an optional staged-model JSON source. It reuses the same combined staged-model source used by Support / Steel Relationship Builder; there is one source authority, not two independent model states.

### 6.1 Preferred mapping — active now

Direct PS/SL member identity is the preferred mapping key:

```text
/PS-068.2
/SL-147.1
```

The resolver uses existing Support/Steel hierarchy reading and line-context evidence. A direct ID with contradictory explicit line context is not silently accepted for enrichment.

### 6.2 Previous-name alias — active after explicit source proof

A staged current member may map an observed old clash identity through an explicit previous-name attribute. This is evidence-driven rename resolution, not heuristic renaming.

### 6.3 Coordinate/base-anchor mapping — later placeholder

A future method may correlate support identity through a base anchor and coordinates when names cannot be trusted. It is intentionally **inactive** in the current production path. No coordinate-based member identity substitution occurs until that method has its own authority definition, tolerance and benchmark qualification.

## 7. JSON trace evidence shown per PS/SL member

For each observed/resolved support member, the report evidence view should expose compact trace data:

- report family and pipe;
- observed clash member ID;
- resolved staged current member ID;
- mapping basis (`DIRECT_MEMBER_ID`, `PREVIOUS_NAME_ALIAS`, `FAMILY_LINE_ENRICHMENT`, unresolved/conflict basis);
- position basis (`NATIVE_MEMBER_POSITION` or clash fallback at row level);
- native POS when available;
- owner branch/full line context;
- source path in the staged JSON hierarchy;
- curated raw attributes relevant to report fields.

This trace is evidence. It must not recalculate report engineering values in the UI.

## 8. Field population from staged JSON

Requested fields and accepted authority direction:

| Report field | Preferred staged evidence |
|---|---|
| SIZE | carrier/pipe `BORE` first; approved alternate bore aliases only when no `BORE` evidence exists; line-name regex only when staged bore evidence is absent |
| SUPPORT TYPE | support member `CMPSUPTYPE`, `MDSSUPPTYPE`, `SUPPORT_TYPE`, approved aliases |
| PIPING PRIMARY SUPPORT | resolved current native member IDs |
| PIPING PRIMARY SUPPORT REFERENCE | member `REF` / approved reference aliases |
| PIPE SCHEDULE | authoritative carrier/pipe schedule attribute only |
| PIPE INSULATION THICKNESS | authoritative insulation-thickness key; `INSU` is accepted as a staged-model thickness attribute |
| PIPE INSULATION TYPE | authoritative insulation-type key only |
| PRIMARY SUPPORT DESCRIPTION | member `DTXR` / approved description alias |
| PREV NAME | explicit previous-name attribute |
| coordinates | native member position when available; clash point is explicit fallback |

### 8.1 SIZE / Bore authority

When staged JSON provides `Bore` / normalized `BORE`, that value is authoritative for report `SIZE`. It outranks `ABORE` and any nominal size parsed from the pipe name. Approved alternate staged bore aliases are consulted only when no `BORE` evidence exists anywhere in the selected authoritative carrier set.

If authoritative `BORE` values conflict, `SIZE` remains blank/conflict and the application does **not** fall back to `ABORE` or pipe-name regex. Pipe-name regex is strictly an XML-only/no-staged-bore fallback.

The system must **not** parse free-text DTXR or unrelated specification strings merely to manufacture pipe schedule or insulation type. Those fields stay blank/unresolved until an accepted source attribute is present.

## 9. Primary Support Site and Zone

Primary Site/Zone come from the primary pipe-side hierarchy or equivalent native ownership evidence. Native staged member `sourcePath` is preferred when it is available; clash primary path is the fallback. Conflicting native Site/Zone values remain blank/conflict and are not overwritten by clash fallback.

The path grammar is discipline-neutral:

```text
site: ...-CU-<discipline>
zone: immediate child ...-CU-<discipline>-<zone>
```

Therefore both of these families are valid:

```text
ASIM-1885-CU-PL
ASIM-1885-CU-PL-S

ASIM-1885-CU-PI
ASIM-1885-CU-PI-D
```

This corrects the previous PL-only projection that left PS-12154 Site/Zone blank despite CU-PI path evidence being present in the clash XML.

## 10. UI workflow

Inside **Support / Steel Relationship Builder → Support Report**:

1. Import/paste Support Report clash XML.
2. Optionally import the combined staged-model JSON from the Support Report panel. This writes to the same shared staged-model source used by the Input tab.
3. Build Support Report.
4. Review row table, completeness state, diagnostics and JSON trace evidence.
5. Export CSV/XLSX.

XML-only reports remain allowed but are labeled partial. Staged-model changes invalidate existing report/export state until rebuilt.

## 11. Provenance and fail-visible behavior

Every report row keeps field-level provenance. Key cases remain visible:

- native member attribute;
- native membership;
- native position;
- native member hierarchy/path;
- authoritative carrier attribute;
- clash relationship/group derivation;
- clash member or coordinate fallback;
- source conflict;
- unresolved.

Location splitting, rename resolution and staged mapping add evidence; they do not weaken existing fail-closed parser/member/carrier rules.

## 12. Benchmark matrix

| Benchmark | Purpose |
|---|---|
| `SL-097 and PS-007.xlsx` + frozen XML fixture | Owner 21-column contract and 10-row golden parity target |
| `SupportreportXML-PS-068_PS-12154.xml` | family-name mismatch + same-location multiple-member control + CU-PI Site/Zone |
| `SupportreportXML-PS-12120.xml` | 19-clash → 14-row complete location-aware report; two multi-location pipe controls |
| `1885_NC.json` at Owner-provided 3D_Converters commit | real staged-model member/attribute/POS/Bore evidence |

## 13. Remaining qualification boundary

The Support Report architecture can now be exercised with real repository benchmark XML and staged JSON evidence. Full cell-for-cell parity for any workbook remains benchmark-specific and must be proven from the corresponding authoritative staged source. External SheetJS/browser deployment checks remain separate delivery qualifications.

The final rule remains simple: **show evidence, preserve uncertainty, and never fill an engineering cell merely because a value looks plausible.**