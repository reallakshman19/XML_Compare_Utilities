# XMLv3 framework and bounded converter

Python 3.10+, standard library only. This isolated implementation reads a supported CII, creates editable typed XMLv3, reconstructs CII from XML alone, and exposes a reference-only Branch → Element → Node view. It reuses the exact pinned XMLv2 parser/writer without changing that held package.

Run from the repository root. Choose an existing private output directory and fresh destination names:

```powershell
python -B prototypes/ciifr-xmlv3/cii_xmlv3.py verify 'C:\private\model.CII'
python -B prototypes/ciifr-xmlv3/cii_xmlv3.py to-xml 'C:\private\model.CII' 'C:\private\output\model.xml'
python -B prototypes/ciifr-xmlv3/cii_xmlv3.py inspect 'C:\private\output\model.xml'
python -B prototypes/ciifr-xmlv3/cii_xmlv3.py inspect-dependencies 'C:\private\output\model.xml'
python -B prototypes/ciifr-xmlv3/cii_xmlv3.py to-cii 'C:\private\output\model.xml' 'C:\private\output\recovered.CII'
python -B prototypes/ciifr-xmlv3/cii_xmlv3.py edit-diameter 'C:\private\output\model.xml' element-000001 254 'C:\private\output\edited.xml'
python -B prototypes/ciifr-xmlv3/cii_xmlv3.py to-cii 'C:\private\output\edited.xml' 'C:\private\output\edited.CII'
```

`verify` compares complete original and reconstructed bytes, length and SHA-256. Conversion receipts report the actual output digest. `edit-diameter` edits one existing element in source units, requires a positive exactly representable value and preserves the original tree. It does not convert units or authorize property transfer. Every destination must be new; failures exit with code 2. The publisher uses a complete temporary file and an exclusive same-directory rename on Windows or hard link on other platforms. Unsupported publication operations fail closed.

## Bounded XML intake

`inspect`, `inspect-dependencies`, `to-cii` and `edit-diameter` use `xmlv3/intake.py` before parsing. The reader consumes at most150000001 bytes for the existing150000000-byte XML cap, bounds every request by its remaining budget, continues after short reads and accepts only on actual EOF. Oversize input retains the existing size diagnostic and exit2, with no published output or overwritten destination. A would-block/no-data response raises an I/O error instead of being mistaken for EOF.

This is an input-byte bound, not a total-memory/RSS or execution-time limit. Bytearray conversion and XML parsing allocate additional memory. It is not an atomic filesystem snapshot; growth after observed EOF is outside that guarantee. CII commands `verify`/`to-xml` retain their existing intake policy. Direct API callers supplying already materialized bytes retain the core size check; future services need their own request-body bounds.

## Structure and authority

The XML root is `RichInputXMLv3`, schema `RichInputXMLv3.0`:

- `Storage/RichInputXMLv2`: ordered sections, records, rows, typed values, original lexemes, layout and validated relationships. These fields alone drive CII output.
- `EngineeringViews/Branches`: groups by exact stored Line Number label; each member references its element and label field. A grouping is not a connected-topology assertion.
- `EngineeringViews/Elements`: endpoint references, elemental data field references, auxiliary-record references and positional MISC material references.
- `EngineeringViews/Nodes`: model-local endpoint occurrences and Node Name field occurrences. Shared fields remain references. Conflicting names or a name field referenced by distinct nodes remain explicit issues; no alias is chosen automatically.

Field keys are `record-id/field-name`, for example `element-000001/outside_diameter`. They identify fields in this model; they are not cross-file correspondence certificates. Generated view fields contain references, never copied authoritative engineering values. Validation regenerates the reference graph and rejects stale, extra or duplicated views.

The envelope's `structure-sha256` catches accidental changes to original lexical/layout metadata, cardinality, node identity, pointers, material assignments and coordinates. It is a consistency digest, not authentication or editing permission. Original source SHA/length retained inside Storage are provenance; after an edit they are not the output's digest. Use the actual conversion receipt for output identity.

## Read-only CONTROL/MISC dependency report

`inspect-dependencies MODEL.xml` consumes only a supported, existing XMLv3 file
through the same bounded intake and complete Storage/view validation as `inspect`.
It prints JSON to stdout; it does not write output files, CII, or modified XML.
The `input` SHA-256 and byte length are the **current XML input's** fingerprint,
not the original CII provenance. `dependency_pins` identifies the exact held
XMLv2 parser/profile modules loaded at startup. `status: PASS` means only that
this qualified-profile inspection succeeded; it is not native or engineering
acceptance. `structural_recalculation: UNSUPPORTED` remains explicit.

`control.entries` retains all 19 original field references in four 6/6/6/1 rows:
16 qualified `logical-record-count` values are compared with the number of
Storage `Record` elements (including unreferenced auxiliary records), without
using physical row counts or owner usage. `NOZZLES` and `HANGERS` are unqualified
special counts, currently restricted to zero; `IZUP` is a zero-only supported
orientation **flag**, not a derived record count.

`misc.material_associations` describes each ELEMENTS ordinal's corresponding
positional `MISCEL_1/material_id_*` field, source line, zero-based row/slot,
13-character lexical column span within that row, identifier (1–699), and
validated material-link target. Source line is not an absolute byte offset.
`line_color` and `line_visibility` in ELEMENTS are different fields. The report
also compares observed versus expected material and execution row shapes and
shows the four indexed mixed-type execution rows, without inventing meanings
for those option fields. The external material catalogue is not loaded.
Structural edits, option editing, nonzero nozzles/hangers/IZUP and property
transfer are outside this command.

## Supported boundary

Profile `CII-V14-ASCII-CRLF-B001`: printable ASCII, exact 22-section sequence, final CRLF, observed VERSION trio and qualified populated records. The inherited writer supports observed ELEMENTS, NODENAME, BEND, RIGID, RESTRANT, DISPLMNT, ALLOWBLS, SIF/TEES and REDUCERS plus the supported globals. Populated EXPJT, FORCMNT, UNIFORM, WIND, OFFSETS, FLANGES and EQUIPMNT remain rejected. NOZZLES/HANGERS/nonzero IZUP remain outside this implementation profile; rejection is not a claim that native v14 disallows them.

CONTROL declares logical counts, not line counts. This implementation verifies them against records. The supported MISC profile has one material assignment per element, six per physical row, plus four execution rows. It validates these dependencies; it does not construct or recalculate structural changes. CONTROL trailing-field native admissibility (E1 F3) remains unresolved. No native acceptance, broad codepage support, full engineering field semantics, browser UI or downstream transfer is claimed.

## Code and evidence

| Module | Responsibility |
|---|---|
| `xmlv3/baseline.py` | Verify pinned engine/profile bytes at process startup; load with isolated profile binding |
| `xmlv3/core.py` | Strict envelope, typed-storage conversion, exact edit validation, receipts |
| `xmlv3/views.py` | Reference hierarchy, shared occurrences and explicit alias issues |
| `xmlv3/guards.py` | Structural and lexical consistency; deterministic view comparison |
| `xmlv3/intake.py` | EOF-aware XML file reader with cumulative byte budget before parsing |
| `xmlv3/publish.py` | Complete-file, exclusive publication |
| `xmlv3/cli.py` | Usable local conversion, verification, inspection and diameter edit |
| `xmlv3/dependencies.py` | Validated read-only CONTROL/MISC dependency projection |
| `tests/test_integration.py` | Actual private-input XML-only and CLI journey, independent byte splice, negatives and labeled fault injection |
| `tests/test_intake.py` | Real-file boundaries/growth, labeled short-read/would-block faults and actual oversized CLI/output protection |
| `tests/test_dependencies.py` | Raw-physical private oracle, material-slot and read-only/negative dependency checks |

The integration test requires the existing authorized 803,776-byte primary with its frozen SHA and an explicitly chosen, existing private scratch directory; no private model is included. Test subdirectories are confined to that directory and cleaned after use:

```powershell
python -B prototypes/ciifr-xmlv3/tests/test_integration.py --fixture 'C:\private\B001-original.CII' --scratch 'C:\private\xmlv3-test-scratch'
python -B prototypes/ciifr-xmlv3/tests/test_intake.py --scratch 'C:\private\xmlv3-test-scratch'
```

The XML-only test starts a separate process with XML on stdin and denies file/network/subprocess access after dependency import. The edit expectation is a literal 13-byte splice independently specified from raw CII layout. Derived alias conflicts and simulated filesystem faults are labeled in the test. Native CAESAR and distinct external assessment are separate, unrun claims.

Engineering PR Delivery is withdrawn, including A1-A5/adoption requirements; no admission score is asserted. Backups, local module patches and evidence remain available. See [high-risk items](../../docs/ciifr/xmlv3/HIGH_RISK_ITEMS.md) and the [agent onboarding plan](../../docs/ciifr/xmlv3/AGENT_ONBOARDING.md).
