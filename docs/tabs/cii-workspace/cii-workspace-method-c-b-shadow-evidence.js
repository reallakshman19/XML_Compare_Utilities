/** Independent diagnostic alternative, NOT a B-certifier or Writer2 integration.
 * Caller must supply graphs parsed by buildOriginalGraphFromBytes (not JSON imports).
 * All evidence is descriptive. No degree/length/OD/wall tolerance approves a NODE.
 */
const SHA = /^[a-f0-9]{64}$/;
const ID = /^[0-9]+$/;
const MAX_ROWS = 20000;
const SHA_KEYS = ['sourceOriginalSha256','targetOriginalSha256','sourceSetSha256'];
const deepFreeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
};
const fail = code => { throw new Error('METHOD_C_B_SHADOW_' + code); };
const identity = value => String(value ?? '');
const copyVec = values => {
  if (!Array.isArray(values) || values.length !== 3 ||
      values.some(v => !Number.isFinite(v))) fail('SIGNED_VECTOR_REQUIRED');
  return [...values];
};
function graph(evidence, graph, expectedSha, expectedMember) {
  if (graph?.byteAuthority !== 'ORIGINAL_BYTES' || graph.sha256 !== expectedSha ||
      graph.member !== expectedMember || !(graph.nodeIndex instanceof Map) ||
      !Array.isArray(graph.edges) || !Array.isArray(graph.nodes))
    fail('ORIGINAL_BYTE_GRAPH_REQUIRED');
  if (graph.nodes.length !== graph.nodeIndex.size ||
      graph.nodes.some(n => !ID.test(identity(n.id)) || graph.nodeIndex.get(n.id) !== n))
    fail('ORIGINAL_NODE_INDEX_INVALID');
  return graph;
}
function incident(graph, node) {
  if (!Array.isArray(node.incident) || !Number.isSafeInteger(node.degree) ||
      node.degree !== node.incident.length) fail('INVALID_ORIGINAL_TOPOLOGY');
  return node.incident.map(index => {
    const edge = graph.edges[index];
    if (!edge || ![edge.from,edge.to].includes(node.id) ||
        !edge.witness?.startsWith('ELEMENTS#') ||
        !Number.isFinite(edge.od) || !Number.isFinite(edge.wall))
      fail('UNTRUSTED_ORIGINAL_ELEMENT_WITNESS');
    return Object.freeze({witness:edge.witness,
      lengthMm:Math.hypot(...copyVec(edge.delta)),
      odMm:edge.od,wallMm:edge.wall,
      neighborNode:edge.from===node.id?edge.to:edge.from});
  });
}
const signedSpectrum = edges => edges.map(e=>e.lengthMm).sort((a,b)=>a-b);
function hypothesis(source, target, sourceNode, targetNode, alt) {
  const a=incident(source,sourceNode), b=incident(target,targetNode);
  const s=signedSpectrum(a), t=signedSpectrum(b);
  const sameDegree=a.length===b.length;
  const deltas=sameDegree?s.map((v,i)=>Number((t[i]-v).toFixed(6))):[];
  const reasons=['NO_OWNER_ADMITTED_NONCIRCULAR_B_POLICY','NO_AUTHENTICATED_INDEPENDENT_SEED',
    'NO_INDEPENDENT_HELD_OUT_IDENTITY_WITNESSES'];
  if (!sameDegree) reasons.push('TOPOLOGY_DEGREE_DIFFERENCE_REQUIRES_ENGINEERING_REVIEW');
  if (deltas.some(d=>d!==0)) reasons.push('SIGNED_INCIDENT_LENGTH_DIFFERENCE_REQUIRES_REVIEW');
  if (sourceNode.od !== targetNode.od) reasons.push('OD_DIFFERENCE_REQUIRES_REVIEW');
  if (sourceNode.wall !== targetNode.wall) reasons.push('WALL_DIFFERENCE_REQUIRES_REVIEW');
  return {targetNode:targetNode.id, distanceMm:alt.distanceMm,
    residualXYZmm:copyVec(alt.residual),
    sourceDegree:sourceNode.degree,targetDegree:targetNode.degree,
    signedSourceElements:a,signedTargetElements:b,
    sortedOriginalLengthDeltaMm:deltas,
    degreeEqual:sameDegree,
    odDeltaMm:Number((targetNode.od-sourceNode.od).toFixed(6)),
    wallDeltaMm:Number((targetNode.wall-sourceNode.wall).toFixed(6)),
    reviewReasons:reasons,verification:'NOT_PHYSICAL_CERTIFICATE'};
}
function examineRow(row, source, target, targetUsers) {
  if (!ID.test(identity(row.sourceNode)) || row.physicalIdentityQualified ||
      row.writerEligible || row.selectedPhysicalTarget ||
      row.identityBound || row.applyAuthorized) fail('FORGED_B_IDENTITY');
  const sourceNode=source.nodeIndex.get(row.sourceNode);
  if (!sourceNode) fail('SOURCE_NODE_MISSING_FROM_ORIGINAL');
  const alts = row.alternatives || [];
  if (!Array.isArray(alts) || alts.length>1000) fail('UNBOUNDED_OR_INVALID_ALTERNATIVES');
  const seen = new Set();
  const hypotheses=alts.map(alt => {
    const key=identity(alt.target);
    if (!ID.test(key) || seen.has(key)) fail('DUPLICATE_OR_INVALID_TARGET');
    seen.add(key);
    const tn=target.nodeIndex.get(key);
    if (!tn || !Number.isFinite(alt.distanceMm) || alt.distanceMm<0)
      fail('TARGET_PHYSICAL_NODE_OR_DISTANCE_NOT_VERIFIED');
    const result=hypothesis(source,target,sourceNode,tn,alt);
    targetUsers.set(key,(targetUsers.get(key)||0)+1);
    return result;
  });
  if (row.status==='MISSING_TARGET_NODE_BUT_ALIGNED_SEGMENT' &&
      (hypotheses.length || !row.segmentOnly || row.segmentOnly.endpoints?.length!==2))
    fail('SEGMENT_IS_NOT_A_TARGET_PHYSICAL_NODE');
  const reasons=[];
  const alignedSegment = row.status === 'MISSING_TARGET_NODE_BUT_ALIGNED_SEGMENT';
  if (!hypotheses.length) reasons.push(alignedSegment?
    'ORIGINAL_TARGET_ELEMENT_ONLY_NO_PHYSICAL_NODE':'NO_PHYSICAL_TARGET_IN_WINDOW');
  if (hypotheses.length>1) reasons.push('MULTIPLE_GEOMETRIC_TARGET_HYPOTHESES');
  if (row.contestedTargets?.length) reasons.push('GEOMETRIC_TARGET_COMPETITION');
  if (row.status==='OWNER_ANCHOR_EXPERIMENT') reasons.push('EXPERIMENTAL_ANCHOR_UNAUTHENTICATED');
  return {sourceNode:row.sourceNode,geometricStatus:row.status,topologyWitnesses:incident(source,sourceNode),
    candidateCount:hypotheses.length,hypotheses,
    segmentOnly:alignedSegment?row.segmentOnly:null,
    nearestUnqualifiedSegment:!alignedSegment?(row.segmentOnly||null):null,
    missingEvidence:reasons.concat('INDEPENDENT_PHYSICAL_IDENTITY_NOT_ESTABLISHED'),
    bDisposition:'B_POLICY_HOLD'};
}
/** Per-source diagnostic, candidate conflicts included, NO automatic target election. */
export function evaluateMethodCBShadow({aEvidence,sourceGraph,targetGraph}={}) {
  if (aEvidence?.schema!=='MethodC.Writer2ReadOnlyGeometry.v1' ||
      aEvidence.authority!=='READ_ONLY_UNVERIFIED_GEOMETRY' ||
      !Array.isArray(aEvidence.rows) || aEvidence.rows.length>MAX_ROWS ||
      !Number.isSafeInteger(aEvidence.sessionEpoch) ||
      aEvidence.qualifiedPhysicalIdentityCount!==0 ||
      aEvidence.writerEligible!==false || aEvidence.applyAuthorized!==false ||
      (aEvidence.mutationOperations||[]).length) fail('A_ONLY_AUTHORITY_REQUIRED');
  if (SHA_KEYS.some(k=>!SHA.test(aEvidence[k])) || !/^S[123]$/.test(aEvidence.sourceId))
    fail('ORIGINAL_SHA_AND_MEMBER_REQUIRED');
  const source=graph(aEvidence,sourceGraph,aEvidence.sourceOriginalSha256,aEvidence.sourceId);
  const target=graph(aEvidence,targetGraph,aEvidence.targetOriginalSha256,'T');
  const users=new Map(), seen=new Set();
  const rows=aEvidence.rows.map(row=>{
    if (seen.has(row.sourceNode)) fail('DUPLICATE_SOURCE_NODE');
    seen.add(row.sourceNode);
    return examineRow(row,source,target,users);
  });
  for(const row of rows)for(const hypothesis of row.hypotheses)
    if(users.get(hypothesis.targetNode)>1)
      hypothesis.reviewReasons.push('TARGET_REUSED_BY_MULTIPLE_SOURCE_CANDIDATES');
  const contest=[...users].filter(([,count])=>count>1).map(([target])=>target).sort((a,b)=>Number(a)-Number(b));
  return deepFreeze({
    schema:'MethodC.PhysicalEvidenceShadow.v1',
    authority:'B_INVESTIGATION_ONLY_NOT_ADMITTED',
    sourceId:aEvidence.sourceId,sourceSetSha256:aEvidence.sourceSetSha256,
    sourceOriginalSha256:aEvidence.sourceOriginalSha256,
    targetOriginalSha256:aEvidence.targetOriginalSha256,
    sessionEpoch:aEvidence.sessionEpoch,
    selectedPoseId:aEvidence.registration?.selectedPoseId??null,
    aRegistrationStatus:aEvidence.registration?.status??null,
    policyStatus:'OWNER_PHYSICAL_B_ADMISSION_POLICY_NOT_APPROVED',
    hypothesisCount:rows.reduce((v,r)=>v+r.hypotheses.length,0),
    contestedPhysicalTargetCandidates:contest,
    rows,qualifiedPhysicalIdentityCount:0,
    physicalCertificates:[],certifiedBoundRows:[],
    writerEligible:false,applyAuthorized:false,mutationOperations:[],
  });
}
