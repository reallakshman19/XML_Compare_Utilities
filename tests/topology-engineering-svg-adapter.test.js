import assert from 'node:assert/strict';
import { createEngineeringRevisionToken } from '../core/engineering-scene/index.js';
import { runEngineeringSvgAdapterConformance } from '../core/engineering-svg/engineering-svg-adapter-conformance.js';
import { readCanonicalTopology, readTopologyInputXml, readTopologyTraceLedger } from '../tabs/topology-trace-validator/topology-artifact-reader.js';
import { validateTopologyArtifacts } from '../tabs/topology-trace-validator/topology-independent-validator.js';
import { readManagedTopologySource } from '../tabs/topology-trace-validator/topology-source-reader.js';
import { createTopologyEngineeringSvgAdapter } from '../tabs/topology-trace-validator/topology-engineering-svg-adapter.js';
import { buildTopologyEngineeringSvgScene } from '../tabs/topology-trace-validator/topology-engineering-svg-scene.js';
import { prepareTopologyEngineeringSvgViewModel } from '../tabs/topology-trace-validator/topology-engineering-svg-view-model.js';
import { buildTopologySvgMarkup } from '../tabs/topology-trace-validator/topology-svg-renderer.js';
import { buildTopologySvgViewModel } from '../tabs/topology-trace-validator/topology-svg-view-model.js';
import { GEOMETRY_TOLERANCE_MM } from '../tabs/topology-trace-validator/topology-validator-values.js';
import {
  canonicalTopologyFixture,
  topologyInputXmlFixture,
  topologySourceFixture,
  topologyTraceLedgerFixture,
} from './fixtures/topology-trace-validator-fixture.js';

console.log('Topology Trace engineering SVG adapter parity test loaded');
