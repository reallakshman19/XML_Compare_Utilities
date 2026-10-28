/* Path B: numeric Node -> typed auxiliary/property occurrence; read-only only. */
import { normalizedNode } from './cii-index.js';
export const NODE_FAMILIES=Object.freeze(['NODENAME','RESTRANT',
  'DISPLMNT','FORCMNT','HANGER','NOZZLE','EQUIPMENT']);
const empty=()=>({incidents:[],restraints:[],displacements:[],forces:[],rigids:[]});
export function inspectNodePair(source,target,selector) {
  const sn=selector.sourceNode?normalizedNode(selector.sourceNode):null;
  const tn=normalizedNode(selector.targetNode);
  const src=sn===null?empty():(source?.byNode.get(sn)||empty());
  const dst=target.byNode.get(tn)||empty();
  return {mode:'NODE_DATA',mapping:'UNVERIFIED_READ_ONLY',
    source:{node:sn,occurrences:src},target:{node:tn,occurrences:dst},
    summary:{sourceRest:src.restraints.length,targetRest:dst.restraints.length,
      sourceDisp:src.displacements.length,targetDisp:dst.displacements.length,
      sourceForce:src.forces.length,targetForce:dst.forces.length},
    reason:'NUMERIC_NODE_CROSS_FILE_IDENTITY_NOT_PROVEN',
    writeEligible:false};
}
