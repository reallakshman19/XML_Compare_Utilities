# EP-SUPPORT-REPORT-1154-0015 — WP-009A benchmark/location + staged JSON trace pre-work

CHAIN_STATE_VERSION: 3
CHAIN_ID: SUPPORT-REPORT-1154
ENDPOINT_ID: EP-SUPPORT-REPORT-1154-0015
ENDPOINT_CLASS: PREWORK
PREVIOUS_ENDPOINT: EP-SUPPORT-REPORT-1154-0014
WORK_ITEM_KEY: github:reallaksh19/XML_Compare_Utilities#1154
WORK_PACKAGE: WP-009A
OWNER_INSTRUCTION: 2026-09-10T06:02:03Z `proceed now, update concept note also`
MAIN_BASIS: b6737f45365dbabaf86e71c070166e3c293afe90
WRITE_AUTHORITY: WRITE_ALLOWED_FOR_WP009A_ONLY
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
QUESTION_DISPLAY: HIDE

## Owner clarification captured

1. Report rows are location-aware. The same pipe on the same secondary family remains one row when clash points represent the same physical support location, but splits when the pipe is supported at materially different locations.
2. `PS-12154` pipe `ASIM-1885-2"-D8810003-11441T3-PP-01` is the positive same-location case: `/PS-12154.2, /PS-12154.5` remains one row and carries no multiple-location remark.
3. `PS-12120` pipe `/ASIM-1885-2"-P8810365-31441C4-HT-01` is the real multi-location case and must yield multiple report rows. Split rows use the exact crisp remark `Pipe supported at multiple locations`.
4. Staged JSON becomes first-class Support Report enrichment evidence. Preferred production mapping now is direct PS/SL member identity. Coordinate/base-anchor matching is a later placeholder and must not silently activate.
5. Support Report UI must allow staged JSON import and show a compact JSON trace/evidence view per PS/SL member including mapping basis and position basis.
6. Requested staged-data report targets are support type, piping primary-support reference, pipe schedule, insulation thickness, insulation type and primary-support description, but each field may populate only when an accepted authoritative source attribute exists.
7. Primary Support Zone/Site derivation must support CU-PI paths as well as the existing CU-PL paths.

## Real benchmark basis

Repository benchmark files added by Owner on live main:
- `benchmarks/SupportreportXML-PS-068_PS-12154.xml`
- `benchmarks/SupportreportXML-PS-12120.xml`
- `benchmarks/SL-097 and PS-007.xlsx`

Independent benchmark observations:
- PS-12154 `.5` and `.2` on the same pipe and `/PS-12154-BAR-7` have clash points approximately 38.4 mm apart and belong to one physical report location by Owner definition.
- PS-12120 repeated pipe `P8810365` has clash locations separated by 300 mm and more, therefore it must split into multiple report locations.

Owner-linked staged JSON authority:
- `reallaksh19/3D_Converters_v1.78@c76b4673087647493f3305a3d6492ad76e65a60d/Benchmarks/1885_NC/1885_NC.json`
- inspected native `/PS-12154.2` evidence includes current member identity, OWNER branch, POS/POSI, REF, PREV-NAME, CMPSUPTYPE, MDSSUPPTYPE, ABORE, INSU and DTXR.

## Authority invariants

- Clash XML owns relationship + clash-location evidence, not native engineering attributes.
- Staged JSON owns native member identity/attributes/position where direct or otherwise explicitly approved mapping proves correspondence.
- Owner workbook remains output oracle and may never be used as staged-model engineering input.
- Direct current PS/SL member ID is preferred. Previous-name alias may be used only when the staged record explicitly carries the observed old identity.
- Coordinate/base-anchor matching is NOT ACTIVE in this package.
- Pipe schedule and insulation type remain blank when no accepted authoritative attribute exists; do not infer them from free-text descriptions/spec strings merely to fill cells.

## Planned bounded patch

- location-cluster report grouping with explicit reporting tolerance and real benchmark tests;
- automatic multi-location remark only when one pipe produces more than one location cluster;
- generic CU primary site/zone path projection;
- direct staged-member/previous-name alias resolver with per-row JSON trace evidence;
- Support Report-local staged JSON file import seam reusing the existing combined staged-model source rather than creating a second authority;
- compact JSON trace view;
- accepted staged attribute aliases including `INSU` for insulation thickness where applicable;
- dedicated Support Report concept note under `docs/`;
- focused real-benchmark and staged-trace tests.

## Non-goals / protected boundaries

- no coordinate/base-anchor matching implementation;
- no expected-value hard coding;
- no broad Support/Steel geometry/topology refactor;
- no workflow/dependency/runtime/writer change;
- no merge in this progression without a later explicit Owner authorization.

EXACT_NEXT_ACTION: create isolated WP-009A material branch from `b6737f45365dbabaf86e71c070166e3c293afe90`; implement the bounded patch; execute real benchmark/focused regressions; open draft PR; freeze LEG-007 and successor endpoint; update concept note and issue Active Handover.