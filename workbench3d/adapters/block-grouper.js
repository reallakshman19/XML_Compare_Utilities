/**
 * block-grouper.js — element data → block-wise collapsible display model (pure).
 *
 * Output shape consumed by the block inspector UI:
 *   [{ blockName: 'Restraint', instances: [{ label: '[1]', entries: [[key,value],...] }] }]
 *
 * Categorized objects keep their real block structure (retained by the
 * adapter); raw InputXML objects get derived pseudo-blocks.
 */

const SENTINEL = /-?1\.0101|-nan/i;

function cleanEntries(entries) {
  return entries.filter(([, value]) => {
    const text = String(value ?? '').trim();
    return text !== '' && !SENTINEL.test(text);
  });
}

function prettifyBlockName(name) {
  const base = String(name).replace(/s?Block$/i, '');
  if (/^[A-Z0-9_]+$/.test(base)) {
    // ALL-CAPS packet names → Title case (RESTRAINT → Restraint)
    return base.charAt(0) + base.slice(1).toLowerCase();
  }
  return base.replace(/([a-z])([A-Z])/g, '$1 $2');
}

const RAW_PSEUDO_BLOCKS = Object.freeze([
  ['Section', /^(DIAMETER|WALL_THICK|INSUL_THICK|CORR_ALLOW|SEAM_WELD|MILL_TOL)/],
  ['Process', /^(TEMP_|PRESSURE|HYDRO_)/],
  ['Material', /^(MATERIAL_|PIPE_DENSITY|INSUL_DENSITY|FLUID_DENSITY|MODULUS|HOT_MOD|POISSONS)/],
]);

/**
 * Group an object's data block-wise.
 * @param {object} object canonical object (with optional .blocks from adapter)
 * @returns [{ blockName, instances: [{ label, entries }] }]
 */
export function groupObjectBlocks(object) {
  if (!object) return [];
  const groups = [];
  const push = (blockName, label, entries) => {
    const clean = cleanEntries(entries);
    if (!clean.length) return;
    let group = groups.find((g) => g.blockName === blockName);
    if (!group) {
      group = { blockName, instances: [] };
      groups.push(group);
    }
    group.instances.push({ label, entries: clean });
  };

  if (Array.isArray(object.blocks) && object.blocks.length) {
    // Categorized schema: real blocks retained by the adapter.
    for (const block of object.blocks) {
      const blockName = prettifyBlockName(block.name);
      if (block.entries?.length) push(blockName, '', block.entries);
      (block.instances ?? []).forEach((instance, index) => {
        const many = block.instances.length > 1;
        push(prettifyBlockName(instance.name), many ? `[${index + 1}]` : '', Object.entries(instance.attrs));
      });
    }
  } else {
    // Raw InputXML: derive pseudo-blocks from flat properties.
    const nameEntries = [];
    if (object.name) nameEntries.push(['NAME', object.name]);
    if (object.lineId) nameEntries.push(['LINE', object.lineId]);
    push('Name', '', nameEntries);
    push('Geometry', '', [
      ['FROM→TO', object.canonicalFromTo],
      ['LENGTH mm', object.lengthMm],
      ['PATH', object.pathId],
      ['STATION mm', object.stationMm],
    ]);
    const used = new Set(['NAME']);
    for (const [blockName, pattern] of RAW_PSEUDO_BLOCKS) {
      const entries = Object.entries(object.properties ?? {}).filter(([key]) => pattern.test(key));
      entries.forEach(([key]) => used.add(key));
      push(blockName, '', entries);
    }
    const other = Object.entries(object.properties ?? {}).filter(([key]) => !used.has(key));
    push('Other', '', other);
  }

  // Packets always shown as per-kind blocks with [n] instances.
  const byKind = new Map();
  for (const packet of object.packets ?? []) {
    if (!byKind.has(packet.kind)) byKind.set(packet.kind, []);
    byKind.get(packet.kind).push(packet);
  }
  for (const [kind, packets] of byKind) {
    const blockName = prettifyBlockName(kind.charAt(0) + kind.slice(1).toLowerCase());
    // Only add if the categorized blocks didn't already cover this kind.
    if (groups.some((g) => g.blockName.toUpperCase().startsWith(kind))) continue;
    packets.forEach((packet, index) => {
      const entries = Object.entries(packet.attrs ?? {});
      if (packet.consumedFrom) entries.push(['(from consumed)', packet.consumedFrom]);
      push(blockName, packets.length > 1 ? `[${index + 1}]` : '', entries);
    });
  }
  return groups;
}
