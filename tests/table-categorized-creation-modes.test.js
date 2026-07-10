import assert from 'node:assert/strict';

import { buildCategorizedGraph } from '../xml-compare/table-categorizer/table-categorized-xml-graph-builder.js';
import { parseTableSource } from '../xml-compare/table-categorizer/table-categorized-xml-source-parser.js';

function rootWith(child, extra = {}) {
  return {
    profileId: 'creation-mode-test',
    ...extra,
    levelDefinitions: [
      { levelId: 'Root', levelType: 'container', creationMode: 'static', key: 'ROOT', documentRoot: true, children: [child] },
    ],
  };
}

const conditionalSource = parseTableSource('ID,Active\n1,Y\n2,N\n3,Y', { sourceId: 'S1', delimiterMode: 'comma' });
const conditionalGraph = buildCategorizedGraph(rootWith({
  levelId: 'ConditionalItem',
  levelType: 'occurrence',
  creationMode: 'conditional',
  keyResolver: { op: 'trim', column: 'ID' },
  conditionResolver: { op: 'booleanParser', column: 'Active' },
}), [conditionalSource]);
assert.equal(conditionalGraph.nodes.filter((node) => node.levelId === 'ConditionalItem').length, 2);

const main = parseTableSource('ID,Name\n1,A\n2,B', { sourceId: 'MAIN', delimiterMode: 'comma' });
const lookup = parseTableSource('ID,Rating\n1,R1\n2,R2', { sourceId: 'LOOKUP', delimiterMode: 'comma' });
const joinedGraph = buildCategorizedGraph(rootWith({
  levelId: 'JoinedItem',
  levelType: 'occurrence',
  creationMode: 'lookup-joined',
  keyResolver: { op: 'trim', sourceId: 'MAIN', column: 'ID' },
  fieldResolvers: { Rating: { op: 'trim', sourceId: 'LOOKUP', column: 'Rating' } },
}, {
  drivingSourceId: 'MAIN',
  joins: [{ joinId: 'rating', leftSourceId: 'MAIN', rightSourceId: 'LOOKUP', leftKeyResolver: { column: 'ID' }, rightKeyResolver: { column: 'ID' }, duplicatePolicy: 'first', missingPolicy: 'warning', joinType: 'left' }],
}), [main, lookup]);
assert.equal(joinedGraph.nodes.filter((node) => node.fields.Rating).length, 2);

const coordinateSource = parseTableSource('ID,X,Y,Z\n1,0,0,0\n2,1,1,1\n3,100,100,100', { sourceId: 'S1', delimiterMode: 'comma' });
const clusterGraph = buildCategorizedGraph(rootWith({
  levelId: 'CoordinateCluster',
  levelType: 'group',
  creationMode: 'coordinate-clustered',
  keyResolver: { op: 'coordinateCluster', contract: { axisMapping: { x: 'X', y: 'Y', z: 'Z' }, tolerance: 2, unit: 'mm' } },
}), [coordinateSource]);
assert.equal(clusterGraph.nodes.filter((node) => node.levelId === 'CoordinateCluster').length, 2);

const manySource = parseTableSource('ID,Tags\n1,A|B|C', { sourceId: 'S1', delimiterMode: 'comma' });
const manyGraph = buildCategorizedGraph(rootWith({
  levelId: 'Tag',
  levelType: 'attribute',
  creationMode: 'many-per-row',
  listResolver: { op: 'trim', column: 'Tags' },
  delimiter: '|',
}), [manySource]);
assert.equal(manyGraph.nodes.filter((node) => node.levelId === 'Tag').length, 3);

console.log('Table categorized creation mode tests passed');
