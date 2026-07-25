# CAESAR GRE bend qualification fixture request

Create each fixture in the same documented CAESAR II build and unit file. Preserve the native job, exported InputXML, re-imported job, re-exported InputXML, screenshots, and operator log.

| ID | Required case |
|---|---|
| F1 | ISO 14692-2005, 90-degree bend, no user curvature nodes |
| F2 | ISO 14692-2017, 90-degree bend, no user curvature nodes |
| F3 | Project GRE code and edition, non-90-degree bend |
| F4 | Project GRE code and edition, explicit midpoint curvature node |
| F5 | Project GRE code and edition, fitting thickness different from pipe |
| F6 | P3D tangency-separated topology import attempt |
| F7 | CAESAR-native consecutive entering/leaving-element control |

For every fixture record CAESAR version/build, XML version, unit file, numeric piping-code ID, authoritative code name and edition, laminate classification, element and bend counts, exact BEND attributes, logical node continuity, and SHA-256 hashes. Import the exported XML into a clean job, record acceptance or every diagnostic, then re-export and compare semantic bend ownership, TYPE, NUM_MITER, curvature nodes, radius, fitting thickness, element count, bend count, and node continuity. Do not normalize sentinel values or edit XML between steps.
