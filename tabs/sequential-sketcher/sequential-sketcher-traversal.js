function otherNode(segment, nodeId) {
  return segment.fromNodeId === nodeId ? segment.toNodeId : segment.fromNodeId;
}

function segmentPreference(left, right) {
  const roleRank = (role) => role === 'RUN_A' || role === 'RUN_B' || role === 'INLINE' ? 0 : 1;
  return roleRank(left.role) - roleRank(right.role) || left.sourceIndex - right.sourceIndex || left.id.localeCompare(right.id);
}

function chooseStartNode(topology, unvisited) {
  const head = topology.boundaries.find((boundary) => boundary.role === 'HEAD' && boundary.nodeId && topology.nodes.find((node) => node.id === boundary.nodeId)?.segmentIds.some((id) => unvisited.has(id)));
  if (head) return { nodeId: head.nodeId, basis: 'HEAD_BOUNDARY' };
  const terminal = topology.nodes
    .filter((node) => node.segmentIds.filter((id) => unvisited.has(id)).length === 1)
    .sort((a, b) => a.id.localeCompare(b.id))[0];
  if (terminal) return { nodeId: terminal.id, basis: 'DEGREE_ONE_TERMINAL' };
  const any = topology.nodes.find((node) => node.segmentIds.some((id) => unvisited.has(id)));
  return any ? { nodeId: any.id, basis: 'PRESENTATION_SEED' } : null;
}

function incident(topology, nodeId, unvisited) {
  const node = topology.nodes.find((candidate) => candidate.id === nodeId);
  return (node?.segmentIds || [])
    .filter((id) => unvisited.has(id))
    .map((id) => topology.segments.find((segment) => segment.id === id))
    .filter(Boolean).sort(segmentPreference);
}

function markEvents(topology, nodeId, markedComponents, commands) {
  const node = topology.nodes.find((candidate) => candidate.id === nodeId);
  for (const componentId of node?.eventComponentIds || []) {
    if (markedComponents.has(componentId)) continue;
    markedComponents.add(componentId);
    commands.push(Object.freeze({ op: 'MARK_COMPONENT', nodeId, componentId }));
  }
}

export function planSequentialTraversal(topology) {
  const unvisited = new Set(topology.segments.map((segment) => segment.id));
  const markedComponents = new Set();
  const commands = [];
  const routeSections = [];
  const issues = [...topology.issues];
  let sectionNumber = 0;
  let firstStart = true;

  while (unvisited.size) {
    const start = chooseStartNode(topology, unvisited);
    if (!start) break;
    sectionNumber += 1;
    const section = { id: `RS-${String(sectionNumber).padStart(3, '0')}`, startNodeId: start.nodeId, segmentIds: [], startBasis: start.basis };
    if (!firstStart) issues.push({ code: 'DISCONNECTED_FRAGMENT', severity: 'WARNING', nodeId: start.nodeId });
    commands.push(Object.freeze({ op: 'MOVE_TO', nodeId: start.nodeId, reason: firstStart ? 'START' : 'DISCONNECTED_FRAGMENT' }));
    firstStart = false;
    let currentNodeId = start.nodeId;
    const pending = [];
    markEvents(topology, currentNodeId, markedComponents, commands);

    while (true) {
      const options = incident(topology, currentNodeId, unvisited);
      if (!options.length) {
        if (!pending.length) break;
        const resume = pending.pop();
        currentNodeId = resume.nodeId;
        commands.push(Object.freeze({ op: 'PEN_UP' }));
        commands.push(Object.freeze({ op: 'MOVE_TO', nodeId: currentNodeId, reason: 'RETURN_TO_JUNCTION' }));
        commands.push(Object.freeze({ op: 'PEN_DOWN' }));
        continue;
      }
      if (options.length > 1) {
        commands.push(Object.freeze({ op: 'REGISTER_JUNCTION', nodeId: currentNodeId, pendingSegmentIds: Object.freeze(options.slice(1).map((segment) => segment.id)) }));
        pending.push({ nodeId: currentNodeId });
      }
      const segment = options[0];
      unvisited.delete(segment.id);
      const nextNodeId = otherNode(segment, currentNodeId);
      section.segmentIds.push(segment.id);
      commands.push(Object.freeze({ op: 'DRAW_SEGMENT', segmentId: segment.id, componentId: segment.componentId, fromNodeId: currentNodeId, toNodeId: nextNodeId }));
      currentNodeId = nextNodeId;
      markEvents(topology, currentNodeId, markedComponents, commands);
    }
    section.endNodeId = currentNodeId;
    routeSections.push(Object.freeze({ ...section, segmentIds: Object.freeze(section.segmentIds) }));
  }

  const undrawnComponents = topology.components.filter((component) => !component.segmentIds.length && !markedComponents.has(component.id));
  for (const component of undrawnComponents) issues.push({ code: 'UNACCOUNTED_COMPONENT', severity: 'ERROR', componentId: component.componentId });
  return Object.freeze({
    commands: Object.freeze(commands),
    routeSections: Object.freeze(routeSections),
    issues: Object.freeze(issues.map(Object.freeze)),
    graphClass: routeSections.length > 1 ? 'DISCONNECTED_FOREST' : topology.nodes.some((node) => node.segmentIds.length > 2) ? 'BRANCHED_GRAPH' : topology.nodes.every((node) => node.segmentIds.length === 2) ? 'LOOP' : 'SIMPLE_PATH',
  });
}
