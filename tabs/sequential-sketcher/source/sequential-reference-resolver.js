function text(value) { return String(value ?? '').trim(); }

export const REFERENCE_TARGET_KINDS = Object.freeze({
  BRANCH: 'BRANCH',
  JUNCTION_COMPONENT: 'JUNCTION_COMPONENT',
  INLINE_COMPONENT: 'INLINE_COMPONENT',
  AMBIGUOUS: 'AMBIGUOUS',
  MISSING: 'MISSING',
});

function componentTarget(component, reference) {
  const junction = component.canonicalType === 'TEE' || component.canonicalType === 'OLET';
  return Object.freeze({
    status: 'RESOLVED',
    reference,
    kind: junction ? REFERENCE_TARGET_KINDS.JUNCTION_COMPONENT : REFERENCE_TARGET_KINDS.INLINE_COMPONENT,
    targetBranchId: component.branchId,
    targetComponentId: component.componentId,
    targetSourceComponentId: component.sourceComponentId,
    targetPortRoles: Object.freeze(junction ? ['BRANCH_OUT'] : component.ports.map((port) => port.role)),
  });
}

export function resolveSequentialReference(referenceValue, indexes) {
  const reference = text(referenceValue);
  if (!reference) return Object.freeze({ status: 'MISSING', kind: REFERENCE_TARGET_KINDS.MISSING, reference });

  const branch = indexes.branches.get(reference);
  if (branch) {
    return Object.freeze({
      status: 'RESOLVED',
      reference,
      kind: REFERENCE_TARGET_KINDS.BRANCH,
      targetBranchId: branch.branchId,
      targetComponentId: null,
      targetSourceComponentId: null,
      targetPortRoles: Object.freeze([]),
    });
  }

  const components = indexes.componentReferences?.get(reference) || [];
  if (components.length === 1) return componentTarget(components[0], reference);
  if (components.length > 1) {
    return Object.freeze({
      status: 'AMBIGUOUS',
      kind: REFERENCE_TARGET_KINDS.AMBIGUOUS,
      reference,
      matches: Object.freeze(components.map((component) => Object.freeze({
        targetBranchId: component.branchId,
        targetComponentId: component.componentId,
        targetSourceComponentId: component.sourceComponentId,
        canonicalType: component.canonicalType,
      }))),
    });
  }

  return Object.freeze({ status: 'MISSING', kind: REFERENCE_TARGET_KINDS.MISSING, reference });
}
