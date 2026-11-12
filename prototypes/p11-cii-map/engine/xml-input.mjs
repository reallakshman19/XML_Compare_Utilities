import { webcrypto } from 'node:crypto';
import { readXmlGraph } from '../vendor/prototypes/ciifr-map/xml-intake.js';
import { xmlDomParser } from '../tests/fixture-tools.mjs';
import { refuse } from '../kit/core.mjs';

export async function readInputXmlGraph(bytes, member = 'XML') {
  try {
    const graph = await readXmlGraph(bytes, {member, cryptoRef: webcrypto, parser: xmlDomParser});
    if (graph.profile !== 'F05 RichInputXML-P1.v1.1') throw new Error('only F05 RichInputXML is enabled');
    return graph;
  } catch (e) {
    refuse('MATCH_XML_INVALID', member, e.message);
  }
}
