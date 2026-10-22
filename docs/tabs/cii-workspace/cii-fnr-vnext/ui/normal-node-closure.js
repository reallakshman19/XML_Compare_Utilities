/* Writer-side normal-mode closure over original TARGET0 physical name records.
 * No proposal evidence or postimage is trusted to define a logical node. */
const bad = code => { throw new Error(code); };
const span = f => `${f.byteStart}:${f.byteEnd}`;

export function enforceNormalNodeClosure(parsed, approvedClaims) {
  const byWitness = new Map(parsed.elements.map(e => [e.witness, e]));
  const bySpan = new Map(parsed.fields.map(f => [span(f), f]));
  const byNode = new Map(), touched = new Map();
  for (const field of parsed.fields) {
    // TARGET0 blank physical names are not aliases, and must remain unchanged.
    if (!field.before.trim()) continue;
    for (const witness of field.owners) {
      const element = byWitness.get(witness);
      if (!element) bad('NORMAL_NODE_OWNER_INVALID');
      const node = String(field.fieldIdentity === 'NODENAME.FROM' ? element.from : element.to);
      if (!byNode.has(node)) byNode.set(node, new Map());
      byNode.get(node).set(span(field), field);
    }
  }
  for (const claim of approvedClaims) {
    if (claim.section !== 'NODENAME') continue;
    const field = bySpan.get(span(claim));
    if (field && !field.before.trim()) bad('NODENAME_BLANK_PHYSICAL_EDIT_FORBIDDEN');
    if (!field || field.fieldIdentity !== claim.fieldIdentity || field.owners.length !== 1) {
      bad('NORMAL_NODE_FIELD_AMBIGUOUS');
    }
    const element = byWitness.get(field.owners[0]);
    if (!element) bad('NORMAL_NODE_OWNER_INVALID');
    const node = String(field.fieldIdentity === 'NODENAME.FROM' ? element.from : element.to);
    if (!touched.has(node)) touched.set(node, new Map());
    if (touched.get(node).has(span(claim))) bad('NORMAL_NODE_ALIAS_COLLISION');
    touched.get(node).set(span(claim), claim);
  }
  for (const [node, chosen] of touched) {
    const all = byNode.get(node);
    if (!all || chosen.size !== all.size || [...all.keys()].some(k => !chosen.has(k))) {
      bad('NORMAL_NODE_ALIAS_APPROVAL_INCOMPLETE');
    }
    const originals = new Set([...all.values()].map(f => f.before.trim()));
    const proposals = new Set([...chosen.values()].map(c => c.after.trim()));
    if (originals.size !== 1 || proposals.size !== 1 || ![...proposals][0]) {
      bad('NORMAL_NODE_ALIAS_VALUES_CONFLICT');
    }
  }
}
