export const NAVIS_ANCHOR_SLOT_COUNT = 5;

function value(input) {
  return String(input ?? '').trim();
}

export function anchorSlotKeys(priority) {
  const suffix = Number(priority) === 1 ? '' : String(priority);
  return Object.freeze({
    tagKey: `navisAnchorTagId${suffix}`,
    supportKey: `navisAnchorSupportIdentity${suffix}`,
  });
}

export function configuredAnchorSlots(config = {}, includeEmpty = false) {
  const rows = Array.from({ length: NAVIS_ANCHOR_SLOT_COUNT }, (_, index) => {
    const priority = index + 1;
    const keys = anchorSlotKeys(priority);
    const tagId = value(config[keys.tagKey]);
    const supportIdentity = value(config[keys.supportKey]);
    return Object.freeze({
      priority,
      role: priority === 1 ? 'PRIMARY_AUTHORITY' : `FALLBACK_${priority - 1}`,
      tagId,
      supportIdentity,
      configured: Boolean(tagId || supportIdentity),
      complete: Boolean(tagId && supportIdentity),
      ...keys,
    });
  });
  return Object.freeze(includeEmpty ? rows : rows.filter((row) => row.configured));
}

export function anchorPriorityLabel(priority) {
  return Number(priority) === 1 ? 'Primary authority' : `Fallback ${Number(priority) - 1}`;
}
