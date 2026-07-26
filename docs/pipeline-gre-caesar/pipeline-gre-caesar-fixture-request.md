# CAESAR GRE bend qualification fixture request

Create every fixture in one documented CAESAR II version/build and unit file. Preserve and SHA-256 hash the native job, original InputXML, imported job, re-exported InputXML, unit file, screenshots, and operator log. Bind the package to the generating repository commit.

| ID | Required case |
|---|---|
| F1 | ISO 14692-2005, 90-degree bend, no user curvature nodes |
| F2 | ISO 14692-2017, 90-degree bend, no user curvature nodes |
| F3 | Project GRE code and edition, non-90-degree bend |
| F4 | Project GRE code and edition, explicit midpoint curvature node |
| F5 | Project GRE code and edition, fitting thickness different from pipe |
| F6 | P3D tangency-separated topology import attempt |
| F7 | CAESAR-native consecutive entering/leaving-element control |

Record every import warning and error verbatim. An accepted import must be warning-free. Re-export comparisons must contain structured evidence for bend ownership, connectivity, semantic node roles, radius, fitting thickness, TYPE numeric and lexical values, NUM_MITER numeric and lexical values, curvature-node roles, NUMELT, NUMBEND, units, code/edition, and laminate. Do not edit or normalize XML between steps.
