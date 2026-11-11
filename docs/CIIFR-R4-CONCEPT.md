# CIIFR R4: source-faithful XMLv2 with engineering line/node views
Owner aim (2026-10-24): **CII → XMLv2 → CII must be byte-identical; SHA-256 and file sizes must match exactly.**
R4 supersedes R3 inside the existing Progress project `ciifr`; retain R1–R3 as history. Standalone Oracle, not OTM.
Pinned Common protocol: https://github.com/reallakshman19/Common/tree/37435267c861d54998fee589e6dc91385bf59bfa/skills/agent-work
Tracking: #158, builder S1 #159, builder S2 #160, independent review #161.

## One serializer, two read-only views
1. Raw ASCII/CRLF CII → unchanged R3 B001 byte lexer and positional field records.
2. Each physical record and field retains exact lexeme, prefix/gaps, ordinal, source line, section, element index and pointer identity.
3. Serialize explicit XMLv2. Re-read the XML **without access to original CII input**.
4. Regenerate CII and compare against a **separately trusted** source size and SHA-256. Any difference is an error, and no verified output may be emitted.
5. XMLv2 → read-only Engineering Line → Element → Properties; and Engineering Line → Node → Nodal associations. The index must not be used as the writer, and editing the view must not alter XML.

Element scope: geometry, dimensions, corrosion/insulation, temperatures/pressures, literal material ID, component-owned RIGID/BEND/REDUCER/allowable references. Node scope: endpoints, node names, restraint DOFs/CNODE, imposed displacements, intersection-node SIF/tee, bend position nodes. RIGID does not become a node property merely because it is referenced on an element. Every event points back to its owner and physical source row.

## Nonnegotiable
- Preserve blank engineering line labels; no guessed carry-forward.
- Preserve stored `0`, near-zero, `9999.99` and any other source lexeme without turning it into an engineering physical value.
- A zero byte diff does **not** prove native CAESAR II XML compatibility, effective material properties, or validated global geometry.
- Unrecognized populated sections/dialects fail closed.
- The protected real CII is never committed to public repository or Progress page. Public fixtures must be wholly invented.

## First two prototype slices
**S1:** runnable standalone hard-gated roundtrip + synthetic fixture + real private benchmark; one user command; byte/hash proof.
**S2:** read-only line/element/node navigation built on the same S1 XMLv2 model, with source pointers and raw/effective-unknown distinctions.
S3 transfer/edit mode remains deferred until new source-grounded mapping and explicit Owner approval plus independent verification.

Build on draft PR; no new competing serializer, no P2/P2.1 changes, no merge. Reviewer must attempt a surviving-error challenge at exact head. Owner native Windows and CAESAR acceptance NOT_RUN.
