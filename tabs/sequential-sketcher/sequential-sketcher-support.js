function normalizeFamily(family, carrierId) {
  const position = family?.position || {};
  return Object.freeze({
    familyId: String(family?.familyId || family?.supportGlyph?.familyId || '').trim(),
    carrierId,
    carrierStationMm: Number(position.carrierStationMm ?? family?.supportGlyph?.carrierStationMm),
    carrierFraction: Number(position.carrierFraction ?? family?.supportGlyph?.carrierFraction),
    centerlinePointGlobal: position.centerlinePointGlobal || family?.supportGlyph?.centerlinePointGlobal || null,
    displayKind: String(family?.resolvedFunction?.supportKind || family?.supportGlyph?.displayKind || 'SUPPORT'),
    label: String(family?.supportGlyph?.label || family?.familyId || 'Support'),
    resolutionStatus: String(family?.carrierBinding?.bindingStatus || family?.supportGlyph?.resolutionStatus || 'UNKNOWN'),
    members: Array.isArray(family?.members) ? family.members : [],
  });
}

export function indexSupportBundle(bundle, branchId) {
  const index = new Map();
  const unresolved = [];
  if (!bundle) return Object.freeze({ index, unresolved, familyCount: 0 });
  const carriers = Array.isArray(bundle.carriers) ? bundle.carriers : [];
  let familyCount = 0;
  for (const carrier of carriers) {
    if (bundle.branchId && branchId && String(bundle.branchId) !== String(branchId)) continue;
    const carrierId = String(carrier?.carrierId || '').trim();
    const families = Array.isArray(carrier?.supportFamilies) ? carrier.supportFamilies : [];
    for (const family of families) {
      const normalized = normalizeFamily(family, carrierId);
      familyCount += 1;
      if (!carrierId) unresolved.push(normalized);
      else {
        const rows = index.get(carrierId) || [];
        rows.push(normalized); index.set(carrierId, rows);
      }
    }
  }
  for (const rows of index.values()) rows.sort((left, right) => {
    const a = Number.isFinite(left.carrierStationMm) ? left.carrierStationMm : Number.POSITIVE_INFINITY;
    const b = Number.isFinite(right.carrierStationMm) ? right.carrierStationMm : Number.POSITIVE_INFINITY;
    return a - b || left.label.localeCompare(right.label);
  });
  return Object.freeze({ index, unresolved: Object.freeze(unresolved), familyCount });
}
